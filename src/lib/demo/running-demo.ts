// DEMO data for the RUNNING screen — values from the approved design (RUNNING MAIN FINAL MASTER).
// Never shown as a real user's data: every screen using this renders the DEMO DATA marker.
import type { AnimalId } from "@/lib/identity/animals";
import type { CardState, RunningMainData } from "@/lib/running/types";

export const DEMO_TODAY: Record<Exclude<CardState, "first">, string> = {
  base: "2026-10-06",
  run: "2026-10-07",
  milestone: "2026-10-10",
};

export function demoRunningData(state: CardState, animal: AnimalId): { data: RunningMainData; today: string } {
  const common = { animal, currentShoe: "Nike Pegasus 42", dataMode: "demo" as const };
  const r = (id: string, runDate: string, km: number, sec: number, createdAt: string) => ({
    id, runDate, distanceKm: km, durationSec: sec, shoe: "Nike Pegasus 42", createdAt,
  });
  const oct05 = r("demo-1005", "2026-10-05", 8.1, 2867, "2026-10-05T07:40:00+09:00"); // 5'54"/km
  const oct03 = r("demo-1003", "2026-10-03", 6.4, 2240, "2026-10-03T07:20:00+09:00"); // 5'50"/km
  const oct07 = r("demo-1007", "2026-10-07", 5.2, 1810, "2026-10-07T07:35:00+09:00"); // 5'48"/km
  const oct10 = r("demo-1010", "2026-10-10", 10.2, 3692, "2026-10-10T08:10:00+09:00"); // 6'02"/km
  switch (state) {
    case "first":
      return { data: { ...common, currentMode: null, runs: [], milestones: [] }, today: "2026-10-01" };
    case "base":
      return { data: { ...common, currentMode: "BUILDING SPEED", runs: [oct05, oct03], milestones: [] }, today: DEMO_TODAY.base };
    case "run":
      return { data: { ...common, currentMode: "BUILDING SPEED", runs: [oct07, oct05, oct03], milestones: [] }, today: DEMO_TODAY.run };
    case "milestone":
      return {
        data: {
          ...common, currentMode: "BUILDING SPEED", runs: [oct10, oct07, oct05, oct03],
          milestones: [{ code: "FIRST_10K", label: "FIRST 10K", runId: oct10.id, achievedOn: "2026-10-10" }],
        },
        today: DEMO_TODAY.milestone,
      };
  }
}
