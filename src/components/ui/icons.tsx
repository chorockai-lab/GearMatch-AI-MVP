// Line pictograms from the approved A′ shell (no emoji in production).
type P = { size?: number; strokeWidth?: number };

export const RunIcon = ({ size = 26, strokeWidth = 2 }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <circle cx="15" cy="4" r="2.2" fill="currentColor" />
    <path
      d="M13.5 8 10.5 14.5M13 9.5 17 12l2.5-2M12.5 9 8.5 10 6.5 12.5M10.5 14.5 15 16.5 14 21.5M10.5 14.5 8 18.5H3.5"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="miter"
    />
  </svg>
);

export const ShoeIcon = ({ size = 26, strokeWidth = 1.8 }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="miter">
    <path d="M2.5 17V11l5.5-1.5L11 6l3.5 1.5L13.5 11 19 12.5c1.6.4 2.5 1.5 2.5 3V17z" />
    <path d="M2.5 20.5h19M9 12.5l1.5-1.5M11 13.5l1.5-1.5" />
  </svg>
);

export const UserIcon = ({ size = 17 }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20.5v-1.5c0-2.8 2.2-5 5-5h5c2.8 0 5 2.2 5 5v1.5" />
  </svg>
);

export const PlusIcon = ({ size = 22, strokeWidth = 2.2 }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square">
    <path d="M12 4v16M4 12h16" />
  </svg>
);

export const ArrowIcon = ({ size = 16, strokeWidth = 2 }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="miter">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

/** CURRENT MODE intensity bars */
export const ModeBars = () => (
  <svg viewBox="0 0 14 10" width="14" height="10" aria-hidden="true">
    <rect x="0" y="7" width="3" height="3" fill="#55554F" />
    <rect x="5" y="4" width="3" height="6" fill="#8E8D87" />
    <rect x="10" y="0" width="3" height="10" fill="#F2F1EC" />
  </svg>
);
