"use client";
// QA only (not linked from the product; page.tsx hides it in Production): what this browser keeps for the
// re-visit checks in docs/QA_REVISIT.md.
// Reads this browser's own data through the normal repositories (RLS: own rows only). It never creates a user:
// with no stored session it only says so.
import { useCallback, useEffect, useState } from "react";
import { STORAGE_MODE } from "@/lib/config";
import { getSupabase } from "@/lib/supabase/client";
import { onboardingRepository } from "@/lib/onboarding/store";
import { runsRepository } from "@/lib/running/repository";
import { itemsRepository } from "@/lib/items/repository";
import { ANIMALS } from "@/lib/identity/animals";
import { BROWSER_LABEL, detectBrowser } from "@/lib/qa/browser";
import { isQaSession } from "@/lib/events/track";

interface Snapshot {
  browser: string;
  qa: boolean;
  userId: string | null; // null = no session in this browser
  animal: string | null;
  onboarded: boolean;
  runs: number;
  saved: number;
  posthogId: string | null;
}

const tail = (id: string | null) => (id ? `…${id.slice(-8)}` : "—");

function readLocal(key: RegExp): string | null {
  try {
    const k = Object.keys(window.localStorage).find((x) => key.test(x));
    return k ? window.localStorage.getItem(k) : null;
  } catch {
    return null;
  }
}

async function snapshot(): Promise<Snapshot> {
  const browser = BROWSER_LABEL[detectBrowser(navigator.userAgent)];
  const qa = isQaSession(); // applies ?qa=1 / ?qa=0 like every other page
  let posthogId: string | null = null;
  try {
    posthogId = (JSON.parse(readLocal(/^ph_phc_.+_posthog$/) ?? "{}") as { distinct_id?: string }).distinct_id ?? null;
  } catch {
    /* no PostHog state */
  }
  let userId: string | null = "local";
  if (STORAGE_MODE === "server") {
    const { data } = await getSupabase()!.auth.getSession();
    userId = data.session?.user.id ?? null;
    if (!userId) return { browser, qa, userId, animal: null, onboarded: false, runs: 0, saved: 0, posthogId };
  }
  const [ob, runs, saved] = await Promise.all([onboardingRepository.load(), runsRepository.list(), itemsRepository.saved()]);
  const animal = ob.identity ? `${ANIMALS[ob.identity.animal_type_v2].nameEn} (${ob.identity.animal_type_v2})` : null;
  return { browser, qa, userId, animal, onboarded: Boolean(ob.identity && ob.completed_at), runs: runs.length, saved: saved.length, posthogId };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-gm-line py-3">
      <dt className="gm-label">{label}</dt>
      <dd className="m-0 text-right text-[16px] font-bold">{value}</dd>
    </div>
  );
}

export function SessionCheck() {
  const [s, setS] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);
  const refresh = useCallback(() => {
    setError(false);
    snapshot().then(setS, () => setError(true));
  }, []);
  useEffect(refresh, [refresh]);

  const ph = !s?.posthogId ? "없음" : s.userId && s.posthogId === s.userId ? `일치 ${tail(s.posthogId)}` : `불일치 ${tail(s.posthogId)}`;
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] px-6 py-10">
      <p className="gm-label" style={{ color: "var(--color-gm-lime)" }}>GEARMATCH · DEV · QA</p>
      <h1 className="mt-3 font-[family-name:var(--font-bc)] text-[40px] leading-[0.92] font-extrabold uppercase">재접속 확인</h1>
      <p className="mt-4 text-[14px] leading-6 text-gm-g1">이 브라우저에 남아 있는 정보예요. 새 사용자를 만들지 않습니다. 사용자 ID는 끝 8자리만 표시해요.</p>
      {error && <p role="alert" className="mt-6 text-[15px] font-bold text-gm-err-tx">불러오지 못했어요. 다시 확인을 눌러 주세요.</p>}
      {s && (
        <dl className="mt-6">
          <Row label="브라우저" value={s.browser} />
          <Row label="저장 방식" value={STORAGE_MODE === "server" ? "서버 (익명 계정)" : "이 브라우저 임시 저장 (DEMO)"} />
          <Row label="QA 표시" value={s.qa ? "켜짐 (?qa=1)" : "꺼짐"} />
          <Row label="사용자 ID" value={s.userId === null ? "없음 — 새 사용자" : s.userId === "local" ? "로컬" : tail(s.userId)} />
          <Row label="러닝 동물" value={s.animal ?? "없음"} />
          <Row label="온보딩 완료" value={s.onboarded ? "예" : "아니요"} />
          <Row label="러닝 기록" value={`${s.runs}건`} />
          <Row label="저장한 신발" value={`${s.saved}건`} />
          <Row label="PostHog ID" value={ph} />
        </dl>
      )}
      <button type="button" onClick={refresh} className="mt-8 flex h-[50px] w-full items-center justify-center border border-gm-line3 text-[16px] font-bold">
        다시 확인
      </button>
    </main>
  );
}
