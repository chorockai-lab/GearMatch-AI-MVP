// Landing hero — night run (approved reference 2026-10-15): the Pixel Runner in front, four moonlit animal
// silhouettes following behind ("which one is mine?"). Built only from existing sprites: the runner is
// human-run, the silhouettes are the char-*-run sprites recoloured by scripts/assets/landing-hero.py.
// Integer scale + nearest-neighbour throughout; the scene is bottom-anchored so short screens trim sky, never runners.
import { bboxCenterX, bboxOf } from "@/lib/assets/sprites";

/** Sky colour at the top of night-bg.png — the header above the scene uses it so the two read as one. */
export const NIGHT_SKY = "#0a0d1c";

const BG_W = 144; // night-bg.png logical size: a 100px-tall scene + 16px of extra sky on top
const BG_H = 116;
const BG_SC = 3;
const SCENE_H = 100 * BG_SC; // 300px — actor/firefly positions are measured in this box (bottom-anchored)
const MAX_H = BG_H * BG_SC; // 348px on tall screens (more sky)
const FEET_ROWS = 4; // 64×48 sprites draw feet on row 43 → 4 empty rows below
const MOON = 22 * BG_SC; // moon.png 22×22
const MOON_FROM_BOTTOM = MAX_H - (16 + 16) * BG_SC + MOON / 2; // moon top, measured from the scene bottom, in the full-height sky

interface Actor {
  src: string;
  key: string; // bbox key for horizontal centring
  cx: number; // centre, % of scene width
  sc: number; // integer scale (bigger = closer)
  base: number; // feet line, px from the top of the 300px scene
  dim?: number; // opacity for depth
}

// back → front
const ACTORS: Actor[] = [
  { src: "/assets/landing/sil-hor.png", key: "char-hor-run", cx: 20, sc: 3, base: 250, dim: 0.85 },
  { src: "/assets/landing/sil-che.png", key: "char-che-run", cx: 88, sc: 3, base: 256, dim: 0.85 },
  { src: "/assets/landing/sil-wol.png", key: "char-wol-run", cx: 41, sc: 4, base: 266 },
  { src: "/assets/landing/sil-fox.png", key: "char-fox-run", cx: 16, sc: 3, base: 282 },
  { src: "/assets/human/human-run.png", key: "human-run", cx: 64, sc: 4, base: 282 },
];

// [left %, top px in the 300px scene, delay s]
const FIREFLIES: [number, number, number][] = [
  [8, 214, 0],
  [27, 252, 1.4],
  [47, 228, 2.6],
  [74, 238, 0.8],
  [93, 206, 2.1],
  [58, 262, 3.2],
];

function Sprite({ a }: { a: Actor }) {
  const w = 64 * a.sc;
  const h = 48 * a.sc;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={a.src}
      alt=""
      aria-hidden="true"
      width={w}
      height={h}
      draggable={false}
      className="px absolute max-w-none select-none"
      style={{
        left: `calc(${a.cx}% - ${Math.round(bboxCenterX(bboxOf(a.key)) * a.sc)}px)`,
        bottom: SCENE_H - a.base - FEET_ROWS * a.sc,
        width: w,
        height: h,
        opacity: a.dim,
      }}
    />
  );
}

export function LandingScene() {
  return (
    <div
      role="img"
      aria-label="달빛 아래 숲길을 달리는 Pixel Runner와, 그 뒤를 따라오는 네 마리 러닝 동물의 실루엣"
      className="px relative w-full overflow-hidden"
      style={{
        // full 300px on most phones; on short screens the sky is trimmed so the CTA stays in view
        height: `clamp(216px, calc(100svh - 440px), ${MAX_H}px)`,
        backgroundColor: NIGHT_SKY,
        backgroundImage: "url(/assets/landing/night-bg.png)",
        backgroundSize: `${BG_W * BG_SC}px ${MAX_H}px`,
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* pinned near the top so a trimmed (short-screen) sky still shows it */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/landing/moon.png"
        alt=""
        aria-hidden="true"
        width={MOON}
        height={MOON}
        draggable={false}
        className="px absolute max-w-none select-none"
        style={{ right: "max(8px, calc(50% - 180px))", top: `max(8px, calc(100% - ${MOON_FROM_BOTTOM}px))`, width: MOON, height: MOON }}
      />
      {ACTORS.map((a) => (
        <Sprite key={a.src} a={a} />
      ))}
      {FIREFLIES.map(([left, top, delay]) => (
        <span
          key={`${left}-${top}`}
          aria-hidden="true"
          className="gm-firefly absolute size-[3px] bg-gm-lime"
          style={{ left: `${left}%`, bottom: SCENE_H - top, animationDelay: `${delay}s` }}
        />
      ))}
      {/* blend the (possibly trimmed) sky into the header above */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-8" style={{ background: `linear-gradient(${NIGHT_SKY}, transparent)` }} />
      {/* soft hand-off from the meadow into the page background */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-b from-transparent to-gm-bg" />
    </div>
  );
}
