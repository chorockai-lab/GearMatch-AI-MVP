// Stats definitions (src/lib/running/stats.ts). Run: npm run test:stats
import { computeStats } from "../src/lib/running/stats";
import { deriveCardState } from "../src/lib/running/state-policy";
import { formatPace, paceSecPerKm } from "../src/lib/running/format";
import type { RunRecord } from "../src/lib/running/types";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};
let n = 0;
const run = (runDate: string, distanceKm: number, durationSec: number, shoe: string | null = "Nike Pegasus 42"): RunRecord => ({
  id: `r${++n}`,
  runDate,
  distanceKm,
  durationSec,
  shoe,
  createdAt: `${runDate}T07:00:00Z`,
});

const TODAY = "2026-10-07";

// empty
const e = computeStats([], TODAY);
check(e.recent.km === 0 && e.recent.runs === 0 && e.recent.paceSec === null, "no runs → 0 km, no pace");
check(e.diffPct === null && e.maxWeek === null && e.mostUsedShoe === null && e.longest === null && e.total.since === null, "no runs → no %, week, shoe, longest");

// period boundaries (handoff: SEP 10 — OCT 07 / AUG 13 — SEP 09)
check(e.recent.from === "2026-09-10" && e.recent.to === "2026-10-07", `recent window ${e.recent.from}..${e.recent.to}`);
check(e.previous.from === "2026-08-13" && e.previous.to === "2026-09-09", `previous window ${e.previous.from}..${e.previous.to}`);

const runs = [
  run("2026-10-07", 5.2, 1810), // WK4 (today)
  run("2026-10-01", 3.0, 1110, null), // WK4 first day
  run("2026-09-30", 8.0, 2800, "ASICS Novablast 6"), // WK3
  run("2026-09-10", 10.2, 3510), // WK1 first day (recent boundary)
  run("2026-09-09", 6.0, 2160), // previous −1 (boundary)
  run("2026-08-13", 4.0, 1500), // previous −4 first day
  run("2026-08-12", 21.1, 7540, "ASICS Novablast 6"), // older than 8 weeks → totals only
];
const s = computeStats(runs, TODAY);
check(s.recent.km === 26.4 && s.recent.runs === 4, `recent km/runs ${s.recent.km}/${s.recent.runs}`);
check(s.previous.km === 10 && s.previous.runs === 2, `previous km/runs ${s.previous.km}/${s.previous.runs}`);
check(s.diffKm === 16.4 && s.diffPct === 164, `diff ${s.diffKm} km / ${s.diffPct}%`);
check(JSON.stringify(s.weeks) === JSON.stringify([4, 0, 0, 6, 10.2, 0, 8, 8.2]), `8 weekly buckets ${JSON.stringify(s.weeks)}`);
check(s.maxWeek === 4, `max week index ${s.maxWeek} (WK1 10.2)`);
check(s.recent.paceSec === paceSecPerKm(26.4, 1810 + 1110 + 2800 + 3510), `recent pace = total time / total km (${formatPace(s.recent.paceSec)})`);
check(s.total.km === 57.5 && s.total.runs === 7 && s.total.since === "2026-08-12", `mileage ${s.total.km} km · ${s.total.runs} runs · since ${s.total.since}`);
check(s.mostUsedShoe?.label === "ASICS Novablast 6" && s.mostUsedShoe.km === 29.1, `most used shoe by km ${JSON.stringify(s.mostUsedShoe)}`);
check(s.longest?.runDate === "2026-09-10" && s.longest.distanceKm === 10.2, "longest run within last 4 weeks only");
check(s.paceDeltaSec === (s.previous.paceSec ?? 0) - (s.recent.paceSec ?? 0), "pace delta = previous − recent");

// tie at the top → no "most" sentence
const tie = computeStats([run("2026-10-07", 5, 1500), run("2026-09-30", 5, 1500)], TODAY);
check(tie.maxWeek === null, "tied top weeks → maxWeek null");

// float noise
const f = computeStats([run("2026-10-07", 0.1, 60), run("2026-10-06", 0.2, 60)], TODAY);
check(f.recent.km === 0.3, `0.1 + 0.2 km = ${f.recent.km}`);

// card state: RUN only for a run saved today; latest saved represents the day
const a = { ...run("2026-10-07", 3, 900), createdAt: "2026-10-07T06:00:00Z" };
const b = { ...run("2026-10-07", 6, 1800), createdAt: "2026-10-07T19:00:00Z" };
const cs = deriveCardState([a, b], [], TODAY);
check(cs.state === "run" && cs.run?.id === b.id, "two runs today → RUN with the latest saved");
check(deriveCardState([run("2026-10-06", 5, 1500)], [], TODAY).state === "base", "only older runs → BASE");
check(deriveCardState([], [], TODAY).state === "first", "no runs → FIRST ENTRY");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
