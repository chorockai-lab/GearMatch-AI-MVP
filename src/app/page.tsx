// Landing — approved key visual (2026-10-15, shown as-is) + approved copy; layout below it from UI handoff 01_LANDING
// Returning visitors go to RUNNING Main / their unfinished step instead (LandingGate checks the saved state first).
import { HERO_TOP, LandingScene } from "@/components/onboarding/LandingScene";
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
      <div style={{ backgroundColor: HERO_TOP }}>
        <header className="flex h-14 items-center justify-between px-6">
          <span className="font-[family-name:var(--font-bc)] text-[17px] font-extrabold tracking-[0.22em]">GEARMATCH</span>
          <span className="gm-label">RUNNING ANIMAL</span>
        </header>
        <LandingScene />
      </div>

      {/* copy + CTA as one centred group under the picture. On tall screens at most 32px of the spare height goes
          above the group (no big gap in the middle); the rest stays below the CTA. */}
      <section
        className="flex flex-1 flex-col px-6 text-center"
        style={{ paddingTop: "clamp(24px, 4.5svh, 44px)", paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
      >
        <div aria-hidden="true" className="max-h-8 flex-1" />
        <h1 className="m-0 text-[clamp(28px,8.4vw,34px)] leading-[1.3] font-extrabold tracking-[-0.02em] break-keep">
          내 안에 숨어 있는
          <br />
          러닝 동물은?
        </h1>
        <p className="mt-4 mb-0 text-[16px] leading-6 break-keep text-gm-g1">
          달릴 때 드러나는 나만의 성향,
          <br />
          어떤 동물과 닮았을까요?
        </p>
        <p className="mt-5 mb-0 text-[14px] text-gm-g2">5문항 · 약 1분</p>
        <div style={{ marginTop: "clamp(20px, 3.5svh, 36px)" }}>
          <PrimaryLink href="/test/1" centered>
            숨은 러닝 동물 발견하기
          </PrimaryLink>
        </div>
        <div aria-hidden="true" className="flex-[3]" />
      </section>
    </FlowFrame>
  );
}
