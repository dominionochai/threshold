"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import CallPanel from "./call-panel";

type Data = Record<string, any>;
function record(value: unknown): Data {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
}
function field(value: Data, keys: string[]): unknown {
  for (const key of keys) if (value[key] !== undefined && value[key] !== null && value[key] !== "") return value[key];
  return undefined;
}
function shown(value: unknown): string {
  if (value === undefined || value === null || value === "") return "unverified";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(shown).join(", ");
  return "unverified";
}
function sourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; }
  catch { return null; }
}
function errorMessage(value: unknown, fallback: string): string {
  const error = record(value).error;
  return typeof error === "string" && error.trim() ? error : fallback;
}
function draftValue(...values: unknown[]): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}
function ResourceCard({ resource, index, directory = false }: { resource: Data; index: number; directory?: boolean }) {
  const name = field(resource, ["name", "title"]);
  const link = sourceUrl(resource.sourceUrl ?? resource.source_url);
  return <article style={styles.card} aria-label={`${directory ? "Directory" : "Ranked resource"} ${index + 1}`}>
    <h3 style={styles.cardTitle}>{shown(name) === "unverified" ? "Name unverified" : shown(name)}</h3>
    <dl style={styles.details}>
      <div><dt>Distance <small>(plan-derived)</small></dt><dd>{shown(field(resource, ["distance", "distanceKm", "distance_km"]))}</dd></div>
      <div><dt>Child acceptance <small>(directory field; unverified)</small></dt><dd>{shown(field(resource, ["childAcceptance", "acceptsChildren", "childrenAccepted", "child_acceptance", "accepts_children"]))}</dd></div>
      <div><dt>Hours <small>(directory field; unverified)</small></dt><dd>{shown(field(resource, ["hours", "openingHours", "opening_hours"]))}</dd></div>
      <div><dt>Source</dt><dd>{link ? <a href={link} target="_blank" rel="noreferrer">Open source link</a> : "unverified"}</dd></div>
    </dl>
  </article>;
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const [caseRecord, setCaseRecord] = useState<Data | null>(null);
  const [plan, setPlan] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [draftEdited, setDraftEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState("");
  const [handoffError, setHandoffError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError(""); setCaseRecord(null); setPlan(null); setDraft(""); setDraftEdited(false); setHandoffMessage(""); setHandoffError("");
      if (!id) { setError("A case ID was not provided."); setLoading(false); return; }
      try {
        const response = await fetch("/api/cases");
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(errorMessage(payload, "Could not load cases."));
        const rows = Array.isArray(payload) ? payload : Array.isArray(record(payload).cases) ? record(payload).cases : [];
        const selected = rows.map(record).find((item: Data) => String(item.id ?? "") === id);
        if (!selected) throw new Error(rows.length === 0 ? "No cases are available." : "Case not found.");
        if (!active) return;
        setCaseRecord(selected);
        const initialDraft = draftValue(selected.draftMessage, selected.reviewDraft, selected.draft, record(selected.handoff).message);
        if (initialDraft) setDraft(initialDraft);
        const planResponse = await fetch(`/api/cases/${encodeURIComponent(id)}/plan`);
        const planPayload: unknown = await planResponse.json();
        if (!planResponse.ok) throw new Error(errorMessage(planPayload, "Could not load the case plan."));
        if (!active) return;
        const nextPlan = record(planPayload);
        setPlan(nextPlan);
        const suppliedDraft = draftValue(nextPlan.draftMessage, nextPlan.reviewDraft, nextPlan.draft, record(nextPlan.handoff).message, record(nextPlan.household).draftMessage);
        if (suppliedDraft) setDraft((current) => current || suppliedDraft);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load this case.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [id]);

  const ranked = useMemo(() => Array.isArray(plan?.rankedResources) ? plan.rankedResources.map(record) : [], [plan]);
  const directories = useMemo(() => Array.isArray(plan?.availableDirectories) ? plan.availableDirectories.map(record) : [], [plan]);
  const callTarget = ranked[0] ?? directories[0] ?? null;

  async function submit(decision: "approve" | "reject") {
    if (!id || submitting) return;
    setSubmitting(true); setHandoffError(""); setHandoffMessage("");
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(id)}/handoff`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, message: draft }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "Could not record the review decision."));
      setHandoffMessage(decision === "approve" ? "Handoff prepared — not sent" : "Handoff rejected.");
    } catch (submitError) {
      setHandoffError(submitError instanceof Error ? submitError.message : "Could not record the review decision.");
    } finally { setSubmitting(false); }
  }

  const evidence = record(caseRecord?.evidence);
  const gapsValue = plan?.claimGaps;
  const gaps = Array.isArray(gapsValue) ? gapsValue : gapsValue == null ? [] : [gapsValue];
  const evidenceItems = [["Meal records", evidence.mealRecords], ["Attendance days", evidence.attendanceDays], ["Allergy declarations", evidence.allergyDeclarations], ["ID documents", evidence.idDocuments]] as const;
  const hasSource = [...ranked, ...directories].some((item) => sourceUrl(item.sourceUrl ?? item.source_url));

  return <div style={styles.page}>
    <header style={styles.header}><p style={styles.eyebrow}>CASE REVIEW</p><h1 style={styles.heading}>Case detail</h1><p style={styles.lede}>Review the plan and available source information before preparing a handoff.</p></header>
    <main style={styles.main}>
      {loading && <p role="status" style={styles.notice}>Loading case and plan…</p>}
      {error && <p role="alert" style={styles.error}>{error}</p>}
      {caseRecord && <>
        {caseRecord.simulated === true && <p role="status" style={styles.simulated}>SIMULATED CASE DATA</p>}
        <section aria-labelledby="summary-heading" style={styles.panel}>
          <h2 id="summary-heading" style={styles.sectionTitle}>Case summary</h2>
          <dl style={styles.details}>
            <div><dt>Case ID</dt><dd>{shown(caseRecord.id)}</dd></div>
            <div><dt>Children <small>(case record)</small></dt><dd>{Array.isArray(caseRecord.children) ? caseRecord.children.length : "unverified"}</dd></div>
            <div><dt>Needs <small>(case record)</small></dt><dd>{shown(caseRecord.needs)}</dd></div>
            <div><dt>Language <small>(case record)</small></dt><dd>{shown(caseRecord.language)}</dd></div>
          </dl>
        </section>
        <section aria-labelledby="plan-heading" style={styles.panel}>
          <h2 id="plan-heading" style={styles.sectionTitle}>Plan</h2>
          {!plan && !loading && <p role="status">Plan details are unavailable.</p>}
          {plan && <>
            <h3 style={styles.subheading}>Ranked resources</h3>
            {ranked.length === 0 ? <p style={styles.notice}>No verified matching open resource. Available directories are listed separately and are not verified matches.</p> : <div style={styles.stack}>{ranked.map((item, index) => <ResourceCard key={String(item.id ?? item.name ?? index)} resource={item} index={index} />)}</div>}
            <h3 style={styles.subheading}>Available directories <small>(listed separately; not verified matches)</small></h3>
            {directories.length ? <div style={styles.stack}>{directories.map((item, index) => <ResourceCard key={String(item.id ?? item.name ?? index)} resource={item} index={index} directory />)}</div> : <p>No available directories were returned by the plan.</p>}
            <h3 style={styles.subheading}>Ordered next steps</h3>
            {Array.isArray(plan.steps) && plan.steps.length ? <ol style={styles.orderedList}>{plan.steps.map((rawStep: unknown, index: number) => {
              const step = record(rawStep);
              const titleValue = typeof rawStep === "string" ? rawStep : field(step, ["title", "action", "step", "label"]);
              const reason = typeof rawStep === "string" ? undefined : field(step, ["reason", "why", "rationale", "detail"]);
              return <li key={index} style={styles.step}><strong>{shown(titleValue) === "unverified" ? `Step ${index + 1}` : shown(titleValue)}</strong><p>Reason: {shown(reason) === "unverified" ? "Not provided by the plan." : shown(reason)}</p></li>;
            })}</ol> : <p>No ordered steps were returned by the plan.</p>}
          </>}
        </section>
        <section aria-labelledby="readiness-heading" style={styles.panel}>
          <h2 id="readiness-heading" style={styles.sectionTitle}>Claim readiness</h2>
          <p>These items reflect plan-listed gaps and case evidence flags; they do not establish eligibility.</p>
          <ol style={styles.orderedList}>
            {gaps.map((gap: unknown, index: number) => { const item = record(gap); const text = typeof gap === "string" ? gap : shown(field(item, ["label", "title", "description", "name", "reason"])); return <li key={`gap-${index}`} style={styles.step}>{text === "unverified" ? "Claim gap details unverified" : text}</li>; })}
            {evidenceItems.map(([label, value], index) => <li key={`evidence-${index}`} style={styles.step}>{label} evidence: {value === true ? "Evidence marked present" : value === false ? "Evidence marked missing" : "unverified"}</li>)}
          </ol>
          {gaps.length === 0 && <p>No claim gaps were listed by the plan.</p>}
        </section>
        <section aria-labelledby="call-heading" style={styles.panel}>
          <h2 id="call-heading" style={styles.sectionTitle}>Call and message draft</h2>
          <p>The speech transcript is held only in the call panel’s component state; it is not saved when the panel unmounts.</p>
          {callTarget && <CallPanel
            caseRecord={{ id: String(caseRecord.id ?? id), children: Array.isArray(caseRecord.children) ? caseRecord.children : [], needs: Array.isArray(caseRecord.needs) ? caseRecord.needs : [], language: typeof caseRecord.language === "string" ? caseRecord.language : "" }}
            resource={{ name: typeof field(callTarget, ["name", "title"]) === "string" ? String(field(callTarget, ["name", "title"])) : "Directory name unverified", sourceUrl: sourceUrl(callTarget.sourceUrl ?? callTarget.source_url) }}
            onDraftMessage={(text: string) => { setDraft(text); setDraftEdited(true); }}
          />}
          {!hasSource && <p role="status" style={styles.notice}>No source-backed directory available.</p>}
          <div style={styles.reviewBox}>
            <label htmlFor="handoff-draft" style={styles.label}>Human review draft</label>
            <p id="draft-help">{draft ? "Review or edit this message before submitting a decision." : "No existing draft was supplied. This editable draft is blank; enter a message only if you choose."}</p>
            <textarea id="handoff-draft" aria-describedby="draft-help" value={draft} onChange={(event) => { setDraft(event.target.value); setDraftEdited(true); }} rows={6} style={styles.textarea} />
            {draftEdited && <p>Draft text is submitted only with the review decision below.</p>}
            <div style={styles.buttonRow}>
              <button type="button" style={styles.primaryButton} disabled={submitting || loading} onClick={() => void submit("approve")}>{submitting ? "Submitting…" : "Approve handoff"}</button>
              <button type="button" style={styles.secondaryButton} disabled={submitting || loading} onClick={() => void submit("reject")}>Reject handoff</button>
            </div>
            {handoffMessage && <p role="status" aria-live="polite" style={styles.success}>{handoffMessage}</p>}
            {handoffError && <p role="alert" style={styles.error}>{handoffError}</p>}
          </div>
        </section>
      </>}
    </main>
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "#f6f5f1", color: "#202522", padding: "24px 16px 56px" },
  header: { maxWidth: 760, margin: "0 auto 20px" }, eyebrow: { fontSize: 12, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 6 },
  heading: { fontSize: "clamp(1.8rem, 7vw, 2.5rem)", lineHeight: 1.15, margin: "0 0 8px" }, lede: { lineHeight: 1.55, margin: 0 },
  main: { display: "grid", gap: 16, maxWidth: 760, margin: "0 auto" }, panel: { background: "#fff", border: "1px solid #d9ddd8", borderRadius: 14, padding: "18px clamp(14px, 4vw, 24px)", overflowWrap: "anywhere" },
  sectionTitle: { fontSize: "1.35rem", margin: "0 0 14px" }, subheading: { fontSize: "1.05rem", margin: "20px 0 10px" }, stack: { display: "grid", gap: 10 },
  card: { border: "1px solid #d9ddd8", borderRadius: 10, padding: 14, background: "#fcfcfb" }, cardTitle: { fontSize: "1rem", margin: "0 0 10px" },
  details: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: "10px 16px", margin: 0 }, orderedList: { paddingLeft: 24, margin: 0 }, step: { padding: "6px 0", lineHeight: 1.5 },
  notice: { background: "#fff8e7", border: "1px solid #e3c978", padding: 12, borderRadius: 8 }, error: { background: "#fff0ee", border: "1px solid #b94b3b", padding: 12, borderRadius: 8 },
  simulated: { background: "#fff1d6", border: "2px solid #8a5414", padding: 12, borderRadius: 8, fontWeight: 800, textAlign: "center" }, reviewBox: { marginTop: 18, borderTop: "1px solid #d9ddd8", paddingTop: 16 },
  label: { display: "block", fontWeight: 700, marginBottom: 6 }, textarea: { display: "block", width: "100%", minHeight: 140, padding: 12, borderRadius: 8, border: "1px solid #66736c", font: "inherit", lineHeight: 1.5, resize: "vertical" },
  buttonRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }, primaryButton: { background: "#1f5141", color: "#fff", border: 0, borderRadius: 8, padding: "11px 16px", font: "inherit", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#24352d", border: "1px solid #536b5f", borderRadius: 8, padding: "11px 16px", font: "inherit", fontWeight: 700, cursor: "pointer" }, success: { background: "#edf7ef", border: "1px solid #74a87e", padding: 12, borderRadius: 8 },
};
