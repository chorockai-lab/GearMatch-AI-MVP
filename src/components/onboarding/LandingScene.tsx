// Landing scene (UI handoff 01_LANDING/landing.png): the running human + a lime pixel "?" where the animal will appear.
// Same lane geometry and anchors as RunnerScene (RUNNING MAIN FINAL MASTER §03) so the two scenes line up.
import { bboxCenterX, bboxOf, bboxWidth, spriteSrc } from "@/lib/assets/sprites";
import { PixelQuestion } from "@/components/ui/icons";

const SC = 3;
const H = 192;
const BASE_Y = H - 18;
const LANE = 8 * SC;
const HUMAN_CX = (100 / 390) * 100;
const QUESTION_CX = (257 / 390) * 100;
const SPR_W = 64 * SC;
const SPR_H = 48 * SC;
const HUMAN_TOP = BASE_Y - 44 * SC;

const anchorLeft = (cxPct: number, baseKey: string, extraPx = 0) =>
  `calc(${cxPct.toFixed(4)}% - ${Math.round(bboxCenterX(bboxOf(baseKey)) * SC) - extraPx}px)`;

function Px({ src, left, alt }: { src: string; left: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      width={SPR_W}
      height={SPR_H}
      className="px absolute max-w-none"
      style={{ left, top: HUMAN_TOP, width: SPR_W, height: SPR_H }}
      draggable={false}
    />
  );
}

export function LandingScene() {
  const hb = bboxOf("human-run");
  const shadowOffset = Math.round(bboxCenterX(hb) - 32) * SC;
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
      <Px src={spriteSrc(bboxWidth(hb) > 34 ? "fx-shadow-wide" : "fx-shadow")} left={anchorLeft(HUMAN_CX, "human-base", shadowOffset)} />
      <Px src={spriteSrc("fx-speed")} left={anchorLeft(HUMAN_CX, "human-base", (hb.x0 - 18) * SC)} />
      <Px src={spriteSrc("human-run")} left={anchorLeft(HUMAN_CX, "human-base")} alt="달리는 Pixel Runner" />
      <span className="absolute" style={{ left: `calc(${QUESTION_CX.toFixed(4)}% - 15px)`, top: 62 }}>
        <PixelQuestion />
      </span>
    </div>
  );
}
