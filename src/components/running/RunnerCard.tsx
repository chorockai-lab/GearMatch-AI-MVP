// Runner Card = scene + runner name + state block. Copy and layout follow RUNNING MAIN FINAL MASTER.
import Link from "next/link";
import { ANIMALS, type AnimalId } from "@/lib/identity/animals";
import { formatDuration, formatKm, formatPace, paceSecPerKm, splitDate } from "@/lib/running/format";
import type { CardState, MilestoneEvent, RunRecord } from "@/lib/running/types";
import { ModeBars } from "@/components/ui/icons";
import { RunnerScene } from "./RunnerScene";

interface Props {
  animal: AnimalId;
  state: CardState;
  run: RunRecord | null;
  milestone: MilestoneEvent | null;
  currentMode: string | null;
  currentShoe: string | null;
}

function Cell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0">
      <span className="gm-label">{label}</span>
      <span className="mt-1 flex items-baseline gap-[3px] whitespace-nowrap">
        <span className="tabular font-[family-name:var(--font-bc)] text-[26px] leading-none font-bold">{value}</span>
        {unit && <span className="font-[family-name:var(--font-bl)] text-[12px] font-semibold text-gm-g1">{unit}</span>}
      </span>
    </div>
  );
}

export function RunnerCard({ animal, state, run, milestone, currentMode, currentShoe }: Props) {
  const a = ANIMALS[animal];
  const shoeText = currentShoe ?? "—";
  return (
    <section id="runner-card" aria-label="My Runner">
      <RunnerScene animal={animal} state={state} />

      <div className="flex items-center justify-between pt-[14px] pr-3 pl-6">
        <h1 className="m-0 font-[family-name:var(--font-bc)] text-[40px] leading-[0.95] font-extrabold uppercase [overflow-wrap:anywhere]">
          {a.nameEn} RUNNER
        </h1>
        <Link href={`/runner-type?animal=${animal}`} aria-label={`${a.nameKo}형 러너 설명 보기`} className="grid size-11 flex-none place-items-center">
          <span className="grid size-[26px] place-items-center border border-gm-line3 font-[family-name:var(--font-bl)] text-[14px] font-bold text-gm-g1">?</span>
        </Link>
      </div>

      {state === "first" && (
        <p className="mx-6 mt-[10px] text-[15px] leading-[22px] font-semibold">
          <span style={{ boxShadow: "inset 0 -7px 0 rgba(215,255,46,0.28)" }}>나만의 {a.nameKo}형 Runner가 완성됐어요.</span>
        </p>
      )}

      {(state === "first" || state === "base") && (
        <div className="mx-6 mt-[14px] grid grid-cols-2 gap-4">
          <div>
            <span className="gm-label">CURRENT MODE</span>
            <span className="mt-1.5 block">
              {currentMode ? (
                <span className="flex items-center gap-2 font-[family-name:var(--font-bc)] text-[18px] font-bold tracking-[0.04em]">
                  <ModeBars />
                  {currentMode}
                </span>
              ) : (
                <span className="font-[family-name:var(--font-bc)] text-[18px] font-bold text-gm-g1">—</span>
              )}
            </span>
          </div>
          <div>
            <span className="gm-label">CURRENT SHOE</span>
            <span className="mt-1.5 block text-[16px] leading-[22px] font-semibold break-keep">{shoeText}</span>
          </div>
        </div>
      )}

      {(state === "run" || state === "milestone") && run && (
        <div className="mx-6 mt-4 border-t border-gm-line pt-3">
          <div className="flex items-center gap-2.5">
            {state === "milestone" && milestone ? (
              <span className="inline-flex h-[26px] items-center bg-gm-lime px-2.5 font-[family-name:var(--font-bc)] text-[17px] font-extrabold tracking-[0.06em] text-gm-bg">
                {milestone.label}
              </span>
            ) : (
              <span className="inline-flex h-[26px] items-center">
                <span className="gm-label" style={{ color: "var(--color-gm-lime)" }}>TODAY&apos;S RUN</span>
              </span>
            )}
            <span className="ml-auto flex items-baseline gap-1">
              <span className="tabular font-[family-name:var(--font-bc)] text-[44px] leading-none font-extrabold">{formatKm(run.distanceKm)}</span>
              <span className="font-[family-name:var(--font-bl)] text-[13px] font-semibold text-gm-g1">KM</span>
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Cell label="PACE" value={formatPace(paceSecPerKm(run.distanceKm, run.durationSec))} unit="/KM" />
            <Cell label="TIME" value={formatDuration(run.durationSec)} />
            <Cell label="DATE" value={`${splitDate(run.runDate).mon} ${splitDate(run.runDate).day}`} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="gm-label flex-none">SHOE</span>
            {/* long names: one line + ellipsis (same rule as MOST USED SHOE on the Stats card) */}
            <span className="min-w-0 truncate text-[15px] font-semibold">{run.shoe ?? "—"}</span>
          </div>
        </div>
      )}
    </section>
  );
}
