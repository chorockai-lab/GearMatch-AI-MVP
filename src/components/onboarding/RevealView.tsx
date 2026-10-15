"use client";
// Identity Reveal — UI handoff 03_IDENTITY_REVEAL/reveal-{id}(-full).png (AI8 template, same for all 8 animals).
// Built from React elements (no poster image). WHY quotes only the answers the user actually picked (lib/identity/why.ts).
// Scores / percentages / secondary type are never shown (spec §4.2, §4.4).
import { useEffect, useState } from "react";
import { useTrackOnce } from "@/lib/events/useTrackOnce";
import { useRouter } from "next/navigation";
import { ANIMALS, type AnimalId } from "@/lib/identity/animals";
import { REVEAL_COPY } from "@/lib/identity/reveal-copy";
import { buildWhy } from "@/lib/identity/why";
import { bboxCenterX, bboxOf, spriteSrc } from "@/lib/assets/sprites";
import { answersCode, completeAnswers, identityFromAnswers, nextOnboardingPath } from "@/lib/onboarding/repository";
import { useOnboarding } from "@/lib/onboarding/useOnboarding";
import { WhyCheckIcon } from "@/components/ui/icons";
import { FlowFrame, FlowLoading, PrimaryLink } from "./Flow";

const SC = 5; // handoff: char-{id}-base.png ×5
const GROUND = 224;
const SPR_W = 64 * SC;
const SPR_H = 48 * SC;
const SPR_TOP = GROUND - 44 * SC;

function RevealScene({ animal }: { animal: AnimalId }) {
  const a = ANIMALS[animal];
  const key = `char-${a.assetId}-base`;
  const b = bboxOf(key);
  const cx = Math.round(bboxCenterX(b) * SC);
  const shadowOffset = Math.round(bboxCenterX(b) - 32) * SC;
  const img = (src: string, left: string, alt?: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      width={SPR_W}
      height={SPR_H}
      className="px absolute max-w-none"
      style={{ left, top: SPR_TOP, width: SPR_W, height: SPR_H }}
      draggable={false}
    />
  );
  return (
    <div className="relative w-full overflow-hidden" style={{ height: GROUND + 1 }}>
      <span aria-hidden="true" className="absolute inset-x-0 h-px" style={{ top: GROUND, background: "#3A3A37" }} />
      {img(spriteSrc("fx-shadow-wide"), `calc(50% - ${cx - shadowOffset}px)`)}
      {img(spriteSrc(key), `calc(50% - ${cx}px)`, `${a.nameKo}형 러너 캐릭터`)}
    </div>
  );
}

export function RevealView({ mode }: { mode: "onboarding" | "review" }) {
  const router = useRouter();
  const { state, setState, repo, error, reload } = useOnboarding();
  const [saveError, setSaveError] = useState<unknown>(null);
  const answers = state ? completeAnswers(state) : null;

  useEffect(() => {
    if (!state) return;
    if (!answers) {
      router.replace(nextOnboardingPath(state));
      return;
    }
    // re-evaluate whenever answers and the stored result disagree (answer edited, refresh, older data)
    if (!state.identity || state.identity.test_answers_v2 !== answersCode(answers)) {
      repo.saveIdentity(identityFromAnswers(answers)).then(setState, setSaveError);
    }
  }, [state, answers, repo, router, setState]);

  useTrackOnce("reveal_view", { animal: state?.identity?.animal_type_v2 ?? null, mode }, Boolean(state?.identity));

  if (!state || !answers || !state.identity) return <FlowLoading error={error ?? saveError} onRetry={reload} />;

  const animal = state.identity.animal_type_v2;
  const a = ANIMALS[animal];
  const copy = REVEAL_COPY[animal];
  const why = buildWhy(answers, animal);

  return (
    <FlowFrame>
      <header className="flex h-14 items-center px-6">
        <span className="font-[family-name:var(--font-bc)] text-[17px] font-extrabold tracking-[0.22em]">GEARMATCH</span>
      </header>
      <RevealScene animal={animal} />

      <main className="px-6 pt-6 pb-[156px]">
        <h1 className="m-0 text-center font-[family-name:var(--font-bc)] text-[76px] leading-[0.92] font-extrabold uppercase">
          {a.nameEn}
          <span className="block text-gm-lime">RUNNER</span>
        </h1>
        <p className="mt-6 mb-0 text-center text-[18px] leading-[26px] font-bold [word-break:keep-all]">{copy.headline}</p>

        <section className="mt-9">
          <h2 className="m-0 flex items-center gap-3 text-[14px] font-bold text-gm-g2">
            성향 분석
            <span aria-hidden="true" className="h-px flex-1 bg-gm-line2" />
          </h2>
          <p className="mt-3 mb-0 text-[16px] leading-[27px] text-gm-tx [word-break:keep-all]">{copy.analysis}</p>
        </section>

        {why.length > 0 && (
          <section className="mt-9">
            <h2 className="m-0 flex items-center gap-3 text-[14px] font-bold text-gm-g2">
              이런 선택과 닮아 있어요
              <span aria-hidden="true" className="h-px flex-1 bg-gm-line2" />
            </h2>
            <ul className="mt-4 grid gap-4 p-0">
              {why.map((w) => (
                <li key={w.questionId} className="flex list-none items-start gap-4">
                  <span className="mt-1 flex-none">
                    <WhyCheckIcon />
                  </span>
                  <span className="text-[17px] leading-[26px] font-semibold [word-break:keep-all]">“{w.text}”</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <div
        className="fixed bottom-0 left-1/2 z-10 w-full max-w-[430px] -translate-x-1/2 px-6 pt-8"
        style={{
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          background: "linear-gradient(180deg, rgba(10,10,10,0) 0, #0A0A0A 28px)",
        }}
      >
        {/* a retake (QA landing preview) by someone who already finished onboarding goes straight back to RUNNING */}
        {mode === "onboarding" && !state.completed_at ? (
          <>
            <PrimaryLink href="/onboarding/habits">내 Runner 완성하기</PrimaryLink>
            <p className="mt-3 mb-0 text-center text-[13px] text-gm-g2">다음 · 러닝 정보와 지금 신는 신발을 알려주세요</p>
          </>
        ) : (
          <PrimaryLink href="/running">RUNNING으로 돌아가기</PrimaryLink>
        )}
      </div>
    </FlowFrame>
  );
}
