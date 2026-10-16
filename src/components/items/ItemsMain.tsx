"use client";
// ITEMS — Runners Like You. UI handoff 08_ITEMS (items-main · state screens), cold-start rules in docs/ITEMS_COLD_START.md:
//   real    → list with real counts and shares ("비슷한 러너들의 선택"; wide range announced automatically)
//   example → DEMO-based example list, labelled "예시 데이터" + disclaimer, NO counts / shares / ranks
//   browse  → the active catalogue, NO numbers (also when height / weight / foot size are missing)
// The range widens automatically (no button). Real numbers come only from stored real records; nothing is invented.
import Link from "next/link";
import { formatShare } from "@/lib/items/aggregate";
import type { MatchItem, MatchProfile, Product } from "@/lib/items/types";
import { matchView, WIDE_NOTICE } from "@/lib/items/view";
import { track } from "@/lib/events/track";
import { useTrackOnce } from "@/lib/events/useTrackOnce";
import { ArrowIcon, BookmarkIcon } from "@/components/ui/icons";
import { LoadFailedBlock, SaveFailedBanner } from "@/components/ui/Feedback";
import { ShoeArt } from "./ShoeArt";
import { DemoBadge, DISTANCE_SHORT, SaveToggle, ShareBar, USE_LABEL, useItemsMatch, useSaved } from "./parts";

const asProduct = (s: MatchItem): Product => ({
  id: s.product_id, brand: s.brand, brand_ko: null, model_name: s.model_name, display_name: s.display_name,
  primary_use: s.primary_use, tags: s.tags, official_url: null, image_url: s.image_url, image_approved: s.image_approved,
});

const PROFILE_EDIT = "/onboarding/runner?return=/items";
const detailHref = (id: string) => `/items/${encodeURIComponent(id)}`;

function ProfileStrip({ me }: { me: MatchProfile }) {
  const cell = (value: number | string | null, unit: string, label: string) => (
    <div className="min-w-0">
      {value == null ? (
        <span className="block text-[16px] font-bold leading-[30px] text-gm-g2">미입력</span>
      ) : (
        <span className="flex items-baseline gap-[2px] whitespace-nowrap">
          <span className="tabular font-[family-name:var(--font-bc)] text-[28px] leading-none font-extrabold">{value}</span>
          <span className="font-[family-name:var(--font-bl)] text-[11px] font-bold text-gm-g1">{unit}</span>
        </span>
      )}
      <span className="gm-label mt-1 block">{label}</span>
    </div>
  );
  const n = (v: number | null) => (v == null ? null : Number.isInteger(v) ? v : Math.round(v * 10) / 10);
  return (
    <section className="border-t border-gm-line2 pt-4 pb-4">
      <div className="flex items-center justify-between">
        <span className="gm-label">YOUR RUNNING PROFILE</span>
        <Link href={PROFILE_EDIT} className="flex items-center gap-1 text-[14px] font-bold">
          내 정보 수정 <ArrowIcon size={14} />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {cell(n(me.height_cm), "CM", "HEIGHT")}
        {cell(n(me.weight_kg), "KG", "WEIGHT")}
        {cell(n(me.shoe_size_mm), "MM", "SHOE")}
        {cell(me.typical_run_distance ? DISTANCE_SHORT[me.typical_run_distance] ?? null : null, "KM", "USUALLY")}
      </div>
    </section>
  );
}

function GroupStrip({ label, badge, text, runners }: { label: string; badge: string | null; text: string; runners: number | null }) {
  return (
    <section className="flex items-center justify-between gap-3 border-y border-gm-line py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="gm-label">{label}</span>
          {badge && <DemoBadge text={badge} />}
        </div>
        <p className="mt-1 mb-0 text-[13px] text-gm-g1 [word-break:keep-all]">{text}</p>
      </div>
      {runners != null && (
        <div className="flex-none text-right">
          <span className="tabular block font-[family-name:var(--font-bc)] text-[40px] leading-none font-extrabold">{runners}</span>
          <span className="gm-label">RUNNERS</span>
        </div>
      )}
    </section>
  );
}

function WiderBanner() {
  return (
    <section className="mt-4 border border-gm-lime px-4 py-4">
      <span className="inline-block bg-gm-lime px-2 font-[family-name:var(--font-bl)] text-[11px] font-extrabold tracking-[0.16em] text-gm-bg">WIDER RANGE</span>
      <p className="mt-2 mb-0 text-[15px] font-bold">{WIDE_NOTICE}</p>
      <p className="mt-1 mb-0 text-[13px] text-gm-g1 [word-break:keep-all]">원래 조건(키 ±5cm · 체중 ±5kg · 발 ±10mm)으로는 5명이 되지 않아 키 ±10cm · 체중 ±10kg · 발 ±20mm로 넓혔어요.</p>
    </section>
  );
}

/** A product row without numbers — DEMO-based examples and catalogue browsing. */
function PlainRow({ s, saved, busy, onSave }: { s: MatchItem; saved: boolean; busy: boolean; onSave: () => void }) {
  return (
    <article className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 border-t border-gm-line py-4">
      <Link href={detailHref(s.product_id)} className="block" aria-label={`${s.display_name} 상세 보기`}>
        <ShoeArt imageUrl={s.image_url} approved={s.image_approved} alt={s.display_name} size="sm" />
      </Link>
      <div className="min-w-0">
        <span className="gm-label block">
          {s.brand.toUpperCase()}
          {s.primary_use ? ` · ${USE_LABEL[s.primary_use] ?? s.primary_use}` : ""}
        </span>
        <Link href={detailHref(s.product_id)} className="block font-[family-name:var(--font-bc)] text-[24px] leading-[1] font-extrabold uppercase [overflow-wrap:anywhere]">
          {s.model_name}
        </Link>
        <div className="mt-2 flex justify-end">
          <SaveToggle compact saved={saved} busy={busy} onToggle={onSave} />
        </div>
      </div>
    </article>
  );
}

export function ItemsMain({ me }: { me: MatchProfile }) {
  const { result: r, error, reload } = useItemsMatch(me);
  const { ids, toggle, busy, failed } = useSaved();
  useTrackOnce("items_view", { status: r?.status ?? null, range: r?.range ?? null, runners: r?.runners ?? null }, Boolean(r));
  const save = async (s: MatchItem) => {
    const res = await toggle(s.product_id, asProduct(s));
    if (res === "saved") track("shoe_save", { product_id: s.product_id, from: "items" });
    if (res === "unsaved") track("shoe_unsave", { product_id: s.product_id, from: "items" });
  };
  const v = r ? matchView(r) : null;
  return (
    <>
      <header className="flex h-14 items-center justify-between pr-3 pl-6">
        <span className="font-[family-name:var(--font-bc)] text-[17px] font-extrabold tracking-[0.22em]">GEARMATCH</span>
        <Link href="/items/saved" className="flex h-11 items-center gap-2 border border-gm-line3 px-3 font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.14em]">
          <BookmarkIcon size={16} /> SAVED
        </Link>
      </header>
      <main className="px-6">
        <h1 className="mt-3 mb-0 font-[family-name:var(--font-bc)] text-[52px] leading-[0.92] font-extrabold uppercase">RUNNERS LIKE YOU</h1>
        <p className="mt-3 mb-4 text-[16px] font-bold text-gm-g1">나와 비슷한 러너들은 어떤 신발을 신을까?</p>
        <ProfileStrip me={me} />
        {error ? (
          <LoadFailedBlock title="러닝화 정보를 불러오지 못했어요." onRetry={reload} />
        ) : !r || !v ? (
          <div className="h-40" aria-busy="true" />
        ) : (
          <>
            {v.needsProfile && (
              <section className="border-t border-gm-line2 pt-6">
                <p className="m-0 text-[18px] font-bold">비슷한 러너를 찾으려면 정보가 더 필요해요.</p>
                <p className="mt-2 mb-0 text-[15px] leading-6 text-gm-g1">키·체중·발 사이즈를 입력하면 조건이 비슷한 러너들의 신발을 볼 수 있어요.</p>
                <Link href={PROFILE_EDIT} className="mt-6 flex h-[60px] items-center justify-between bg-gm-lime px-5 text-[18px] font-extrabold text-gm-bg">
                  내 정보 추가하기
                  <ArrowIcon size={22} />
                </Link>
              </section>
            )}
            {v.wideNotice && <WiderBanner />}
            {v.groupLabel && (
              <div className={v.wideNotice ? "mt-4" : ""}>
                <GroupStrip
                  label={v.groupLabel}
                  badge={v.badge}
                  text={v.kind === "real" ? (r.range === "wide" ? "넓힌 조건과 비슷한 러너들이에요." : "이 조건과 비슷한 러너들의 장비를 살펴보세요.") : "실제 러너 기록이 아닌 예시 목록이에요."}
                  runners={v.showNumbers ? r.runners : null}
                />
              </div>
            )}
            {v.kind === "browse" && v.notice && (
              <section className="border-t border-gm-line2 pt-6">
                <p className="m-0 text-[18px] font-bold [word-break:keep-all]">{v.notice}</p>
                <p className="mt-2 mb-0 text-[15px] leading-6 text-gm-g1 [word-break:keep-all]">등록된 러닝화를 둘러보고 관심 신발로 저장할 수 있어요.</p>
              </section>
            )}
            <section className="mt-6">
              {failed && <div className="mb-3"><SaveFailedBanner message="저장하지 못했어요. 다시 시도해 주세요." /></div>}
              <h2 className="m-0 mb-4 text-[18px] font-bold">{v.heading}</h2>
              {v.kind === "example" && v.notice && <p className="mt-0 mb-4 text-[13px] leading-5 text-gm-g1 [word-break:keep-all]">{v.notice}</p>}
              {v.showNumbers
                ? r.items.slice(0, 10).map((s, i) => {
                    const rank = String(i + 1).padStart(2, "0");
                    const isSaved = ids.has(s.product_id);
                    const count = `${r.runners}명 중 ${s.runners}명`;
                    const share = s.share ?? 0;
                    if (i === 0 && r.range === "base")
                      return (
                        <article key={s.product_id} className="pb-6">
                          <div className="relative">
                            <ShoeArt imageUrl={s.image_url} approved={s.image_approved} alt={s.display_name} size="lg" />
                            <span className="tabular absolute top-3 left-4 font-[family-name:var(--font-bc)] text-[30px] font-extrabold">{rank}</span>
                          </div>
                          <span className="gm-label mt-5 block">{s.brand.toUpperCase()}</span>
                          <div className="flex items-end justify-between gap-3">
                            <h3 className="m-0 font-[family-name:var(--font-bc)] text-[38px] leading-[0.95] font-extrabold uppercase [overflow-wrap:anywhere]">{s.model_name}</h3>
                            <span className="tabular flex-none font-[family-name:var(--font-bc)] text-[40px] leading-none font-extrabold">{formatShare(share)}</span>
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <span className="flex-none text-[14px] font-bold">{count}</span>
                            <span className="flex-1"><ShareBar share={share} /></span>
                          </div>
                          <div className="mt-5 flex gap-2">
                            <Link href={detailHref(s.product_id)} className="flex h-[60px] flex-1 items-center justify-between bg-gm-lime px-5 text-[17px] font-extrabold text-gm-bg">
                              제품 살펴보기 <ArrowIcon size={20} />
                            </Link>
                            <SaveToggle saved={isSaved} busy={busy === s.product_id} onToggle={() => save(s)} />
                          </div>
                        </article>
                      );
                    return (
                      <article key={s.product_id} className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 border-t border-gm-line py-4">
                        <Link href={detailHref(s.product_id)} className="relative block" aria-label={`${s.display_name} 상세 보기`}>
                          <ShoeArt imageUrl={s.image_url} approved={s.image_approved} alt={s.display_name} size="sm" />
                          <span className="tabular absolute top-1 left-2 font-[family-name:var(--font-bc)] text-[18px] font-extrabold">{rank}</span>
                        </Link>
                        <div className="min-w-0">
                          <span className="gm-label block">{s.brand.toUpperCase()}</span>
                          <Link href={detailHref(s.product_id)} className="block font-[family-name:var(--font-bc)] text-[24px] leading-[1] font-extrabold uppercase [overflow-wrap:anywhere]">
                            {s.model_name}
                          </Link>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="min-w-0">
                              <span className="flex items-baseline gap-2 whitespace-nowrap">
                                <span className="text-[13px] font-bold">{count}</span>
                                <span className="tabular font-[family-name:var(--font-bc)] text-[20px] font-extrabold text-gm-g1">{formatShare(share)}</span>
                              </span>
                              <span className="mt-1 block w-[120px]"><ShareBar share={share} cells={16} /></span>
                            </span>
                            <SaveToggle compact saved={isSaved} busy={busy === s.product_id} onToggle={() => save(s)} />
                          </div>
                        </div>
                      </article>
                    );
                  })
                : r.items.map((s) => <PlainRow key={s.product_id} s={s} saved={ids.has(s.product_id)} busy={busy === s.product_id} onSave={() => save(s)} />)}
              {r.items.length === 0 && <p className="m-0 border-t border-gm-line py-4 text-[15px] text-gm-g1">아직 표시할 러닝화가 없어요.</p>}
              {v.kind === "real" && r.range === "wide" && <p className="mt-4 mb-0 text-[13px] text-gm-g1">넓힌 그룹 {r.runners}명 기준이에요.</p>}
            </section>
          </>
        )}
      </main>
    </>
  );
}
