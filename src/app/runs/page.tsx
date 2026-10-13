"use client";
import { FlowLoading } from "@/components/onboarding/Flow";
import { RunHistoryView } from "@/components/running/RunViews";
import { useRuns } from "@/lib/running/useRuns";
import { useRequireOnboarding } from "@/lib/onboarding/useRequireOnboarding";
import { useTrackOnce } from "@/lib/events/useTrackOnce";

export default function RunHistoryPage() {
  const ob = useRequireOnboarding();
  const { runs, error, reload } = useRuns();
  useTrackOnce("history_view", { runs: runs?.length ?? 0 }, runs != null);
  if (!ob.ready || !runs || error) return <FlowLoading error={ob.error ?? error} onRetry={ob.error ? ob.reload : reload} />;
  return <RunHistoryView runs={runs} />;
}
