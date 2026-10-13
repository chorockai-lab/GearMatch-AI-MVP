import Link from "next/link";
import { AppFrame, AppHeader, BottomNav } from "./AppChrome";

/** Temporary screen for routes that later STEPs implement. Clearly marked as not built yet. */
export function Placeholder({ title, step, note, tab = "running" }: { title: string; step: string; note?: string; tab?: "running" | "items" }) {
  return (
    <AppFrame>
      <AppHeader />
      <div className="px-6 pt-10">
        <p className="gm-label" style={{ color: "var(--color-gm-lime)" }}>{step} · 구현 예정</p>
        <h1 className="mt-3 font-[family-name:var(--font-bc)] text-[40px] leading-[0.95] font-extrabold uppercase">{title}</h1>
        {note && <p className="mt-4 text-[15px] leading-6 text-gm-g1">{note}</p>}
        <Link href="/running" className="mt-8 inline-flex h-11 items-center border border-gm-line3 px-4 text-[14px] font-semibold">
          RUNNING으로 돌아가기
        </Link>
      </div>
      <BottomNav active={tab} />
    </AppFrame>
  );
}
