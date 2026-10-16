"use client";
// Privacy P-2: "내 데이터 삭제" on /privacy — deletes this browser's anonymous account and its data after a confirmation sheet.
// Same sheet pattern as the run delete confirmation (RunForm). No analytics event is sent for this action.
import { useState } from "react";
import { deleteMyData } from "@/lib/privacy/deleteMyData";
import { SaveFailedBanner } from "@/components/ui/Feedback";

type Phase = "idle" | "confirm" | "deleting" | "deleted" | "nothing";

export function DeleteMyData() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [failed, setFailed] = useState(false);

  const run = async () => {
    setPhase("deleting");
    setFailed(false);
    const result = await deleteMyData();
    if (result === "failed") {
      setFailed(true);
      setPhase("confirm");
      return;
    }
    setPhase(result);
  };

  // full reload so no screen keeps the deleted account's data in memory
  const restart = () => window.location.replace("/");

  if (phase === "deleted" || phase === "nothing") {
    return (
      <section className="mt-10 border-t border-gm-line2 pt-6" aria-live="polite">
        <h2 className="m-0 text-[20px] font-extrabold">{phase === "deleted" ? "데이터를 삭제했어요." : "삭제할 데이터가 없어요."}</h2>
        <p className="mt-2 mb-0 text-[15px] leading-6 text-gm-g1 break-keep">
          {phase === "deleted"
            ? "이 브라우저의 익명 계정과 테스트 결과·러닝 기록이 모두 삭제됐어요."
            : "이 브라우저에는 저장된 익명 계정이 없어요."}
        </p>
        <button type="button" onClick={restart} className="mt-5 h-14 w-full border border-gm-line3 text-[16px] font-bold">
          처음 화면으로
        </button>
      </section>
    );
  }

  return (
    <section className="mt-10 border-t border-gm-line2 pt-6">
      <h2 className="m-0 text-[20px] font-extrabold">내 데이터 삭제</h2>
      <p className="mt-2 mb-0 text-[15px] leading-6 text-gm-g1 break-keep">
        지금 이 브라우저(앱)에서 쓰는 익명 계정과 러닝 동물 결과·러닝 습관·신체 정보·신발·러닝 기록·이용 기록을 모두 삭제해요.
        다른 브라우저나 앱에서 쓴 기록은 그곳에서 따로 삭제해야 해요.
      </p>
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setPhase("confirm");
        }}
        className="mt-5 h-14 w-full border border-gm-err-line text-[16px] font-bold text-gm-err-tx"
      >
        내 데이터 삭제하기
      </button>

      {(phase === "confirm" || phase === "deleting") && (
        <div className="fixed inset-0 z-20 mx-auto flex max-w-[430px] flex-col justify-end bg-[rgba(3,3,3,0.66)]" role="dialog" aria-modal="true" aria-labelledby="delete-data-title">
          <div className="border-t border-gm-line2 bg-gm-sheet px-6 pt-7" style={{ paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
            <h2 id="delete-data-title" className="m-0 text-[22px] font-extrabold">모든 데이터를 삭제할까요?</h2>
            <p className="mt-2 mb-0 text-[15px] leading-6 text-gm-g1 break-keep">
              삭제하면 되돌릴 수 없어요. 이 브라우저의 러닝 동물 결과와 러닝 기록을 다시 볼 수 없고, 다음에 열면 처음부터 시작해요.
            </p>
            {failed && (
              <div className="mt-3">
                <SaveFailedBanner message="삭제하지 못했어요. 잠시 후 다시 시도해 주세요." />
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPhase("idle")} disabled={phase === "deleting"} className="h-14 border border-gm-line3 text-[16px] font-bold">
                취소
              </button>
              <button type="button" onClick={run} disabled={phase === "deleting"} className="h-14 bg-gm-err text-[16px] font-extrabold text-gm-bg">
                {phase === "deleting" ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
