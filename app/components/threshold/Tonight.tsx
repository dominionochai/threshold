import { useActionMutation } from "@agent-native/core/client/hooks";
import { IconAlertTriangle, IconCheck, IconChevronRight, IconHelp, IconInfoCircle, IconMapPin, IconNavigation, IconPhoneCall, IconShieldCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { findNeighborhood } from "@shared/data/neighborhoods";
import { resources } from "@shared/data/resources";
import { cityHelp } from "@shared/engine/call";
import { distanceKm } from "@shared/engine/geo";
import type { Resource } from "@shared/engine/resource";
import type { ScoutResult } from "@shared/engine/scout";
import { NEED_LABEL, type Approval, type CaseRecord, type CaseStep, type Need } from "@shared/engine/types";
import { mapsUrl, miles } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BottomSheet, type Detent } from "./BottomSheet";
import { DirectionsSheet } from "./DirectionsSheet";
import { RouteMap } from "./RouteMap";
import { TeamFeed } from "./TeamFeed";
import { Chip, PrimaryButton, QuietButton } from "./ui";

export type Plan = Partial<Record<Need, { options: ScoutResult[] }>>;

/** How much of the sheet shows at rest: the label, the place, and the one button. */
const PEEK = 292;
const FALLBACK_START = { lat: 40.7128, lng: -74.006 };

const time12 = (hhmm: string) => {
  const hour = Number(hhmm.slice(0, 2));
  const minutes = hhmm.slice(3);
  return `${hour % 12 || 12}${minutes === "00" ? "" : `:${minutes}`} ${hour < 12 ? "AM" : "PM"}`;
};

type State = "pending" | "confirmed" | "declined" | "waiting";

function stateOf(step: CaseStep, approvals: Approval[]): State {
  if (approvals.some((a) => a.stepId === step.id && a.status === "pending")) return "pending";
  if (step.status === "confirmed") return "confirmed";
  if (step.status === "declined") return "declined";
  return "waiting";
}

function StateChip({ state }: { state: State }) {
  if (state === "confirmed")
    return (
      <Chip tone="open" icon={<IconCheck className="size-3.5" />}>
        Sorted
      </Chip>
    );
  if (state === "pending") return <Chip tone="amber">Needs your yes</Chip>;
  if (state === "declined")
    return (
      <Chip tone="closed" icon={<IconX className="size-3.5" />}>
        Not confirmed
      </Chip>
    );
  return <Chip>Ready</Chip>;
}

function OptionCard({ r, primary, busy, onAsk }: { r: ScoutResult; primary: boolean; busy: boolean; onAsk: () => void }) {
  const { resource, openness } = r;
  const Action = primary ? PrimaryButton : QuietButton;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[22px] font-semibold leading-tight tracking-[-0.01em]">{resource.name}</p>
        <p className="flex items-start gap-1.5 pt-1 text-[15px] text-th-muted">
          <IconMapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {resource.address}
        </p>
      </div>
      <Action onClick={onAsk} disabled={busy}>
        <IconPhoneCall className="size-5" aria-hidden="true" />
        Call them for me
      </Action>
      <div className="flex flex-wrap gap-1.5">
        {openness.status === "open" ? (
          <Chip tone="open" icon={<IconCheck className="size-3.5" />}>
            {openness.closes ? `Open until ${time12(openness.closes)}` : "Open 24 hours"}
          </Chip>
        ) : openness.status === "closed" ? (
          <Chip tone="closed" icon={<IconX className="size-3.5" />}>
            Closed now
          </Chip>
        ) : (
          <Chip dashed icon={<IconHelp className="size-3.5" />}>
            Hours unknown
          </Chip>
        )}
        <Chip>{miles(r.distanceKm)}</Chip>
        {r.verified ? (
          <Chip icon={<IconShieldCheck className="size-3.5" />}>Checked {resource.verifiedAt}</Chip>
        ) : (
          <Chip dashed icon={<IconHelp className="size-3.5" />}>
            Not yet checked
          </Chip>
        )}
      </div>
      {r.note ? (
        <p className="flex gap-2 text-[15px] leading-snug text-th-muted">
          <IconInfoCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {r.note}
        </p>
      ) : null}
      {r.conflict ? (
        <p className="flex gap-2 rounded-xl border border-th-amber/50 bg-th-amber/10 p-2.5 text-[15px] leading-snug text-th-amber">
          <IconAlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Sources disagree.</span> {r.conflict}
          </span>
        </p>
      ) : null}
      <a href={resource.sourceUrl} target="_blank" rel="noreferrer" className="block text-center text-[14px] text-th-muted underline underline-offset-2">
        See the source
      </a>
    </div>
  );
}

/** The honest end of the road: the city line, with no promises we can't keep. */
function Help311({ record, need }: { record: CaseRecord; need: Need }) {
  const label = NEED_LABEL[need].toLowerCase();
  return (
    <div className="th-in space-y-3">
      <p className="text-[22px] font-semibold leading-tight tracking-[-0.01em]">{need === "bed" ? "We couldn't confirm a bed yet." : `We couldn't confirm ${label} yet.`}</p>
      <p className="text-[17px] leading-snug text-th-muted">{cityHelp(record, need)}</p>
      <a href="tel:311" className="th-press flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-th-amber text-[17px] font-semibold text-th-ink">
        <IconPhoneCall className="size-5" aria-hidden="true" />
        Call 311
      </a>
      {need === "medical" ? (
        <a href="tel:911" className="block text-center text-[15px] font-medium text-th-text underline underline-offset-2">
          Emergency? Call 911
        </a>
      ) : null}
    </div>
  );
}

type Focus = {
  step: CaseStep;
  state: State;
  pending: Approval | undefined;
  decided: Approval | undefined;
  top: ScoutResult | undefined;
  rest: ScoutResult[];
  place: Resource | null;
};

function focusOf(record: CaseRecord, step: CaseStep, plan: Plan | undefined): Focus {
  const state = stateOf(step, record.approvals);
  const forStep = record.approvals.filter((a) => a.stepId === step.id);
  const pending = forStep.find((a) => a.status === "pending");
  const decided = forStep.find((a) => a.status === "approved" && a.outcome === "confirmed");
  const tried = new Set(forStep.filter((a) => a.outcome === "declined").map((a) => a.resourceId));
  const [top, ...rest] = (plan?.[step.need]?.options ?? []).filter((o) => !tried.has(o.resource.id));
  const byId = (id: string | undefined) => resources.find((r) => r.id === id) ?? null;
  const place = state === "pending" ? byId(pending?.resourceId) : state === "confirmed" ? byId(decided?.resourceId) : (top?.resource ?? null);
  return { step, state, pending, decided, top, rest, place };
}

function FocusBlock({ record, focus, plan, isNext, busy, onAsk, onOpen, onDirections }: { record: CaseRecord; focus: Focus; plan: Plan | undefined; isNext: boolean; busy: boolean; onAsk: (resourceId: string) => void; onOpen: (approvalId: string) => void; onDirections: () => void }) {
  const { state, pending, decided, top, rest, place } = focus;
  return (
    <div className="space-y-3">
      {state === "pending" && pending && place ? (
        <div className="th-in space-y-3">
          <p className="text-[22px] font-semibold leading-tight tracking-[-0.01em]">Caller is ready to call {place.name}.</p>
          <p className="text-[17px] leading-snug text-th-muted">Nothing is sent until you say yes. Read it first.</p>
          <PrimaryButton onClick={() => onOpen(pending.id)}>
            <IconPhoneCall className="size-5" aria-hidden="true" />
            Review the call
          </PrimaryButton>
        </div>
      ) : null}

      {state === "confirmed" && place ? (
        <div className="th-in space-y-3">
          <p className="text-[22px] font-semibold leading-tight tracking-[-0.01em]">{place.name} said yes.</p>
          <p className="flex items-start gap-1.5 text-[16px] text-th-muted">
            <IconMapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {place.address}
          </p>
          <PrimaryButton onClick={onDirections}>
            <IconNavigation className="size-5" aria-hidden="true" />
            Get directions
          </PrimaryButton>
          <div className="grid grid-cols-2 gap-2">
            <a href={mapsUrl(place.address)} target="_blank" rel="noreferrer" className="th-press flex min-h-12 items-center justify-center rounded-2xl border border-th-line bg-th-raised text-[16px] font-medium">
              Open in Maps
            </a>
            {decided ? (
              <QuietButton className="min-h-12 text-[16px]" onClick={() => onOpen(decided.id)}>
                See the call
              </QuietButton>
            ) : null}
          </div>
          {place.note ? <p className="text-[15px] leading-snug text-th-muted">{place.note}</p> : null}
        </div>
      ) : null}

      {state === "declined" ? <Help311 record={record} need={focus.step.need} /> : null}

      {state === "waiting" || state === "declined" ? (
        !plan ? (
          <p className="text-[15px] text-th-muted">Looking…</p>
        ) : !top ? (
          state === "waiting" ? <Help311 record={record} need={focus.step.need} /> : null
        ) : (
          <>
            {state === "declined" ? <p className="pt-1 text-[15px] font-medium text-th-muted">Another place to try</p> : null}
            <OptionCard r={top} primary={isNext && state === "waiting"} busy={busy} onAsk={() => onAsk(top.resource.id)} />
            {rest.length > 0 ? (
              <details>
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center rounded-2xl text-[16px] font-medium text-th-muted marker:hidden">
                  {rest.length} other {rest.length === 1 ? "place" : "places"}
                </summary>
                <ul className="divide-y divide-th-line">
                  {rest.slice(0, 3).map((r) => (
                    <li key={r.resource.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[17px] font-medium">{r.resource.name}</p>
                        <p className="text-[14px] text-th-muted">{miles(r.distanceKm)}</p>
                      </div>
                      <QuietButton className="min-h-12 w-auto shrink-0 px-4 text-[16px]" disabled={busy} onClick={() => onAsk(r.resource.id)}>
                        Call
                      </QuietButton>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}

/** Tonight is a map and a sheet. The map shows where; the sheet holds the one next thing to do. */
export function Tonight({ record, plan, onOpen }: { record: CaseRecord; plan: Plan | undefined; onOpen: (approvalId: string) => void }) {
  const requestCall = useActionMutation("request-call");
  const [detent, setDetent] = useState<Detent>(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [directions, setDirections] = useState(false);

  const states = record.steps.map((s) => stateOf(s, record.approvals));
  const sorted = states.filter((s) => s === "confirmed").length;
  const nextId = record.steps.find((_, i) => states[i] === "pending")?.id ?? record.steps.find((_, i) => states[i] === "waiting")?.id ?? record.steps[0]?.id;
  const focusStep = record.steps.find((s) => s.id === picked) ?? record.steps.find((s) => s.id === nextId);
  const focus = focusStep ? focusOf(record, focusStep, plan) : null;

  const home = findNeighborhood(record.location);
  const from = home ?? FALLBACK_START;
  const km = focus?.place ? distanceKm(from, focus.place) : null;
  const index = focusStep ? record.steps.indexOf(focusStep) : 0;

  function ask(stepId: string, resourceId: string) {
    requestCall.mutate({ stepId, resourceId }, { onSuccess: (data) => onOpen((data as { approvalId: string }).approvalId) });
  }

  return (
    <div className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] bottom-[calc(4rem+env(safe-area-inset-bottom))] mx-auto max-w-[460px] overflow-hidden">
      <div className="absolute inset-x-0 top-0" style={{ bottom: PEEK - 28 }}>
        <RouteMap from={from} fromLabel={record.location} to={focus?.place ?? null} toLabel={focus?.place ? focus.place.name.split(" (")[0] ?? null : null} />
      </div>

      {focus?.place && detent < 2 ? (
        <button onClick={() => setDirections(true)} className="th-press absolute end-4 top-4 flex min-h-12 items-center gap-2 rounded-full border border-th-line bg-th-surface/85 px-4 text-[16px] font-semibold text-th-amber backdrop-blur-xl focus-visible:outline-2 focus-visible:outline-th-amber">
          <IconNavigation className="size-5" aria-hidden="true" />
          Directions
        </button>
      ) : null}

      <BottomSheet detent={detent} onDetent={setDetent} peek={PEEK}>
        {focus ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] font-semibold text-th-muted">
                {NEED_LABEL[focus.step.need]} · {index + 1} of {record.steps.length}
              </p>
              <StateChip state={focus.state} />
            </div>

            <FocusBlock record={record} focus={focus} plan={plan} isNext={focus.step.id === nextId} busy={requestCall.isPending} onAsk={(rid) => ask(focus.step.id, rid)} onOpen={onOpen} onDirections={() => setDirections(true)} />

            {requestCall.error ? (
              <p role="alert" className="text-[15px] text-th-closed">
                {requestCall.error.message}
              </p>
            ) : null}

            {record.steps.length > 1 ? (
              <section aria-label="Everything tonight" className="space-y-3 border-t border-th-line pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] font-semibold">Tonight, {record.location}</h2>
                  <p className="text-[14px] text-th-muted">
                    {sorted} of {record.steps.length} sorted
                  </p>
                </div>
                <div className="flex gap-1.5" role="img" aria-label={`${sorted} of ${record.steps.length} sorted`}>
                  {states.map((s, i) => (
                    <span key={record.steps[i]?.id} className={cn("h-1.5 flex-1 rounded-full", s === "confirmed" ? "bg-th-open" : s === "pending" ? "bg-th-amber" : "bg-th-line")} />
                  ))}
                </div>
                <ul className="divide-y divide-th-line">
                  {record.steps.map((step, i) =>
                    step.id === focus.step.id ? null : (
                      <li key={step.id}>
                        <button
                          onClick={() => {
                            setPicked(step.id);
                            setDetent(0);
                          }}
                          className="th-press flex min-h-14 w-full items-center justify-between gap-3 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-th-amber"
                        >
                          <span className="text-[18px] font-medium">{NEED_LABEL[step.need]}</span>
                          <span className="flex items-center gap-2">
                            <StateChip state={states[i] ?? "waiting"} />
                            <IconChevronRight className="size-4 text-th-muted rtl:rotate-180" aria-hidden="true" />
                          </span>
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            ) : null}

            <TeamFeed record={record} />
          </div>
        ) : (
          <p className="text-[17px] text-th-muted">Nothing to do yet.</p>
        )}
      </BottomSheet>

      {directions && focus?.place ? <DirectionsSheet place={focus.place} distanceKm={km} onClose={() => setDirections(false)} /> : null}
    </div>
  );
}
