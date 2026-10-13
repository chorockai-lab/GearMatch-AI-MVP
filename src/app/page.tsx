// Landing — UI handoff 01_LANDING/landing.png
import { LandingScene } from "@/components/onboarding/LandingScene";
import { FlowFrame, PrimaryLink } from "@/components/onboarding/Flow";
import { TrackView } from "@/components/ui/TrackView";

export default function Landing() {
  return (
    <FlowFrame>
      <TrackView name="landing_view" />
      <header className="flex h-14 items-center justify-between px-6">
        <span className="font-[family-name:var(--font-bc)] text-[17px] font-extrabold tracking-[0.22em]">GEARMATCH</span>
        <span className="gm-label">RUNNING ANIMAL</span>
      </header>
      <LandingScene />

      <section className="px-6 pt-[46px]">
        <p className="m-0 flex items-center gap-3 font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.14em]">
          <span className="text-gm-lime">YOUR RUNNING ANIMAL</span>
          <span aria-hidden="true" className="tracking-[0.5em] text-gm-g1">? — — —</span>
        </p>
        <h1 className="mt-[18px] mb-0 text-[34px] leading-[44px] font-extrabold tracking-[-0.02em]">
          나는 어떤
          <br />
          동물형 러너일까?
        </h1>
        <p className="mt-4 mb-0 text-[16px] leading-6 text-gm-g1">5개의 질문으로 나의 러닝 성향을 발견해 보세요.</p>
      </section>

      <div className="mt-auto px-6 pt-10" style={{ paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-end justify-between border-b border-gm-line pb-4">
          <p className="m-0 flex items-baseline gap-3">
            <span className="tabular font-[family-name:var(--font-bc)] text-[46px] leading-none font-extrabold">05</span>
            <span className="gm-label">QUESTIONS</span>
          </p>
          <span className="text-[14px] text-gm-g1">약 1분</span>
        </div>
        <div className="mt-4">
          <PrimaryLink href="/test/1">내 러닝 동물 알아보기</PrimaryLink>
        </div>
      </div>
    </FlowFrame>
  );
}
