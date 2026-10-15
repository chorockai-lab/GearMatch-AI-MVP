"use client";
// Shared pieces of the onboarding screens (UI handoff 02_RUNNER_TEST / 04_RUNNER_PROFILE).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowIcon, BackIcon } from "@/components/ui/icons";
import { LoadFailedBlock } from "@/components/ui/Feedback";

/** Full-height mobile column (390-first, centred on wider screens). */
export function FlowFrame({ children }: { children: React.ReactNode }) {
  return <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-gm-bg">{children}</div>;
}

/** "← 이전" + "{LABEL} 01 / 05" + segmented progress bar. */
export function FlowTopBar({ label, step, total, backHref }: { label: string; step: number; total: number; backHref?: string }) {
  const router = useRouter();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="px-6">
      <div className="flex h-14 items-center justify-between">
        <button
          type="button"
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          className="-ml-2 flex h-11 items-center gap-2.5 px-2 text-[16px] font-bold"
        >
          <BackIcon />
          이전
        </button>
        <p className="m-0 flex items-baseline gap-2" aria-label={`${label} ${step} / ${total}`}>
          <span className="gm-label">{label}</span>
          <span className="tabular font-[family-name:var(--font-bc)] text-[24px] leading-none font-extrabold text-gm-lime">{pad(step)}</span>
          <span className="tabular font-[family-name:var(--font-bc)] text-[20px] leading-none font-bold text-gm-g1">/ {pad(total)}</span>
        </p>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-[3px] flex-1 ${i < step ? "bg-gm-lime" : "bg-gm-line2"}`} />
        ))}
      </div>
    </div>
  );
}

const ctaBase = "flex h-[60px] w-full items-center justify-between px-5 text-[18px] font-extrabold";

/** Lime primary CTA. Disabled = dark grey (profile-step1 "다음" before completion). */
export function PrimaryButton({ children, disabled, onClick, type = "button" }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${ctaBase} ${disabled ? "cursor-not-allowed bg-[#222221] text-gm-line3" : "bg-gm-lime text-gm-bg"}`}
    >
      {children}
      <ArrowIcon size={22} />
    </button>
  );
}

/**
 * `centered`: label centred, arrow kept at the right edge (Landing). Default layout is unchanged.
 * Below 360px the label is 1px smaller and the arrow 4px further out, so they never crowd each other.
 */
export function PrimaryLink({ href, children, centered = false }: { href: string; children: React.ReactNode; centered?: boolean }) {
  if (centered) {
    return (
      <Link href={href} className={`${ctaBase} relative !justify-center bg-gm-lime text-gm-bg max-[359px]:text-[17px]`}>
        {children}
        <span className="absolute right-5 flex max-[359px]:right-4">
          <ArrowIcon size={22} />
        </span>
      </Link>
    );
  }
  return (
    <Link href={href} className={`${ctaBase} bg-gm-lime text-gm-bg`}>
      {children}
      <ArrowIcon size={22} />
    </Link>
  );
}

/** Bordered choice button (profile options, "모델명을 몰라요" …). Selected = lime fill. */
export function ChoiceButton({ selected, onClick, children, className = "" }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-[50px] items-center justify-center border px-2 text-[16px] font-bold ${
        selected ? "border-gm-lime bg-gm-lime text-gm-bg" : "border-gm-line3 text-gm-tx"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Black blank screen while client-only state loads (avoids a flash of wrong content).
 * With `error`, shows the shared load-failed block (UI handoff load-failed) and a retry.
 */
export function FlowLoading({ error, onRetry }: { error?: unknown; onRetry?: () => void } = {}) {
  return (
    <FlowFrame>
      {error ? (
        <div className="px-6 pt-20">
          <LoadFailedBlock title="정보를 불러오지 못했어요." onRetry={onRetry ?? (() => window.location.reload())} />
        </div>
      ) : null}
    </FlowFrame>
  );
}
