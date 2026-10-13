// Verifies the scoring implementation against Animal Identity MVP Spec §4.2 and §7.
// Run: npm run test:identity
import { ANIMAL_IDS, type AnimalId } from "../src/lib/identity/animals";
import { evaluateIdentity, parseAnswerString, PRIMARY_OPPORTUNITY } from "../src/lib/identity/scoring";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};

// §4.2 primary opportunity table
const SPEC_OPP: Record<AnimalId, number> = { HAM: 11, CHE: 13, HOR: 12, GOA: 14, FOX: 12, WOL: 11, OTT: 12, CAT: 10 };
check(ANIMAL_IDS.every((t) => PRIMARY_OPPORTUNITY[t] === SPEC_OPP[t]), `primary opportunity = spec §4.2 ${JSON.stringify(PRIMARY_OPPORTUNITY)}`);

// §7 synthetic personas
// [answers, expected animal, expected secondary (spec §7 "주요 보조 성향")]
const PERSONAS: [string, AnimalId, AnimalId][] = [
  ["AABAC", "HAM", "HOR"], ["DDABD", "CHE", "GOA"], ["BABCC", "HOR", "HAM"], ["DBBDD", "GOA", "HOR"], ["ECCEA", "FOX", "CAT"],
  ["CADEB", "WOL", "OTT"], ["BEEEE", "OTT", "CAT"], ["EECEE", "CAT", "FOX"], ["DBABD", "GOA", "CHE"],
];
for (const [code, expected, expSec] of PERSONAS) {
  const r = evaluateIdentity(parseAnswerString(code));
  check(r.animal === expected && r.secondary === expSec, `persona ${code} → ${r.animal}/${r.secondary} (expected ${expected}/${expSec}), mixed_signal=${r.mixedSignal}`);
}
const mixed = evaluateIdentity(parseAnswerString("DBABD"));
check(mixed.secondary === "CHE" && mixed.mixedSignal, "DBABD: GOA 12/14 vs CHE 11/13 → secondary CHE, mixed_signal=true");

// §7 all 5^5 = 3,125 combinations
const SPEC_DIST: Record<AnimalId, number> = { HAM: 364, CHE: 383, HOR: 403, GOA: 394, FOX: 377, WOL: 415, OTT: 465, CAT: 324 };
const dist = Object.fromEntries(ANIMAL_IDS.map((t) => [t, 0])) as Record<AnimalId, number>;
const steps = [0, 0, 0, 0, 0];
const L = ["A", "B", "C", "D", "E"];
let total = 0;
let deterministic = true;
for (const a of L) for (const b of L) for (const c of L) for (const d of L) for (const e of L) {
  const code = a + b + c + d + e;
  const r = evaluateIdentity(parseAnswerString(code));
  const r2 = evaluateIdentity(parseAnswerString(code));
  if (r.animal !== r2.animal || r.secondary !== r2.secondary) deterministic = false;
  dist[r.animal]++;
  steps[r.tieBreakStep]++;
  total++;
}
console.log("distribution:", JSON.stringify(dist));
check(total === 3125, `combinations = ${total}`);
check(ANIMAL_IDS.every((t) => dist[t] === SPEC_DIST[t]), "distribution matches spec §7 table");
check(ANIMAL_IDS.every((t) => dist[t] > 0), "all 8 animals reachable");
check(deterministic, "same answers → same result");
const exactTies = steps[1] + steps[2] + steps[3] + steps[4];
check(exactTies === 98, `exact normalized ties = ${exactTies} (spec: 98)`);
check(steps[2] + steps[3] + steps[4] === 6, `left after HOW compare = ${steps[2] + steps[3] + steps[4]} (spec: 6)`);
check(steps[3] + steps[4] === 2, `left after primary-count compare = ${steps[3] + steps[4]} (spec: 2)`);
check(steps[4] === 0, `fixed-order fallback used = ${steps[4]} (spec: 0)`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
