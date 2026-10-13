// Pace & display formatting. Pace is always derived (distance + time), never entered.

/** seconds per km, rounded to whole seconds; null if distance is not positive. */
export function paceSecPerKm(distanceKm: number, durationSec: number): number | null {
  if (!(distanceKm > 0) || !(durationSec > 0)) return null;
  return Math.round(durationSec / distanceKm);
}

/** 348 → 5'48" */
export function formatPace(secPerKm: number | null): string {
  if (secPerKm == null) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}'${String(s).padStart(2, "0")}"`;
}

/** 1810 → 30:10 · 3692 → 1:01:32 */
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** 5.2 → "5.2", 10 → "10.0" (one decimal, as in the design) */
export const formatKm = (km: number) => km.toFixed(1);

const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/** "2026-10-07" → { mon: "OCT", day: "07" } */
export function splitDate(isoDate: string): { mon: string; day: string } {
  const [, m, d] = isoDate.split("-");
  return { mon: MON[Number(m) - 1] ?? "", day: d ?? "" };
}

/** Local calendar date "YYYY-MM-DD" for a Date (device time zone). */
export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
