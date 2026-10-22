"use client";
// "개인정보 수집·이용 안내" — no handoff screen (MISSING); copy from docs/PRIVACY_NOTICE_DRAFT.md, final wording approved by the in-house privacy officer (2026-10-22).
// Reached from Landing, Profile step 2 and RUNNING Main, or directly by link (test invitation), so "이전" falls back to "/".
// Kept inside the onboarding frame (no app tabs) so "이전" returns to the form.
import { useRouter } from "next/navigation";
import { FlowFrame } from "@/components/onboarding/Flow";
import { BackIcon } from "@/components/ui/icons";
import { DeleteMyData } from "@/components/privacy/DeleteMyData";
import { PrivacyNotice } from "@/components/privacy/PrivacyNotice";
import { AnalyticsChoice } from "@/components/privacy/AnalyticsChoice";

export default function PrivacyPage() {
  const router = useRouter();
  const back = () => (window.history.length > 1 ? router.back() : router.push("/"));
  return (
    <FlowFrame>
      <div className="flex h-14 items-center px-6">
        <button type="button" onClick={back} className="-ml-2 flex h-11 items-center gap-2.5 px-2 text-[16px] font-bold">
          <BackIcon />
          이전
        </button>
      </div>
      <main className="px-6 pt-6" style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}>
        <h1 className="m-0 text-[30px] leading-[38px] font-extrabold tracking-[-0.02em] break-keep">개인정보 수집·이용 안내</h1>
        <PrivacyNotice />
        <AnalyticsChoice />
        <DeleteMyData />
      </main>
    </FlowFrame>
  );
}
