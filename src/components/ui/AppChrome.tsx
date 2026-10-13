import Link from "next/link";
import { RunIcon, ShoeIcon, UserIcon } from "./icons";

/** Mobile app frame: 390-first, centred on wider screens, room for the fixed tab bar. */
export function AppFrame({ children }: { children: React.ReactNode }) {
  return <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-gm-bg pb-[108px]">{children}</div>;
}

export function AppHeader({ demo }: { demo?: boolean }) {
  return (
    <header className="relative z-[2] flex h-14 items-center justify-between pr-3 pl-6">
      <span className="flex items-center gap-2.5">
        <span className="font-[family-name:var(--font-bc)] text-[17px] font-extrabold tracking-[0.22em]">GEARMATCH</span>
        {demo && (
          <span className="border border-gm-line3 px-1.5 py-px font-[family-name:var(--font-bl)] text-[10px] font-bold tracking-[0.12em] text-gm-g1">
            DEMO DATA
          </span>
        )}
      </span>
      <Link href="/profile" aria-label="내 정보 수정" className="grid size-11 place-items-center text-gm-g1">
        <span className="grid size-9 place-items-center border border-gm-line2">
          <UserIcon />
        </span>
      </Link>
    </header>
  );
}

export function BottomNav({ active }: { active: "running" | "items" }) {
  const tab = (key: "running" | "items", href: string, label: string, icon: React.ReactNode) => {
    const on = active === key;
    return (
      <Link
        href={href}
        aria-current={on ? "page" : undefined}
        className={`relative flex items-center justify-center gap-2.5 ${on ? "text-gm-tx" : "text-gm-g2"}`}
      >
        {on && <span aria-hidden="true" className="absolute -top-px right-6 left-6 h-0.5 bg-gm-lime" />}
        {icon}
        <span className={`font-[family-name:var(--font-bl)] text-[12px] tracking-[0.14em] ${on ? "font-bold" : "font-semibold"}`}>{label}</span>
      </Link>
    );
  };
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 left-1/2 z-10 grid h-[84px] w-full max-w-[430px] -translate-x-1/2 grid-cols-2 border-t border-gm-line bg-[rgba(10,10,10,0.96)]"
      style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
    >
      {tab("running", "/running", "RUNNING", <RunIcon strokeWidth={active === "running" ? 2 : 1.7} />)}
      {tab("items", "/items", "ITEMS", <ShoeIcon strokeWidth={active === "items" ? 2 : 1.7} />)}
    </nav>
  );
}
