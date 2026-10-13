// Runner Card state policy — kept in ONE place so it can change without touching UI.
//
// PROVISIONAL (MVP kickoff §6, 2026-10-12). Not yet a confirmed product decision:
//   FIRST ENTRY : 0 saved runs
//   BASE        : default
//   RUN         : a run saved successfully for today's date
//   MILESTONE   : a confirmed milestone event (see milestones.ts)
//   priority    : MILESTONE > RUN > BASE
//   RUN / MILESTONE shown only until the end of that date
//   several runs on the same day → the most recently saved one represents the day
import type { CardState, MilestoneEvent, RunRecord } from "./types";

export const STATE_POLICY = {
  version: "provisional-2026-10-12",
  showRunUntil: "end-of-run-date" as const,
  showMilestoneUntil: "end-of-achieved-date" as const,
  sameDayRepresentative: "latest-saved" as const,
  priority: ["milestone", "run", "base"] as const,
};

export interface CardStateResult {
  state: CardState;
  run: RunRecord | null; // the run shown in RUN / MILESTONE
  milestone: MilestoneEvent | null;
}

export function deriveCardState(runs: RunRecord[], milestones: MilestoneEvent[], today: string): CardStateResult {
  if (runs.length === 0) return { state: "first", run: null, milestone: null };

  const todays = runs.filter((r) => r.runDate === today);
  // same-day representative: latest successful save
  const rep = todays.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

  const ms = milestones.filter((m) => m.achievedOn === today);
  if (ms.length > 0) {
    const m = ms[ms.length - 1];
    const run = runs.find((r) => r.id === m.runId) ?? rep;
    return { state: "milestone", run, milestone: m };
  }
  if (rep) return { state: "run", run: rep, milestone: null };
  return { state: "base", run: null, milestone: null };
}
