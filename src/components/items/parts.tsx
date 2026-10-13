"use client";
// Shared ITEMS pieces — UI handoff 08_ITEMS.
import { useCallback, useEffect, useState } from "react";
import { itemsRepository, type SavedProduct } from "@/lib/items/repository";
import type { MatchProfile, Range, RunnersLikeYou } from "@/lib/items/types";
import { BookmarkIcon } from "@/components/ui/icons";

export const USE_LABEL: Record<string, string> = {
  DAILY: "DAILY TRAINER",
  LONG: "LONG RUN",
  TEMPO: "TEMPO",
  RACE: "RACE",
  STABILITY: "STABILITY",
  RECOVERY: "RECOVERY",
};

/** usual-distance bucket → "5-10" KM (USUALLY) */
export const DISTANCE_SHORT: Record<string, string> = { LT_3: "<3", D3_5: "3-5", D5_10: "5-10", GTE_10: "10+" };

export function DemoBadge({ data = false }: { data?: boolean }) {
  return (
    <span className="inline-flex h-6 items-center border border-dashed border-gm-line3 px-2 font-[family-name:var(--font-bl)] text-[11px] font-bold tracking-[0.16em] text-gm-g1">
      {data ? "DEMO DATA" : "DEMO"}
    </span>
  );
}

/** "28명 중 8명" segmented bar — 24 cells, filled by share */
export function ShareBar({ share, cells = 24 }: { share: number; cells?: number }) {
  const on = Math.round(share * cells);
  return (
    <span aria-hidden="true" className="flex gap-[2px]">
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} className={`h-[7px] flex-1 ${i < on ? "bg-gm-tx" : "bg-gm-line2"}`} />
      ))}
    </span>
  );
}

export function SaveToggle({ saved, onToggle, busy, compact }: { saved: boolean; onToggle: () => void; busy?: boolean; compact?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={busy}
      onClick={onToggle}
      className={`flex flex-none items-center justify-center gap-2 border font-[family-name:var(--font-bl)] font-bold tracking-[0.14em] ${compact ? "h-11 px-3 text-[13px]" : "h-[60px] px-5 text-[15px]"} ${
        saved ? "border-gm-tx bg-gm-tx text-gm-bg" : "border-gm-line3 text-gm-tx"
      }`}
    >
      <BookmarkIcon size={compact ? 16 : 18} filled={saved} />
      {saved ? "SAVED" : "SAVE"}
    </button>
  );
}

/** Runners Like You result for a range. `result` null while loading. */
export function useRunnersLikeYou(range: Range, profile: MatchProfile | null) {
  const [result, setResult] = useState<RunnersLikeYou | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify(profile);
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    setResult(null);
    itemsRepository.runnersLikeYou(range, JSON.parse(key)).then(
      (r) => alive && setResult(r),
      (e) => alive && setError(e ?? new Error("load failed")),
    );
    return () => {
      alive = false;
    };
  }, [range, key, attempt, profile]);
  const reload = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);
  return { result, error, reload };
}

/** Saved shoes + toggle with optimistic update (reverted on failure). */
export function useSaved() {
  const [saved, setSaved] = useState<SavedProduct[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    itemsRepository.saved().then(
      (s) => alive && setSaved(s),
      (e) => alive && setError(e ?? new Error("load failed")),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);
  const ids = new Set((saved ?? []).map((s) => s.product.id));

  async function toggle(productId: string, product?: SavedProduct["product"]): Promise<"saved" | "unsaved" | "failed"> {
    if (busy) return "failed";
    const wasSaved = ids.has(productId);
    const before = saved ?? [];
    setBusy(productId);
    setFailed(false);
    setSaved(wasSaved ? before.filter((s) => s.product.id !== productId) : product ? [{ product, saved_at: new Date().toISOString() }, ...before] : before);
    try {
      if (wasSaved) await itemsRepository.unsave(productId);
      else await itemsRepository.save(productId);
      return wasSaved ? "unsaved" : "saved";
    } catch {
      setSaved(before);
      setFailed(true);
      return "failed";
    } finally {
      setBusy(null);
    }
  }
  const reload = () => {
    setError(null);
    setAttempt((n) => n + 1);
  };
  return { saved, ids, toggle, busy, failed, error, reload };
}
