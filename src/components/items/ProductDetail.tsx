"use client";
// Product Detail — UI handoff 08_ITEMS: product-detail · product-detail-saved. Saving keeps the user on this screen.
// "RUNNERS LIKE YOU" numbers come from the same aggregate as the list (same range); no numbers when the group is too small.
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatShare } from "@/lib/items/aggregate";
import { itemsRepository } from "@/lib/items/repository";
import type { MatchProfile, Product, Range } from "@/lib/items/types";
import { track } from "@/lib/events/track";
import { useTrackOnce } from "@/lib/events/useTrackOnce";
import { ArrowIcon, BackIcon, BookmarkIcon } from "@/components/ui/icons";
import { LoadFailedBlock, SaveFailedBanner } from "@/components/ui/Feedback";
import { ShoeArt } from "./ShoeArt";
import { DemoBadge, USE_LABEL, useRunnersLikeYou, useSaved } from "./parts";

export function ProductDetail({ id, range, from, me }: { id: string; range: Range; from: string; me: MatchProfile }) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const { result: r } = useRunnersLikeYou(range, me);
  const { ids, toggle, busy, failed } = useSaved();
  useTrackOnce("shoe_detail_view", { product_id: id, range, from }, product != null);

  useEffect(() => {
    let alive = true;
    itemsRepository.product(id).then(
      (p) => alive && setProduct(p),
      (e) => alive && setLoadError(e ?? new Error("load failed")),
    );
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const back = from === "saved" ? "/items/saved" : range === "wide" ? "/items?range=wide" : "/items";
  const top = (
    <Link href={back} className="-ml-1 flex h-14 items-center gap-3 px-6 font-[family-name:var(--font-bl)] text-[15px] font-bold tracking-[0.12em]">
      <BackIcon /> {from === "saved" ? "SAVED" : "ITEMS"}
    </Link>
  );
  if (loadError) return <>{top}<div className="px-6"><LoadFailedBlock title="제품 정보를 불러오지 못했어요." onRetry={() => { setLoadError(null); setAttempt((n) => n + 1); }} /></div></>;
  if (product === undefined) return top;
  if (product === null)
    return (
      <>
        {top}
        <p className="m-0 px-6 pt-4 text-[17px] font-bold">이 제품을 찾을 수 없어요.</p>
      </>
    );

  const saved = ids.has(product.id);
  const item = r?.status === "ok" ? r.items.find((i) => i.product_id === product.id) ?? null : null;
  const x = item?.runners ?? 0;
  const wide = range === "wide";
  const group = wide ? "넓힌 그룹" : "비슷한 러너";

  async function onSave() {
    const res = await toggle(product!.id, product!);
    if (res === "saved") track("shoe_save", { product_id: product!.id, from: "detail" });
    if (res === "unsaved") track("shoe_unsave", { product_id: product!.id, from: "detail" });
  }

  return (
    <>
      {top}
      <main className="px-6 pb-[150px]">
        <span className="gm-label block">
          {product.brand.toUpperCase()}
          {product.primary_use ? ` · ${USE_LABEL[product.primary_use] ?? product.primary_use}` : ""}
        </span>
        <h1 className="mt-1 mb-5 font-[family-name:var(--font-bc)] text-[52px] leading-[0.92] font-extrabold uppercase [overflow-wrap:anywhere]">{product.model_name}</h1>
        <ShoeArt imageUrl={product.image_url} approved={product.image_approved} alt={product.display_name} size="lg" label />

        <section className="mt-6 border-t border-gm-line2 pt-5">
          <div className="flex items-center justify-between">
            <span className="gm-label">RUNNERS LIKE YOU</span>
            {r?.demo && <DemoBadge data />}
          </div>
          {!r ? (
            <div className="h-24" aria-busy="true" />
          ) : r.status === "ok" ? (
            <>
              <div className="mt-2 flex items-end gap-3">
                <span className="tabular font-[family-name:var(--font-bc)] text-[76px] leading-[0.9] font-extrabold">{formatShare(x / (r.runners ?? 1))}</span>
                <span className="pb-1 font-[family-name:var(--font-bl)] text-[12px] leading-4 font-bold tracking-[0.14em] text-gm-g1">
                  {x} OF {r.runners}
                  <br />
                  RUNNERS
                </span>
              </div>
              <p className="mt-3 mb-0 text-[16px] leading-6 [word-break:keep-all]">
                {x > 0 ? `${group} ${r.runners}명 중 ${x}명이 이 신발로 러닝을 기록했어요.` : `${group} ${r.runners}명 중 이 신발을 신은 러너는 아직 없어요.`}
              </p>
            </>
          ) : (
            <p className="mt-3 mb-0 text-[15px] leading-6 text-gm-g1">
              {r.status === "profile_missing" ? "키·체중·발 사이즈를 입력하면 비슷한 러너들의 사용 비율을 볼 수 있어요." : "아직 비교할 비슷한 러너가 충분하지 않아요."}
            </p>
          )}
        </section>

        {item && (item.run_count != null || item.total_km != null) && (
          <section className="mt-6 border-t border-gm-line2 pt-5">
            <div className="flex items-center justify-between">
              <span className="gm-label">HOW THEY RUN</span>
              {r?.demo && <DemoBadge data />}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <span className="flex items-baseline gap-1.5">
                  <span className="tabular font-[family-name:var(--font-bc)] text-[44px] leading-none font-extrabold">{item.run_count ?? "—"}</span>
                  <span className="font-[family-name:var(--font-bl)] text-[12px] font-bold tracking-[0.14em] text-gm-g1">RUNS</span>
                </span>
                <span className="mt-1 block text-[13px] text-gm-g1">이 신발로 달린 횟수</span>
              </div>
              <div>
                <span className="flex items-baseline gap-1.5">
                  <span className="tabular font-[family-name:var(--font-bc)] text-[44px] leading-none font-extrabold">{item.total_km == null ? "—" : Math.round(item.total_km)}</span>
                  <span className="font-[family-name:var(--font-bl)] text-[12px] font-bold tracking-[0.14em] text-gm-g1">KM</span>
                </span>
                <span className="mt-1 block text-[13px] text-gm-g1">이 신발로 달린 총 거리</span>
              </div>
            </div>
            <p className="mt-3 mb-0 text-[12px] text-gm-g2">{group} {x}명의 기록 합계</p>
          </section>
        )}

        {(product.tags.length > 0 || product.official_url) && (
          <section className="mt-6 border-t border-gm-line2 pt-5">
            <span className="gm-label">ABOUT THIS SHOE</span>
            {product.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <span key={t} className="border border-gm-line3 px-2.5 py-1 font-[family-name:var(--font-bl)] text-[12px] font-bold tracking-[0.12em]">{t}</span>
                ))}
              </div>
            )}
            {product.official_url && (
              <a href={product.official_url} target="_blank" rel="noopener noreferrer" className="mt-4 flex h-14 items-center justify-between border-y border-gm-line text-[15px] font-bold">
                {product.brand} 공식 사이트에서 자세히 보기
                <ArrowIcon size={18} />
              </a>
            )}
          </section>
        )}
      </main>

      <div className="fixed bottom-0 left-1/2 z-10 w-full max-w-[430px] -translate-x-1/2 border-t border-gm-line bg-gm-bg px-6 pt-3" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        {failed && <div className="mb-3"><SaveFailedBanner message="저장하지 못했어요. 다시 시도해 주세요." /></div>}
        {saved ? (
          <button type="button" onClick={onSave} disabled={Boolean(busy)} aria-pressed className="flex h-[60px] w-full items-center justify-between border border-gm-tx px-5 text-[16px] font-bold">
            저장 목록에 추가했어요.
            <span className="flex items-center gap-2 text-[15px]"><BookmarkIcon filled /> 저장됨</span>
          </button>
        ) : (
          <button type="button" onClick={onSave} disabled={Boolean(busy)} aria-pressed={false} className="flex h-[60px] w-full items-center justify-between bg-gm-lime px-5 text-[18px] font-extrabold text-gm-bg">
            관심 신발 저장하기
            <BookmarkIcon size={22} />
          </button>
        )}
      </div>
    </>
  );
}
