"use client";
import { FlowLoading } from "@/components/onboarding/Flow";
import { StatsDetailView } from "@/components/running/StatsViews";
import { localDate } from "@/lib/running/format";
import { useRuns } from "@/lib/running/useRuns";
import { useRequireOnboarding } from "@/lib/onboarding/useRequireOnboarding";
import { useTrackOnce } from "@/lib/events/useTrackOnce";

export default function StatsDetailPage() {
  const ob = useRequireOnboarding();
  const { runs, error, reload } = useRuns();
  useTrackOnce("stats_detail_view", { runs: runs?.length ?? 0 }, runs != null);
  if (!ob.ready || !runs || error) return <FlowLoading error={ob.error ?? error} onRetry={ob.error ? ob.reload : reload} />;
  return <StatsDetailView runs={runs} today={localDate()} />;
}
