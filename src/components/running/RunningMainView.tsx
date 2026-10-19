// RUNNING Main — presentational. Receives already-resolved data; no fetching here.
import Link from "next/link";
import { deriveCardState } from "@/lib/running/state-policy";
import type { RunningMainData } from "@/lib/running/types";
import { AppFrame, AppHeader, BottomNav } from "@/components/ui/AppChrome";
import { PlusIcon } from "@/components/ui/icons";
import { RunnerCard } from "./RunnerCard";
import { RecentRuns } from "./RecentRuns";
import { CardShare } from "@/components/share/CardShare";
import { DATA_MODE } from "@/lib/config";

export function RunningMainView({ data, today }: { data: RunningMainData; today: string }) {
  const card = deriveCardState(data.runs, data.milestones, today);
  return (
    <AppFrame>
      <AppHeader demo={data.dataMode === "demo"} />
      <RunnerCard
        animal={data.animal}
        state={card.state}
        run={card.run}
        milestone={card.milestone}
        currentMode={data.currentMode}
        currentShoe={data.currentShoe}
      />
      <div className="px-6 pt-4">
        {/* DEMO preview data or a DEMO build → the image is marked DEMO DATA; real data → no mark */}
        <CardShare targetId="runner-card" card="runner" demo={data.dataMode === "demo" || DATA_MODE === "demo"} />
      </div>
      <div className="px-6 pt-[22px]">
        <Link
          href="/runs/new"
          className="flex h-[60px] items-center justify-between bg-gm-lime px-5 text-[18px] font-extrabold text-gm-bg"
        >
          오늘의 러닝 남기기
          <PlusIcon />
        </Link>
      </div>
      <RecentRuns runs={data.runs} today={today} />
      {/* privacy notice + "내 데이터 삭제" after onboarding (2026-10-19 decision A+B) — text link only, FINAL layout above unchanged */}
      <div className="px-6 pt-5">
        <Link href="/privacy" className="inline-flex h-11 items-center text-[13px] text-gm-g2 underline underline-offset-4">
          개인정보 안내 · 내 데이터 삭제
        </Link>
      </div>
      <BottomNav active="running" />
    </AppFrame>
  );
}
