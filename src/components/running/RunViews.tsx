"use client";
// Run Detail · Run History — UI handoff 06_RUNNING_RECORDS: run-detail · run-history · run-history-empty.
import Link from "next/link";
import { formatDateKo, formatDuration, formatKm, formatMonDay, formatMonthHeading, formatPace, paceSecPerKm, weekdayEn } from "@/lib/running/format";
import type { RunRecord } from "@/lib/running/types";
import { ArrowIcon, BackIcon, ChevronDownIcon, PlusIcon } from "@/components/ui/icons";

function TopBack({ href, right }: { href: string; right?: React.ReactNode }) {
  return (
    <div className="flex h-14 items-center justify-between px-6">
      <Link href={href} className="-ml-2 flex h-11 items-center gap-2.5 px-2 text-[16px] font-bold">
        <BackIcon />
        이전
      </Link>
      {right}
    </div>
  );
}

const BigTitle = ({ children }: { children: React.ReactNode }) => (
  <h1 className="mt-2 mb-0 font-[family-name:var(--font-bc)] text-[56px] leading-none font-extrabold uppercase">{children}</h1>
);

export function RunDetailView({ run }: { run: RunRecord }) {
  const pace = paceSecPerKm(run.distanceKm, run.durationSec);
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-gm-bg">
      <TopBack href="/runs" right={<span className="gm-label">{formatMonDay(run.runDate)} · {weekdayEn(run.runDate)}</span>} />
      <main className="flex-1 px-6 pb-[120px]">
        <BigTitle>RUN DETAIL</BigTitle>
        <div className="mt-7 border-t border-gm-line2 pt-4">
          <span className="gm-label">DISTANCE</span>
          <p className="m-0 flex items-baseline gap-2">
            <span className="tabular font-[family-name:var(--font-bc)] text-[96px] leading-[0.95] font-extrabold">{formatKm(run.distanceKm)}</span>
            <span className="font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.14em] text-gm-g1">KM</span>
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 border-t border-gm-line pt-4 pb-5">
          <div>
            <span className="gm-label">TIME</span>
            <p className="tabular mt-1 mb-0 font-[family-name:var(--font-bc)] text-[38px] leading-none font-extrabold">{formatDuration(run.durationSec)}</p>
          </div>
          <div>
            <span className="gm-label">AVG PACE</span>
            <p className="mt-1 mb-0 flex items-baseline gap-1">
              <span className="tabular font-[family-name:var(--font-bc)] text-[38px] leading-none font-extrabold">{formatPace(pace)}</span>
              <span className="font-[family-name:var(--font-bl)] text-[12px] font-bold text-gm-g1">/KM</span>
            </p>
          </div>
        </div>
        <div className="flex h-[57px] items-center justify-between border-t border-gm-line">
          <span className="gm-label">DATE</span>
          <span className="text-[16px] font-semibold">{formatDateKo(run.runDate)}</span>
        </div>
        <div className="flex items-center justify-between border-y border-gm-line py-3">
          <span className="gm-label">SHOE</span>
          <span className="text-right">
            <span className="block text-[16px] font-semibold">{run.shoe ?? "신발 미지정"}</span>
            <span className="block text-[13px] text-gm-g1">이 러닝에 신은 신발</span>
          </span>
        </div>
      </main>
      <div className="fixed bottom-0 left-1/2 z-10 w-full max-w-[430px] -translate-x-1/2 bg-gm-bg px-6 pt-3" style={{ paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
        <Link href={`/runs/${run.id}/edit`} className="flex h-[60px] items-center justify-between bg-gm-lime px-5 text-[18px] font-extrabold text-gm-bg">
          기록 수정하기
          <ArrowIcon size={22} />
        </Link>
      </div>
    </div>
  );
}

function HistoryRow({ run }: { run: RunRecord }) {
  return (
    <li className="list-none border-t border-gm-line">
      <Link href={`/runs/${run.id}`} className="grid grid-cols-[84px_minmax(0,1fr)_20px] items-center gap-x-3 py-3">
        <span>
          <span className="block font-[family-name:var(--font-bc)] text-[20px] leading-tight font-extrabold">{formatMonDay(run.runDate)}</span>
          <span className="gm-label block">{weekdayEn(run.runDate)}</span>
        </span>
        <span className="min-w-0">
          <span className="flex items-baseline gap-1.5">
            <span className="tabular font-[family-name:var(--font-bc)] text-[30px] leading-none font-extrabold">{formatKm(run.distanceKm)}</span>
            <span className="font-[family-name:var(--font-bl)] text-[12px] font-bold tracking-[0.14em] text-gm-g1">KM</span>
          </span>
          <span className="tabular mt-1 block font-[family-name:var(--font-bc)] text-[19px] font-bold text-gm-g1">
            {formatDuration(run.durationSec)} · {formatPace(paceSecPerKm(run.distanceKm, run.durationSec))}/KM
          </span>
          <span className={`mt-0.5 block truncate text-[13px] ${run.shoe ? "text-gm-g1" : "text-gm-g2"}`}>{run.shoe ?? "신발 미지정"}</span>
        </span>
        <span className="-rotate-90 text-gm-g1"><ChevronDownIcon size={18} /></span>
      </Link>
    </li>
  );
}

export function RunHistoryView({ runs }: { runs: RunRecord[] }) {
  const months: { key: string; runs: RunRecord[] }[] = [];
  for (const r of runs) {
    const key = r.runDate.slice(0, 7);
    const last = months[months.length - 1];
    if (last?.key === key) last.runs.push(r);
    else months.push({ key, runs: [r] });
  }
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-gm-bg pb-12">
      <TopBack href="/running" />
      <main className="px-6">
        <BigTitle>RUN HISTORY</BigTitle>
        {runs.length === 0 ? (
          <div className="mt-8 border-t border-gm-line2 pt-6">
            <p className="m-0 text-[18px] font-bold">아직 러닝 기록이 없어요.</p>
            <p className="mt-1 mb-0 text-[15px] text-gm-g1">첫 러닝을 남겨보세요.</p>
            <Link href="/runs/new" className="mt-6 flex h-[60px] items-center justify-between bg-gm-lime px-5 text-[18px] font-extrabold text-gm-bg">
              오늘의 러닝 남기기
              <PlusIcon />
            </Link>
          </div>
        ) : (
          months.map((m) => (
            <section key={m.key} className="mt-7">
              <h2 className="gm-label m-0 pb-2">{formatMonthHeading(`${m.key}-01`)}</h2>
              <ul className="m-0 p-0">{m.runs.map((r) => <HistoryRow key={r.id} run={r} />)}</ul>
            </section>
          ))
        )}
      </main>
    </div>
  );
}

export function RunNotFound() {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-gm-bg">
      <TopBack href="/runs" />
      <main className="px-6 pt-6">
        <p className="m-0 text-[18px] font-bold">이 기록을 찾을 수 없어요.</p>
        <p className="mt-1 mb-0 text-[15px] text-gm-g1">삭제되었거나 다른 브라우저에서 만든 기록일 수 있어요.</p>
      </main>
    </div>
  );
}
