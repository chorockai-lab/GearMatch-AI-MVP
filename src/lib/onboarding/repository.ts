// Onboarding data access. Screens talk ONLY to `OnboardingRepository`.
//
// STEP 2: `localOnboardingRepository` keeps everything in this browser's localStorage.
//   ⚠ This is TEMPORARY client storage — not a server save. It is lost on another browser,
//   in private mode, or when site data is cleared. Never describe it as saved to an account.
// STEP 3: add a Supabase implementation of the same interface and swap `onboardingRepository`.
import { evaluateIdentity, type Answers } from "@/lib/identity/scoring";
import type { AnswerCode, QuestionId } from "@/lib/identity/questions";
import { EMPTY_PROFILE, EMPTY_STATE, type IdentityRecord, type OnboardingState, type RunnerProfile } from "./types";

export interface OnboardingRepository {
  readonly kind: "local-temporary" | "server";
  load(): Promise<OnboardingState>;
  /** Saves one answer. Changing an answer clears the stored identity (it must be re-evaluated). */
  setAnswer(q: QuestionId, code: AnswerCode): Promise<OnboardingState>;
  saveIdentity(identity: IdentityRecord): Promise<OnboardingState>;
  saveProfile(patch: Partial<RunnerProfile>): Promise<OnboardingState>;
  complete(): Promise<OnboardingState>;
  reset(): Promise<void>;
}

const KEY = "gearmatch.onboarding.v1";
// Used only when localStorage is unavailable (private mode / blocked / quota) — not as a cache.
let memoryFallback: OnboardingState = EMPTY_STATE;
let storageWorks = true;

function read(): OnboardingState {
  if (!storageWorks) return memoryFallback;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    storageWorks = false;
    return memoryFallback;
  }
  if (!raw) return EMPTY_STATE;
  try {
    const v = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      answers: v.answers ?? {},
      identity: v.identity ?? null,
      profile: { ...EMPTY_PROFILE, ...(v.profile ?? {}) },
      completed_at: v.completed_at ?? null,
    };
  } catch {
    return EMPTY_STATE; // corrupted value → start over
  }
}

function write(s: OnboardingState): OnboardingState {
  memoryFallback = s;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    storageWorks = false; // blocked (private mode / quota) → keeps working for this page session only
  }
  return s;
}

export const localOnboardingRepository: OnboardingRepository = {
  kind: "local-temporary",
  async load() {
    return read();
  },
  async setAnswer(q, code) {
    const s = read();
    if (s.answers[q] === code) return s;
    return write({ ...s, answers: { ...s.answers, [q]: code }, identity: null });
  },
  async saveIdentity(identity) {
    return write({ ...read(), identity });
  },
  async saveProfile(patch) {
    const s = read();
    return write({ ...s, profile: { ...s.profile, ...patch } });
  },
  async complete() {
    return write({ ...read(), completed_at: new Date().toISOString() });
  },
  async reset() {
    memoryFallback = EMPTY_STATE;
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};

/** The repository the app uses. STEP 3 swaps this for the Supabase implementation. */
export const onboardingRepository: OnboardingRepository = localOnboardingRepository;

// ── pure helpers ────────────────────────────────────────────────────────────

const QIDS: QuestionId[] = ["Q1", "Q2", "Q3", "Q4", "Q5"];

export function completeAnswers(s: OnboardingState): Answers | null {
  return QIDS.every((q) => s.answers[q]) ? (s.answers as Answers) : null;
}

/** "AABAC" — the spec §4.5 test_answers_v2 code */
export const answersCode = (answers: Answers) => QIDS.map((q) => answers[q]).join("");

export function identityFromAnswers(answers: Answers): IdentityRecord {
  const r = evaluateIdentity(answers);
  return {
    animal_type_v2: r.animal,
    secondary_type_v2: r.secondary,
    test_answers_v2: answersCode(answers),
    test_schema_version: r.testSchemaVersion,
    scoring_version: r.scoringVersion,
    mixed_signal: r.mixedSignal,
    evaluated_at: new Date().toISOString(),
  };
}

export const habitsComplete = (p: RunnerProfile) => Boolean(p.experience && p.runs_per_week && p.typical_run_distance);

/** Where an unfinished user should be sent (guards for each onboarding screen). */
export function nextOnboardingPath(s: OnboardingState): string {
  const missing = QIDS.findIndex((q) => !s.answers[q]);
  if (missing >= 0) return `/test/${missing + 1}`;
  if (!s.identity) return "/reveal";
  if (!habitsComplete(s.profile)) return "/onboarding/habits";
  if (!s.completed_at) return "/onboarding/shoe";
  return "/running";
}
