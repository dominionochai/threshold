import { IconBus, IconCar, IconWalk, IconX } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import type { Resource } from "@shared/engine/resource";
import { directionsUrl, miles, type TravelMode } from "@/lib/format";

const MODES: { mode: TravelMode; label: string; icon: typeof IconWalk }[] = [
  { mode: "walking", label: "Walk", icon: IconWalk },
  { mode: "transit", label: "Transit", icon: IconBus },
  { mode: "driving", label: "Drive", icon: IconCar },
];

/** Real turn-by-turn lives in Maps. We hand the trip over and don't guess at times or streets. */
export function DirectionsSheet({ place, distanceKm, onClose }: { place: Pick<Resource, "name" | "address">; distanceKm: number | null; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Close" onClick={onClose} className="th-fade absolute inset-0 bg-black/70" />
      <div role="dialog" aria-modal="true" aria-labelledby="dir-title" className="th-sheet relative w-full max-w-[460px] rounded-t-[28px] border border-b-0 border-th-line bg-th-surface px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-th-line" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="dir-title" className="text-[24px] font-semibold leading-tight tracking-[-0.02em]">
              Get there
            </h2>
            <p className="pt-0.5 text-[17px] font-medium">{place.name}</p>
            <p className="text-[16px] text-th-muted">{place.address}</p>
            {distanceKm !== null ? <p className="pt-1 text-[15px] text-th-muted">{miles(distanceKm)} in a straight line. The route is longer.</p> : null}
          </div>
          <button ref={close} onClick={onClose} aria-label="Close" className="th-press flex size-12 shrink-0 items-center justify-center rounded-full bg-th-raised focus-visible:outline-2 focus-visible:outline-th-amber">
            <IconX className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2.5 pt-5">
          {MODES.map(({ mode, label, icon: Icon }) => (
            <a key={mode} href={directionsUrl(place.address, mode)} target="_blank" rel="noreferrer" className="th-press flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-th-line bg-th-raised text-[16px] font-medium focus-visible:outline-2 focus-visible:outline-th-amber">
              <Icon className="size-6" aria-hidden="true" />
              {label}
            </a>
          ))}
        </div>
        <p className="pt-4 text-center text-[14px] text-th-muted">Opens Maps with turn-by-turn directions.</p>
      </div>
    </div>
  );
}
