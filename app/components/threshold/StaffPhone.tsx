import { useEffect, useState, type ReactNode } from "react";
import type { ActiveCall } from "@shared/engine/types";
import { useDemoCall } from "./useDemoCall";

const HANDSET = "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z";

function Round({ color, label, hangUp, onClick }: { color: string; label?: string; hangUp?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 text-sm text-white" aria-label={label}>
      <span className="grid h-[72px] w-[72px] place-items-center rounded-full" style={{ background: color }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style={{ transform: hangUp ? "rotate(135deg)" : undefined }}>
          <path d={HANDSET} />
        </svg>
      </span>
      {label}
    </button>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-neutral-950">
      <div className="relative flex h-full max-h-[844px] w-full max-w-[390px] flex-col justify-between overflow-hidden bg-black px-8 pb-14 pt-24 text-center text-white sm:rounded-[48px] sm:border-[10px] sm:border-neutral-800">
        {children}
      </div>
    </div>
  );
}

const clock = (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
const timer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** The shelter's phone. It looks like a phone: a lock screen, an incoming call, a call in progress. */
export function StaffPhone({ call }: { call: ActiveCall | null }) {
  const phone = useDemoCall(call);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(tick);
  }, []);

  if (phone.phase === "ringing") {
    return (
      <Screen>
        <div>
          <h1 className="text-4xl font-light">Threshold</h1>
          <p className="mt-2 text-lg text-neutral-400">incoming call</p>
        </div>
        <div className="flex justify-between px-4">
          <Round color="#ff3b30" label="Decline" hangUp onClick={phone.decline} />
          <Round color="#34c759" label="Accept" onClick={() => void phone.accept()} />
        </div>
      </Screen>
    );
  }

  if (phone.phase === "connected" || phone.phase === "ended") {
    return (
      <Screen>
        <div>
          <h1 className="text-4xl font-light">Threshold</h1>
          <p className="mt-2 text-lg text-neutral-400">{phone.phase === "ended" ? "Call Ended" : timer(phone.seconds)}</p>
        </div>
        <div className="flex justify-center">
          {phone.phase === "connected" && <Round color="#ff3b30" hangUp onClick={phone.end} />}
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div>
        <p className="text-7xl font-extralight">{clock(now)}</p>
        <p className="mt-2 text-lg text-neutral-400">{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>
      {phone.voices === "missing" && <p className="text-sm text-red-400">Voice files missing. Run: pnpm demo:voice</p>}
    </Screen>
  );
}
