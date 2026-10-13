// Onboarding guard rules (lib/onboarding/repository.ts pure helpers). Run: npm run test:onboarding
import { answersCode, habitsComplete, identityFromAnswers, nextOnboardingPath } from "../src/lib/onboarding/repository";
import { parseAnswerString } from "../src/lib/identity/scoring";
import { EMPTY_PROFILE, EMPTY_STATE, type OnboardingState } from "../src/lib/onboarding/types";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};

const answers = parseAnswerString("AABAC");
const identity = identityFromAnswers(answers);
const habits = { ...EMPTY_PROFILE, experience: "Y1_3", runs_per_week: "W3_4", typical_run_distance: "D5_10" };
const s = (patch: Partial<OnboardingState>): OnboardingState => ({ ...EMPTY_STATE, ...patch });

check(nextOnboardingPath(EMPTY_STATE) === "/test/1", "empty → /test/1");
check(nextOnboardingPath(s({ answers: { Q1: "A", Q2: "A" } })) === "/test/3", "Q1–Q2 answered → /test/3");
check(nextOnboardingPath(s({ answers: { Q1: "A", Q3: "B" } })) === "/test/2", "gap at Q2 → /test/2");
check(nextOnboardingPath(s({ answers })) === "/reveal", "all answered, no result → /reveal");
check(nextOnboardingPath(s({ answers, identity })) === "/onboarding/habits", "result, no habits → habits");
check(nextOnboardingPath(s({ answers, identity, profile: { ...habits, typical_run_distance: null } })) === "/onboarding/habits", "2/3 habits → habits");
check(nextOnboardingPath(s({ answers, identity, profile: habits })) === "/onboarding/shoe", "habits done, not completed → shoe (step 2 is skippable)");
check(nextOnboardingPath(s({ answers, identity, profile: habits, completed_at: "2026-10-13T00:00:00Z" })) === "/running", "completed → /running");
check(!habitsComplete({ ...habits, runs_per_week: null }) && habitsComplete(habits), "habitsComplete needs the 3 required fields only");
check(answersCode(answers) === "AABAC" && identity.test_answers_v2 === "AABAC", "test_answers_v2 code");
check(
  identity.animal_type_v2 === "HAM" && identity.secondary_type_v2 === "HOR" && identity.test_schema_version === "animal-v2.0.0" && identity.scoring_version === "animal-score-0.1",
  "identity record fields (spec §4.5)",
);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
