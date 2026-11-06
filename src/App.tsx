import React, { useEffect, useState } from "react";
import { getCaseState, createCaseAction, logEventAction, updateEvidenceAction, updateStepStatusAction } from "./actions/case-actions";
import { findClaimGaps } from "./engine/claim";
import { resources } from "./data/resources.seed";
import { tokens } from "./design-tokens";
import type { CaseRecord } from "./engine/types";

export default function App() {
  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [newEventDesc, setNewEventDesc] = useState("");
  const [borough, setBorough] = useState("Brooklyn");

  const loadState = async () => {
    try {
      const state = await getCaseState();
      setCaseData(state);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCaseAction.run({ location: borough, childrenAges: [7, 11], language: "English" }, { caller: "frontend" });
    await loadState();
  };

  const handleLogEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventDesc.trim()) return;
    const res = await logEventAction.run({ type: "UI_MANUAL_LOG", description: newEventDesc }, { caller: "frontend" });
    setCaseData(res.case);
    setNewEventDesc("");
  };

  const handleToggleEvidence = async (req: string) => {
    const verified = caseData?.evidence[req as keyof typeof caseData.evidence] === true;
    const res = await updateEvidenceAction.run({ requirement: req as any, verified: !verified }, { caller: "frontend" });
    setCaseData(res.case);
  };

  const handleStepStatus = async (stepId: string, status: "waiting" | "calling" | "confirmed" | "declined") => {
    const res = await updateStepStatusAction.run({ stepId, status }, { caller: "frontend" });
    setCaseData(res.case);
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center font-mono text-sm">Loading case record storage...</div>;
  }

  if (!caseData) {
    return (
      <div className={`min-h-screen ${tokens.background} ${tokens.textPrimary} p-4 sm:p-12 ${tokens.font} flex items-center justify-center`}>
        <div className={`max-w-md w-full p-6 rounded-2xl ${tokens.surface} space-y-6`}>
          <div>
            <h1 className="text-xl font-bold tracking-tight">THRESHOLD</h1>
            <p className={`text-xs ${tokens.textSecondary} mt-1`}>New York City · ACCESS HRA & Tonight's Crisis Record</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 space-y-2">
            <p className="font-semibold text-zinc-300">Honest Empty State</p>
            <p>No active case record exists in storage. Seed nothing fake. Initialize a household case below to begin tracking tonight's crisis and SNAP claim.</p>
          </div>
          <form onSubmit={handleCreateCase} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Select NYC Borough</label>
              <select
                value={borough}
                onChange={(e) => setBorough(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Manhattan">Manhattan</option>
                <option value="Brooklyn">Brooklyn</option>
                <option value="Queens">Queens</option>
                <option value="Bronx">Bronx</option>
                <option value="Staten Island">Staten Island</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 text-zinc-950 font-semibold text-sm rounded-lg hover:bg-amber-400 transition"
            >
              Initialize Household Case
            </button>
          </form>
        </div>
      </div>
    );
  }

  const gaps = findClaimGaps(caseData.evidence);

  return (
    <div className={`min-h-screen ${tokens.background} ${tokens.textPrimary} p-4 sm:p-8 ${tokens.font}`}>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header & Two-Threshold Progress Motif */}
        <header className="border-b border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">THRESHOLD</h1>
              <p className={`text-sm ${tokens.textSecondary}`}>New York City · ACCESS HRA & Tonight's Crisis Record</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800">Clock 1: Tonight's Crisis</span>
              <span className="text-zinc-600">→</span>
              <span className="px-2.5 py-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">Clock 2: SNAP Claim</span>
            </div>
          </div>
        </header>

        {/* Household Section */}
        <section className={`p-5 rounded-xl ${tokens.surface}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Household Profile</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="block text-zinc-500 text-xs">Borough</span>
              <span className="font-medium">{caseData.location}</span>
            </div>
            <div>
              <span className="block text-zinc-500 text-xs">Children Ages</span>
              <span className="font-medium">{caseData.children.join(", ")} years</span>
            </div>
            <div>
              <span className="block text-zinc-500 text-xs">Language</span>
              <span className="font-medium">{caseData.language}</span>
            </div>
            <div>
              <span className="block text-zinc-500 text-xs">Storage Backend</span>
              <span className="font-medium text-emerald-400">Agent-Native Database</span>
            </div>
          </div>
        </section>

        {/* Crisis Steps & Outreach Status */}
        <section className={`p-5 rounded-xl ${tokens.surface}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Tonight's Crisis Steps (Clock 1)</h2>
          <div className="space-y-3">
            {caseData.steps.map((step) => {
              const res = resources.find(r => r.kind === step.need);
              return (
                <div key={step.id} className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">{step.need}</span>
                      <span className="font-medium text-sm">{res ? res.name : "Local Resource"}</span>
                    </div>
                    {res && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {res.address} · <a href={res.sourceUrl} target="_blank" rel="noreferrer" className="underline text-amber-400">Source Directory</a>
                        {res.phone && ` · ${res.phone}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(["waiting", "calling", "confirmed", "declined"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStepStatus(step.id, st)}
                        className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                          step.status === st ? "bg-amber-500 text-zinc-950 font-bold" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SNAP Claim Gaps & Evidence (Clock 2) */}
        <section className={`p-5 rounded-xl ${tokens.surface}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">SNAP Claim Readiness Gaps (Clock 2)</h2>
            <span className="text-xs font-mono text-amber-400">{gaps.length} Gaps Remaining</span>
          </div>
          <div className="space-y-2">
            {[
              { key: "householdMembersId", label: "ID for all household members" },
              { key: "residenceProof", label: "Proof of residence or shelter status" },
              { key: "incomeProof", label: "Income documentation" },
              { key: "householdComposition", label: "Household composition details" },
              { key: "deadlinesNote", label: "Deadlines Acknowledgment (10-day doc, 7-day interview, 30-day determination)" },
            ].map(({ key, label }) => {
              const verified = caseData.evidence[key as keyof typeof caseData.evidence] === true;
              return (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/50 text-sm">
                  <span className={verified ? "line-through text-zinc-500" : "text-zinc-200"}>{label}</span>
                  <button
                    onClick={() => handleToggleEvidence(key)}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      verified ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {verified ? "Verified" : "Mark Verified"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Activity Trail & Event Ledger */}
        <section className={`p-5 rounded-xl ${tokens.surface}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Activity Trail & Claim Evidence Ledger</h2>
          
          <form onSubmit={handleLogEvent} className="mb-4 flex gap-2">
            <input
              type="text"
              value={newEventDesc}
              onChange={(e) => setNewEventDesc(e.target.value)}
              placeholder="Log note, call outcome, or document update..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 text-zinc-950 font-semibold text-sm rounded-lg hover:bg-amber-400 transition"
            >
              Log Event
            </button>
          </form>

          <div className="space-y-2 font-mono text-xs max-h-60 overflow-y-auto">
            {caseData.events.map((ev) => (
              <div key={ev.id} className="p-2.5 rounded bg-zinc-950/60 border border-zinc-800/40 flex items-start justify-between gap-4">
                <div>
                  <span className="text-amber-400 font-bold">[{ev.type}]</span> <span className="text-zinc-300">{ev.description}</span>
                </div>
                <span className="text-zinc-600 text-[10px] whitespace-nowrap">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
