"use client";
// RUNNING Main fed by the onboarding result (animal + current shoe). Runs are not stored until STEP 3,
// so the card is always FIRST ENTRY here. The FINAL RunningMainView is reused unchanged.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { localDate } from "@/lib/running/format";
import { nextOnboardingPath } from "@/lib/onboarding/repository";
import { SHOE_UNKNOWN_LABEL } from "@/lib/onboarding/options";
import { useOnboarding } from "@/lib/onboarding/useOnboarding";
import { AppFrame } from "@/components/ui/AppChrome";
import { RunningMainView } from "./RunningMainView";

export function RunningFromOnboarding() {
  const router = useRouter();
  const { state } = useOnboarding();
  const ready = state && state.identity && state.completed_at;

  useEffect(() => {
    if (state && !ready) router.replace(nextOnboardingPath(state));
  }, [state, ready, router]);

  if (!state || !ready || !state.identity) return <AppFrame>{null}</AppFrame>;

  const p = state.profile;
  const currentShoe = p.current_shoe_status === "known" ? p.current_shoe_label : p.current_shoe_status === "unknown" ? SHOE_UNKNOWN_LABEL : null;
  return (
    <RunningMainView
      today={localDate()}
      data={{
        animal: state.identity.animal_type_v2,
        currentMode: null, // no approved rule (DECISION NEEDED)
        currentShoe,
        runs: [],
        milestones: [],
        dataMode: "real",
      }}
    />
  );
}
