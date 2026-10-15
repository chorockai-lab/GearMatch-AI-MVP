// Landing — night-run hero (approved reference 2026-10-15; layout below the scene from UI handoff 01_LANDING)
// Returning visitors go to RUNNING Main / their unfinished step instead (LandingGate checks the saved state first).
import { LandingScene, NIGHT_SKY } from "@/components/onboarding/LandingScene";
import { LandingGate } from "@/components/onboarding/LandingGate";
import { FlowFrame, PrimaryLink } from "@/components/onboarding/Flow";

export default function Landing() {
  return (
    <LandingGate>
      <LandingScreen />
    </LandingGate>
  );
}

function LandingScreen() {
  return (
    <FlowFrame>
      <div style={{ backgroundColor: NIGHT_SKY }}>
        <header className="flex h-14 items-center justify-between px-6">
          <span className="font-[family-name:var(--font-bc)] text-[17px] font-extrabold tracking-[0.22em]">GEARMATCH</span>
          <span className="gm-label">RUNNING ANIMAL</span>
        </header>
        <LandingScene />
      </div>

      <section className="px-6 pt-6">
        <p className="m-0 flex items-center gap-3 font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.14em]">
          <span className="text-gm-lime">YOUR RUNNING ANIMAL</span>
          <span aria-hidden="true" className="tracking-[0.5em] text-gm-g1">? — — —</span>
        </p>
        <h1 className="mt-3 mb-0 text-[34px] leading-[44px] font-extrabold tracking-[-0.02em]">
          나는 어떤
          <br />
          동물형 러너일까?
        </h1>
        <p className="mt-3 mb-0 text-[16px] leading-6 break-keep text-gm-g1">5개의 질문으로 나와 닮은 러닝 동물을 찾아보세요.</p>
      </section>

      <div className="mt-auto px-6 pt-6" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-end justify-between border-b border-gm-line pb-3">
          <p className="m-0 flex items-baseline gap-3">
            <span className="tabular font-[family-name:var(--font-bc)] text-[36px] leading-none font-extrabold">05</span>
            <span className="gm-label">QUESTIONS</span>
          </p>
          <span className="text-[14px] text-gm-g1">약 1분</span>
        </div>
        <div className="mt-3">
          <PrimaryLink href="/test/1">내 러닝 동물 알아보기</PrimaryLink>
        </div>
      </div>
    </FlowFrame>
  );
}
