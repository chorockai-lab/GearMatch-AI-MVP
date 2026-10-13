"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { nextOnboardingPath } from "./repository";
import { useOnboarding } from "./useOnboarding";

/** For RUNNING-side screens: redirects to the next onboarding step until onboarding is complete. */
export function useRequireOnboarding() {
  const router = useRouter();
  const ob = useOnboarding();
  const ready = Boolean(ob.state?.identity && ob.state.completed_at);
  useEffect(() => {
    if (ob.state && !ready) router.replace(nextOnboardingPath(ob.state));
  }, [ob.state, ready, router]);
  return { ...ob, ready };
}

/** Current shoe label to show / snapshot ("모델명 모름" only for display, never as a run's shoe). */
export const knownShoe = (p: { current_shoe_status: string | null; current_shoe_label: string | null }) =>
  p.current_shoe_status === "known" ? p.current_shoe_label : null;
