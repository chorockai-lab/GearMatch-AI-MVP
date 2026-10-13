"use client";
// Edit Run — same run_id is kept; delete asks for confirmation, then returns to Run History.
import { useParams, useRouter } from "next/navigation";
import { RunForm } from "@/components/running/RunForm";
import { FlowLoading } from "@/components/onboarding/Flow";
import { RunNotFound } from "@/components/running/RunViews";
import { useRun } from "@/lib/running/useRuns";
import { knownShoe, useRequireOnboarding } from "@/lib/onboarding/useRequireOnboarding";
import { track } from "@/lib/events/track";

export default function EditRunPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ob = useRequireOnboarding();
  const { run, error, reload, repo } = useRun(id);
  if (!ob.state || !ob.ready || run === undefined || error) return <FlowLoading error={ob.error ?? error} onRetry={ob.error ? ob.reload : reload} />;
  if (run === null) return <RunNotFound />;
  return (
    <RunForm
      mode="edit"
      backHref={`/runs/${run.id}`}
      currentShoe={knownShoe(ob.state.profile)}
      initial={{ runDate: run.runDate, distanceKm: run.distanceKm, durationSec: run.durationSec, shoe: run.shoe }}
      onSubmit={async (input) => {
        await repo.update(run.id, input);
        track("run_update", { run_id: run.id });
        router.replace(`/runs/${run.id}`);
      }}
      onDelete={async () => {
        await repo.remove(run.id);
        track("run_delete", { run_id: run.id });
        router.replace("/runs");
      }}
    />
  );
}
