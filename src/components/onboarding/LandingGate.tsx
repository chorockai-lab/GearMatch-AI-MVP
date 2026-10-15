"use client";
// "/" entry. A first-time browser sees the Landing right away. A returning browser (it has a Supabase session or
// onboarding data) first loads the saved onboarding state, then goes to RUNNING Main / the step it stopped at,
// or sees the Landing if nothing was started. Load failure → the shared load-failed block with retry.
// The Landing markup is unchanged; this only decides whether to show it.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { entryPath } from "@/lib/onboarding/repository";
import { onboardingRepository } from "@/lib/onboarding/store";
import { trackAppOpen } from "@/lib/events/track";
import { useTrackOnce } from "@/lib/events/useTrackOnce";
import { FlowLoading } from "./Flow";

/** localStorage keys only a returning browser has: the Supabase session (server mode) or onboarding data (both modes). */
const RETURNING_KEY = /^sb-.+-auth-token$|^gearmatch\.onboarding\./;
const GATE_ID = "gm-entry";

/** Runs while the HTML is parsed, before the first paint: hides the Landing for a returning browser so it never flashes. */
const PRECHECK = `try{if(Object.keys(localStorage).some(function(k){return ${RETURNING_KEY}.test(k)}))document.getElementById("${GATE_ID}").setAttribute("data-checking","")}catch(e){}`;

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

  // client-side navigation to "/" (the inline script does not run then) → hide before paint as well
  useLayoutEffect(() => {
    if (isReturning()) ref.current?.setAttribute("data-checking", "");
  }, []);

  useEffect(() => {
    trackAppOpen(); // also stores the ?qa=1 flag before any redirect drops the query
    if (!isReturning()) {
      setPhase("landing");
      return;
    }
    let alive = true;
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
      <div id={GATE_ID} ref={ref} suppressHydrationWarning className="contents [&[data-checking]]:hidden">
        <script dangerouslySetInnerHTML={{ __html: PRECHECK }} />
        {children}
      </div>
      {phase === "error" && <FlowLoading error onRetry={retry} />}
    </>
  );
}
