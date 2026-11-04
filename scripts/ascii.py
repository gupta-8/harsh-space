"""Turns a tonal illustration (or a photo of red/yellow flowers) into the site's ascii mark.

  python scripts/ascii.py <image-url-or-path>                       # illustration on white
  python scripts/ascii.py <image> --photo [left,top,right,bottom]   # photo: keep red/yellow petals
"""
import sys
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
COLS, ROWS = 56, 30
BG = 242
# darkest → lightest, matching the canvas palette ramp (rose-0 … rose-4); cut by quantile so every tier shows up
GLYPHS = ["@#S", "%?", "*+", ";:", ","]
SHARES = [0.34, 0.58, 0.76, 0.90]


def load(src: str) -> Image.Image:
    data = httpx.get(src, timeout=20).content if src.startswith("http") else Path(src).read_bytes()
    return Image.open(BytesIO(data)).convert("RGB")


def petals_mask(img: Image.Image) -> Image.Image:
    """White where the pixel is a saturated red/orange/yellow, black elsewhere (leaves, sky)."""
    h, s, v = img.convert("HSV").split()
    mask = Image.new("L", img.size, 0)
    px = mask.load()
    hp, sp, vp = h.load(), s.load(), v.load()
    for y in range(img.height):
        for x in range(img.width):
            hue, sat, val = hp[x, y], sp[x, y], vp[x, y]
            if sat > 80 and val > 70 and (hue < 48 or hue > 232):
                px[x, y] = 255
    mask = mask.filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.MaxFilter(3))
    return largest_blobs(mask)


def largest_blobs(mask: Image.Image, keep_ratio: float = 0.12) -> Image.Image:
    """Drops stray specks: keeps connected regions at least `keep_ratio` the size of the biggest one."""
    scale = 160 / max(mask.size)
    small = mask.resize((max(1, int(mask.width * scale)), max(1, int(mask.height * scale))), Image.NEAREST)
    w, hgt = small.size
    px = small.load()
    label = [[0] * w for _ in range(hgt)]
    sizes = {}
    current = 0
    for sy in range(hgt):
        for sx in range(w):
            if px[sx, sy] < 128 or label[sy][sx]:
                continue
            current += 1
            stack = [(sx, sy)]
            label[sy][sx] = current
            n = 0
            while stack:
                cx, cy = stack.pop()
                n += 1
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < hgt and px[nx, ny] >= 128 and not label[ny][nx]:
                        label[ny][nx] = current
                        stack.append((nx, ny))
            sizes[current] = n
    if not sizes:
        return mask
    biggest = max(sizes.values())
    keep = {k for k, n in sizes.items() if n >= biggest * keep_ratio}
    out = Image.new("L", small.size, 0)
    op = out.load()
    for sy in range(hgt):
        for sx in range(w):
            if label[sy][sx] in keep:
                op[sx, sy] = 255
    return out.resize(mask.size, Image.NEAREST).filter(ImageFilter.MaxFilter(5))


def petal_tone(img: Image.Image) -> Image.Image:
    """Luminance, with the glowing yellow hearts pulled darkest so each bloom keeps a dense centre like the rose did."""
    h, s, v = img.convert("HSV").split()
    gray = ImageOps.autocontrast(img.convert("L"), cutoff=2)
    gp, hp, sp = gray.load(), h.load(), s.load()
    for y in range(img.height):
        for x in range(img.width):
            if 16 <= hp[x, y] < 48 and sp[x, y] > 90:
                gp[x, y] = int(gp[x, y] * 0.25)
            else:
                gp[x, y] = int(gp[x, y] * 0.9)
    return gray


def to_tonal(src: str, photo: bool, crop) -> Image.Image:
    img = load(src)
    if crop:
        img = img.crop(crop)
    if not photo:
        gray = ImageOps.autocontrast(img.convert("L"), cutoff=1)
        mask = gray.point(lambda v: 255 if v < BG else 0)
    else:
        mask = petals_mask(img)
        gray = petal_tone(img)
    gray = Image.composite(gray, Image.new("L", img.size, 255), mask)
    box = mask.getbbox()
    gray = gray.crop(box)
    side = max(gray.size)
    square = Image.new("L", (side, side), 255)
    square.paste(gray, ((side - gray.width) // 2, (side - gray.height) // 2))
    return square


def main(src: str, photo: bool = False, crop=None) -> None:
    square = to_tonal(src, photo, crop)
    if photo:
        square = square.filter(ImageFilter.UnsharpMask(radius=max(2, square.width // 60), percent=160, threshold=2))
    small = square.resize((COLS, ROWS), Image.LANCZOS)
    values = sorted(v for v in small.get_flattened_data() if v < BG)
    cuts = [values[min(len(values) - 1, int(len(values) * s))] for s in SHARES] + [BG]
    lines = []
    for y in range(ROWS):
        row = ""
        for x in range(COLS):
            v = small.getpixel((x, y))
            ch = " "
            for limit, glyphs in zip(cuts, GLYPHS):
                if v < limit:
                    ch = glyphs[(x * 7 + y * 3) % len(glyphs)]
                    break
            row += ch
        lines.append(row.rstrip())
    # Blank rows stay: the canvas stretches the grid onto a square, so the padding is what preserves the aspect.
    art = "\n".join(lines)
    (ROOT / "scripts" / "ascii.txt").write_text(art + "\n")
    (ROOT / "frontend" / "src" / "lib" / "ascii-art.js").write_text(f"export const ASCII_ART = `{art}`;\n")
    print(art)
    print(f"{sum(len(l.replace(' ', '')) for l in lines)} glyphs, {len(lines)} rows")


if __name__ == "__main__":
    args = sys.argv[1:]
    use_photo = "--photo" in args
    box = None
    if use_photo:
        i = args.index("--photo")
        if i + 1 < len(args):
            box = tuple(int(n) for n in args[i + 1].split(","))
    main(args[0], use_photo, box)
