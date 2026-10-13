"use client";
import { useCallback, useEffect, useState } from "react";
import { onboardingRepository } from "./store";
import type { OnboardingState } from "./types";

/**
 * Loads onboarding state on the client. `state` is null until loaded (no SSR access to storage).
 * `error` is set when loading fails (server mode: network / auth); `reload` retries.
 */
export function useOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    onboardingRepository.load().then(
      (s) => alive && setState(s),
      (e) => alive && setError(e ?? new Error("load failed")),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { state, setState, error, reload, repo: onboardingRepository };
}
