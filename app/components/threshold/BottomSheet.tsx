import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 0 = peek (the next action), 1 = half, 2 = full. */
export type Detent = 0 | 1 | 2;

const RUBBER = 0.28;
/** Apple's deceleration: how far a flick carries on its own. */
const project = (velocityPxPerS: number) => (velocityPxPerS / 1000) * (0.998 / (1 - 0.998));

/**
 * A three-stop sheet. It follows the finger 1:1, rubber-bands past its ends,
 * lands where a flick would carry it, and can be grabbed again mid-flight.
 */
export function BottomSheet({ detent, onDetent, peek, children }: { detent: Detent; onDetent: (d: Detent) => void; peek: number; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const gesture = useRef<{ startY: number; startOffset: number; at: number; samples: { y: number; t: number }[]; moved: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visible = [peek, Math.max(height * 0.6, peek + 140), height];
  const offsets = visible.map((v) => Math.max(0, height - v));
  const rest = offsets[detent] ?? 0;
  const y = drag ?? rest;

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const f = frame.current?.getBoundingClientRect();
      const s = sheet.current?.getBoundingClientRect();
      // Read where the sheet is right now, so a grab mid-flight does not jump.
      const startOffset = f && s ? s.top - f.top : rest;
      gesture.current = { startY: e.clientY, startOffset, at: performance.now(), samples: [{ y: e.clientY, t: performance.now() }], moved: false };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDrag(startOffset);
    },
    [rest],
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      const delta = e.clientY - g.startY;
      if (Math.abs(delta) > 6) g.moved = true;
      if (!g.moved) return;
      g.samples = [...g.samples.slice(-4), { y: e.clientY, t: performance.now() }];
      const raw = g.startOffset + delta;
      const top = offsets[2] ?? 0;
      const bottom = offsets[0] ?? 0;
      setDrag(raw < top ? top + (raw - top) * RUBBER : raw > bottom ? bottom + (raw - bottom) * RUBBER : raw);
    },
    [offsets],
  );

  const onUp = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g) return;
      if (!g.moved) {
        setDrag(null);
        onDetent(detent === 2 ? 1 : ((detent + 1) as Detent));
        return;
      }
      const first = g.samples[0];
      const last = g.samples[g.samples.length - 1];
      const dt = first && last ? Math.max(last.t - first.t, 1) : 1;
      const velocity = first && last ? ((last.y - first.y) / dt) * 1000 : 0;
      const landing = (drag ?? g.startOffset) + project(velocity);
      let best: Detent = 0;
      offsets.forEach((o, i) => {
        if (Math.abs(o - landing) < Math.abs((offsets[best] ?? 0) - landing)) best = i as Detent;
      });
      setDrag(null);
      onDetent(best);
      void e;
    },
    [detent, drag, offsets, onDetent],
  );

  useEffect(() => {
    // A resize or a new peek height re-seats the sheet without animating through a drag.
    setDrag((d) => (gesture.current ? d : null));
  }, [height, peek]);

  return (
    <div ref={frame} className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={sheet}
        style={{ height, transform: `translateY(${y}px)`, transition: drag === null ? "transform 380ms cubic-bezier(0.32, 0.72, 0, 1)" : "none" }}
        className="pointer-events-auto absolute inset-x-0 top-0 flex flex-col rounded-t-[28px] border border-b-0 border-th-line bg-th-surface/92 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl motion-reduce:!transition-none"
      >
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="button"
          tabIndex={0}
          aria-label={detent === 2 ? "Make this smaller" : "Show more"}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "Enter") onDetent(Math.min(2, detent + 1) as Detent);
            if (e.key === "ArrowDown") onDetent(Math.max(0, detent - 1) as Detent);
          }}
          className="flex h-8 shrink-0 cursor-grab touch-none items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-th-amber active:cursor-grabbing"
        >
          <span className="h-1 w-10 rounded-full bg-th-line" aria-hidden="true" />
        </div>
        <div className={cn("min-h-0 flex-1 overscroll-contain px-4 pb-6", detent === 2 ? "overflow-y-auto" : "overflow-hidden")}>{children}</div>
      </div>
    </div>
  );
}
