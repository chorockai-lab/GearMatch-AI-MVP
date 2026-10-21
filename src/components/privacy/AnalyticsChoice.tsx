"use client";
// "이용 통계 분석" choice on /privacy (docs/POSTHOG.md). Shown only when PostHog runs for regular users:
//   consent → opt-in: nothing is sent to PostHog until "동의하기" · all → opt-out: "보내지 않기" stops it.
// Same section pattern as DeleteMyData. The choice is kept in this browser only; Supabase events are not affected.
import { useEffect, useState } from "react";
import { analyticsChoice, POSTHOG_MODE, setAnalyticsConsent } from "@/lib/analytics/posthog";
import type { AnalyticsChoice as Choice } from "@/lib/analytics/posthog-policy";

export function AnalyticsChoice() {
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setChoice(analyticsChoice());
    setReady(true);
  }, []);
  if (POSTHOG_MODE !== "consent" && POSTHOG_MODE !== "all") return null;

  const sending = POSTHOG_MODE === "consent" ? choice === "granted" : choice !== "denied";
  const toggle = () => {
    const next = sending ? "denied" : "granted";
    setAnalyticsConsent(next);
    setChoice(next);
  };
  const action = POSTHOG_MODE === "consent" ? (sending ? "동의 철회하기" : "동의하기") : sending ? "보내지 않기" : "다시 보내기";

  return (
    <section className="mt-10 border-t border-gm-line2 pt-6" aria-live="polite">
      <h2 className="m-0 text-[20px] font-extrabold">이용 통계 분석</h2>
      <p className="mt-2 mb-0 text-[15px] leading-6 text-gm-g1 break-keep">
        서비스 개선을 위해 화면 이용 기록을 미국의 PostHog로 보내 통계를 냅니다(8번). 테스트 답변·키·체중은 보내지 않아요.
        {POSTHOG_MODE === "consent" ? " 동의한 경우에만 보내요." : ""} 선택하지 않거나 거부해도 서비스는 그대로 이용할 수 있어요.
      </p>
      {ready && (
        <>
          <p className="mt-4 mb-0 text-[15px] font-bold">{sending ? "지금: 보내는 중" : "지금: 보내지 않음"}</p>
          <button type="button" onClick={toggle} aria-pressed={sending} className="mt-3 h-14 w-full border border-gm-line3 text-[16px] font-bold">
            {action}
          </button>
          <p className="mt-2 mb-0 text-[13px] leading-5 text-gm-g2 break-keep">이 선택은 지금 이 브라우저(앱)에만 적용돼요.</p>
        </>
      )}
    </section>
  );
}
