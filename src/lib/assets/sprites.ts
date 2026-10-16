// Sprite metadata for character v2 (64×48 transparent PNG, 1 cell = 1 px).
// char-*-celebrate are stored for later; no screen uses them yet (MILESTONE stays disabled).
// Bounding boxes come from docs/asset-source/export-check.json (inclusive pixel coords).
// Regenerate if the PNGs change.

export const GRID_W = 64;
export const GRID_H = 48;

export interface BBox { x0: number; y0: number; x1: number; y1: number }

export const SPRITE_BBOX: Record<string, BBox> = {
  "char-cat-base": { x0: 20, y0: 18, x1: 42, y1: 43 },
  "char-cat-celebrate": { x0: 14, y0: 21, x1: 48, y1: 43 },
  "char-cat-run": { x0: 15, y0: 20, x1: 48, y1: 43 },
  "char-che-base": { x0: 15, y0: 21, x1: 48, y1: 43 },
  "char-che-celebrate": { x0: 12, y0: 17, x1: 52, y1: 43 },
  "char-che-run": { x0: 10, y0: 22, x1: 54, y1: 43 },
  "char-fox-base": { x0: 24, y0: 19, x1: 39, y1: 43 },
  "char-fox-celebrate": { x0: 14, y0: 20, x1: 50, y1: 43 },
  "char-fox-run": { x0: 12, y0: 20, x1: 52, y1: 43 },
  "char-goa-base": { x0: 20, y0: 16, x1: 43, y1: 43 },
  "char-goa-celebrate": { x0: 14, y0: 17, x1: 49, y1: 43 },
  "char-goa-run": { x0: 14, y0: 15, x1: 48, y1: 43 },
  "char-ham-base": { x0: 24, y0: 24, x1: 38, y1: 43 },
  "char-ham-celebrate": { x0: 22, y0: 24, x1: 42, y1: 43 },
  "char-ham-run": { x0: 19, y0: 25, x1: 43, y1: 43 },
  "char-hor-base": { x0: 17, y0: 16, x1: 46, y1: 43 },
  "char-hor-celebrate": { x0: 12, y0: 16, x1: 51, y1: 43 },
  "char-hor-run": { x0: 14, y0: 15, x1: 50, y1: 43 },
  "char-ott-base": { x0: 20, y0: 20, x1: 42, y1: 43 },
  "char-ott-celebrate": { x0: 11, y0: 21, x1: 52, y1: 43 },
  "char-ott-run": { x0: 12, y0: 21, x1: 52, y1: 43 },
  "char-wol-base": { x0: 19, y0: 17, x1: 44, y1: 43 },
  "char-wol-celebrate": { x0: 12, y0: 18, x1: 51, y1: 43 },
  "char-wol-run": { x0: 10, y0: 19, x1: 52, y1: 43 },
  "fx-celebrate": { x0: 6, y0: 2, x1: 58, y1: 16 },
  "fx-shadow": { x0: 22, y0: 42, x1: 41, y1: 43 },
  "fx-shadow-wide": { x0: 11, y0: 42, x1: 52, y1: 43 },
  "fx-speed": { x0: 2, y0: 22, x1: 17, y1: 36 },
  "human-base": { x0: 24, y0: 3, x1: 40, y1: 43 },
  "human-celebrate": { x0: 20, y0: 4, x1: 44, y1: 43 },
  "human-run": { x0: 15, y0: 3, x1: 48, y1: 43 },
};

export type SpriteKey = keyof typeof SPRITE_BBOX;

export function spriteSrc(key: string): string {
  if (key.startsWith("char-")) return `/assets/char/${key}.png`;
  if (key.startsWith("human-")) return `/assets/human/${key}.png`;
  return `/assets/fx/${key}.png`;
}

export function bboxOf(key: string): BBox {
  const b = SPRITE_BBOX[key];
  if (!b) throw new Error(`Unknown sprite: ${key}`);
  return b;
}

/** Horizontal centre of the drawn pixels, in grid cells (e.g. 32.5). */
export const bboxCenterX = (b: BBox) => (b.x0 + b.x1 + 1) / 2;
export const bboxWidth = (b: BBox) => b.x1 - b.x0 + 1;
