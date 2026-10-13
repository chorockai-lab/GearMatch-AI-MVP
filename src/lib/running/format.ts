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

// ── STEP 3 display helpers (UI handoff 06/07) ───────────────────────────────

const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_EN = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

/** weekday of a local calendar date (0 = Sunday), computed without time zones */
const dow = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/** "2026-10-08" → "THU" */
export const weekdayEn = (isoDate: string) => DOW_EN[dow(isoDate)];

/** "2026-10-08" → "2026. 10. 08 (목)" */
export function formatDateKo(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${y}. ${m}. ${d} (${DOW_KO[dow(isoDate)]})`;
}

/** "2026-10-08" → "OCT 08" */
export const formatMonDay = (isoDate: string) => {
  const { mon, day } = splitDate(isoDate);
  return `${mon} ${day}`;
};

/** "2026-10-08" → "OCTOBER 2026" */
export const formatMonthHeading = (isoDate: string) => `${MONTH_EN[Number(isoDate.slice(5, 7)) - 1]} ${isoDate.slice(0, 4)}`;

/** "2026-09-14" → "SEP 2026" */
export const formatMonYear = (isoDate: string) => `${splitDate(isoDate).mon} ${isoDate.slice(0, 4)}`;

/** 3692 → { h: 1, m: 1, s: 32 } */
export const splitDuration = (sec: number) => ({ h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60 });

/** km to one decimal, never "-0.0" */
export const formatKmSigned = (km: number) => `${km > 0 ? "+" : km < 0 ? "−" : ""}${Math.abs(km).toFixed(1)}`;
