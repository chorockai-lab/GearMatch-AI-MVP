"use client";
// Add Run / Edit Run — UI handoff 06_RUNNING_RECORDS: add-run · add-run-error · add-run-failed · edit-run · delete-confirm.
// Inputs: date · distance · time (h/m/s) · shoe. Pace is derived (AUTO), never entered.
// Date / shoe "변경" sheets have no A′ screen in the handoff (MISSING) → native date picker + minimal inline shoe choices.
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateKo, formatDuration, formatKm, formatMonDay, formatPace, localDate, paceSecPerKm, splitDuration, weekdayEn } from "@/lib/running/format";
import type { RunInput } from "@/lib/running/repository";
import { ArrowIcon, BackIcon, CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { SaveFailedBanner } from "@/components/ui/Feedback";

const MAX_KM = 300;
const MAX_HOURS = 47;

interface Draft {
  km: string;
  h: string;
  m: string;
  s: string;
  date: string;
  shoe: string | null;
}

export interface RunFormProps {
  mode: "add" | "edit";
  initial: RunInput;
  /** the profile's current shoe (label), for the CURRENT tag and the shoe choices */
  currentShoe: string | null;
  onSubmit: (input: RunInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  backHref: string;
}

const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);
function decimal(v: string) {
  const t = v.replace(",", ".").replace(/[^\d.]/g, "");
  const [int, ...rest] = t.split(".");
  return rest.length ? `${int.slice(0, 3)}.${rest.join("").slice(0, 2)}` : int.slice(0, 3);
}

function validate(d: Draft) {
  const km = d.km === "" ? null : Number(d.km);
  const h = d.h === "" ? 0 : Number(d.h);
  const m = d.m === "" ? 0 : Number(d.m);
  const s = d.s === "" ? 0 : Number(d.s);
  const timeEntered = d.h !== "" || d.m !== "" || d.s !== "";
  const errors: { km?: string; h?: string; m?: string; s?: string; time?: string } = {};
  if (km != null && !(km > 0)) errors.km = "0보다 큰 거리를 입력해 주세요.";
  else if (km != null && km > MAX_KM) errors.km = `${MAX_KM}km 이하로 입력해 주세요.`;
  if (h > MAX_HOURS) errors.h = `시간은 0~${MAX_HOURS} 사이로 입력해 주세요.`;
  if (m > 59) errors.m = "분은 0~59 사이로 입력해 주세요.";
  if (s > 59) errors.s = "초는 0~59 사이로 입력해 주세요.";
  const durationSec = h * 3600 + m * 60 + s;
  if (timeEntered && !errors.h && !errors.m && !errors.s && durationSec === 0) errors.time = "0보다 긴 시간을 입력해 주세요.";
  const valid = km != null && Object.keys(errors).length === 0 && durationSec > 0;
  return { errors, valid, km: km ?? 0, durationSec };
}

function Field({
  value, onChange, unit, label, invalid, edited, big, inputMode, id,
}: {
  value: string; onChange: (v: string) => void; unit: string; label: string; invalid?: boolean; edited?: boolean; big?: boolean;
  inputMode: "decimal" | "numeric"; id: string;
}) {
  const border = invalid ? "border-gm-err" : edited ? "border-gm-lime" : "border-gm-line2";
  return (
    <label htmlFor={id} className={`flex items-center border bg-gm-field ${big ? "h-[63px] px-4" : "h-[63px] px-4"} ${border}`}>
      <span className="sr-only">{label}</span>
      <input
        id={id}
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={`tabular min-w-0 flex-1 bg-transparent font-[family-name:var(--font-bc)] font-extrabold text-gm-tx outline-none placeholder:text-gm-line3 ${big ? "text-[40px]" : "text-[36px]"}`}
      />
      <span className={`flex-none font-bold text-gm-g1 ${unit === "KM" ? "font-[family-name:var(--font-bl)] text-[13px] tracking-[0.14em]" : "text-[12px]"}`}>{unit}</span>
    </label>
  );
}

export function RunForm({ mode, initial, currentShoe, onSubmit, onDelete, backHref }: RunFormProps) {
  const router = useRouter();
  const init = splitDuration(initial.durationSec);
  const initialDraft: Draft = useMemo(
    () => ({
      km: initial.distanceKm > 0 ? String(initial.distanceKm) : "",
      h: initial.durationSec > 0 ? String(init.h) : "",
      m: initial.durationSec > 0 ? String(init.m).padStart(2, "0") : "",
      s: initial.durationSec > 0 ? String(init.s).padStart(2, "0") : "",
      date: initial.runDate,
      shoe: initial.shoe,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [d, setD] = useState<Draft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shoeOpen, setShoeOpen] = useState(false);
  const [customShoe, setCustomShoe] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const v = validate(d);
  const pace = v.valid ? paceSecPerKm(v.km, v.durationSec) : null;
  const today = localDate();
  const set = (patch: Partial<Draft>) => {
    setD({ ...d, ...patch });
    setFailed(false);
  };
  const edited = (k: keyof Draft) => mode === "edit" && d[k] !== initialDraft[k];
  const kmChanged = mode === "edit" && v.valid && Number(d.km) !== initial.distanceKm;

  async function submit() {
    if (!v.valid || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await onSubmit({ runDate: d.date, distanceKm: Math.round(v.km * 100) / 100, durationSec: v.durationSec, shoe: d.shoe });
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!onDelete || saving) return;
    setSaving(true);
    setDeleteFailed(false);
    try {
      await onDelete();
    } catch {
      setDeleteFailed(true);
      setSaving(false);
    }
  }

  function openDate() {
    const el = dateRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  }

  const dateText = mode === "add" ? (d.date === today ? `TODAY · ${formatMonDay(d.date)}` : `${formatMonDay(d.date)} · ${weekdayEn(d.date)}`) : formatDateKo(d.date);
  const shoeChoices = [currentShoe, initial.shoe].filter((x, i, a): x is string => Boolean(x) && a.indexOf(x) === i);

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-gm-bg">
      <div className="flex h-14 items-center px-6">
        <button type="button" onClick={() => router.push(backHref)} aria-label="이전" className="-ml-2 grid size-11 place-items-center">
          <BackIcon />
        </button>
      </div>

      <main className="flex-1 px-6 pb-[200px]">
        {mode === "add" ? (
          <>
            <h1 className="mt-2 mb-0 text-[30px] leading-[38px] font-extrabold tracking-[-0.02em]">오늘의 러닝</h1>
            <p className="mt-2 mb-0 text-[15px] text-gm-g1">거리와 시간만 입력하면 돼요.</p>
          </>
        ) : (
          <div className="mt-1 flex items-end justify-between">
            <h1 className="m-0 font-[family-name:var(--font-bc)] text-[48px] leading-none font-extrabold uppercase">EDIT RUN</h1>
            <span className="mb-1 text-[14px] font-bold text-gm-lime">수정 중</span>
          </div>
        )}

        <div className={`flex items-center justify-between ${mode === "add" ? "mt-7" : "mt-6"}`}>
          <span className="gm-label">DISTANCE</span>
          <span className="gm-label">KM</span>
        </div>
        <div className="mt-2">
          <Field id="distance" label="거리 (km)" value={d.km} onChange={(x) => set({ km: decimal(x) })} unit="KM" invalid={Boolean(v.errors.km)} edited={edited("km")} big inputMode="decimal" />
        </div>
        {v.errors.km ? (
          <p className="mt-2 mb-0 text-[14px] font-bold text-gm-err-tx">{v.errors.km}</p>
        ) : kmChanged ? (
          <p className="mt-2 mb-0 text-[14px] text-gm-lime">수정됨 · 원래 {formatKm(initial.distanceKm)} KM</p>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <span className="gm-label">TIME</span>
          <span className="text-[12px] text-gm-g2">시간 · 분 · 초</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Field id="hours" label="시간" value={d.h} onChange={(x) => set({ h: digits(x, 2) })} unit="시간" invalid={Boolean(v.errors.h)} edited={edited("h")} inputMode="numeric" />
          <Field id="minutes" label="분" value={d.m} onChange={(x) => set({ m: digits(x, 2) })} unit="분" invalid={Boolean(v.errors.m)} edited={edited("m")} inputMode="numeric" />
          <Field id="seconds" label="초" value={d.s} onChange={(x) => set({ s: digits(x, 2) })} unit="초" invalid={Boolean(v.errors.s)} edited={edited("s")} inputMode="numeric" />
        </div>
        {(v.errors.h || v.errors.m || v.errors.s || v.errors.time) && (
          <p className="mt-2 mb-0 text-[14px] font-bold text-gm-err-tx">{v.errors.h ?? v.errors.m ?? v.errors.s ?? v.errors.time}</p>
        )}

        <div className="mt-4 flex h-[63px] items-center justify-between border border-gm-line2 px-[15px]">
          <span className="flex items-center gap-2">
            <span className="gm-label">AVG PACE</span>
            <span className="border border-gm-g1 px-1.5 font-[family-name:var(--font-bl)] text-[10px] leading-4 font-bold tracking-[0.12em] text-gm-g1">AUTO</span>
          </span>
          <span className="flex items-baseline gap-1">
            <span className="tabular font-[family-name:var(--font-bc)] text-[32px] leading-none font-extrabold">{formatPace(pace)}</span>
            {pace != null && <span className="font-[family-name:var(--font-bl)] text-[12px] font-bold text-gm-g1">/KM</span>}
          </span>
        </div>

        <div className="mt-5 flex min-h-[57px] items-center justify-between border-t border-gm-line">
          <span className="gm-label">DATE</span>
          <button type="button" onClick={openDate} className="relative flex items-center gap-2.5 py-3">
            <span className="text-[16px] font-bold">{dateText}</span>
            <span className="text-[14px] font-bold text-gm-g1">변경</span>
            <span className="-rotate-90 text-gm-g1"><ChevronDownIcon size={16} /></span>
            <input
              ref={dateRef}
              type="date"
              aria-label="날짜 선택"
              max={today}
              value={d.date}
              onChange={(e) => e.target.value && e.target.value <= today && set({ date: e.target.value })}
              className="pointer-events-none absolute inset-0 opacity-0"
              tabIndex={-1}
            />
          </button>
        </div>

        <div className="border-y border-gm-line py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="gm-label">SHOE</span>
            <span className="min-w-0 flex-1 pl-3">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-[16px] font-semibold">{d.shoe ?? "신발 미지정"}</span>
                {d.shoe && d.shoe === currentShoe && mode === "add" && (
                  <span className="border border-gm-g1 px-1.5 font-[family-name:var(--font-bl)] text-[10px] leading-4 font-bold tracking-[0.12em] text-gm-g1">CURRENT</span>
                )}
              </span>
              <span className="mt-0.5 block text-[13px] text-gm-g1">{mode === "add" ? "이번 러닝에 신은 신발로 저장돼요." : "이 러닝에 신은 신발"}</span>
            </span>
            <button type="button" aria-expanded={shoeOpen} onClick={() => setShoeOpen(!shoeOpen)} className="h-11 flex-none font-[family-name:var(--font-bl)] text-[13px] font-bold tracking-[0.12em]">
              {mode === "add" ? "CHANGE" : "변경"}
            </button>
          </div>
          {shoeOpen && (
            <div className="mt-2 grid gap-2">
              {shoeChoices.map((label) => (
                <button key={label} type="button" aria-pressed={d.shoe === label} onClick={() => { set({ shoe: label }); setShoeOpen(false); }}
                  className={`flex h-11 items-center justify-between border px-3 text-[15px] font-semibold ${d.shoe === label ? "border-gm-lime text-gm-lime" : "border-gm-line2"}`}>
                  {label}
                  {d.shoe === label && <CheckIcon size={14} />}
                </button>
              ))}
              <button type="button" aria-pressed={d.shoe === null} onClick={() => { set({ shoe: null }); setShoeOpen(false); }}
                className={`flex h-11 items-center justify-between border px-3 text-[15px] font-semibold ${d.shoe === null ? "border-gm-lime text-gm-lime" : "border-gm-line2"}`}>
                신발 미지정
                {d.shoe === null && <CheckIcon size={14} />}
              </button>
              <div className="flex gap-2">
                <label htmlFor="custom-run-shoe" className="sr-only">다른 신발 직접 입력</label>
                <input id="custom-run-shoe" value={customShoe} maxLength={40} onChange={(e) => setCustomShoe(e.target.value)} placeholder="다른 신발 직접 입력"
                  className="h-11 min-w-0 flex-1 border border-gm-line2 bg-gm-field px-3 text-[15px] outline-none placeholder:text-gm-g2" />
                <button type="button" disabled={!customShoe.trim()} onClick={() => { set({ shoe: customShoe.trim() }); setShoeOpen(false); }}
                  className="h-11 border border-gm-line3 px-3 text-[14px] font-bold disabled:text-gm-line3">적용</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-1/2 z-10 w-full max-w-[430px] -translate-x-1/2 px-6 pt-6"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(10,10,10,0) 0, #0A0A0A 22px)" }}>
        {failed && <div className="mb-3"><SaveFailedBanner /></div>}
        <button type="button" onClick={submit} disabled={!v.valid || saving}
          className={`flex h-[60px] w-full items-center justify-between px-5 text-[18px] font-extrabold ${!v.valid ? "cursor-not-allowed bg-[#222221] text-gm-line3" : "bg-gm-lime text-gm-bg"}`}>
          {saving ? "저장 중…" : failed ? "다시 시도하기" : mode === "add" ? "러닝 저장하기" : "수정 내용 저장하기"}
          {failed ? <ArrowIcon size={22} /> : <CheckIcon size={24} />}
        </button>
        {mode === "edit" && onDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="mx-auto mt-2 flex h-11 items-center text-[16px] font-bold text-gm-err-tx">
            이 러닝 기록 삭제하기
          </button>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-20 mx-auto flex max-w-[430px] flex-col justify-end bg-[rgba(3,3,3,0.66)]" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="border-t border-gm-line2 bg-gm-sheet px-6 pt-7" style={{ paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
            <h2 id="delete-title" className="m-0 text-[22px] font-extrabold">이 기록을 삭제할까요?</h2>
            <p className="mt-2 mb-0 text-[15px] text-gm-g1">삭제한 기록은 되돌릴 수 없어요.</p>
            <p className="tabular mt-5 mb-0 border border-gm-line2 px-[15px] py-3 font-[family-name:var(--font-bc)] text-[22px] font-extrabold">
              {formatMonDay(initial.runDate)} · {formatKm(initial.distanceKm)} KM · {formatDuration(initial.durationSec)}
            </p>
            {deleteFailed && <div className="mt-3"><SaveFailedBanner message="삭제하지 못했어요. 잠시 후 다시 시도해 주세요." /></div>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-14 border border-gm-line3 text-[16px] font-bold">취소</button>
              <button type="button" onClick={doDelete} disabled={saving} className="h-14 bg-gm-err text-[16px] font-extrabold text-gm-bg">
                {saving ? "삭제 중…" : "기록 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
