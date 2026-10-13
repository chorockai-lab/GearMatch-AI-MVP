// Shared failure UI — UI handoff add-run-failed (banner) and load-failed (block with retry).

/** "저장하지 못했어요. 입력한 내용은 그대로 있어요." — coral banner above the bottom CTA. */
export function SaveFailedBanner({ message = "저장하지 못했어요. 입력한 내용은 그대로 있어요." }: { message?: string }) {
  return (
    <p role="alert" className="mt-0 mb-0 border border-gm-err-line bg-gm-err-bg px-[15px] py-3 text-[15px] leading-[22px] font-bold text-gm-err-tx">
      {message}
    </p>
  );
}

/** "기록을 불러오지 못했어요. / 잠시 후 다시 시도해 주세요. / [다시 시도]" */
export function LoadFailedBlock({ title = "기록을 불러오지 못했어요.", onRetry }: { title?: string; onRetry: () => void }) {
  return (
    <div role="alert" className="border-t border-gm-line py-[18px]">
      <p className="m-0 text-[17px] font-bold">{title}</p>
      <p className="mt-1 mb-0 text-[15px] text-gm-g1">잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={onRetry} className="mt-5 flex h-[46px] w-[140px] items-center justify-center border border-gm-line3 text-[16px] font-bold">
        다시 시도
      </button>
    </div>
  );
}
