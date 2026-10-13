"use client";
// RUNNING Main fed by the user's own data: onboarding result (animal + current shoe) + saved runs.
// The FINAL RunningMainView is reused unchanged; card state comes from state-policy.ts (provisional policy).
// Milestones stay disabled (milestones.ts) until the conditions are confirmed.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { localDate } from "@/lib/running/format";
import { deriveCardState } from "@/lib/running/state-policy";
import { useRuns } from "@/lib/running/useRuns";
import { nextOnboardingPath } from "@/lib/onboarding/repository";
import { SHOE_UNKNOWN_LABEL } from "@/lib/onboarding/options";
import { useOnboarding } from "@/lib/onboarding/useOnboarding";
import { useTrackOnce } from "@/lib/events/useTrackOnce";
import { ANIMALS } from "@/lib/identity/animals";
import { AppFrame, AppHeader, BottomNav } from "@/components/ui/AppChrome";
import { LoadFailedBlock } from "@/components/ui/Feedback";
import { PlusIcon } from "@/components/ui/icons";
import { FlowLoading } from "@/components/onboarding/Flow";
import Link from "next/link";
import { RunningMainView } from "./RunningMainView";

/** UI handoff 09 load-failed: scene area blank, name kept, values "—", retry under RECENT RUNS. */
function RunningLoadFailed({ title, onRetry }: { title: string | null; onRetry: () => void }) {
  return (
    <AppFrame>
      <AppHeader />
      <div aria-hidden="true" className="h-[192px] border-b border-gm-line2 bg-[#111110]" />
      <div className="px-6 pt-[14px]">
        {title && <h1 className="m-0 font-[family-name:var(--font-bc)] text-[40px] leading-[0.95] font-extrabold uppercase">{title}</h1>}
        <div className="mt-[14px] grid grid-cols-2 gap-4">
          <div><span className="gm-label">CURRENT MODE</span><span className="mt-1.5 block text-[18px] text-gm-g1">—</span></div>
          <div><span className="gm-label">CURRENT SHOE</span><span className="mt-1.5 block text-[18px] text-gm-g1">—</span></div>
        </div>
      </div>
      <div className="px-6 pt-[22px]">
        <Link href="/runs/new" className="flex h-[60px] items-center justify-between bg-gm-lime px-5 text-[18px] font-extrabold text-gm-bg">
          오늘의 러닝 남기기
          <PlusIcon />
        </Link>
      </div>
      <section className="px-6 pt-7">
        <h2 className="m-0 mb-2"><span className="gm-label" style={{ color: "var(--color-gm-g1)" }}>RECENT RUNS</span></h2>
        <LoadFailedBlock onRetry={onRetry} />
      </section>
      <BottomNav active="running" />
    </AppFrame>
  );
}

export function RunningFromOnboarding() {
  const router = useRouter();
  const ob = useOnboarding();
  const { runs, error, reload } = useRuns();
  const state = ob.state;
  const ready = Boolean(state?.identity && state.completed_at);
  const today = localDate();

  useEffect(() => {
    if (state && !ready) router.replace(nextOnboardingPath(state));
  }, [state, ready, router]);

  const cardState = runs ? deriveCardState(runs, [], today).state : null;
  useTrackOnce("running_view", { state: cardState, runs: runs?.length ?? 0 }, Boolean(ready && cardState));

  if (ob.error) return <FlowLoading error={ob.error} onRetry={ob.reload} />;
  if (!state || !ready || !state.identity) return <AppFrame>{null}</AppFrame>;
  if (error) return <RunningLoadFailed title={`${ANIMALS[state.identity.animal_type_v2].nameEn} RUNNER`} onRetry={reload} />;
  if (!runs) return <AppFrame>{null}</AppFrame>;

  const p = state.profile;
  const currentShoe = p.current_shoe_status === "known" ? p.current_shoe_label : p.current_shoe_status === "unknown" ? SHOE_UNKNOWN_LABEL : null;
  return (
    <RunningMainView
      today={today}
      data={{
        animal: state.identity.animal_type_v2,
        currentMode: null, // no approved rule (DECISION NEEDED)
        currentShoe,
        runs,
        milestones: [], // MILESTONES_ENABLED = false until conditions are confirmed
        dataMode: "real",
      }}
    />
  );
}
