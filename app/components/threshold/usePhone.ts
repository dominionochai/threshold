import { useActionMutation } from "@agent-native/core/client/hooks";
import { useEffect, useRef, useState } from "react";
import type { Outcome } from "@shared/engine/conversation";
import type { ActiveCall, Turn } from "@shared/engine/types";
import { playWav, speakInBrowser, startRinging } from "./callAudio";

/** Actions report model failures as `{ error }`; turn that back into a thrown, readable error. */
function unwrap<T>(result: T | { error: string }): T {
  if (result && typeof result === "object" && "error" in result) throw new Error(String(result.error));
  return result;
}

export type Phase = "ringing" | "live" | "wrapping" | "done";

/** Runs one call: the caller speaks, the person on the other end answers, and the call is closed into the case. */
export function usePhone(call: ActiveCall) {
  const [phase, setPhase] = useState<Phase>(call.status === "live" ? "live" : "ringing");
  const [turns, setTurns] = useState<Turn[]>(call.turns);
  const [busy, setBusy] = useState<"thinking" | "speaking" | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRing = useRef<(() => void) | null>(null);

  // Mutations here are plumbing for one call, so they must not refetch the whole case on every turn.
  const quiet = { skipActionQueryInvalidation: true } as const;
  const nextLine = useActionMutation("call-turn", quiet);
  const speak = useActionMutation("speak-line", quiet);
  const finish = useActionMutation("finish-call");

  useEffect(() => {
    if (call.status === "live") return undefined;
    try {
      stopRing.current = startRinging();
    } catch {
      // Some browsers hold audio until a tap; the Answer button still works.
    }
    return () => {
      stopRing.current?.();
    };
  }, []);

  async function hangUp(final: Turn[]) {
    setPhase("wrapping");
    const result = unwrap(await finish.mutateAsync({ callId: call.id, turns: final }));
    setOutcome(result.outcome);
    setPhase("done");
  }

  async function agentSpeaks(history: Turn[]) {
    setError(null);
    try {
      setBusy("thinking");
      const { say, endCall } = unwrap(await nextLine.mutateAsync({ callId: call.id, turns: history }));
      // If the voice service is down, the caller still speaks, in the browser's own voice.
      const audio = await speak.mutateAsync({ text: say }).then((r) => unwrap(r).audio, () => null);
      const next: Turn[] = [...history, { who: "agent", text: say }];
      setTurns(next);
      setBusy("speaking");
      await (audio ? playWav(audio) : speakInBrowser(say));
      setBusy(null);
      if (endCall) await hangUp(next);
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : "Something went wrong on the call.");
    }
  }

  return {
    phase, turns, busy, outcome, error,
    answer: () => {
      stopRing.current?.();
      setPhase("live");
      void agentSpeaks([]);
    },
    staffSays: (text: string) => {
      const next: Turn[] = [...turns, { who: "shelter", text }];
      setTurns(next);
      void agentSpeaks(next);
    },
    hangUp: () => void hangUp(turns).catch((e) => setError(e instanceof Error ? e.message : "Could not close the call.")),
  };
}
