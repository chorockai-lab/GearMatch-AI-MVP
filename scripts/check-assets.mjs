// Verifies the character/effect PNGs in public/assets: 64×48, RGBA (colour type 6). No dependencies.
// Run: npm run check:assets
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../public/assets/", import.meta.url));
const EXPECT = {
  char: ["ham", "che", "hor", "goa", "fox", "wol", "ott", "cat"].flatMap((a) => [`char-${a}-base.png`, `char-${a}-run.png`, `char-${a}-celebrate.png`]),
  human: ["human-base.png", "human-run.png", "human-celebrate.png"],
  fx: ["fx-shadow.png", "fx-shadow-wide.png", "fx-speed.png", "fx-celebrate.png"],
};

let fail = 0;
for (const [dir, files] of Object.entries(EXPECT)) {
  const present = new Set(readdirSync(join(ROOT, dir)));
  for (const f of files) {
    if (!present.has(f)) { console.log(`MISSING  ${dir}/${f}`); fail++; continue; }
    const b = readFileSync(join(ROOT, dir, f));
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20), colourType = b[25];
    const ok = w === 64 && h === 48 && colourType === 6;
    console.log(`${ok ? "OK      " : "BAD     "} ${dir}/${f}  ${w}×${h} colourType=${colourType}`);
    if (!ok) fail++;
  }
}
const total = Object.values(EXPECT).flat().length;
console.log(fail ? `\n${fail} problem(s)` : `\nAll ${total} PNG assets present and 64×48 RGBA`);
process.exit(fail ? 1 : 0);
