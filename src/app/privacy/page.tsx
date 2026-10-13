"use client";
// UI handoff: "개인정보 수집·이용 안내" is linked from Profile step 2 but has no copy or screen yet (MISSING · DECISION NEEDED).
// Kept inside the onboarding frame (no app tabs) so "이전" returns to the form.
import { useRouter } from "next/navigation";
import { FlowFrame } from "@/components/onboarding/Flow";
import { BackIcon } from "@/components/ui/icons";

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <FlowFrame>
      <div className="flex h-14 items-center px-6">
        <button type="button" onClick={() => router.back()} className="-ml-2 flex h-11 items-center gap-2.5 px-2 text-[16px] font-bold">
          <BackIcon />
          이전
        </button>
      </div>
      <main className="px-6 pt-6">
        <h1 className="m-0 text-[30px] leading-[38px] font-extrabold tracking-[-0.02em]">개인정보 수집·이용 안내</h1>
        <p className="mt-4 mb-0 text-[15px] leading-6 text-gm-g1">안내 문구가 아직 확정되지 않았어요. 확정되면 이 화면에 표시합니다.</p>
      </main>
    </FlowFrame>
  );
}
