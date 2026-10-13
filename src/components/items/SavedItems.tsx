"use client";
// Saved Items — UI handoff 08_ITEMS: saved-items · saved-items-empty. Detail → back returns here.
import Link from "next/link";
import { track } from "@/lib/events/track";
import { ArrowIcon, BackIcon, BookmarkIcon } from "@/components/ui/icons";
import { LoadFailedBlock, SaveFailedBanner } from "@/components/ui/Feedback";
import { ShoeArt } from "./ShoeArt";
import { useSaved } from "./parts";

export function SavedItems() {
  const { saved, toggle, busy, failed, error, reload } = useSaved();
  return (
    <>
      <Link href="/items" className="-ml-1 flex h-14 items-center gap-3 px-6 font-[family-name:var(--font-bl)] text-[15px] font-bold tracking-[0.12em]">
        <BackIcon /> ITEMS
      </Link>
      <main className="px-6">
        <h1 className="mt-1 mb-0 font-[family-name:var(--font-bc)] text-[52px] leading-[0.92] font-extrabold uppercase">SAVED ITEMS</h1>
        {saved && saved.length > 0 && (
          <p className="mt-2 mb-0 flex items-baseline gap-2">
            <span className="tabular font-[family-name:var(--font-bc)] text-[26px] font-extrabold">{String(saved.length).padStart(2, "0")}</span>
            <span className="gm-label">SHOES</span>
          </p>
        )}
        <div className="mt-5 border-t border-gm-line2">
          {error ? (
            <LoadFailedBlock title="저장한 신발을 불러오지 못했어요." onRetry={reload} />
          ) : !saved ? (
            <div className="h-24" aria-busy="true" />
          ) : saved.length === 0 ? (
            <div className="pt-6">
              <p className="m-0 text-[18px] font-bold">아직 저장한 러닝화가 없어요.</p>
              <p className="mt-2 mb-0 text-[15px] leading-6 text-gm-g1">궁금한 러닝화를 저장하고<br />나중에 다시 살펴보세요.</p>
              <Link href="/items" className="mt-6 flex h-[60px] items-center justify-between bg-gm-lime px-5 text-[18px] font-extrabold text-gm-bg">
                비슷한 러너들의 선택 보기 <ArrowIcon size={22} />
              </Link>
            </div>
          ) : (
            <>
              {failed && <div className="mt-3"><SaveFailedBanner message="저장을 취소하지 못했어요. 다시 시도해 주세요." /></div>}
              {saved.map(({ product: p }) => (
                <article key={p.id} className="grid grid-cols-[132px_minmax(0,1fr)_44px] items-center gap-x-4 border-b border-gm-line py-4">
                  <Link href={`/items/${encodeURIComponent(p.id)}?from=saved`} aria-label={`${p.display_name} 상세 보기`}>
                    <ShoeArt imageUrl={p.image_url} approved={p.image_approved} alt={p.display_name} size="sm" />
                  </Link>
                  <div className="min-w-0">
                    <span className="gm-label block">{p.brand.toUpperCase()}</span>
                    <span className="block font-[family-name:var(--font-bc)] text-[24px] leading-[1] font-extrabold uppercase [overflow-wrap:anywhere]">{p.model_name}</span>
                    <Link href={`/items/${encodeURIComponent(p.id)}?from=saved`} className="mt-2 inline-flex items-center gap-1 text-[14px] font-bold text-gm-g1">
                      제품 상세 보기 <ArrowIcon size={14} />
                    </Link>
                  </div>
                  <button
                    type="button"
                    aria-label={`${p.display_name} 저장 취소`}
                    aria-pressed
                    disabled={Boolean(busy)}
                    onClick={async () => {
                      if ((await toggle(p.id)) === "unsaved") track("shoe_unsave", { product_id: p.id, from: "saved" });
                    }}
                    className="grid size-11 place-items-center bg-gm-lime text-gm-bg"
                  >
                    <BookmarkIcon filled />
                  </button>
                </article>
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
