// Landing hero — the approved key visual (2026-10-15), shown as-is: public/assets/landing/landing-hero-approved.png
// (1672×941). Never cropped (full width, original aspect ratio); the colours around it continue its own edges.
import Image from "next/image";

const SRC = "/assets/landing/landing-hero-approved.png";
const W = 1672;
const H = 941;

/** Average colour of the image's top / bottom edge — the header above and the fade below use them. */
export const HERO_TOP = "#031027";
export const HERO_BOTTOM = "#010e1a";

export function LandingScene() {
  return (
    <div className="relative w-full">
      <Image
        src={SRC}
        alt="달빛 아래 숲길을 달리는 러너와, 그 뒤를 따라오는 말·늑대·여우·치타"
        width={W}
        height={H}
        priority
        quality={90}
        sizes="(max-width: 430px) 100vw, 430px"
        className="block h-auto w-full"
      />
      {/* below the picture: its bottom-edge colour fading into the page (nothing is drawn over the image) */}
      <div aria-hidden="true" className="h-4" style={{ background: `linear-gradient(${HERO_BOTTOM}, var(--color-gm-bg))` }} />
    </div>
  );
}
