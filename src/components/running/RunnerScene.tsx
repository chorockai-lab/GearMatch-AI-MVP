// Runner Card scene — human (left lane) + animal (one lane up, right), same direction.
// Rules (RUNNING MAIN FINAL MASTER §03):
//  • 64×48 PNGs at integer ×3 (192×144), nearest-neighbour
//  • centres at 100/390 and 250/390 of the scene width; animal one lane (24px) up
//  • every pose keeps its BASE sprite anchor → no jump between BASE / RUN / MILESTONE
//  • layers: lanes → shadow → speed → human → animal → celebrate
//  • animal speed lines start right of the human sprite (never cross the human)
import { ANIMALS, type AnimalId } from "@/lib/identity/animals";
import { bboxCenterX, bboxOf, bboxWidth, spriteSrc } from "@/lib/assets/sprites";
import type { CardState } from "@/lib/running/types";

const SC = 3;
const H = 192;
const BASE_Y = H - 18; // ground line (174)
const LANE = 8 * SC; // 24
const HUMAN_CX = (100 / 390) * 100; // % of scene width
const ANIMAL_CX = (250 / 390) * 100;
const SPR_W = 64 * SC;
const SPR_H = 48 * SC;
const HUMAN_TOP = BASE_Y - 44 * SC; // 42
const ANIMAL_TOP = HUMAN_TOP - LANE; // 18

/** CSS left for a sprite grid whose BASE bbox centre sits at cx% of the scene. */
const anchorLeft = (cxPct: number, baseKey: string, extraPx = 0) =>
  `calc(${cxPct.toFixed(4)}% - ${Math.round(bboxCenterX(bboxOf(baseKey)) * SC) - extraPx}px)`;

function Px({ src, left, top, alt, hidden }: { src: string; left: string; top: number; alt?: string; hidden?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={hidden ? "" : alt ?? ""}
      aria-hidden={hidden || undefined}
      width={SPR_W}
      height={SPR_H}
      className="px absolute max-w-none"
      style={{ left, top, width: SPR_W, height: SPR_H }}
      draggable={false}
    />
  );
}

export function RunnerScene({ animal, state }: { animal: AnimalId; state: CardState }) {
  const a = ANIMALS[animal];
  const pose = state === "run" ? "run" : "base";
  const humanKey = state === "run" ? "human-run" : state === "milestone" ? "human-celebrate" : "human-base";
  const animalKey = `char-${a.assetId}-${pose}`;
  const humanBase = "human-base";
  const animalBase = `char-${a.assetId}-base`;

  const shadowFor = (key: string, cxPct: number, baseKey: string, top: number) => {
    const b = bboxOf(key);
    const offset = Math.round(bboxCenterX(b) - 32) * SC;
    return <Px src={spriteSrc(bboxWidth(b) > 34 ? "fx-shadow-wide" : "fx-shadow")} left={anchorLeft(cxPct, baseKey, offset)} top={top} hidden />;
  };

  const hb = bboxOf(humanKey);
  const ab = bboxOf(animalKey);
  const humanSpeedLeft = anchorLeft(HUMAN_CX, humanBase, (hb.x0 - 18) * SC);
  // animal speed: default trail position, but never left of (human right edge − 1 cell)
  const animalSpeedDefault = anchorLeft(ANIMAL_CX, animalBase, (ab.x0 - 18) * SC);
  const humanRightMinus = anchorLeft(HUMAN_CX, humanBase, (hb.x1 + 1) * SC + SC - 2 * SC);
  const animalSpeedLeft = `max(${animalSpeedDefault}, ${humanRightMinus})`;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: H,
        backgroundColor: "#0A0A0A",
        backgroundImage: `repeating-linear-gradient(180deg, transparent 0 ${LANE - 1}px, #232321 ${LANE - 1}px ${LANE}px)`,
        backgroundPosition: `0 ${BASE_Y % LANE}px`,
      }}
    >
      <span aria-hidden="true" className="absolute inset-x-0 h-px" style={{ top: BASE_Y, background: "#3A3A37" }} />
      <span aria-hidden="true" className="absolute inset-x-0 h-px" style={{ top: BASE_Y - LANE, background: "#2E2E2B" }} />
      {shadowFor(humanKey, HUMAN_CX, humanBase, HUMAN_TOP)}
      {shadowFor(animalKey, ANIMAL_CX, animalBase, ANIMAL_TOP)}
      {state === "run" && (
        <>
          <Px src={spriteSrc("fx-speed")} left={humanSpeedLeft} top={HUMAN_TOP} hidden />
          <Px src={spriteSrc("fx-speed")} left={animalSpeedLeft} top={ANIMAL_TOP} hidden />
        </>
      )}
      <Px src={spriteSrc(humanKey)} left={anchorLeft(HUMAN_CX, humanBase)} top={HUMAN_TOP} alt="내 Pixel Runner" />
      <Px src={spriteSrc(animalKey)} left={anchorLeft(ANIMAL_CX, animalBase)} top={ANIMAL_TOP} alt={`${a.nameKo}형 러너 캐릭터`} />
      {state === "milestone" && (
        <>
          <Px src={spriteSrc("fx-celebrate")} left={anchorLeft(HUMAN_CX, humanBase)} top={HUMAN_TOP - 2 * SC} hidden />
          <Px src={spriteSrc("fx-celebrate")} left={anchorLeft(ANIMAL_CX, animalBase)} top={ANIMAL_TOP - 2 * SC} hidden />
        </>
      )}
    </div>
  );
}
