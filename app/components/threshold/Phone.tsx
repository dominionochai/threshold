import { useEffect, useRef, useState } from "react";
import type { ActiveCall } from "@shared/engine/types";
import { canListen, listen } from "./callAudio";
import { usePhone } from "./usePhone";

const button = "rounded-full px-5 py-3 font-semibold disabled:opacity-40";

export function Phone({ call, location, onClose }: { call: ActiveCall; location: string; onClose: () => void }) {
  const phone = usePhone(call);
  const [typed, setTyped] = useState("");
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const stopListening = useRef<(() => void) | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const ready = phone.phase === "live" && phone.busy === null;

  useEffect(() => log.current?.scrollTo({ top: log.current.scrollHeight }), [phone.turns, phone.busy]);

  function toggleMic() {
    if (listening) return stopListening.current?.();
    setListening(true);
    stopListening.current = listen({
      onInterim: setHeard,
      onFinal: (text) => {
        setHeard("");
        phone.staffSays(text);
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="flex h-[640px] w-full max-w-sm flex-col rounded-[2.5rem] border border-zinc-700 bg-zinc-950 p-5 text-zinc-100 shadow-2xl">
        <header className="pb-3 text-center">
          <p className="text-xs uppercase tracking-wide text-zinc-400">{phone.phase === "ringing" ? "Incoming call" : phone.phase === "done" ? "Call ended" : "On the call"}</p>
          <h2 className="text-lg font-semibold">Threshold</h2>
          <p className="text-sm text-zinc-400">an assistant calling for a family in {location}</p>
          <p className="mt-1 text-xs text-amber-300">You are the staff at {call.resourceName}</p>
        </header>

        {phone.phase === "ringing" && (
          <div className="grid flex-1 place-items-center">
            <button className={`${button} bg-emerald-500 px-10 py-5 text-lg text-zinc-950`} onClick={phone.answer}>Answer</button>
          </div>
        )}

        {(phone.phase === "live" || phone.phase === "wrapping") && (
          <>
            <div ref={log} className="flex-1 space-y-2 overflow-y-auto py-2">
              {phone.turns.map((turn, i) => (
                <p key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${turn.who === "agent" ? "bg-zinc-800" : "ml-auto bg-amber-400 text-zinc-950"}`}>{turn.text}</p>
              ))}
              {heard && <p className="ml-auto max-w-[85%] rounded-2xl bg-amber-400/40 px-3 py-2 text-sm">{heard}</p>}
              {phone.busy === "thinking" && <p className="text-sm text-zinc-500">…</p>}
              {phone.phase === "wrapping" && <p className="text-sm text-zinc-400">Writing the call into the case…</p>}
            </div>
            {phone.error && <p className="pb-2 text-sm text-rose-400">{phone.error}</p>}
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-full bg-zinc-900 px-4 py-2 text-sm outline-none"
                  placeholder="Type what you say as staff"
                  value={typed}
                  disabled={!ready}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && typed.trim()) {
                      phone.staffSays(typed.trim());
                      setTyped("");
                    }
                  }}
                />
                {canListen() && (
                  <button className={`${button} ${listening ? "bg-rose-500" : "bg-zinc-800"} py-2`} disabled={!ready} onClick={toggleMic}>{listening ? "Stop" : "Speak"}</button>
                )}
              </div>
              <button className={`${button} w-full bg-rose-600`} disabled={phone.phase === "wrapping"} onClick={phone.hangUp}>End call</button>
            </div>
          </>
        )}

        {phone.phase === "done" && phone.outcome && (
          <div className="flex flex-1 flex-col justify-between">
            <div className="space-y-2 text-sm">
              <p className="text-lg font-semibold capitalize">{phone.outcome.result}</p>
              <p>{phone.outcome.summary}</p>
              {phone.outcome.instructions.map((item) => (
                <p key={item} className="text-amber-300">• {item}</p>
              ))}
              <p className="text-xs text-zinc-400">Written to the activity trail.</p>
            </div>
            <button className={`${button} bg-zinc-800`} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
