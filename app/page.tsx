"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Need = "food" | "bed" | "medical" | "legal";
type ApiResponse = { id?: unknown; error?: unknown };

const CHILD_COUNTS = Array.from({ length: 8 }, (_, index) => index + 1);
const AGES = Array.from({ length: 18 }, (_, age) => age);
const NEED_OPTIONS: { value: Need; label: string; detail: string }[] = [
  { value: "food", label: "Food", detail: "Something to eat" },
  { value: "bed", label: "A safe place to sleep", detail: "A bed for tonight" },
  { value: "medical", label: "Medical care", detail: "Health or urgent care" },
  { value: "legal", label: "Legal support", detail: "Help with legal needs" },
];
const LOCATIONS = [
  "Nairobi — Kibera",
  "Nairobi — Eastlands",
  "Nairobi — Mathare",
  "Mombasa — Likoni",
  "Mombasa — Mvita",
  "Kisumu — Manyatta",
];
const LANGUAGES = ["English", "Kiswahili", "Somali", "Arabic"];

export default function HomePage() {
  const router = useRouter();
  const [childCount, setChildCount] = useState<number | null>(null);
  const [children, setChildren] = useState<Array<number | null>>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function chooseChildCount(count: number) {
    setChildCount(count);
    setChildren((current) => [
      ...current.slice(0, count),
      ...Array.from({ length: Math.max(0, count - current.length) }, () => null),
    ]);
    setError("");
  }

  function chooseAge(childIndex: number, age: number) {
    setChildren((current) =>
      current.map((selectedAge, index) => index === childIndex ? age : selectedAge),
    );
    setError("");
  }

  function toggleNeed(need: Need) {
    setNeeds((current) => current.includes(need)
      ? current.filter((selected) => selected !== need)
      : [...current, need]);
  }

  async function submitIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (childCount === null) {
      setError("Please choose how many children need support tonight.");
      return;
    }
    if (children.length !== childCount || children.some((age) => age === null)) {
      setError("Please choose an age for each child.");
      return;
    }
    if (!location) {
      setError("Please choose a city or area to continue.");
      return;
    }
    if (!language) {
      setError("Please choose a language to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          children: children.filter((age): age is number => age !== null),
          needs,
          location,
          language,
        }),
      });
      const payload: unknown = await response.json();
      const data: ApiResponse = typeof payload === "object" && payload !== null
        ? payload as ApiResponse
        : {};

      if (!response.ok) {
        throw new Error(typeof data.error === "string"
          ? data.error
          : "We could not save your answers. Please try again.");
      }
      if (typeof data.id !== "string" || data.id.trim().length === 0) {
        throw new Error("We could not confirm your next step. Please try again.");
      }
      router.push(`/case/${encodeURIComponent(data.id)}`);
    } catch (submitError) {
      setError(submitError instanceof Error
        ? submitError.message
        : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="site-header">
        <a className="brand" href="#main" aria-label="Threshold home">
          <span className="brand-mark" aria-hidden="true">T</span>
          <span className="brand-name">Threshold</span>
        </a>
        <span className="header-note">A calm first step</span>
      </header>

      <main id="main" className="main-content">
        <div className="intro">
          <p className="eyebrow">START HERE</p>
          <h1>What would help tonight?</h1>
          <p className="intro-copy">
            You can keep this simple. Choose what applies; there is no written
            explanation to fill in.
          </p>
          <p className="number-note">
            Numbers shown here are caregiver-selected ages or counts derived
            from your choices. Nothing is estimated.
          </p>
        </div>

        <form className="intake-card" onSubmit={submitIntake} noValidate>
          <fieldset className="form-section">
            <legend className="section-title">How many children need support tonight?</legend>
            <p className="section-hint">
              Choose the caregiver-selected count. You will choose each child’s age next.
            </p>
            <div className="count-grid" role="group" aria-label="Caregiver-selected child count">
              {CHILD_COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  className="count-button"
                  aria-pressed={childCount === count}
                  aria-label={`Caregiver-selected count: ${count} ${count === 1 ? "child" : "children"}`}
                  onClick={() => chooseChildCount(count)}
                >
                  <span className="count-number" aria-hidden="true">{count}</span>
                  <span className="count-label">{count === 1 ? "child" : "children"}</span>
                </button>
              ))}
            </div>
            {childCount !== null && (
              <p className="selection-note" aria-live="polite">
                Caregiver-selected count: {childCount} {childCount === 1 ? "child" : "children"}.
              </p>
            )}
          </fieldset>

          {childCount !== null && (
            <section className="form-section child-section" aria-labelledby="ages-heading">
              <h2 id="ages-heading" className="section-title">Choose each child’s age</h2>
              <p className="section-hint">
                Select age in completed years. Each age is chosen by the caregiver;
                child order is derived from the count you selected.
              </p>
              <div className="child-list">
                {children.map((selectedAge, childIndex) => (
                  <fieldset className="child-age-panel" key={childIndex}>
                    <legend className="child-title">
                      Child {childIndex + 1} — age chosen by caregiver
                    </legend>
                    <div className="age-grid" role="group" aria-label={`Caregiver-selected age in years for child ${childIndex + 1}`}>
                      {AGES.map((age) => (
                        <button
                          key={age}
                          type="button"
                          className={`age-chip${selectedAge === age ? " is-selected" : ""}`}
                          aria-pressed={selectedAge === age}
                          aria-label={`Age ${age} years, caregiver-selected for child ${childIndex + 1}`}
                          onClick={() => chooseAge(childIndex, age)}
                        >
                          {age}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </section>
          )}

          <fieldset className="form-section">
            <legend className="section-title">What is needed tonight?</legend>
            <p className="section-hint">Choose any that apply. You can leave these unselected.</p>
            <div className="need-grid">
              {NEED_OPTIONS.map((need) => {
                const selected = needs.includes(need.value);
                return (
                  <button
                    key={need.value}
                    type="button"
                    className="need-button"
                    aria-pressed={selected}
                    aria-label={`${need.label}: ${selected ? "selected" : "not selected"}`}
                    onClick={() => toggleNeed(need.value)}
                  >
                    <span className="need-indicator" aria-hidden="true">{selected ? "✓" : "+"}</span>
                    <span className="need-copy">
                      <span className="need-label">{need.label}</span>
                      <span className="need-detail">{need.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="form-section select-section">
            <label className="section-title" htmlFor="location">City or area</label>
            <p className="section-hint" id="location-hint">
              Choose from the list only. The first option clears your selection.
            </p>
            <div className="select-wrap">
              <select
                id="location"
                name="location"
                value={location}
                aria-describedby="location-hint"
                aria-invalid={Boolean(error && !location)}
                onChange={(event) => { setLocation(event.target.value); setError(""); }}
              >
                <option value="">Not selected — choose or clear</option>
                {LOCATIONS.map((place) => <option key={place} value={place}>{place}</option>)}
              </select>
            </div>
          </div>

          <div className="form-section select-section">
            <label className="section-title" htmlFor="language">Preferred language</label>
            <p className="section-hint" id="language-hint">
              Choose the language that feels easiest for you.
            </p>
            <div className="select-wrap">
              <select
                id="language"
                name="language"
                value={language}
                aria-describedby="language-hint"
                aria-invalid={Boolean(error && !language)}
                onChange={(event) => { setLanguage(event.target.value); setError(""); }}
              >
                <option value="">Choose a language</option>
                {LANGUAGES.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="error-message" role="alert">{error}</p>}

          <div className="submit-area">
            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving your answers…" : "Continue"}
            </button>
            <p className="submit-note">
              Your choices help prepare the next step. You are in control of what you share.
            </p>
          </div>
        </form>

        <footer className="page-footer">You can change your choices before continuing.</footer>
      </main>
    </div>
  );
}
