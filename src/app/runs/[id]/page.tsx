"use client";
import { useParams } from "next/navigation";
import { FlowLoading } from "@/components/onboarding/Flow";
import { RunDetailView, RunNotFound } from "@/components/running/RunViews";
import { useRun } from "@/lib/running/useRuns";
import { useRequireOnboarding } from "@/lib/onboarding/useRequireOnboarding";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ob = useRequireOnboarding();
  const { run, error, reload } = useRun(id);
  if (!ob.ready || run === undefined || error) return <FlowLoading error={ob.error ?? error} onRetry={ob.error ? ob.reload : reload} />;
  if (run === null) return <RunNotFound />;
  return <RunDetailView run={run} />;
}
