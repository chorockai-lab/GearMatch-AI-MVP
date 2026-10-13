// Shoe image slot — UI handoff 08_ITEMS. A product photo is shown ONLY when its use is approved (image_approved);
// otherwise the design-system placeholder silhouette is drawn (no brand logos or unlicensed photos).
/* eslint-disable @next/next/no-img-element */

function Silhouette({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 110" className={className} aria-hidden="true">
      <path d="M14 76c-2-22 0-44 10-52 9-7 18-3 26 2 6 4 12 6 18 3 8-5 14-14 26-12 10 2 17 12 26 20 18 15 44 18 62 26 10 5 16 9 16 15" fill="#F2F1EC" stroke="#0A0A0A" strokeWidth="4" strokeLinejoin="round" />
      <path d="M12 74h184c8 0 12 5 12 11s-4 12-14 12H22c-7 0-10-4-10-10z" fill="#D2CEC6" stroke="#0A0A0A" strokeWidth="4" strokeLinejoin="round" />
      <path d="M26 30c4 10 5 22 3 34" fill="none" stroke="#8E8D87" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M150 64c14-3 32-1 44 4" fill="none" stroke="#8E8D87" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M104 31l8 7M117 37l8 7M130 43l8 7" stroke="#0A0A0A" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function ShoeArt({
  imageUrl, approved, alt, size = "md", label = false,
}: {
  imageUrl: string | null; approved: boolean; alt: string; size?: "sm" | "md" | "lg"; label?: boolean;
}) {
  const box = size === "lg" ? "h-[220px]" : size === "md" ? "h-[140px]" : "h-[78px]";
  const art = size === "lg" ? "w-[78%]" : size === "md" ? "w-[74%]" : "w-[80%]";
  return (
    <div className={`relative grid w-full place-items-center bg-[#161615] ${box}`}>
      {approved && imageUrl ? (
        <img src={imageUrl} alt={alt} className="h-full w-full object-contain" />
      ) : (
        <>
          <Silhouette className={art} />
          <span className="sr-only">{alt} — 이미지 준비 중</span>
        </>
      )}
      {label && !(approved && imageUrl) && (
        <span className="absolute right-3 bottom-2.5 font-[family-name:var(--font-bl)] text-[10px] font-bold tracking-[0.16em] text-gm-g2">IMAGE PLACEHOLDER</span>
      )}
    </div>
  );
}
