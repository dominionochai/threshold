import { useActionMutation } from "@agent-native/core/client/hooks";
import { useEffect, useRef, useState } from "react";
import { DEMO_CALL } from "@shared/demo/call-script";
import type { ActiveCall, Turn } from "@shared/engine/types";
import { playClip, preloadClips, startRinging, waitForTurn } from "./callAudio";

export type DemoPhase = "idle" | "ringing" | "connected" | "ended";
const clipUrl = (id: string) => `/demo-voice/${id}.wav`;
const warn = (what: string) => (e: unknown) => console.warn(`[threshold] ${what}`, e);

/** The shelter's phone for the scripted demo: ring, answer, talk to the recorded caller, hang up. */
export function useDemoCall(call: ActiveCall | null) {
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [voices, setVoices] = useState<"loading" | "ready" | "missing">("loading");
  const clips = useRef(new Map<string, HTMLAudioElement>());
  const stopRing = useRef<(() => void) | null>(null);
  const handled = useRef<string | null>(null);
  const abort = useRef(new AbortController());
  const playing = useRef<HTMLAudioElement | undefined>(undefined);
  const save = useActionMutation("call-turn", { skipActionQueryInvalidation: true });
  const finish = useActionMutation("finish-call", { skipActionQueryInvalidation: true });

  useEffect(() => {
    let cancelled = false;
    preloadClips(DEMO_CALL.agent.map((l) => clipUrl(l.id))).then(
      (loaded) => {
        clips.current = loaded;
        if (!cancelled) setVoices("ready");
      },
      () => !cancelled && setVoices("missing"),
    );
    return () => {
      cancelled = true;
      stopRing.current?.();
    };
  }, []);

  useEffect(() => {
    if (!call || call.status !== "ringing" || handled.current === call.id) return;
    handled.current = call.id;
    setPhase("ringing");
    try {
      stopRing.current = startRinging();
    } catch {
      // The browser may hold audio until the first tap; accepting still works.
    }
  }, [call]);

  useEffect(() => {
    if (phase !== "connected") return undefined;
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [phase]);

  async function accept() {
    if (!call || phase !== "ringing") return;
    stopRing.current?.();
    abort.current = new AbortController();
    setSeconds(0);
    setPhase("connected");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).catch(() => null);

    const turns: Turn[] = [];
    for (const [i, line] of DEMO_CALL.agent.entries()) {
      if (abort.current.signal.aborted) break;
      // Saved in the background so the case screen follows along; the call never waits on it.
      void save.mutateAsync({ callId: call.id, turns: [...turns] }).catch(warn("could not save call progress"));
      turns.push({ who: "agent", text: line.text });
      playing.current = clips.current.get(clipUrl(line.id));
      await playClip(playing.current);
      if (i === DEMO_CALL.agent.length - 1 || abort.current.signal.aborted) break;
      await waitForTurn(stream, abort.current.signal);
      turns.push({ who: "shelter", text: DEMO_CALL.staff[i] ?? "" });
    }

    stream?.getTracks().forEach((t) => t.stop());
    setPhase("ended");
    await finish.mutateAsync({ callId: call.id, turns }).catch(warn("could not close the call"));
    setTimeout(() => setPhase("idle"), 2500);
  }

  return {
    phase,
    seconds,
    voices,
    accept,
    decline: () => {
      stopRing.current?.();
      setPhase("idle");
    },
    end: () => {
      abort.current.abort();
      playing.current?.pause();
    },
  };
}
