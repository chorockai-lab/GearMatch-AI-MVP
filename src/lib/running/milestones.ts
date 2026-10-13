// Milestone definitions.
//
// ⚠ CONFIRMATION NEEDED — no approved document defines the exact FIRST 10K condition.
// PRODUCT_MVP v1.8 §9.3 only lists examples (FIRST RUN, FIRST 5K, FIRST 10K, 3 RUNS, 10 KM TOTAL).
// The rule below is a placeholder so the UI can be wired; it is NOT used for real data until confirmed
// (ENABLED = false). Edit/delete handling of a milestone run is also undecided.
import type { MilestoneEvent, RunRecord } from "./types";

export const MILESTONES_ENABLED = false;

export interface MilestoneRule {
  code: string;
  label: string;
  /** returns true when `run` (just saved) achieves the milestone given the runs saved before it */
  test: (run: RunRecord, previous: RunRecord[]) => boolean;
  confirmed: boolean;
}

export const MILESTONE_RULES: MilestoneRule[] = [
  {
    code: "FIRST_10K",
    label: "FIRST 10K",
    // placeholder: first single run with distance ≥ 10.0 km
    test: (run, prev) => run.distanceKm >= 10 && !prev.some((r) => r.distanceKm >= 10),
    confirmed: false,
  },
];

export function detectMilestones(run: RunRecord, previous: RunRecord[]): MilestoneEvent[] {
  if (!MILESTONES_ENABLED) return [];
  return MILESTONE_RULES.filter((m) => m.confirmed && m.test(run, previous)).map((m) => ({
    code: m.code,
    label: m.label,
    runId: run.id,
    achievedOn: run.runDate,
  }));
}
