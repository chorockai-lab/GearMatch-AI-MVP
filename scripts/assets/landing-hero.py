"""Landing hero pixel assets (night scene) — generated, deterministic.

    python -I scripts/assets/landing-hero.py          (needs Pillow)

Writes public/assets/landing/:
  night-bg.png       144x116 logical px (shown at 3x, bottom-anchored): night sky, clouds, pine forest, glowing grass
  moon.png           22x22, placed separately at the top of the scene so short screens never crop it
  sil-{hor,wol,fox,che}.png  64x48, the EXISTING run sprites recoloured as moonlit silhouettes
                             (same grid as public/assets/char, so SPRITE_BBOX still applies)
No new characters: the silhouettes are the approved animal sprites with a dark navy palette + a moonlight rim.
"""
import math
import random
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets" / "landing"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 144, 100  # the scene; EXTRA rows of plain starry sky are added on top when saving
EXTRA = 16  # extra sky, only visible on tall screens (the scene is bottom-anchored)
GROUND = 92  # feet baseline (logical px) — keep in sync with LandingScene.tsx

rnd = random.Random(20261015)


def hexc(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


# ── background ───────────────────────────────────────────────────────────────
bg = Image.new("RGBA", (W, H), hexc("#0a0d1c"))
px = bg.load()

# sky: banded gradient with a 2-tone dither on each band edge (pixel-art style)
SKY = ["#0a0d1c", "#0c1124", "#0f152c", "#121a35", "#151e3d", "#182244"]
band_h = 11
for y in range(0, 66):
    i = min(y // band_h, len(SKY) - 1)
    for x in range(W):
        c = SKY[i]
        if i + 1 < len(SKY) and y % band_h >= band_h - 2 and (x + y) % 2 == 0:
            c = SKY[i + 1]
        px[x, y] = hexc(c)

# stars
for _ in range(46):
    x, y = rnd.randrange(W), rnd.randrange(2, 52)
    px[x, y] = hexc(rnd.choice(["#8d9bd6", "#b9c3f0", "#5f6daa", "#e8ecff"]))
for sx, sy in [(22, 9), (61, 6), (94, 14), (12, 30), (77, 27)]:  # 4-point sparkles
    for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]:
        px[sx + dx, sy + dy] = hexc("#e8ecff" if (dx, dy) == (0, 0) else "#9fb0f0")

# moon: its own sprite with a soft stepped glow (LandingScene pins it to the top so it is never cropped)
MS, MR = 22, 7
moon = Image.new("RGBA", (MS, MS), (0, 0, 0, 0))
mp = moon.load()
MC = MS // 2
for y in range(MS):
    for x in range(MS):
        d = math.hypot(x - MC, y - MC)
        if d <= MR:
            c = "#f4f0c6"
            if (x - MC, y - MC) in [(-2, -2), (-3, -1), (2, 1), (3, 2), (1, 3), (-1, 2)]:
                c = "#dcd6a3"  # craters
            if d > MR - 1.2 and x > MC:
                c = "#e6e0ad"
            mp[x, y] = hexc(c)
        elif d <= MR + 2:
            mp[x, y] = hexc("#2a3155")
        elif d <= MR + 4 and (x + y) % 2 == 0:
            mp[x, y] = hexc("#1f2748")
moon.save(OUT / "moon.png", optimize=True)

# clouds (soft dark-blue strips)
def cloud(cx, cy, w, tone_top, tone_body):
    for x in range(cx - w // 2, cx + w // 2):
        if not 0 <= x < W:
            continue
        hump = int(2 + 2 * math.sin((x - cx) / 3.1) + (w // 2 - abs(x - cx)) / 5)
        for y in range(cy - hump, cy + 2):
            if 0 <= y < H:
                px[x, y] = hexc(tone_top if y == cy - hump else tone_body)

cloud(104, 27, 30, "#3a4677", "#222b52")
cloud(136, 22, 22, "#3a4677", "#222b52")
cloud(30, 38, 34, "#2c3766", "#1a2246")
cloud(70, 33, 18, "#2c3766", "#1a2246")

# far mountains
for x in range(W):
    h = int(48 + 5 * math.sin(x / 13.0) + 3 * math.sin(x / 5.3 + 1.2))
    for y in range(h, 70):
        px[x, y] = hexc("#141c38")
        if y == h:
            px[x, y] = hexc("#232d55")

# pine forest, two layers
def pine(x0, base, height, body, rim):
    for i in range(height):
        y = base - i
        half = max(0, (height - i) // 3 + (1 if i % 4 == 0 else 0))
        for x in range(x0 - half, x0 + half + 1):
            if 0 <= x < W and 0 <= y < H:
                px[x, y] = hexc(rim if (x == x0 + half and i % 2 == 0) else body)

for x0 in range(-4, W + 6, 7):
    pine(x0 + rnd.randrange(-2, 3), 76, rnd.randrange(16, 27), "#16204a", "#2a3870")
for y in range(70, 80):
    for x in range(W):
        if px[x, y][:3] == hexc("#141c38")[:3] or y >= 76:
            px[x, y] = hexc("#111939")
for x0 in range(-2, W + 6, 9):
    pine(x0 + rnd.randrange(-2, 3), 84, rnd.randrange(14, 22), "#0c1229", "#1d2852")

# meadow: dark ground + glowing grass tips (brand lime) along the runner baseline
for y in range(80, H):
    for x in range(W):
        px[x, y] = hexc("#0b1a12" if y < GROUND - 2 else "#081209")
for x in range(W):
    tip = GROUND - 3 - (1 if (x * 7) % 5 == 0 else 0) - (1 if (x * 3) % 11 == 0 else 0)
    for y in range(tip, GROUND + 1):
        px[x, y] = hexc("#2f5a14" if y > tip + 1 else ("#c8f03a" if (x % 3) else "#8fc22a"))
    px[x, tip] = hexc("#e3ff6b" if x % 4 == 0 else "#a9d936")
for y in range(GROUND + 1, H):  # foreground grass texture
    for x in range(W):
        if (x * 5 + y * 3) % 7 == 0:
            px[x, y] = hexc("#14301a")
        if (x * 11 + y) % 23 == 0:
            px[x, y] = hexc("#24461a")

full = Image.new("RGBA", (W, H + EXTRA), hexc(SKY[0]))
fp = full.load()
for _ in range(10):  # a few stars in the extra sky
    fp[rnd.randrange(W), rnd.randrange(1, EXTRA)] = hexc(rnd.choice(["#8d9bd6", "#5f6daa", "#e8ecff"]))
full.paste(bg, (0, EXTRA))
full.save(OUT / "night-bg.png", optimize=True)

# ── silhouettes ──────────────────────────────────────────────────────────────
# luminance → 3 navy tones (shape reads, colours/identity muted) + moonlight rim from the upper right (where the moon is)
TONES = [hexc("#06091a"), hexc("#0a0f25"), hexc("#101731")]
RIM = hexc("#7c8dd2")
RIM_SOFT = hexc("#2e3b74")
for key in ["hor", "wol", "fox", "che"]:
    src = Image.open(ROOT / "public" / "assets" / "char" / f"char-{key}-run.png").convert("RGBA")
    s = src.load()
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    o = out.load()
    w, h = src.size
    solid = lambda x, y: 0 <= x < w and 0 <= y < h and s[x, y][3] > 0
    for y in range(h):
        for x in range(w):
            if not solid(x, y):
                continue
            r, g, b, _ = s[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            o[x, y] = TONES[0 if lum < 70 else (1 if lum < 150 else 2)]
            if not solid(x, y - 1):
                o[x, y] = RIM  # moonlight on top edges
            elif not solid(x + 1, y):
                o[x, y] = RIM_SOFT  # dimmer on the moon-side (right) edges
    out.save(OUT / f"sil-{key}.png", optimize=True)

print("wrote", sorted(p.name for p in OUT.iterdir()))
