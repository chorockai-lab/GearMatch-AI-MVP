import Link from "next/link";
import { RunnerScene } from "@/components/running/RunnerScene";
import { ANIMAL_IDS, ANIMALS } from "@/lib/identity/animals";
import type { CardState } from "@/lib/running/types";

// QA page: every animal × every card state, using the real PNG assets.
const STATES: CardState[] = ["base", "run", "milestone"];

export default function StatesPage() {
  return (
    <main className="mx-auto w-full max-w-[1300px] px-6 py-10">
      <Link href="/dev" className="gm-label">← 개발 미리보기</Link>
      <h1 className="mt-3 font-[family-name:var(--font-bc)] text-[40px] font-extrabold uppercase">8 Animals × States</h1>
      <p className="mt-2 text-[13px] text-gm-g1">FIRST ENTRY의 장면은 BASE와 같습니다. 각 장면은 실제 PNG(×3, nearest-neighbour)입니다.</p>
      <div className="mt-8 grid gap-y-8">
        {ANIMAL_IDS.map((id) => (
          <section key={id}>
            <h2 className="mb-3 flex items-baseline gap-3">
              <span className="font-[family-name:var(--font-bc)] text-[24px] font-extrabold">{ANIMALS[id].nameEn}</span>
              <span className="text-[13px] text-gm-g2">{id} · {ANIMALS[id].nameKo}</span>
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {STATES.map((s) => (
                <Link key={s} href={`/running?state=${s}&animal=${id}`} className="block w-[390px] max-w-full">
                  <RunnerScene animal={id} state={s} />
                  <span className="mt-1 block gm-label">{s.toUpperCase()}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
