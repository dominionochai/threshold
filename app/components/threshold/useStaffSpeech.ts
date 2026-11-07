import { useEffect, useRef, useState } from "react";
import { listen } from "./callAudio";

/**
 * Hands-free turn-taking: while `active`, keep the microphone open and hand over each
 * finished sentence. The caller's own voice is never captured, because `active` is
 * false while it speaks.
 */
export function useStaffSpeech(active: boolean, onSentence: (text: string) => void) {
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const handler = useRef(onSentence);
  handler.current = onSentence;

  useEffect(() => {
    if (!active) return undefined;
    let finished = false;
    let stop: (() => void) | undefined;
    const begin = () => {
      stop = listen({
        onInterim: setInterim,
        onFinal: (text) => {
          finished = true;
          setInterim("");
          handler.current(text);
        },
        onEnd: () => {
          if (!finished) setTimeout(begin, 250); // silence: keep the line open
        },
        onError: (message) => {
          finished = true;
          setMicError(message);
        },
      });
    };
    begin();
    return () => {
      finished = true;
      stop?.();
    };
  }, [active]);

  return { interim, micError };
}
