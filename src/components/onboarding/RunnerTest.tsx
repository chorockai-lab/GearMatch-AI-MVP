"use client";
// Runner Test — UI handoff 02_RUNNER_TEST/runner-test-q{1..5}.png
// 1 question per screen · tap = save + auto-advance · "이전" goes back with the previous answer kept (editable).
// Changing any answer clears the stored identity; it is re-evaluated after Q5 (spec §8 QA).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS, type AnswerCode } from "@/lib/identity/questions";
import { completeAnswers, identityFromAnswers } from "@/lib/onboarding/repository";
import { useOnboarding } from "@/lib/onboarding/useOnboarding";
import { CheckIcon } from "@/components/ui/icons";
import { SaveFailedBanner } from "@/components/ui/Feedback";
import { track } from "@/lib/events/track";
import { useTrackOnce } from "@/lib/events/useTrackOnce";
import { FlowFrame, FlowLoading, FlowTopBar } from "./Flow";

const ADVANCE_DELAY_MS = 220; // long enough to see the selected state

export function RunnerTest({ n }: { n: number }) {
  const router = useRouter();
  const { state, repo, error, reload } = useOnboarding();
  const [picked, setPicked] = useState<AnswerCode | null>(null);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const q = QUESTIONS[n - 1];

  // guard: earlier questions must be answered first
  useEffect(() => {
    if (!state) return;
    const firstMissing = QUESTIONS.findIndex((x) => !state.answers[x.id]);
    if (firstMissing >= 0 && firstMissing < n - 1) router.replace(`/test/${firstMissing + 1}`);
  }, [state, n, router]);

  useTrackOnce("test_start", {}, n === 1 && Boolean(state));

  if (!state) return <FlowLoading error={error} onRetry={reload} />;
  const current = picked ?? state.answers[q.id] ?? null;

  async function choose(code: AnswerCode) {
    if (busy.current) return;
    busy.current = true;
    setPicked(code);
    setFailed(false);
    try {
      const next = await repo.setAnswer(q.id, code);
      await new Promise((r) => setTimeout(r, ADVANCE_DELAY_MS));
      if (n < QUESTIONS.length) {
        router.push(`/test/${n + 1}`);
        return;
      }
      const answers = completeAnswers(next);
      if (!answers) {
        busy.current = false;
        router.replace("/test/1");
        return;
      }
      const identity = identityFromAnswers(answers);
      await repo.saveIdentity(identity);
      track("test_complete", { animal: identity.animal_type_v2, mixed_signal: identity.mixed_signal });
      router.push("/reveal");
    } catch {
      busy.current = false;
      setFailed(true);
    }
  }

  return (
    <FlowFrame>
      <FlowTopBar label="PROGRESS" step={n} total={QUESTIONS.length} backHref={n === 1 ? "/" : `/test/${n - 1}`} />
      <main className="px-6 pt-[30px] pb-10">
        <p className="gm-label m-0">RUNNER TEST</p>
        <h1 className="mt-3 mb-0 text-[24px] leading-[35px] font-extrabold tracking-[-0.04em] [word-break:keep-all]">{q.title}</h1>
        <ul className="mt-6 grid gap-2 p-0" role="radiogroup" aria-label={q.title}>
          {q.options.map((o) => {
            const on = current === o.code;
            return (
              <li key={o.code} className="list-none">
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choose(o.code)}
                  className={`grid min-h-16 w-full grid-cols-[20px_minmax(0,1fr)_24px] items-center gap-x-[14px] border py-3 pr-[15px] pl-[15px] text-left ${
                    on ? "border-gm-lime bg-gm-lime text-gm-bg" : "border-gm-line2 text-gm-tx"
                  }`}
                >
                  <span className={`font-[family-name:var(--font-bc)] text-[22px] font-extrabold ${on ? "text-gm-bg" : "text-gm-g2"}`}>{o.code}</span>
                  <span className="text-[16px] leading-[23px] font-bold [word-break:keep-all]">{o.text}</span>
                  <span
                    aria-hidden="true"
                    className={`grid size-6 place-items-center rounded-full ${on ? "bg-gm-bg text-gm-lime" : "border border-gm-g2"}`}
                  >
                    {on && <CheckIcon size={14} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 mb-0 text-[13px] text-gm-g2">고르면 다음 질문으로 넘어가요.</p>
        {failed && <div className="mt-4"><SaveFailedBanner message="저장하지 못했어요. 다시 골라 주세요." /></div>}
      </main>
    </FlowFrame>
  );
}
