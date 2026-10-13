// Supabase implementation of OnboardingRepository (STORAGE_MODE = "server").
//   • In-progress test answers stay in this browser (local draft) — only the evaluated result is a server record.
//   • identity_results / runner_profiles rows belong to the anonymous user (RLS: own rows only).
//   • Changing an answer deletes the stored result, same rule as the local repository.
import { SCORING_VERSION, TEST_SCHEMA_VERSION } from "@/lib/identity/questions";
import { isAnimalId } from "@/lib/identity/animals";
import { ensureUserId, getSupabase } from "@/lib/supabase/client";
import { serverDraftRepository as draft, type OnboardingRepository } from "./repository";
import { EMPTY_PROFILE, type IdentityRecord, type OnboardingState, type PartialAnswers, type RunnerProfile } from "./types";

const IDENTITY_COLS = "animal_type_v2, secondary_type_v2, test_answers_v2, test_schema_version, scoring_version, mixed_signal, evaluated_at";
const PROFILE_COLS =
  "experience, runs_per_week, typical_run_distance, weekly_distance, height_cm, weight_kg, shoe_size_mm, interest_distance, current_shoe_label, current_shoe_status, onboarding_completed_at";

function db() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  return sb;
}

function toIdentity(row: Record<string, unknown> | null): IdentityRecord | null {
  if (!row || !isAnimalId(row.animal_type_v2) || !isAnimalId(row.secondary_type_v2)) return null;
  // results from another schema/scoring version are not silently reused (spec §4.5)
  if (row.test_schema_version !== TEST_SCHEMA_VERSION || row.scoring_version !== SCORING_VERSION) return null;
  return {
    animal_type_v2: row.animal_type_v2,
    secondary_type_v2: row.secondary_type_v2,
    test_answers_v2: String(row.test_answers_v2),
    test_schema_version: TEST_SCHEMA_VERSION,
    scoring_version: SCORING_VERSION,
    mixed_signal: Boolean(row.mixed_signal),
    evaluated_at: String(row.evaluated_at),
  };
}

const num = (v: unknown) => (v == null ? null : Number(v));

function toProfile(row: Record<string, unknown> | null): { profile: RunnerProfile; completedAt: string | null } {
  if (!row) return { profile: EMPTY_PROFILE, completedAt: null };
  return {
    profile: {
      experience: (row.experience as string) ?? null,
      runs_per_week: (row.runs_per_week as string) ?? null,
      typical_run_distance: (row.typical_run_distance as string) ?? null,
      weekly_distance: (row.weekly_distance as string) ?? null,
      height_cm: num(row.height_cm),
      weight_kg: num(row.weight_kg),
      shoe_size_mm: num(row.shoe_size_mm),
      interest_distance: (row.interest_distance as string) ?? null,
      current_shoe_label: (row.current_shoe_label as string) ?? null,
      current_shoe_status: (row.current_shoe_status as RunnerProfile["current_shoe_status"]) ?? null,
    },
    completedAt: (row.onboarding_completed_at as string) ?? null,
  };
}

/** "AABAC" → answers (used when the local draft is gone but the server result exists) */
function answersFromCode(code: string): PartialAnswers {
  const ids = ["Q1", "Q2", "Q3", "Q4", "Q5"] as const;
  return /^[A-E]{5}$/.test(code) ? (Object.fromEntries(ids.map((q, i) => [q, code[i]])) as PartialAnswers) : {};
}

async function load(): Promise<OnboardingState> {
  const userId = await ensureUserId();
  const [idRes, prRes, local] = await Promise.all([
    db().from("identity_results").select(IDENTITY_COLS).eq("user_id", userId).maybeSingle(),
    db().from("runner_profiles").select(PROFILE_COLS).eq("user_id", userId).maybeSingle(),
    draft.load(),
  ]);
  if (idRes.error) throw idRes.error;
  if (prRes.error) throw prRes.error;
  const identity = toIdentity(idRes.data);
  const { profile, completedAt } = toProfile(prRes.data);
  const answers = Object.keys(local.answers).length > 0 ? local.answers : identity ? answersFromCode(identity.test_answers_v2) : {};
  return { answers, identity, profile, completed_at: completedAt };
}

export const serverOnboardingRepository: OnboardingRepository = {
  kind: "server",
  load,
  async setAnswer(q, code) {
    const before = await draft.load();
    await draft.setAnswer(q, code);
    if (before.answers[q] !== code) {
      const userId = await ensureUserId();
      const { error } = await db().from("identity_results").delete().eq("user_id", userId);
      if (error) throw error;
    }
    return load();
  },
  async saveIdentity(identity) {
    await ensureUserId();
    const { error } = await db().from("identity_results").upsert(identity);
    if (error) throw error;
    return load();
  },
  async saveProfile(patch) {
    await ensureUserId();
    const { error } = await db().from("runner_profiles").upsert(patch);
    if (error) throw error;
    return load();
  },
  async complete() {
    await ensureUserId();
    const { error } = await db().from("runner_profiles").upsert({ onboarding_completed_at: new Date().toISOString() });
    if (error) throw error;
    return load();
  },
  async reset() {
    const userId = await ensureUserId();
    await db().from("identity_results").delete().eq("user_id", userId);
    await db().from("runner_profiles").delete().eq("user_id", userId);
    await draft.reset();
  },
};
