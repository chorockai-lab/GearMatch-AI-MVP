// Onboarding guard rules (lib/onboarding/repository.ts pure helpers). Run: npm run test:onboarding
import { answersCode, entryPath, habitsComplete, identityFromAnswers, nextOnboardingPath } from "../src/lib/onboarding/repository";
import { parseAnswerString } from "../src/lib/identity/scoring";
import { EMPTY_PROFILE, EMPTY_STATE, type OnboardingState } from "../src/lib/onboarding/types";
import { detectBrowser } from "../src/lib/qa/browser";

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
// "/" for a returning visitor (server state loaded first)
check(entryPath(EMPTY_STATE) === null, "entry: nothing started → Landing");
check(entryPath(s({ profile: habits })) === null, "entry: profile values alone (no test) → Landing");
check(entryPath(s({ answers: { Q1: "A", Q2: "C" } })) === "/test/3", "entry: test in progress → next question");
check(entryPath(s({ answers })) === "/reveal", "entry: all answered, no result → Reveal");
check(entryPath(s({ answers, identity })) === "/onboarding/habits", "entry: result, profile not done → habits");
check(entryPath(s({ answers, identity, profile: habits })) === "/onboarding/shoe", "entry: habits done → shoe");
check(entryPath(s({ answers, identity, profile: habits, completed_at: "2026-10-13T00:00:00Z" })) === "/running", "entry: onboarding complete → RUNNING");
check(entryPath(s({ answers, identity: null, profile: habits, completed_at: "2026-10-13T00:00:00Z" })) === "/reveal", "entry: complete but result invalid (other scoring version) → re-evaluate");
check(!habitsComplete({ ...habits, runs_per_week: null }) && habitsComplete(habits), "habitsComplete needs the 3 required fields only");
check(answersCode(answers) === "AABAC" && identity.test_answers_v2 === "AABAC", "test_answers_v2 code");
check(
  identity.animal_type_v2 === "HAM" && identity.secondary_type_v2 === "HOR" && identity.test_schema_version === "animal-v2.0.0" && identity.scoring_version === "animal-score-0.1",
  "identity record fields (spec §4.5)",
);

// QA re-visit page (/dev/session): which browser the tester is in
const UA = {
  kakaoIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.8.0",
  kakaoAndroid: "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 KAKAOTALK/25.8.0 (INAPP)",
  safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  androidWebView: "Mozilla/5.0 (Linux; Android 14; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36",
  samsung: "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};
check(detectBrowser(UA.kakaoIos) === "kakaotalk-inapp" && detectBrowser(UA.kakaoAndroid) === "kakaotalk-inapp", "KakaoTalk in-app (iOS / Android)");
check(detectBrowser(UA.safari) === "ios-safari" && detectBrowser(UA.iosChrome) === "ios-chrome", "iPhone Safari vs Chrome");
check(detectBrowser(UA.androidChrome) === "android-chrome" && detectBrowser(UA.samsung) === "samsung-internet", "Android Chrome vs Samsung Internet");
check(detectBrowser(UA.androidWebView) === "other-inapp" && detectBrowser(UA.desktop) === "desktop", "other app WebView / desktop");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
