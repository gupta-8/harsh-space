"""Paints the ringed-planet favicon PNGs in the site palette (the SVG twin is public/favicon.svg)."""
import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "frontend" / "public"
PAPER = (250, 248, 242, 255)
ROSE = {0: (124, 16, 48), 1: (163, 18, 60), 2: (206, 41, 85), 3: (227, 92, 124), 4: (240, 160, 178)}
TILT = -16
S = 512


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def planet(size: int, background) -> Image.Image:
    c = S / 2
    sphere_r = S * 0.29
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(ring)
    rx, ry, w = S * 0.477, S * 0.164, S * 0.062
    d.ellipse((c - rx, c - ry, c + rx, c + ry), fill=(*ROSE[3], 255))
    d.ellipse((c - rx + w, c - ry + w * 0.6, c + rx - w, c + ry - w * 0.6), fill=(0, 0, 0, 0))
    back = ring.copy()
    front = ring.copy()
    bp, fp = back.load(), front.load()
    for y in range(S):
        for x in range(S):
            if bp[x, y][3] == 0:
                continue
            if y < c:  # upper half of the un-rotated ring sits behind the planet
                fp[x, y] = (0, 0, 0, 0)
                bp[x, y] = (*ROSE[4], 235)
            else:
                bp[x, y] = (0, 0, 0, 0)
    back = back.rotate(-TILT, resample=Image.BICUBIC)
    front = front.rotate(-TILT, resample=Image.BICUBIC)

    sphere = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sp = sphere.load()
    lx, ly, lz = -0.55, -0.62, 0.56
    norm = math.sqrt(lx * lx + ly * ly + lz * lz)
    for y in range(S):
        for x in range(S):
            dx, dy = (x + 0.5 - c) / sphere_r, (y + 0.5 - c) / sphere_r
            r2 = dx * dx + dy * dy
            if r2 > 1.02:
                continue
            z = math.sqrt(max(0.0, 1 - min(1.0, r2)))
            lam = max(0.0, (dx * lx + dy * ly + z * lz) / norm)
            col = lerp(ROSE[0], ROSE[1], min(1, lam / 0.5)) if lam < 0.5 else lerp(ROSE[1], ROSE[3], (lam - 0.5) / 0.5)
            alpha = 255 if r2 <= 0.98 else int(255 * (1.02 - r2) / 0.04)
            sp[x, y] = (*col, alpha)

    img = Image.new("RGBA", (S, S), background)
    img.alpha_composite(back)
    img.alpha_composite(sphere)
    img.alpha_composite(front)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    planet(64, (0, 0, 0, 0)).save(OUT / "favicon.png")
    planet(180, PAPER).save(OUT / "apple-touch-icon.png")
    print("ok")
