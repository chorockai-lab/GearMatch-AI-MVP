# Self-hosted fonts

Bundled with the app so `next build` never fetches Google Fonts (that fetch broke Vercel builds:
[vercel/next.js#99114](https://github.com/vercel/next.js/issues/99114)). The files are the exact woff2 files Google Fonts served before.

| Family | Files | Loaded by | License |
|---|---|---|---|
| Barlow Condensed 500–800 | `BarlowCondensed-*-latin.woff2` (latin subset) | `next/font/local` in `src/app/layout.tsx` (preloaded) | SIL OFL 1.1 — `OFL-Barlow.txt` |
| Barlow 500–700 | `Barlow-*-latin.woff2` (latin subset) | `next/font/local` in `src/app/layout.tsx` (preloaded) | SIL OFL 1.1 — `OFL-Barlow.txt` |
| Noto Sans KR 400–800 | `noto-sans-kr/*.woff2` — 96 Unicode-range slices of the variable font | `noto-sans-kr.css` (`@font-face` + `unicode-range`; browsers download only the slices a page uses) | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |

Left out on purpose: Barlow latin-ext / vietnamese subsets (only Latin text is set in Barlow) and the 28 Noto Sans KR
slices that contain only Hanja (none in the UI; typed Hanja falls back to the system Korean font).
