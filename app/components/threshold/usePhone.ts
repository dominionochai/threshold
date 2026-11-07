import { useActionMutation } from "@agent-native/core/client/hooks";
import { useEffect, useRef, useState } from "react";
import type { Outcome, Turn } from "@shared/engine/call";
import type { ActiveCall } from "@shared/engine/types";
import { playWav, startRinging } from "./callAudio";

export type Phase = "ringing" | "live" | "wrapping" | "done";

/** Runs one call: the caller speaks, the person on the other end answers, and the call is closed into the case. */
export function usePhone(call: ActiveCall) {
  const [phase, setPhase] = useState<Phase>("ringing");
  const [turns, setTurns] = useState<Turn[]>([]);
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
    try {
      stopRing.current = startRinging();
    } catch {
      // Some browsers hold audio until a tap; the Answer button still works.
    }
    return () => stopRing.current?.();
  }, []);

  async function hangUp(final: Turn[]) {
    setPhase("wrapping");
    const result = await finish.mutateAsync({ callId: call.id, turns: final });
    setOutcome(result.outcome);
    setPhase("done");
  }

  async function agentSpeaks(history: Turn[]) {
    setError(null);
    try {
      setBusy("thinking");
      const { say, endCall } = await nextLine.mutateAsync({ callId: call.id, turns: history });
      const { audio } = await speak.mutateAsync({ text: say });
      const next: Turn[] = [...history, { who: "agent", text: say }];
      setTurns(next);
      setBusy("speaking");
      await playWav(audio);
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
