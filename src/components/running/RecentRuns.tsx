import Link from "next/link";
import { formatKm, formatPace, paceSecPerKm, splitDate } from "@/lib/running/format";
import type { RunRecord } from "@/lib/running/types";
import { ArrowIcon } from "@/components/ui/icons";

function Row({ run, isToday }: { run: RunRecord; isToday: boolean }) {
  const { mon, day } = splitDate(run.runDate);
  return (
    <div className="grid h-16 grid-cols-[76px_minmax(0,1fr)_auto] items-center border-t border-gm-line">
      <span className="font-[family-name:var(--font-bl)] text-[13px] leading-4 font-semibold tracking-[0.06em] text-gm-g2">
        {isToday && (
          <>
            <span className="text-gm-lime">TODAY</span>
            <br />
          </>
        )}
        {mon} <span className="font-[family-name:var(--font-bc)] text-[18px] font-bold tracking-normal text-gm-g1">{day}</span>
      </span>
      <span className="flex items-baseline">
        <span className="tabular font-[family-name:var(--font-bc)] text-[38px] leading-none font-bold">{formatKm(run.distanceKm)}</span>
        <span className="ml-1 font-[family-name:var(--font-bl)] text-[13px] font-semibold text-gm-g1">KM</span>
      </span>
      <span className="tabular font-[family-name:var(--font-bc)] text-[22px] font-semibold text-gm-g1">
        {formatPace(paceSecPerKm(run.distanceKm, run.durationSec))}/KM
      </span>
    </div>
  );
}

export function RecentRuns({ runs, today, limit = 2 }: { runs: RunRecord[]; today: string; limit?: number }) {
  return (
    <section aria-label="Recent Runs" className="px-6 pt-7">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="m-0">
          <span className="gm-label" style={{ color: "var(--color-gm-g1)" }}>RECENT RUNS</span>
        </h2>
        <Link
          href="/stats"
          className="flex h-11 items-center gap-2 border border-gm-line3 px-3.5 font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.12em]"
        >
          VIEW STATS
          <ArrowIcon />
        </Link>
      </div>
      {runs.length === 0 ? (
        <div className="border-t border-gm-line py-[18px]">
          <p className="m-0 text-[15px] font-semibold">아직 기록이 없어요.</p>
          <p className="mt-1 mb-0 text-[14px] text-gm-g1">첫 러닝을 남기면 여기에 쌓여요.</p>
        </div>
      ) : (
        runs.slice(0, limit).map((r) => <Row key={r.id} run={r} isToday={r.runDate === today} />)
      )}
    </section>
  );
}
