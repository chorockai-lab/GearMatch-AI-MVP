import Link from "next/link";
import { ANIMAL_IDS, ANIMALS } from "@/lib/identity/animals";

// Development index (QA only). "/" is the Landing screen since STEP 2.
const STATES = [
  ["first", "FIRST ENTRY"],
  ["base", "BASE"],
  ["run", "RUN"],
  ["milestone", "MILESTONE"],
] as const;

export default function DevIndex() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] px-6 py-10">
      <p className="gm-label" style={{ color: "var(--color-gm-lime)" }}>GEARMATCH AI v2.0 · MVP · DEV</p>
      <h1 className="mt-3 font-[family-name:var(--font-bc)] text-[44px] leading-[0.92] font-extrabold uppercase">개발 미리보기</h1>
      <p className="mt-4 text-[14px] leading-6 text-gm-g1">
        RUNNING Main 화면과 캐릭터 자산을 DEMO 데이터로 확인하는 QA 페이지예요. 실제 흐름은 첫 화면(/)에서 시작합니다.
      </p>

      <h2 className="mt-10 gm-label">RUNNING MAIN · CHEETAH</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {STATES.map(([s, label]) => (
          <li key={s}>
            <Link href={`/running?state=${s}&animal=CHE`} className="flex h-12 items-center border border-gm-line3 px-4 font-[family-name:var(--font-bc)] text-[18px] font-bold">
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 gm-label">8 ANIMALS · BASE</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {ANIMAL_IDS.map((id) => (
          <li key={id}>
            <Link href={`/running?state=base&animal=${id}`} className="flex h-12 items-center justify-between border border-gm-line px-4">
              <span className="font-[family-name:var(--font-bc)] text-[18px] font-bold">{ANIMALS[id].nameEn}</span>
              <span className="text-[12px] text-gm-g2">{id}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/dev/states" className="mt-10 flex h-[60px] items-center justify-between bg-gm-lime px-5 text-[17px] font-extrabold text-gm-bg">
        8종 × 4상태 장면 한 번에 보기
      </Link>
    </main>
  );
}
