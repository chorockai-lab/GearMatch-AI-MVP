"use client";
// Add Run — saves, then returns to RUNNING Main (RUN state appears only after the save succeeded).
import { useRouter } from "next/navigation";
import { RunForm } from "@/components/running/RunForm";
import { FlowLoading } from "@/components/onboarding/Flow";
import { localDate } from "@/lib/running/format";
import { runsRepository } from "@/lib/running/repository";
import { knownShoe, useRequireOnboarding } from "@/lib/onboarding/useRequireOnboarding";
import { track } from "@/lib/events/track";

export default function AddRunPage() {
  const router = useRouter();
  const { state, ready, error, reload } = useRequireOnboarding();
  if (!state || !ready) return <FlowLoading error={error} onRetry={reload} />;
  const shoe = knownShoe(state.profile);
  return (
    <RunForm
      mode="add"
      backHref="/running"
      currentShoe={shoe}
      initial={{ runDate: localDate(), distanceKm: 0, durationSec: 0, shoe }}
      onSubmit={async (input) => {
        try {
          const run = await runsRepository.create(input);
          track("run_save_success", { run_id: run.id, is_today: run.runDate === localDate() });
          router.replace("/running");
        } catch (e) {
          track("run_save_fail");
          throw e;
        }
      }}
    />
  );
}
