"use client";
// "이용 통계 분석" on /privacy (docs/POSTHOG.md): see and change the PostHog consents. Shown only when PostHog runs for
// regular users — consent: two separate opt-in items (이용 통계 분석 · 국외 이전), sent only when both are given;
// all: one opt-out switch. Same section pattern as DeleteMyData. Choices are recorded via lib/analytics/consent.ts.
import { useEffect, useState } from "react";
import { POSTHOG_MODE } from "@/lib/analytics/posthog";
import { currentConsent, setConsent } from "@/lib/analytics/consent";
import { effectiveChoice, shouldSend, type ConsentItem, type ConsentState } from "@/lib/analytics/posthog-policy";

const ITEMS: { key: ConsentItem; label: string }[] = [
  { key: "stats", label: "이용 통계 분석" },
  { key: "transfer", label: "국외 이전(미국 PostHog)" },
];

export function AnalyticsChoice() {
  const [state, setState] = useState<ConsentState | null>(null);
  useEffect(() => setState(currentConsent()), []);
  if (POSTHOG_MODE !== "consent" && POSTHOG_MODE !== "all") return null;

  const sending = state ? shouldSend(POSTHOG_MODE, false, effectiveChoice(state)) : false;
  const set = (items: Partial<Record<ConsentItem, "granted" | "denied">>) => setState(setConsent(items, "privacy"));

  return (
    <section id="analytics" className="mt-10 scroll-mt-4 border-t border-gm-line2 pt-6" aria-live="polite">
      <h2 className="m-0 text-[20px] font-extrabold">이용 통계 분석</h2>
      <p className="mt-2 mb-0 text-[15px] leading-6 text-gm-g1 break-keep">
        서비스 개선을 위해 화면 이용 기록을 미국의 PostHog로 보내 통계를 냅니다(8번). 테스트 답변·키·체중은 보내지 않아요.
        {POSTHOG_MODE === "consent" ? " 두 항목에 모두 동의한 경우에만 보내요." : ""} 동의하지 않거나 철회해도 서비스는 그대로 이용할 수 있어요.
      </p>
      {state && (
        <>
          {POSTHOG_MODE === "consent" ? (
            ITEMS.map(({ key, label }) => {
              const granted = state[key] === "granted";
              return (
                <div key={key} className="mt-4 flex items-center justify-between gap-3 border-b border-gm-line pb-4">
                  <div>
                    <p className="m-0 text-[15px] font-bold">{label}</p>
                    <p className="mt-0.5 mb-0 text-[14px] text-gm-g1">{granted ? "동의함" : "동의하지 않음"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set({ [key]: granted ? "denied" : "granted" })}
                    aria-pressed={granted}
                    className="h-11 flex-none border border-gm-line3 px-4 text-[15px] font-bold"
                  >
                    {granted ? "동의 철회" : "동의하기"}
                  </button>
                </div>
              );
            })
          ) : (
            <button
              type="button"
              onClick={() => set(sending ? { stats: "denied", transfer: "denied" } : { stats: "granted", transfer: "granted" })}
              aria-pressed={sending}
              className="mt-4 h-14 w-full border border-gm-line3 text-[16px] font-bold"
            >
              {sending ? "보내지 않기" : "다시 보내기"}
            </button>
          )}
          <p className="mt-4 mb-0 text-[15px] font-bold">{sending ? "지금: 보내는 중" : "지금: 보내지 않음"}</p>
          <p className="mt-2 mb-0 text-[13px] leading-5 text-gm-g2 break-keep">
            이 선택은 지금 이 브라우저(앱)에만 적용돼요. 철회하면 이미 보낸 기록의 삭제도 요청해요.
          </p>
        </>
      )}
    </section>
  );
}
