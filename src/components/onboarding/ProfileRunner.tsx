"use client";
// Runner Profile Step 2 — UI handoff 04_RUNNER_PROFILE/profile-step2.png
// All optional. "계속하기" saves what was entered; "지금은 건너뛰기" moves on without saving this screen.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BODY_RANGES, INTEREST_DISTANCE, INTEREST_NONE } from "@/lib/onboarding/options";
import { habitsComplete, nextOnboardingPath } from "@/lib/onboarding/repository";
import { useOnboarding } from "@/lib/onboarding/useOnboarding";
import { ChoiceButton, FlowFrame, FlowLoading, FlowTopBar, PrimaryButton } from "./Flow";
import { SaveFailedBanner } from "@/components/ui/Feedback";
import { track } from "@/lib/events/track";

type BodyKey = keyof typeof BODY_RANGES;
type Draft = Record<BodyKey, string> & { interest_distance: string | null };

const toText = (n: number | null) => (n == null ? "" : String(n));

function invalid(key: BodyKey, text: string) {
  if (!text) return false;
  const n = Number(text);
  return !Number.isInteger(n) || n < BODY_RANGES[key].min || n > BODY_RANGES[key].max;
}

function BodyInput({ id, value, onChange }: { id: BodyKey; value: string; onChange: (v: string) => void }) {
  const r = BODY_RANGES[id];
  const bad = invalid(id, value);
  return (
    <div>
      <label htmlFor={id} className="block text-[17px] font-bold">
        {r.label} <span className="font-normal text-gm-g2">(선택)</span>
      </label>
      <div className={`mt-2.5 flex h-[57px] items-center border bg-[#141413] px-4 ${bad ? "border-gm-lime" : "border-gm-line2"}`}>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          maxLength={3}
          placeholder="미입력"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          aria-invalid={bad || undefined}
          aria-describedby={bad ? `${id}-hint` : undefined}
          className="tabular min-w-0 flex-1 bg-transparent text-[17px] font-semibold text-gm-tx outline-none placeholder:font-normal placeholder:text-gm-line3"
        />
        <span className="font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.14em] text-gm-g1">{r.unit}</span>
      </div>
      {bad && (
        <p id={`${id}-hint`} className="mt-1.5 mb-0 text-[13px] text-gm-g1">
          {r.min}~{r.max} 사이 숫자로 입력해 주세요.
        </p>
      )}
    </div>
  );
}

export function ProfileRunner() {
  const router = useRouter();
  const { state, repo, error, reload } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // ITEMS "내 정보 수정 / 추가하기" opens this screen with ?return=/items — go back there instead of continuing onboarding
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => {
    setReturnTo(new URLSearchParams(window.location.search).get("return") === "/items" ? "/items" : null);
  }, []);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!state) return;
    if (!state.identity || !habitsComplete(state.profile)) {
      router.replace(nextOnboardingPath(state));
      return;
    }
    const p = state.profile;
    setDraft({ height_cm: toText(p.height_cm), weight_kg: toText(p.weight_kg), shoe_size_mm: toText(p.shoe_size_mm), interest_distance: p.interest_distance });
  }, [state, router]);

  if (!state || !draft) return <FlowLoading error={error} onRetry={reload} />;

  const anyInvalid = (Object.keys(BODY_RANGES) as BodyKey[]).some((k) => invalid(k, draft[k]));
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const toggleInterest = (v: string) => set({ interest_distance: draft.interest_distance === v ? null : v });

  async function submit() {
    if (anyInvalid) return;
    const num = (t: string) => (t ? Number(t) : null);
    setSaving(true);
    setFailed(false);
    try {
      await repo.saveProfile({
        height_cm: num(draft!.height_cm),
        weight_kg: num(draft!.weight_kg),
        shoe_size_mm: num(draft!.shoe_size_mm),
        interest_distance: draft!.interest_distance,
      });
      // which optional fields were filled — never the values themselves
      track("profile_runner_complete", { height: Boolean(draft!.height_cm), weight: Boolean(draft!.weight_kg), foot: Boolean(draft!.shoe_size_mm), interest_distance: draft!.interest_distance });
      router.push(returnTo ?? "/onboarding/shoe");
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <FlowFrame>
      <FlowTopBar label="PROFILE" step={2} total={3} backHref={returnTo ?? "/onboarding/habits"} />
      <main className="flex flex-1 flex-col px-6 pt-[30px]">
        <h1 className="m-0 text-[30px] leading-[38px] font-extrabold tracking-[-0.02em]">나와 비슷한 러너 찾기</h1>
        <p className="mt-2 mb-0 text-[15px] leading-[23px] text-gm-g1 [word-break:keep-all]">비슷한 조건의 러너들이 신는 러닝화를 찾는 데만 쓰여요.</p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <BodyInput id="height_cm" value={draft.height_cm} onChange={(v) => set({ height_cm: v })} />
          <BodyInput id="weight_kg" value={draft.weight_kg} onChange={(v) => set({ weight_kg: v })} />
        </div>
        <div className="mt-5">
          <BodyInput id="shoe_size_mm" value={draft.shoe_size_mm} onChange={(v) => set({ shoe_size_mm: v })} />
        </div>
        <Link href="/privacy" className="mt-4 self-start text-[14px] text-gm-g1 underline underline-offset-4">
          개인정보 수집·이용 안내
        </Link>

        <fieldset className="mt-7 border-0 p-0">
          <legend className="text-[17px] font-bold">
            관심 대회 거리 <span className="font-normal text-gm-g2">(선택)</span>
          </legend>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {INTEREST_DISTANCE.map((c) => (
              <ChoiceButton key={c.value} selected={draft.interest_distance === c.value} onClick={() => toggleInterest(c.value)} className="font-[family-name:var(--font-bc)] !text-[19px]">
                {c.label}
              </ChoiceButton>
            ))}
            <ChoiceButton selected={draft.interest_distance === INTEREST_NONE.value} onClick={() => toggleInterest(INTEREST_NONE.value)} className="col-span-4">
              {INTEREST_NONE.label}
            </ChoiceButton>
          </div>
        </fieldset>

        <div className="mt-auto pt-10" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
          {failed && <div className="mb-3"><SaveFailedBanner /></div>}
          <PrimaryButton disabled={anyInvalid || saving} onClick={submit}>
            계속하기
          </PrimaryButton>
          <Link href={returnTo ?? "/onboarding/shoe"} onClick={() => !returnTo && track("profile_runner_skip")} className="mx-auto mt-3 flex h-11 w-fit items-center text-[16px] font-bold text-gm-g1 underline underline-offset-4">
            지금은 건너뛰기
          </Link>
        </div>
      </main>
    </FlowFrame>
  );
}
