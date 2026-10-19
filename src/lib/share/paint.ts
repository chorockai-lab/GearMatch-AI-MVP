// Paints a rendered DOM subtree onto a canvas, for the Runner / Stats card images (Issue #16).
// Only the CSS those cards use is supported: background colours, solid borders, a hard-stop
// repeating-linear-gradient (scene lanes), zero-blur inset box-shadows (text highlight), <img> (pixel sprites,
// nearest-neighbour), inline <svg>, text, overflow clipping, text-overflow: ellipsis and opacity.
// Text is drawn character by character at the positions the browser laid out (same fonts, so letter-spacing,
// kerning, wrapping and truncation match the screen). Nothing leaves the browser.

type Box = { x: number; y: number; w: number; h: number };
type Op =
  | ({ k: "rect"; color: string; a: number } & Box)
  | ({ k: "img"; src: string; a: number; smooth: boolean } & Box)
  | ({ k: "grad"; segs: { color: string; from: number; to: number }[]; period: number; offset: number; a: number } & Box)
  | { k: "text"; chars: { ch: string; x: number; top: number; right: number }[]; font: string; color: string; a: number; clipRight: number | null; spacing: number }
  | ({ k: "clip" } & Box)
  | { k: "unclip" };

const TRANSPARENT = /^(transparent|rgba\(0, 0, 0, 0\))$/;
const isPaint = (c: string) => !!c && !TRANSPARENT.test(c);

function rel(r: DOMRect, o: DOMRect): Box {
  return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
}

/** "repeating-linear-gradient(rgba(0,0,0,0) 0px, rgba(0,0,0,0) 23px, rgb(35,35,33) 23px, rgb(35,35,33) 24px)" */
function parseRepeatingGradient(bg: string) {
  const m = bg.match(/^repeating-linear-gradient\((.*)\)$/);
  if (!m) return null;
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of m[1]) {
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  parts.push(cur.trim());
  if (/deg|turn|^to /.test(parts[0])) {
    if (!/^(180deg|0\.5turn|to bottom)$/.test(parts[0])) return null; // only top → bottom
    parts.shift();
  }
  const stops: { color: string; pos: number }[] = [];
  for (const p of parts) {
    const s = p.match(/^(.*?)((?:\s+-?[\d.]+px){1,2})$/);
    if (!s) return null;
    for (const len of s[2].trim().split(/\s+/)) stops.push({ color: s[1].trim(), pos: parseFloat(len) });
  }
  const segs: { color: string; from: number; to: number }[] = [];
  for (let i = 0; i + 1 < stops.length; i++) {
    if (stops[i].color === stops[i + 1].color && stops[i + 1].pos > stops[i].pos && isPaint(stops[i].color)) {
      segs.push({ color: stops[i].color, from: stops[i].pos, to: stops[i + 1].pos });
    }
  }
  const period = stops[stops.length - 1]?.pos ?? 0;
  return period > 0 ? { segs, period } : null;
}

function collect(el: Element, origin: DOMRect, ops: Op[], alpha: number): void {
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return;
  const a = alpha * parseFloat(cs.opacity || "1");
  if (a <= 0) return;
  const r = el.getBoundingClientRect();
  if (cs.position === "absolute" && r.width <= 1 && r.height <= 1) return; // screen-reader-only text
  const box = rel(r, origin);

  if (el instanceof HTMLImageElement) {
    ops.push({ k: "img", src: el.currentSrc || el.src, a, smooth: false, ...box });
    return;
  }
  if (el instanceof SVGSVGElement) {
    const svg = el.cloneNode(true) as SVGSVGElement;
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", String(r.width));
    svg.setAttribute("height", String(r.height));
    svg.setAttribute("color", cs.color);
    svg.style.color = cs.color;
    const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    ops.push({ k: "img", src, a, smooth: true, ...box });
    return;
  }

  if (isPaint(cs.backgroundColor)) ops.push({ k: "rect", color: cs.backgroundColor, a, ...box });
  if (cs.backgroundImage && cs.backgroundImage !== "none") {
    const g = parseRepeatingGradient(cs.backgroundImage);
    if (g) ops.push({ k: "grad", ...g, offset: parseFloat(cs.backgroundPositionY) || 0, a, ...box });
  }
  const shadow = cs.boxShadow.match(/^(.*?)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+0px(?:\s+-?[\d.]+px)?\s+inset$/);
  if (shadow) {
    const dy = parseFloat(shadow[3]);
    for (const lr of Array.from(el.getClientRects())) {
      const b = rel(lr, origin);
      const h = Math.min(Math.abs(dy), b.h);
      ops.push({ k: "rect", color: shadow[1], a, x: b.x, w: b.w, h, y: dy < 0 ? b.y + b.h - h : b.y });
    }
  }
  const side = (w: string, s: string, c: string) => (s !== "none" && s !== "hidden" && parseFloat(w) > 0 && isPaint(c) ? parseFloat(w) : 0);
  const bt = side(cs.borderTopWidth, cs.borderTopStyle, cs.borderTopColor);
  const bb = side(cs.borderBottomWidth, cs.borderBottomStyle, cs.borderBottomColor);
  const bl = side(cs.borderLeftWidth, cs.borderLeftStyle, cs.borderLeftColor);
  const br = side(cs.borderRightWidth, cs.borderRightStyle, cs.borderRightColor);
  if (bt) ops.push({ k: "rect", color: cs.borderTopColor, a, x: box.x, y: box.y, w: box.w, h: bt });
  if (bb) ops.push({ k: "rect", color: cs.borderBottomColor, a, x: box.x, y: box.y + box.h - bb, w: box.w, h: bb });
  if (bl) ops.push({ k: "rect", color: cs.borderLeftColor, a, x: box.x, y: box.y, w: bl, h: box.h });
  if (br) ops.push({ k: "rect", color: cs.borderRightColor, a, x: box.x + box.w - br, y: box.y, w: br, h: box.h });

  const clips = cs.overflowX !== "visible" || cs.overflowY !== "visible";
  if (clips) ops.push({ k: "clip", ...box });

  const ellipsis = cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1;
  const clipRight = ellipsis ? box.x + box.w - parseFloat(cs.paddingRight || "0") : null;
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const upper = cs.textTransform === "uppercase";
  const spacing = parseFloat(cs.letterSpacing) || 0; // "normal" → 0

  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      const chars: { ch: string; x: number; top: number; right: number }[] = [];
      const range = document.createRange();
      for (let i = 0; i < text.length; ) {
        const cp = text.codePointAt(i)!;
        const len = cp > 0xffff ? 2 : 1;
        const ch = text.slice(i, i + len);
        // spaces are kept as positions (never drawn) so an ellipsis lands exactly where the browser puts it
        range.setStart(child, i);
        range.setEnd(child, i + len);
        const cr = Array.from(range.getClientRects()).find((x) => x.width > 0);
        if (cr) chars.push({ ch: /\s/.test(ch) ? " " : upper ? ch.toUpperCase() : ch, x: cr.left - origin.left, top: cr.top - origin.top, right: cr.right - origin.left });
        i += len;
      }
      if (chars.some((c) => c.ch !== " ")) ops.push({ k: "text", chars, font, color: cs.color, a, clipRight, spacing });
    } else if (child instanceof Element) {
      collect(child, origin, ops, a);
    }
  }
  if (clips) ops.push({ k: "unclip" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${src.slice(0, 60)}`));
    img.src = src;
  });
}

/** Paints `root` (already laid out on the page) into ctx at (dx, dy), in CSS pixels (ctx carries the scale).
 * `stage` is told which step is running (QA diagnostics in CardShare). */
export async function paintInto(ctx: CanvasRenderingContext2D, root: HTMLElement, dx = 0, dy = 0, stage: (s: string) => void = () => {}): Promise<void> {
  stage("paint:collect");
  const origin = root.getBoundingClientRect();
  const ops: Op[] = [];
  collect(root, origin, ops, 1);

  // every font/text pair must be loaded for the canvas (unicode-range subsets are not fetched by fillText)
  const fontText = new Map<string, string>();
  for (const op of ops) if (op.k === "text") fontText.set(op.font, (fontText.get(op.font) ?? "") + op.chars.map((c) => c.ch).join("") + "…");
  stage("paint:fonts");
  await Promise.all(Array.from(fontText, ([font, text]) => document.fonts.load(font, text)));
  stage("paint:images");
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    Array.from(new Set(ops.flatMap((op) => (op.k === "img" ? [op.src] : [])))).map(async (src) => images.set(src, await loadImage(src))),
  );

  stage("paint:draw");
  ctx.save();
  ctx.translate(dx, dy);
  for (const op of ops) {
    switch (op.k) {
      case "rect":
        ctx.globalAlpha = op.a;
        ctx.fillStyle = op.color;
        ctx.fillRect(op.x, op.y, op.w, op.h);
        break;
      case "grad": {
        ctx.save();
        ctx.beginPath();
        ctx.rect(op.x, op.y, op.w, op.h);
        ctx.clip();
        ctx.globalAlpha = op.a;
        const start = (op.offset % op.period) - op.period;
        for (let y = start; y < op.h; y += op.period) {
          for (const s of op.segs) {
            ctx.fillStyle = s.color;
            ctx.fillRect(op.x, op.y + y + s.from, op.w, s.to - s.from);
          }
        }
        ctx.restore();
        break;
      }
      case "img":
        ctx.globalAlpha = op.a;
        ctx.imageSmoothingEnabled = op.smooth;
        ctx.drawImage(images.get(op.src)!, op.x, op.y, op.w, op.h);
        break;
      case "text": {
        ctx.globalAlpha = op.a;
        ctx.font = op.font;
        ctx.fillStyle = op.color;
        ctx.textBaseline = "alphabetic";
        const ascent = ctx.measureText("Hg").fontBoundingBoxAscent;
        let chars = op.chars;
        let tail: { x: number; top: number } | null = null;
        if (op.clipRight != null) {
          const ew = ctx.measureText("…").width;
          const fit = chars.filter((c) => c.right <= op.clipRight! - ew);
          if (fit.length < chars.length) {
            const last = fit[fit.length - 1] ?? chars[0];
            tail = { x: fit.length ? last.right : chars[0].x, top: last.top };
            chars = fit;
          }
        }
        // centre each glyph in the advance the browser gave it (minus letter-spacing): tabular-nums digits sit in
        // wider slots than the canvas's proportional glyphs, and the canvas has no font-variant-numeric
        for (const c of chars) if (c.ch !== " ") ctx.fillText(c.ch, c.x + (c.right - c.x - op.spacing - ctx.measureText(c.ch).width) / 2, c.top + ascent);
        if (tail) ctx.fillText("…", tail.x, tail.top + ascent);
        break;
      }
      case "clip":
        ctx.save();
        ctx.beginPath();
        ctx.rect(op.x, op.y, op.w, op.h);
        ctx.clip();
        break;
      case "unclip":
        ctx.restore();
        break;
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
