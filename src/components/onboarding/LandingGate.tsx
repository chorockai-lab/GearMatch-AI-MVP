"use client";
// "/" entry. A first-time browser sees the Landing right away. A returning browser (it has a Supabase session or
// onboarding data) first loads the saved onboarding state, then goes to RUNNING Main / the step it stopped at,
// or sees the Landing if nothing was started. Load failure → the shared load-failed block with retry.
// The Landing markup is unchanged; this only decides whether to show it.
// QA only: `/?qa=1&landing=1` shows the Landing to a returning browser too ("랜딩 다시 보기"). Nothing is reset by
// viewing it; if that user already has a result, the test CTA asks before starting again.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { entryPath } from "@/lib/onboarding/repository";
import { onboardingRepository } from "@/lib/onboarding/store";
import { isQaSession, trackAppOpen } from "@/lib/events/track";
import { useTrackOnce } from "@/lib/events/useTrackOnce";
import { FlowLoading } from "./Flow";

/** localStorage keys only a returning browser has: the Supabase session (server mode) or onboarding data (both modes). */
const RETURNING_KEY = /^sb-.+-auth-token$|^gearmatch\.onboarding\./;
const GATE_ID = "gm-entry";

/** Runs while the HTML is parsed, before the first paint: hides the Landing for a returning browser so it never flashes. */
const PRECHECK = `try{if(Object.keys(localStorage).some(function(k){return ${RETURNING_KEY}.test(k)}))document.getElementById("${GATE_ID}").setAttribute("data-checking","")}catch(e){}`;

/** QA "랜딩 다시 보기": only in a QA browser (`?qa=1` now or earlier) and only with `landing=1` in the address. */
function isLandingPreview(): boolean {
  try {
    return isQaSession() && new URLSearchParams(window.location.search).get("landing") === "1";
  } catch {
    return false;
  }
}

function isReturning(): boolean {
  try {
    return Object.keys(window.localStorage).some((k) => RETURNING_KEY.test(k));
  } catch {
    return false; // storage blocked → nothing could have been kept anyway
  }
}

export function LandingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"checking" | "landing" | "error">("checking");
  const [attempt, setAttempt] = useState(0);
  const [hasResult, setHasResult] = useState(false); // landing preview: this browser already finished the test
  const [confirmRetake, setConfirmRetake] = useState(false);

  // client-side navigation to "/" (the inline script does not run then) → hide before paint as well
  useLayoutEffect(() => {
    if (isReturning()) ref.current?.setAttribute("data-checking", "");
  }, []);

  useEffect(() => {
    trackAppOpen(); // also stores the ?qa=1 flag before any redirect drops the query
    let alive = true;
    if (isLandingPreview()) {
      setPhase("landing"); // no redirect, nothing written
      if (isReturning()) {
        onboardingRepository.load().then(
          (state) => alive && setHasResult(Boolean(state.identity || state.completed_at)),
          () => undefined,
        );
      }
      return () => {
        alive = false;
      };
    }
    if (!isReturning()) {
      setPhase("landing");
      return;
    }
    onboardingRepository.load().then(
      (state) => {
        if (!alive) return;
        const to = entryPath(state);
        if (to) router.replace(to);
        else setPhase("landing");
      },
      () => alive && setPhase("error"),
    );
    return () => {
      alive = false;
    };
  }, [attempt, router]);

  useEffect(() => {
    if (phase === "landing") ref.current?.removeAttribute("data-checking");
  }, [phase]);
  useTrackOnce("landing_view", undefined, phase === "landing"); // only when the Landing is actually shown

  const retry = useCallback(() => {
    setPhase("checking");
    setAttempt((n) => n + 1);
  }, []);

  return (
    <>
      <div
        id={GATE_ID}
        ref={ref}
        suppressHydrationWarning
        className="contents [&[data-checking]]:hidden"
        onClickCapture={(e) => {
          // landing preview of a user with a result: ask before the test starts again
          if (!hasResult || !(e.target as Element).closest('a[href="/test/1"]')) return;
          e.preventDefault();
          e.stopPropagation();
          setConfirmRetake(true);
        }}
      >
        <script dangerouslySetInnerHTML={{ __html: PRECHECK }} />
        {children}
      </div>
      {phase === "error" && <FlowLoading error onRetry={retry} />}
      {confirmRetake && (
        <div className="fixed inset-0 z-20 mx-auto flex max-w-[430px] flex-col justify-end bg-[rgba(3,3,3,0.66)]" role="dialog" aria-modal="true" aria-labelledby="retake-title">
          <div className="border-t border-gm-line2 bg-gm-sheet px-6 pt-7" style={{ paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
            <h2 id="retake-title" className="m-0 text-[22px] font-extrabold">테스트를 다시 할까요?</h2>
            <p className="mt-2 mb-0 text-[15px] leading-[22px] text-gm-g1">
              답을 바꾸면 지금의 러닝 동물 결과가 새 결과로 바뀌어요. 러닝 기록과 저장한 신발은 그대로 남아요.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmRetake(false)} className="h-14 border border-gm-line3 text-[16px] font-bold">
                취소
              </button>
              <button type="button" onClick={() => router.push("/test/1")} className="h-14 bg-gm-lime text-[16px] font-extrabold text-gm-bg">
                다시 테스트하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
