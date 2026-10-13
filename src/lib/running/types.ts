import type { AnimalId } from "@/lib/identity/animals";

export type CardState = "first" | "base" | "run" | "milestone";

/** A saved run as the RUNNING screen needs it. Dates are local calendar dates "YYYY-MM-DD". */
export interface RunRecord {
  id: string;
  runDate: string;
  distanceKm: number;
  durationSec: number;
  shoe: string | null;
  createdAt: string; // ISO timestamp of the successful server save
}

export interface MilestoneEvent {
  code: string; // e.g. "FIRST_10K"
  label: string; // e.g. "FIRST 10K"
  runId: string;
  achievedOn: string; // "YYYY-MM-DD"
}

export interface RunningMainData {
  animal: AnimalId;
  /** Approved CURRENT MODE value; null when no rule/value exists (shows "—"). */
  currentMode: string | null;
  currentShoe: string | null;
  runs: RunRecord[]; // newest first
  milestones: MilestoneEvent[];
  dataMode: "demo" | "real";
}
