"use client";
// Stats Card · Stats Detail — UI handoff 07_STATS_HISTORY: stats-card · stats-detail · stats-empty.
// Data only (no characters). All numbers come from computeStats() over the user's saved runs.
import Link from "next/link";
import { computeStats, type Stats } from "@/lib/running/stats";
import { formatDuration, formatKm, formatKmSigned, formatMonDay, formatMonYear, formatPace, paceSecPerKm, weekdayEn } from "@/lib/running/format";
import type { RunRecord } from "@/lib/running/types";
import { ArrowIcon, BackIcon, PlusIcon } from "@/components/ui/icons";
import { CardShare } from "@/components/share/CardShare";
import { DATA_MODE } from "@/lib/config";

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <span className={`gm-label block ${className}`}>{children}</span>;
const Num = ({ children, size, className = "" }: { children: React.ReactNode; size: string; className?: string }) => (
  <span className={`tabular font-[family-name:var(--font-bc)] leading-none font-extrabold ${size} ${className}`}>{children}</span>
);
const Unit = ({ children }: { children: React.ReactNode }) => <span className="font-[family-name:var(--font-bl)] text-[12px] font-bold tracking-[0.12em] text-gm-g1">{children}</span>;

/** "지난 4주보다 6.3km 더 달렸어요." and its variants (provisional copy for the non-designed cases) */
function diffSentence(s: Stats): string {
  if (s.previous.km === 0) return s.recent.km > 0 ? `최근 4주 동안 ${formatKm(s.recent.km)}km를 달렸어요.` : "최근 4주에는 기록이 없어요.";
  if (s.diffKm > 0) return `지난 4주보다 ${formatKm(s.diffKm)}km 더 달렸어요.`;
  if (s.diffKm < 0) return `지난 4주보다 ${formatKm(-s.diffKm)}km 덜 달렸어요.`;
  return "지난 4주와 같은 거리를 달렸어요.";
}

function Bars({ values, highlight, dim }: { values: number[]; highlight: number; dim?: (i: number) => boolean }) {
  const max = Math.max(...values, 0.0001);
  return (
    <div className="flex h-[118px] items-end gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end">
          {v > 0 && <span className="tabular mb-1 font-[family-name:var(--font-bc)] text-[15px] font-bold text-gm-g1">{formatKm(v)}</span>}
          <span
            className={`block w-full ${i === highlight && v > 0 ? "bg-gm-lime" : dim?.(i) ? "bg-gm-line2" : "bg-gm-g2"}`}
            style={{ height: v > 0 ? `${Math.max(4, Math.round((v / max) * 70))}px` : "2px", background: v > 0 ? undefined : "#3A3A37" }}
          />
        </div>
      ))}
    </div>
  );
}

function EmptyStats() {
  return (
    <>
      <Label>LAST 4 WEEKS</Label>
      <p className="m-0 mt-1 flex items-baseline gap-2">
        <Num size="text-[88px]" className="text-gm-g2">0.0</Num>
        <Unit>KM</Unit>
      </p>
      <p className="mt-4 mb-0 text-[16px] font-bold">아직 기록이 없어요.</p>
      <p className="mt-1 mb-0 text-[15px] text-gm-g1">첫 러닝을 남기면 여기에 쌓여요.</p>
      <div className="mt-5 border-t border-gm-line2 pt-5">
        <Label>WEEKLY DISTANCE</Label>
        <div className="mt-14 grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((w) => (
            <span key={w} className="border-t-2 border-gm-line2 pt-2 text-center font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.14em] text-gm-g2">
              WK {w}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

export function StatsCardView({ runs, today }: { runs: RunRecord[]; today: string }) {
  const s = computeStats(runs, today);
  const empty = runs.length === 0;
  return (
    <>
      <div className="px-6">
        <Link href="/running" className="-ml-1 flex h-12 items-center gap-3 font-[family-name:var(--font-bl)] text-[14px] font-bold tracking-[0.16em]">
          <BackIcon />
          VIEW RUNNER
        </Link>
        <section id="stats-card" aria-label="Stats" className="mt-2 border border-gm-line bg-gm-field px-[18px] py-5">
          {empty ? (
            <EmptyStats />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label>LAST 4 WEEKS</Label>
                  <p className="m-0 mt-1 flex items-baseline gap-2">
                    <Num size="text-[88px]">{formatKm(s.recent.km)}</Num>
                    <Unit>KM</Unit>
                  </p>
                </div>
                <div className="text-right">
                  <Label>VS PREV 4 WK</Label>
                  <Num size="text-[30px]" className={`mt-4 block whitespace-nowrap ${s.diffKm > 0 ? "text-gm-lime" : ""}`}>
                    {formatKmSigned(s.diffKm)} KM
                  </Num>
                  <span className="tabular mt-1 block text-[13px] text-gm-g1">
                    {s.diffPct != null ? `${s.diffPct > 0 ? "+" : ""}${s.diffPct}% · ` : ""}
                    {formatKm(s.previous.km)} KM
                  </span>
                </div>
              </div>
              <p className="mt-3 mb-0 text-[16px] font-bold">{diffSentence(s)}</p>

              <div className="mt-5 border-t border-gm-line2 pt-5">
                <Label>WEEKLY DISTANCE</Label>
                <div className="mt-3">
                  <Bars values={s.weeks.slice(4)} highlight={3} />
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((w) => (
                    <span key={w} className="text-center font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.14em] text-gm-g2">WK {w}</span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-gm-line2 pt-5">
                <div>
                  <Label>GEARMATCH MILEAGE</Label>
                  <span className="mt-1 block text-[12px] text-gm-g1">
                    {s.total.runs} {s.total.runs === 1 ? "RUN" : "RUNS"}{s.total.since ? ` · SINCE ${formatMonYear(s.total.since)}` : ""}
                  </span>
                </div>
                <p className="m-0 flex items-baseline gap-1.5">
                  <Num size="text-[36px]">{formatKm(s.total.km)}</Num>
                  <Unit>KM</Unit>
                </p>
              </div>

              <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 border-t border-gm-line2 pt-5">
                <div>
                  <Label>AVG PACE</Label>
                  <p className="m-0 mt-1 flex items-baseline gap-1">
                    <Num size="text-[30px]">{formatPace(s.recent.paceSec)}</Num>
                    {s.recent.paceSec != null && <Unit>/KM</Unit>}
                  </p>
                </div>
                <div className="min-w-0">
                  <Label>MOST USED SHOE</Label>
                  {s.mostUsedShoe ? (
                    <p className="m-0 mt-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-semibold">{s.mostUsedShoe.label}</span>
                      <Num size="text-[22px]" className="flex-none text-gm-g1">{formatKm(s.mostUsedShoe.km)}KM</Num>
                    </p>
                  ) : (
                    <p className="m-0 mt-1 text-[15px] text-gm-g1">—</p>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        <div className="mt-3">
          {/* DEMO build (local, temporary data) → the image is marked DEMO DATA; real data → no mark */}
          <CardShare targetId="stats-card" card="stats" demo={DATA_MODE === "demo"} />
        </div>

        {empty ? (
          <Link href="/runs/new" className="mt-4 flex h-[60px] items-center justify-between bg-gm-lime px-5 text-[18px] font-extrabold text-gm-bg">
            오늘의 러닝 남기기
            <PlusIcon />
          </Link>
        ) : (
          <Link href="/stats/detail" className="mt-4 flex h-[58px] items-center justify-between border border-gm-line3 px-5 text-[17px] font-bold">
            상세 통계 보기
            <ArrowIcon size={20} />
          </Link>
        )}
      </div>
    </>
  );
}

const pad2 = (n: number) => String(n);
function hoursMinutes(sec: number) {
  return { h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60) };
}
const weekLabel = (i: number) => (i < 4 ? `${i - 4}` : `${i - 3}`);

function paceSentence(s: Stats): string | null {
  if (s.paceDeltaSec == null) return null;
  if (s.paceDeltaSec > 0) return `최근 4주는 이전 4주보다 km당 ${s.paceDeltaSec}초 빠른 페이스예요.`;
  if (s.paceDeltaSec < 0) return `최근 4주는 이전 4주보다 km당 ${-s.paceDeltaSec}초 느린 페이스예요.`;
  return "최근 4주와 이전 4주의 페이스가 같아요.";
}

export function StatsDetailView({ runs, today }: { runs: RunRecord[]; today: string }) {
  const s = computeStats(runs, today);
  const rt = hoursMinutes(s.recent.durationSec);
  const ps = paceSentence(s);
  const recentRuns = runs.slice(0, 3);
  const section = "mt-7 border-t border-gm-line pt-6";
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-gm-bg pb-12">
      <div className="flex h-14 items-center justify-between px-6">
        <Link href="/stats" aria-label="이전" className="-ml-2 grid size-11 place-items-center">
          <BackIcon />
        </Link>
        <span className="font-[family-name:var(--font-bl)] text-[14px] font-bold tracking-[0.16em]">RUNNING STATS</span>
      </div>
      <main className="px-6">
        <div className="flex items-center justify-between">
          <Label>LAST 4 WEEKS</Label>
          <Label>{formatMonDay(s.recent.from)} — {formatMonDay(s.recent.to)}</Label>
        </div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="m-0 flex items-baseline gap-2">
            <Num size="text-[96px]">{formatKm(s.recent.km)}</Num>
            <Unit>KM</Unit>
          </p>
          <div className="pb-2 text-right">
            <Label>VS PREV 4 WK</Label>
            <Num size="text-[30px]" className={`mt-1 block whitespace-nowrap ${s.diffKm > 0 ? "text-gm-lime" : ""}`}>{formatKmSigned(s.diffKm)} KM</Num>
            {s.diffPct != null && <span className="tabular mt-1 block text-[13px] text-gm-g1">{s.diffPct > 0 ? "+" : ""}{s.diffPct}%</span>}
          </div>
        </div>
        <p className="mt-3 mb-0 text-[16px] font-bold">{diffSentence(s)}</p>
        <div className="mt-6 flex items-center justify-between border-y border-gm-line py-4">
          <span className="text-[13px] text-gm-g1">PREVIOUS 4 WEEKS · {formatMonDay(s.previous.from)} — {formatMonDay(s.previous.to)}</span>
          <Num size="text-[24px]" className="text-gm-g1">{formatKm(s.previous.km)}KM</Num>
        </div>

        <section className={section}>
          <div className="flex items-center justify-between">
            <Label>WEEKLY FLOW</Label>
            <Label>PREVIOUS · RECENT</Label>
          </div>
          <p className="mt-2 mb-4 text-[14px] text-gm-g1">최근 8주 동안 주마다 달린 거리예요.</p>
          <Bars values={s.weeks} highlight={7} dim={(i) => i < 4} />
          <div className="mt-2 flex gap-2">
            {s.weeks.map((_, i) => (
              <span key={i} className="flex-1 text-center font-[family-name:var(--font-bl)] text-[13px] font-bold text-gm-g2">{weekLabel(i)}</span>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[13px] text-gm-g1">
            <span>PREVIOUS 4 WEEKS · {formatKm(s.previous.km)}</span>
            <span className="text-gm-tx">RECENT 4 WEEKS · {formatKm(s.recent.km)}</span>
          </div>
          {s.maxWeek != null && (
            <p className="mt-3 mb-0 text-[15px] font-bold">
              WK {weekLabel(s.maxWeek)}에 {formatKm(s.weeks[s.maxWeek])}km로, 8주 중 가장 많이 달렸어요.
            </p>
          )}
        </section>

        <section className={section}>
          <div className="flex items-center justify-between">
            <Label>RUNNING RHYTHM</Label>
            <Label>LAST 4 WEEKS</Label>
          </div>
          <div className="mt-3 grid grid-cols-2">
            <div>
              <Label>RUNS</Label>
              <Num size="text-[44px]" className="mt-1 block">{s.recent.runs}</Num>
            </div>
            <div>
              <Label>RUNNING TIME</Label>
              <p className="m-0 mt-1 flex items-baseline gap-1">
                <Num size="text-[44px]">{pad2(rt.h)}</Num><Unit>H</Unit>
                <Num size="text-[44px]" className="ml-2">{pad2(rt.m)}</Num><Unit>M</Unit>
              </p>
            </div>
          </div>
        </section>

        <section className={section}>
          <Label>AVG PACE</Label>
          <div className="mt-3 grid grid-cols-2">
            <div>
              <Label>RECENT 4 WEEKS</Label>
              <p className="m-0 mt-1 flex items-baseline gap-1"><Num size="text-[44px]">{formatPace(s.recent.paceSec)}</Num>{s.recent.paceSec != null && <Unit>/KM</Unit>}</p>
            </div>
            <div>
              <Label>PREVIOUS 4 WEEKS</Label>
              <p className="m-0 mt-1 flex items-baseline gap-1"><Num size="text-[44px]" className="text-gm-g1">{formatPace(s.previous.paceSec)}</Num>{s.previous.paceSec != null && <Unit>/KM</Unit>}</p>
            </div>
          </div>
          {ps && <p className="mt-3 mb-0 text-[15px] font-bold">{ps}</p>}
        </section>

        <section className={section}>
          <Label>HIGHLIGHT</Label>
          {s.longest ? (
            <div className="mt-3 grid grid-cols-[auto_auto_minmax(0,1fr)] items-end gap-x-6">
              <div>
                <Label>LONGEST RUN</Label>
                <p className="m-0 mt-1 flex items-baseline gap-1"><Num size="text-[44px]">{formatKm(s.longest.distanceKm)}</Num><Unit>KM</Unit></p>
              </div>
              <div>
                <Label>DATE</Label>
                <Num size="text-[24px]" className="mt-1 block">{formatMonDay(s.longest.runDate)}</Num>
              </div>
              <div className="min-w-0">
                <Label>SHOE</Label>
                <span className="mt-1 block text-[14px] font-semibold [overflow-wrap:anywhere]">{s.longest.shoe ?? "신발 미지정"}</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 mb-0 text-[15px] text-gm-g1">최근 4주에는 기록이 없어요.</p>
          )}
        </section>

        <section className={section}>
          <Label>RECENT RUNS</Label>
          <ul className="mt-3 p-0">
            {recentRuns.map((r) => (
              <li key={r.id} className="list-none border-t border-gm-line">
                <Link href={`/runs/${r.id}`} className="grid grid-cols-[78px_minmax(0,1fr)_auto] items-center gap-x-3 py-3">
                  <span>
                    <span className="block font-[family-name:var(--font-bc)] text-[19px] font-extrabold">{formatMonDay(r.runDate)}</span>
                    <span className="gm-label block">{weekdayEn(r.runDate)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-1"><Num size="text-[30px]">{formatKm(r.distanceKm)}</Num><Unit>KM</Unit></span>
                    <span className="block truncate text-[13px] text-gm-g1">{r.shoe ?? "신발 미지정"}</span>
                  </span>
                  <Num size="text-[22px]" className="text-gm-g1">{formatPace(paceSecPerKm(r.distanceKm, r.durationSec))}/KM</Num>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/runs" className="mt-4 flex h-[56px] items-center justify-center border border-gm-line3 text-[16px] font-bold">
            전체 기록 보기
          </Link>
          <p className="sr-only">총 러닝 시간 {formatDuration(s.recent.durationSec)}</p>
        </section>
      </main>
    </div>
  );
}
