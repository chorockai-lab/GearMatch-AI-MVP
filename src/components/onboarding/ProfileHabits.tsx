"use client";
// Runner Profile Step 1 — UI handoff 04_RUNNER_PROFILE/profile-step1.png
// 3 required (experience · runs per week · typical run distance) + weekly distance (optional).
// One section open at a time; choosing a value opens the next unanswered required section.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EXPERIENCE,
  RUNS_PER_WEEK,
  TYPICAL_RUN_DISTANCE,
  WEEKLY_DISTANCE,
  labelOf,
  type Choice,
} from "@/lib/onboarding/options";
import { nextOnboardingPath } from "@/lib/onboarding/repository";
import type { RunnerProfile } from "@/lib/onboarding/types";
import { useOnboarding } from "@/lib/onboarding/useOnboarding";
import { ChevronDownIcon } from "@/components/ui/icons";
import { SaveFailedBanner } from "@/components/ui/Feedback";
import { track } from "@/lib/events/track";
import { ChoiceButton, FlowFrame, FlowLoading, FlowTopBar, PrimaryButton } from "./Flow";

type Field = "experience" | "runs_per_week" | "typical_run_distance" | "weekly_distance";

const FIELDS: { key: Field; label: string; choices: Choice[]; optional?: boolean }[] = [
  { key: "experience", label: "러닝 경험", choices: EXPERIENCE },
  { key: "runs_per_week", label: "주간 러닝 횟수", choices: RUNS_PER_WEEK },
  { key: "typical_run_distance", label: "한 번에 뛰는 거리", choices: TYPICAL_RUN_DISTANCE },
  { key: "weekly_distance", label: "주간 총거리", choices: WEEKLY_DISTANCE, optional: true },
];
const REQUIRED = FIELDS.filter((f) => !f.optional);

/** Odd count → first choice full width (handoff: "이제 시작하려고 해요"); "잘 모르겠어요" stays last, full width. */
function ChoiceGrid({ field, value, onPick }: { field: (typeof FIELDS)[number]; value: string | null; onPick: (v: string) => void }) {
  const list = field.choices;
  const fullFirst = list.length % 2 === 1 && list[list.length - 1].value !== "UNKNOWN";
  const fullLast = list.length % 2 === 1 && !fullFirst;
  return (
    <div className="grid grid-cols-2 gap-2 pb-5">
      {list.map((c, i) => (
        <ChoiceButton
          key={c.value}
          selected={value === c.value}
          onClick={() => onPick(c.value)}
          className={(fullFirst && i === 0) || (fullLast && i === list.length - 1) ? "col-span-2" : ""}
        >
          {c.label}
        </ChoiceButton>
      ))}
    </div>
  );
}

export function ProfileHabits() {
  const router = useRouter();
  const { state, repo, error, reload } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState<Pick<RunnerProfile, Field> | null>(null);
  const [open, setOpen] = useState<Field | null>("experience");

  useEffect(() => {
    if (!state) return;
    if (!state.identity) {
      router.replace(nextOnboardingPath(state));
      return;
    }
    const p = state.profile;
    setDraft({ experience: p.experience, runs_per_week: p.runs_per_week, typical_run_distance: p.typical_run_distance, weekly_distance: p.weekly_distance });
    setOpen(REQUIRED.find((f) => !p[f.key])?.key ?? null);
  }, [state, router]);

  if (!state || !state.identity || !draft) return <FlowLoading error={error} onRetry={reload} />;

  const done = REQUIRED.filter((f) => draft[f.key]).length;
  const complete = done === REQUIRED.length;

  function pick(key: Field, v: string) {
    const next = { ...draft!, [key]: v };
    setDraft(next);
    setOpen(REQUIRED.find((f) => !next[f.key])?.key ?? null);
  }

  async function submit() {
    if (!complete) return;
    setSaving(true);
    setFailed(false);
    try {
      await repo.saveProfile(draft!);
      track("profile_habits_complete", { experience: draft!.experience, runs_per_week: draft!.runs_per_week, typical_run_distance: draft!.typical_run_distance });
      router.push("/onboarding/runner");
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <FlowFrame>
      <FlowTopBar label="PROFILE" step={1} total={3} backHref="/reveal" />
      <main className="flex flex-1 flex-col px-6 pt-[30px]">
        <h1 className="m-0 text-[30px] leading-[38px] font-extrabold tracking-[-0.02em]">나의 러닝 습관</h1>
        <p className="mt-2 mb-0 text-[15px] text-gm-g1">기록과 비슷한 러너 찾기에 쓰여요.</p>

        <div className="mt-6 border-b border-gm-line2">
          {FIELDS.map((f) => {
            const isOpen = open === f.key;
            const value = labelOf(f.choices, draft[f.key]);
            return (
              <section key={f.key} className="border-t border-gm-line2">
                <h2 className="m-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : f.key)}
                    className="flex h-[57px] w-full items-center justify-between text-left"
                  >
                    <span className="text-[17px] font-bold">
                      {f.label}
                      {f.optional && <span className="font-normal text-gm-g2"> (선택)</span>}
                    </span>
                    <span className="flex items-center gap-2.5">
                      {!isOpen && <span className={`text-[16px] ${value ? "font-semibold text-gm-tx" : "text-gm-g2"}`}>{value ?? "선택"}</span>}
                      <span className="text-gm-g1">
                        <ChevronDownIcon />
                      </span>
                    </span>
                  </button>
                </h2>
                {isOpen && <ChoiceGrid field={f} value={draft[f.key]} onPick={(v) => pick(f.key, v)} />}
              </section>
            );
          })}
        </div>

        <div className="mt-auto pt-10" style={{ paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
          <p className="mt-0 mb-3 text-[14px] text-gm-g2">
            필수 정보 <b className="text-gm-tx">{done}/{REQUIRED.length}</b> 완료
          </p>
          {failed && <div className="mb-3"><SaveFailedBanner /></div>}
          <PrimaryButton disabled={!complete || saving} onClick={submit}>
            다음
          </PrimaryButton>
        </div>
      </main>
    </FlowFrame>
  );
}
