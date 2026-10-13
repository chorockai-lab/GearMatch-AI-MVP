// Onboarding data shapes. Field names follow supabase/migrations/0001_init_draft.sql
// (identity_results, runner_profiles) so STEP 3 can persist them without renaming.
import type { AnimalId } from "@/lib/identity/animals";
import type { AnswerCode, QuestionId } from "@/lib/identity/questions";
import type { SCORING_VERSION, TEST_SCHEMA_VERSION } from "@/lib/identity/questions";

export type PartialAnswers = Partial<Record<QuestionId, AnswerCode>>;

/** spec §4.5 minimum fields (+ mixed_signal, internal only) */
export interface IdentityRecord {
  animal_type_v2: AnimalId;
  secondary_type_v2: AnimalId;
  test_answers_v2: string; // "DBABD"
  test_schema_version: typeof TEST_SCHEMA_VERSION;
  scoring_version: typeof SCORING_VERSION;
  mixed_signal: boolean;
  evaluated_at: string; // ISO
}

export type ShoeStatus = "known" | "unknown" | "none";

export interface RunnerProfile {
  // Step 1 — 나의 러닝 습관
  experience: string | null;
  runs_per_week: string | null;
  typical_run_distance: string | null;
  weekly_distance: string | null; // optional
  // Step 2 — 나와 비슷한 러너 찾기 (all optional)
  height_cm: number | null;
  weight_kg: number | null;
  shoe_size_mm: number | null;
  interest_distance: string | null;
  // Current Shoe
  current_shoe_label: string | null;
  current_shoe_status: ShoeStatus | null;
}

export interface OnboardingState {
  answers: PartialAnswers;
  identity: IdentityRecord | null;
  profile: RunnerProfile;
  /** set when Current Shoe is confirmed → RUNNING Main is reachable */
  completed_at: string | null;
}

export const EMPTY_PROFILE: RunnerProfile = {
  experience: null,
  runs_per_week: null,
  typical_run_distance: null,
  weekly_distance: null,
  height_cm: null,
  weight_kg: null,
  shoe_size_mm: null,
  interest_distance: null,
  current_shoe_label: null,
  current_shoe_status: null,
};

export const EMPTY_STATE: OnboardingState = { answers: {}, identity: null, profile: EMPTY_PROFILE, completed_at: null };
