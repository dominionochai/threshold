import type { Need, PlanStep } from "./types";

const PRIORITY: Record<Need, number> = {
  medical: 1,
  bed: 2,
  food: 3,
  legal: 4
};

const REASONS: Record<Need, string> = {
  medical: "Prioritize medical needs because delayed care can create immediate health risks.",
  bed: "Prioritize safe shelter next to reduce immediate exposure and instability.",
  food: "Address food needs after urgent health and shelter needs.",
  legal: "Address legal needs after immediate health, shelter, and food needs."
};

/** Order requested steps by urgency and attach the reason for each priority. */
export function orderSteps(needs: readonly Need[]): PlanStep[] {
  return needs
    .map((need, originalIndex) => ({
      step: { need, priority: PRIORITY[need], reason: REASONS[need] },
      originalIndex
    }))
    .sort(
      (left, right) =>
        left.step.priority - right.step.priority ||
        left.originalIndex - right.originalIndex
    )
    .map(({ step }) => step);
}
