// Animal Identity scoring v0.1 — implements Spec §4 exactly.
//  raw[type] = Σ primary points + Σ secondary points (1)
//  normalized = raw / primaryOpportunity[type]  — compared with integer cross-multiplication
//  ties: (1) HOW(Q2–Q4) primary points → (2) primary pick count → (3) first primary hit in Q3→Q2→Q4→Q1→Q5 → (4) fixed code order
import { ANIMAL_IDS, type AnimalId } from "./animals";
import { QUESTIONS, SCORING_VERSION, TEST_SCHEMA_VERSION, type AnswerCode, type QuestionId } from "./questions";

export type Answers = Record<QuestionId, AnswerCode>;

/** Σ primary points of the questions where the type appears as a primary (spec §4.2 table). */
export const PRIMARY_OPPORTUNITY: Record<AnimalId, number> = (() => {
  const o = Object.fromEntries(ANIMAL_IDS.map((t) => [t, 0])) as Record<AnimalId, number>;
  for (const q of QUESTIONS) {
    const seen = new Set<AnimalId>();
    for (const opt of q.options) seen.add(opt.primary);
    for (const t of seen) o[t] += q.primaryPoints;
  }
  return o;
})();

const HOW_QUESTIONS: QuestionId[] = ["Q2", "Q3", "Q4"];
const LOOKUP_ORDER: QuestionId[] = ["Q3", "Q2", "Q4", "Q1", "Q5"];
export const MIXED_SIGNAL_GAP = 0.05;

export interface TypeScore {
  type: AnimalId;
  raw: number;
  opportunity: number;
  normalized: number; // for logging only — comparison uses cross-multiplication
  howPrimary: number;
  primaryPicks: number;
}

export interface IdentityResult {
  animal: AnimalId;
  secondary: AnimalId;
  /** Secondary may be described only when the user picked ≥1 answer with it as primary (spec §4.4). */
  secondaryHasPrimaryEvidence: boolean;
  mixedSignal: boolean;
  ranking: TypeScore[];
  /** Which tie-break step decided 1st place (0 = no exact tie). Internal/QA only. */
  tieBreakStep: 0 | 1 | 2 | 3 | 4;
  testSchemaVersion: typeof TEST_SCHEMA_VERSION;
  scoringVersion: typeof SCORING_VERSION;
}

function optionOf(qid: QuestionId, code: AnswerCode) {
  const q = QUESTIONS.find((x) => x.id === qid);
  if (!q) throw new Error(`Unknown question ${qid}`);
  const opt = q.options.find((o) => o.code === code);
  if (!opt) throw new Error(`Unknown answer ${qid}-${code}`);
  return { q, opt };
}

export function scoreTypes(answers: Answers): TypeScore[] {
  const s = Object.fromEntries(
    ANIMAL_IDS.map((t) => [t, { type: t, raw: 0, opportunity: PRIMARY_OPPORTUNITY[t], normalized: 0, howPrimary: 0, primaryPicks: 0 }]),
  ) as Record<AnimalId, TypeScore>;
  for (const q of QUESTIONS) {
    const { opt } = optionOf(q.id, answers[q.id]);
    s[opt.primary].raw += q.primaryPoints;
    s[opt.primary].primaryPicks += 1;
    if (HOW_QUESTIONS.includes(q.id)) s[opt.primary].howPrimary += q.primaryPoints;
    if (opt.secondary) s[opt.secondary].raw += q.secondaryPoints;
  }
  for (const t of ANIMAL_IDS) s[t].normalized = s[t].raw / s[t].opportunity;
  return ANIMAL_IDS.map((t) => s[t]);
}

/** >0 if a ranks above b by normalized score only (exact, integer cross-multiplication). */
function cmpNormalized(a: TypeScore, b: TypeScore): number {
  return a.raw * b.opportunity - b.raw * a.opportunity;
}

/** Pick the winner among `pool` using the spec tie-break chain. Returns winner + step used. */
function pickTop(pool: TypeScore[], answers: Answers): { winner: TypeScore; step: 0 | 1 | 2 | 3 | 4 } {
  let best = pool.filter((x) => pool.every((y) => cmpNormalized(x, y) >= 0));
  if (best.length === 1) return { winner: best[0], step: 0 };
  // (1) HOW primary points
  const maxHow = Math.max(...best.map((x) => x.howPrimary));
  best = best.filter((x) => x.howPrimary === maxHow);
  if (best.length === 1) return { winner: best[0], step: 1 };
  // (2) primary pick count
  const maxPicks = Math.max(...best.map((x) => x.primaryPicks));
  best = best.filter((x) => x.primaryPicks === maxPicks);
  if (best.length === 1) return { winner: best[0], step: 2 };
  // (3) first primary hit in Q3→Q2→Q4→Q1→Q5
  const tied = new Set(best.map((x) => x.type));
  for (const qid of LOOKUP_ORDER) {
    const { opt } = optionOf(qid, answers[qid]);
    if (tied.has(opt.primary)) return { winner: best.find((x) => x.type === opt.primary)!, step: 3 };
  }
  // (4) fixed code order (theoretical fallback)
  for (const t of ANIMAL_IDS) {
    const w = best.find((x) => x.type === t);
    if (w) return { winner: w, step: 4 };
  }
  throw new Error("unreachable");
}

export function evaluateIdentity(answers: Answers): IdentityResult {
  const scores = scoreTypes(answers);
  const ranking: TypeScore[] = [];
  let pool = [...scores];
  let firstStep: 0 | 1 | 2 | 3 | 4 = 0;
  while (pool.length) {
    const { winner, step } = pickTop(pool, answers);
    if (ranking.length === 0) firstStep = step;
    ranking.push(winner);
    pool = pool.filter((x) => x.type !== winner.type);
  }
  const [first, second] = ranking;
  return {
    animal: first.type,
    secondary: second.type,
    secondaryHasPrimaryEvidence: second.primaryPicks > 0,
    mixedSignal: first.normalized - second.normalized < MIXED_SIGNAL_GAP,
    ranking,
    tieBreakStep: firstStep,
    testSchemaVersion: TEST_SCHEMA_VERSION,
    scoringVersion: SCORING_VERSION,
  };
}

/** "DBABD" → Answers */
export function parseAnswerString(s: string): Answers {
  if (!/^[A-E]{5}$/.test(s)) throw new Error(`Invalid answer string: ${s}`);
  const ids: QuestionId[] = ["Q1", "Q2", "Q3", "Q4", "Q5"];
  return Object.fromEntries(ids.map((id, i) => [id, s[i] as AnswerCode])) as Answers;
}
