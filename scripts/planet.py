"""Draws the ringed-planet ascii mark from geometry. Run: python scripts/planet.py"""
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COLS, ROWS = 56, 30
GLYPHS = ["@#S", "%?", "*+", ";:", ","]  # darkest → lightest, same ramp the canvas palette uses
SPHERE_R = 0.62
RING_IN, RING_GAP_IN, RING_GAP_OUT, RING_OUT = 0.70, 0.86, 0.885, 1.0
RING_SQUASH = 0.36
TILT = math.radians(-16)
LIGHT = (-0.55, -0.62, 0.56)
STARS = [(4, 3), (51, 2), (7, 26), (50, 27), (2, 15), (53, 12), (12, 1), (44, 28)]


def pick(glyphs: str, c: int, r: int) -> str:
    return glyphs[(c * 7 + r * 3) % len(glyphs)]


def clamp(t: int) -> int:
    return max(0, min(len(GLYPHS) - 1, t))


def sphere_tier(x: float, y: float) -> int:
    r2 = (x * x + y * y) / (SPHERE_R * SPHERE_R)
    z = math.sqrt(max(0.0, 1.0 - r2))
    nx, ny = x / SPHERE_R, y / SPHERE_R
    lx, ly, lz = LIGHT
    norm = math.sqrt(lx * lx + ly * ly + lz * lz)
    lambert = max(0.0, (nx * lx + ny * ly + z * lz) / norm)
    tier = 2 if lambert > 0.8 else 1 if lambert > 0.4 else 0
    return clamp(tier)


def ring(x: float, y: float):
    """Returns (tier, in_front) for a ring point, or None."""
    u = x * math.cos(TILT) - y * math.sin(TILT)
    v = x * math.sin(TILT) + y * math.cos(TILT)
    d = math.sqrt(u * u + (v / RING_SQUASH) ** 2)
    if d < RING_IN or d > RING_OUT or RING_GAP_IN < d < RING_GAP_OUT:
        return None
    front = v > 0
    tier = 4 if d > RING_OUT - 0.05 else 3
    return tier, front


def main() -> None:
    lines = []
    for r in range(ROWS):
        row = ""
        for c in range(COLS):
            x = (c + 0.5) / COLS * 2 - 1
            y = (r + 0.5) / ROWS * 2 - 1
            on_sphere = x * x + y * y <= SPHERE_R * SPHERE_R
            hit = ring(x, y)
            ch = " "
            if hit and (hit[1] or not on_sphere):
                ch = pick(GLYPHS[hit[0]], c, r)
            elif on_sphere:
                ch = pick(GLYPHS[sphere_tier(x, y)], c, r)
            elif (c, r) in STARS:
                ch = pick(GLYPHS[4], c, r)
            row += ch
        lines.append(row.rstrip())
    art = "\n".join(lines)
    (ROOT / "scripts" / "ascii.txt").write_text(art + "\n")
    (ROOT / "frontend" / "src" / "lib" / "ascii-art.js").write_text(f"export const ASCII_ART = `{art}`;\n")
    print(art)
    print(f"{sum(len(l.replace(' ', '')) for l in lines)} glyphs, {len(lines)} rows")


if __name__ == "__main__":
    main()
