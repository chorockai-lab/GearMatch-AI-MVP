"use client";
// Landing: the two optional PostHog consents under the start button (docs/POSTHOG.md). Shown only in consent mode —
// in qa / off the Landing is unchanged. Unchecked by default; the service works the same without them.
import Link from "next/link";
import { useEffect, useState } from "react";
import { POSTHOG_MODE } from "@/lib/analytics/posthog";
import { currentConsent, setConsent } from "@/lib/analytics/consent";
import type { ConsentItem, ConsentState } from "@/lib/analytics/posthog-policy";

const ITEMS: { key: ConsentItem; label: string; text: string }[] = [
  { key: "stats", label: "이용 통계 분석 동의", text: "화면 이용 기록으로 서비스 개선 통계를 내요" },
  { key: "transfer", label: "국외 이전 동의", text: "이 기록을 미국 PostHog Inc.로 보내요" },
];

export function LandingConsent() {
  const [state, setState] = useState<ConsentState | null>(null);
  useEffect(() => setState(currentConsent()), []);
  if (POSTHOG_MODE !== "consent") return null;

  return (
    <div className="mx-auto mt-4 w-full max-w-[342px] text-left">
      {ITEMS.map(({ key, label, text }) => (
        <label key={key} className="flex min-h-11 items-start gap-2.5 py-1">
          <input
            type="checkbox"
            checked={state?.[key] === "granted"}
            disabled={!state}
            onChange={(e) => setState(setConsent({ [key]: e.target.checked ? "granted" : "denied" }, "landing"))}
            className="mt-0.5 size-5 flex-none accent-[#D7FF2E]"
          />
          <span className="text-[13px] leading-5 text-gm-g1 break-keep">
            <span className="font-bold text-gm-tx">(선택) {label}</span> — {text}
          </span>
        </label>
      ))}
      <p className="mt-1 mb-0 text-[12px] leading-[18px] text-gm-g2 break-keep">
        두 항목에 모두 동의해야 보내요. 동의하지 않아도 모든 기능을 쓸 수 있어요.{" "}
        <Link href="/privacy#analytics" className="-my-3 inline-block py-3 underline underline-offset-4">
          자세히
        </Link>
      </p>
    </div>
  );
}
