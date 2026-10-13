"use client";
import { useEffect, useState } from "react";
import { onboardingRepository } from "./repository";
import type { OnboardingState } from "./types";

/** Loads onboarding state on the client. `state` is null until loaded (no SSR access to storage). */
export function useOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  useEffect(() => {
    let alive = true;
    onboardingRepository.load().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);
  return { state, setState, repo: onboardingRepository };
}
