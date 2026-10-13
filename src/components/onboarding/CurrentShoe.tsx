"use client";
// Current Shoe — UI handoff 04_RUNNER_PROFILE/current-shoe(-selected)(-full).png
// Choices: POPULAR model · 직접 입력 · 모델명을 몰라요 · 아직 러닝화가 없어요.
// "직접 입력하기" has no A′ screen in the handoff (MISSING) → minimal inline text field, flagged in DEVELOPMENT_STATUS.
// Search filters the POPULAR list only (there is no product catalogue until STEP 4).
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { POPULAR_SHOES, SHOE_UNKNOWN_LABEL } from "@/lib/onboarding/options";
import { habitsComplete, nextOnboardingPath } from "@/lib/onboarding/repository";
import type { ShoeStatus } from "@/lib/onboarding/types";
import { useOnboarding } from "@/lib/onboarding/useOnboarding";
import { ArrowIcon, CheckIcon, SearchIcon } from "@/components/ui/icons";
import { ChoiceButton, FlowFrame, FlowLoading, FlowTopBar, PrimaryButton } from "./Flow";
import { SaveFailedBanner } from "@/components/ui/Feedback";
import { track } from "@/lib/events/track";

type Pick = { status: ShoeStatus; label: string | null; source: "popular" | "custom" | "unknown" | "none" } | null;

const CUSTOM_MAX = 40;

export function CurrentShoe() {
  const router = useRouter();
  const { state, repo, error, reload } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState<Pick>(null);
  const [query, setQuery] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!state) return;
    if (!state.identity || !habitsComplete(state.profile)) {
      router.replace(nextOnboardingPath(state));
      return;
    }
    const p = state.profile;
    if (p.current_shoe_status === "known" && p.current_shoe_label) {
      const popular = POPULAR_SHOES.some((s) => s.label === p.current_shoe_label);
      setPick({ status: "known", label: p.current_shoe_label, source: popular ? "popular" : "custom" });
      if (!popular) {
        setCustomOpen(true);
        setCustom(p.current_shoe_label);
      }
    } else if (p.current_shoe_status === "unknown") setPick({ status: "unknown", label: null, source: "unknown" });
    else if (p.current_shoe_status === "none") setPick({ status: "none", label: null, source: "none" });
    setReady(true);
  }, [state, router]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_SHOES;
    return POPULAR_SHOES.filter((s) => `${s.brand} ${s.model} ${s.label}`.toLowerCase().includes(q));
  }, [query]);

  if (!state || !ready) return <FlowLoading error={error} onRetry={reload} />;

  const selectedText =
    pick?.status === "known" ? pick.label : pick?.status === "unknown" ? SHOE_UNKNOWN_LABEL : pick?.status === "none" ? "아직 없음" : null;

  function openCustom() {
    setCustomOpen(true);
    const seed = custom || query.trim();
    setCustom(seed);
    setPick(seed ? { status: "known", label: seed, source: "custom" } : null);
  }

  function typeCustom(v: string) {
    const text = v.slice(0, CUSTOM_MAX);
    setCustom(text);
    setPick(text.trim() ? { status: "known", label: text.trim(), source: "custom" } : null);
  }

  async function submit() {
    if (!pick) return;
    setSaving(true);
    setFailed(false);
    try {
      await repo.saveProfile({ current_shoe_status: pick.status, current_shoe_label: pick.status === "known" ? pick.label : null });
      await repo.complete();
      track("onboarding_complete", { shoe_status: pick.status, shoe_source: pick.source });
      router.push("/running");
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <FlowFrame>
      <FlowTopBar label="SHOE" step={3} total={3} backHref="/onboarding/runner" />
      <main className="px-6 pt-[30px] pb-[170px]">
        <h1 className="m-0 text-[30px] leading-[38px] font-extrabold tracking-[-0.02em]">지금 신는 러닝화</h1>

        <label className="mt-5 flex h-[53px] items-center gap-3 border border-gm-line2 bg-[#141413] px-4 text-gm-g1">
          <SearchIcon />
          <span className="sr-only">브랜드·모델 검색</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="브랜드·모델 검색"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-gm-tx outline-none placeholder:text-gm-g2"
          />
        </label>

        <p className="gm-label mt-7 mb-0">{query.trim() ? "SEARCH" : "POPULAR"}</p>
        <ul className="mt-3 p-0" role="radiogroup" aria-label="러닝화 선택">
          {list.map((s) => {
            const on = pick?.source === "popular" && pick.label === s.label;
            return (
              <li key={s.label} className="list-none border-t border-gm-line">
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setPick({ status: "known", label: s.label, source: "popular" });
                    setCustomOpen(false);
                  }}
                  className="flex h-[61px] w-full items-center gap-[14px] text-left"
                >
                  <span className="grid h-10 w-[52px] flex-none place-items-center bg-[#161615] px-1 text-center font-[family-name:var(--font-bl)] text-[9px] leading-[11px] font-bold tracking-[0.1em] text-gm-g1">
                    {s.brand}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-[family-name:var(--font-bl)] text-[12px] font-bold tracking-[0.16em] text-gm-g2">{s.brand}</span>
                    <span className="block truncate text-[17px] font-semibold">{s.model}</span>
                  </span>
                  <span aria-hidden="true" className={`grid size-6 flex-none place-items-center rounded-full ${on ? "bg-gm-lime text-gm-bg" : "border border-gm-g2"}`}>
                    {on && <CheckIcon size={14} />}
                  </span>
                </button>
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="list-none border-t border-gm-line py-4 text-[15px] text-gm-g1">검색 결과가 없어요. 아래에서 직접 입력해 주세요.</li>
          )}
          <li className="list-none border-y border-gm-line">
            <button type="button" aria-expanded={customOpen} onClick={openCustom} className="flex h-14 w-full items-center justify-between text-[17px] font-bold">
              직접 입력하기
              <ArrowIcon size={20} />
            </button>
            {customOpen && (
              <div className="pb-4">
                <label htmlFor="custom-shoe" className="sr-only">
                  브랜드와 모델명
                </label>
                <input
                  id="custom-shoe"
                  autoFocus
                  value={custom}
                  onChange={(e) => typeCustom(e.target.value)}
                  placeholder="예) Saucony Endorphin Speed 5"
                  maxLength={CUSTOM_MAX}
                  className={`h-[53px] w-full border bg-[#141413] px-4 text-[16px] text-gm-tx outline-none placeholder:text-gm-g2 ${
                    pick?.source === "custom" ? "border-gm-lime" : "border-gm-line2"
                  }`}
                />
              </div>
            )}
          </li>
        </ul>

        <p className="gm-label mt-6 mb-0">OR</p>
        <div className="mt-3 grid gap-2">
          <ChoiceButton
            selected={pick?.status === "unknown"}
            onClick={() => {
              setPick({ status: "unknown", label: null, source: "unknown" });
              setCustomOpen(false);
            }}
            className="h-[53px]"
          >
            모델명을 몰라요
          </ChoiceButton>
          <ChoiceButton
            selected={pick?.status === "none"}
            onClick={() => {
              setPick({ status: "none", label: null, source: "none" });
              setCustomOpen(false);
            }}
            className="h-[53px]"
          >
            아직 러닝화가 없어요
          </ChoiceButton>
        </div>
      </main>

      <div
        className="fixed bottom-0 left-1/2 z-10 w-full max-w-[430px] -translate-x-1/2 px-6 pt-6"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(10,10,10,0) 0, #0A0A0A 22px)" }}
      >
        <p className="mt-0 mb-3 flex items-baseline justify-between gap-4">
          <span className="flex-none text-[14px] tracking-[0.1em] text-gm-g2">선택한 신발</span>
          <span className={`truncate text-[16px] ${selectedText ? "font-semibold text-gm-tx" : "font-bold text-gm-g1"}`}>{selectedText ?? "선택 전"}</span>
        </p>
        {failed && <div className="mb-3"><SaveFailedBanner /></div>}
        <PrimaryButton disabled={!pick || saving} onClick={submit}>
          내 Runner 완성하기
        </PrimaryButton>
      </div>
    </FlowFrame>
  );
}
