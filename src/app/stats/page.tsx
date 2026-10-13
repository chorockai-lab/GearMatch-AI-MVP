"use client";
// Stats Card — RUNNING Main "VIEW STATS" → here; "VIEW RUNNER" → back.
import { AppFrame, AppHeader, BottomNav } from "@/components/ui/AppChrome";
import { FlowLoading } from "@/components/onboarding/Flow";
import { StatsCardView } from "@/components/running/StatsViews";
import { localDate } from "@/lib/running/format";
import { useRuns } from "@/lib/running/useRuns";
import { useRequireOnboarding } from "@/lib/onboarding/useRequireOnboarding";
import { useTrackOnce } from "@/lib/events/useTrackOnce";

export default function StatsPage() {
  const ob = useRequireOnboarding();
  const { runs, error, reload } = useRuns();
  useTrackOnce("stats_view", { runs: runs?.length ?? 0 }, runs != null);
  if (!ob.ready || !runs || error) return <FlowLoading error={ob.error ?? error} onRetry={ob.error ? ob.reload : reload} />;
  return (
    <AppFrame>
      <AppHeader />
      <StatsCardView runs={runs} today={localDate()} />
      <BottomNav active="running" />
    </AppFrame>
  );
}
