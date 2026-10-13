// Stats Card / Stats Detail calculations — pure functions of the saved runs and "today".
// Definitions (UI handoff 07_STATS_HISTORY; PROVISIONAL until product confirms):
//   • LAST 4 WEEKS     = the 28 calendar days ending today (today included)      e.g. SEP 10 — OCT 07
//   • PREVIOUS 4 WEEKS = the 28 days before that                                e.g. AUG 13 — SEP 09
//   • WK 1..4          = 7-day blocks of LAST 4 WEEKS, WK 4 = the most recent 7 days; −4..−1 the same for PREVIOUS
//   • AVG PACE         = total time ÷ total distance of the period (not an average of per-run paces)
//   • vs PREV %        = (recent − previous) ÷ previous; none when previous is 0
//   • GEARMATCH MILEAGE= all saved runs; SINCE = month of the earliest run
//   • MOST USED SHOE   = all runs, by summed distance (runs without a shoe excluded)
//   • LONGEST RUN      = longest run in LAST 4 WEEKS (same distance → the later one)
// Dates are local calendar dates "YYYY-MM-DD"; arithmetic is done on UTC day numbers (no time-zone drift).
import { paceSecPerKm } from "./format";
import type { RunRecord } from "./types";

const DAY = 86_400_000;
const toDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};
const fromDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

export interface Period {
  from: string;
  to: string;
  km: number;
  runs: number;
  durationSec: number;
  paceSec: number | null;
}

export interface Stats {
  recent: Period;
  previous: Period;
  diffKm: number; // recent − previous
  diffPct: number | null; // rounded %, null when previous km is 0
  /** 8 weekly km totals: [−4, −3, −2, −1, WK1, WK2, WK3, WK4] */
  weeks: number[];
  /** index into `weeks` of the highest week, null when all are 0 or tied at the top */
  maxWeek: number | null;
  total: { km: number; runs: number; since: string | null };
  mostUsedShoe: { label: string; km: number } | null;
  longest: RunRecord | null;
  /** previous pace − recent pace in s/km (positive = faster now); null if either is missing */
  paceDeltaSec: number | null;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** km values are summed with 2-decimal precision to avoid float noise (e.g. 0.1 + 0.2) */
const kmSum = (runs: RunRecord[]) => Math.round(sum(runs.map((r) => r.distanceKm)) * 100) / 100;

function period(runs: RunRecord[], fromDayN: number, toDayN: number): Period {
  const inside = runs.filter((r) => {
    const d = toDay(r.runDate);
    return d >= fromDayN && d <= toDayN;
  });
  const km = kmSum(inside);
  const durationSec = sum(inside.map((r) => r.durationSec));
  return { from: fromDay(fromDayN), to: fromDay(toDayN), km, runs: inside.length, durationSec, paceSec: paceSecPerKm(km, durationSec) };
}

export function computeStats(runs: RunRecord[], today: string): Stats {
  const t = toDay(today);
  const recent = period(runs, t - 27, t);
  const previous = period(runs, t - 55, t - 28);

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = t - (7 - i) * 7; // i=7 → [t−6, t] · i=0 → [t−55, t−49]
    return period(runs, end - 6, end).km;
  });
  const top = Math.max(...weeks);
  const maxWeek = top > 0 && weeks.filter((w) => w === top).length === 1 ? weeks.indexOf(top) : null;

  const byShoe = new Map<string, number>();
  for (const r of runs) if (r.shoe) byShoe.set(r.shoe, (byShoe.get(r.shoe) ?? 0) + r.distanceKm);
  let mostUsedShoe: Stats["mostUsedShoe"] = null;
  for (const [label, km] of byShoe) if (!mostUsedShoe || km > mostUsedShoe.km) mostUsedShoe = { label, km: Math.round(km * 100) / 100 };

  const recentRuns = runs.filter((r) => toDay(r.runDate) >= t - 27 && toDay(r.runDate) <= t);
  const longest =
    recentRuns.slice().sort((a, b) => b.distanceKm - a.distanceKm || b.runDate.localeCompare(a.runDate) || b.createdAt.localeCompare(a.createdAt))[0] ??
    null;

  const earliest = runs.reduce<string | null>((m, r) => (m == null || r.runDate < m ? r.runDate : m), null);

  return {
    recent,
    previous,
    diffKm: Math.round((recent.km - previous.km) * 100) / 100,
    diffPct: previous.km > 0 ? Math.round(((recent.km - previous.km) / previous.km) * 100) : null,
    weeks,
    maxWeek,
    total: { km: kmSum(runs), runs: runs.length, since: earliest },
    mostUsedShoe,
    longest,
    paceDeltaSec: recent.paceSec != null && previous.paceSec != null ? previous.paceSec - recent.paceSec : null,
  };
}
