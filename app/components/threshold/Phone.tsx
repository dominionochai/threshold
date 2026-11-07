import { useEffect, useRef, useState } from "react";
import type { ActiveCall } from "@shared/engine/types";
import { canListen } from "./callAudio";
import { usePhone } from "./usePhone";
import { useStaffSpeech } from "./useStaffSpeech";

const button = "rounded-full px-5 py-3 font-semibold disabled:opacity-40";

export function Phone({ call, location, onClose }: { call: ActiveCall; location: string; onClose: () => void }) {
  const phone = usePhone(call);
  const [typing, setTyping] = useState(!canListen());
  const [typed, setTyped] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const live = phone.phase === "live";
  const hearing = live && phone.busy === null && !typing;
  const { interim, micError } = useStaffSpeech(hearing, phone.staffSays);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [phone.turns, phone.busy, interim]);

  const status = phone.busy === "thinking" ? "Thinking…" : phone.busy === "speaking" ? "Speaking…" : hearing ? "Listening. Speak as the staff member." : "";

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

        {(live || phone.phase === "wrapping") && (
          <>
            <div ref={log} className="flex-1 space-y-2 overflow-y-auto py-2">
              {phone.turns.map((turn, i) => (
                <p key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${turn.who === "agent" ? "bg-zinc-800" : "ml-auto bg-amber-400 text-zinc-950"}`}>{turn.text}</p>
              ))}
              {interim && <p className="ml-auto max-w-[85%] rounded-2xl bg-amber-400/40 px-3 py-2 text-sm">{interim}</p>}
              {phone.phase === "wrapping" && <p className="text-sm text-zinc-400">Writing the call into the case…</p>}
            </div>
            <p className="pb-2 text-center text-sm text-zinc-400">{status}</p>
            {(phone.error || micError) && <p className="pb-2 text-sm text-rose-400">{phone.error ?? `Microphone: ${micError}`}</p>}
            {typing && (
              <input
                className="mb-3 rounded-full bg-zinc-900 px-4 py-2 text-sm outline-none"
                placeholder="Type what the staff member says, then Enter"
                value={typed}
                disabled={phone.busy !== null}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && typed.trim()) {
                    phone.staffSays(typed.trim());
                    setTyped("");
                  }
                }}
              />
            )}
            <div className="flex gap-2">
              <button className={`${button} flex-1 bg-rose-600`} disabled={phone.phase === "wrapping"} onClick={phone.hangUp}>End call</button>
              {canListen() && (
                <button className="px-2 text-xs text-zinc-500 underline" onClick={() => setTyping((t) => !t)}>{typing ? "Use voice" : "Type instead"}</button>
              )}
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
