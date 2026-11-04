"""Draws the social card and favicons in the site's own palette. Run once: python scripts/og.py"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public"
TTF = ROOT / "scripts" / "ttf"
PAPER, INK, FAINT = (250, 248, 242), (23, 20, 15), (114, 106, 90)
ROSES = {"@#S": (124, 16, 48), "%?": (163, 18, 60), "*+": (206, 41, 85), ";:": (227, 92, 124), ",": (240, 160, 178)}
ART = (ROOT / "scripts" / "ascii.txt").read_text().rstrip("\n")
COLS = max(len(line) for line in ART.split("\n"))
ROWS = len(ART.split("\n"))


def colour(ch):
    for glyphs, rgb in ROSES.items():
        if ch in glyphs:
            return rgb
    return ROSES["*+"]


def draw_art(img, x0, y0, side, size):
    """Paints the ascii mark into a side×side square, same stretch as the canvas on the site."""
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(TTF / "GeistMono.ttf"), size)
    font.set_variation_by_axes([600])
    cw, ch_ = side / COLS, side / ROWS
    for r, line in enumerate(ART.split("\n")):
        for c, ch in enumerate(line):
            if ch != " ":
                d.text((x0 + (c + 0.5) * cw, y0 + (r + 0.5) * ch_), ch, font=font, fill=colour(ch), anchor="mm")


def social():
    img = Image.new("RGB", (1200, 630), PAPER)
    d = ImageDraw.Draw(img)
    serif = ImageFont.truetype(str(TTF / "InstrumentSerif-Regular.ttf"), 92)
    italic = ImageFont.truetype(str(TTF / "InstrumentSerif-Italic.ttf"), 92)
    mono = ImageFont.truetype(str(TTF / "GeistMono.ttf"), 18)
    d.text((96, 72), "HARSHGUPTA.ME", font=mono, fill=FAINT)
    d.text((96, 215), "hi, i'm", font=serif, fill=INK)
    d.text((96, 318), "harsh", font=italic, fill=ROSES["%?"])
    w = d.textlength("harsh", font=italic)
    d.text((96 + w + 4, 318), ".", font=serif, fill=ROSES["%?"])
    d.text((96, 455), "projects, writing, and whatever's playing.", font=mono, fill=FAINT)
    d.text((96, 535), "( say hi back )", font=mono, fill=FAINT)
    draw_art(img, 640, 65, 500, 16)
    img.save(OUT / "og.png", optimize=True)


def icon(size, name, transparent):
    """Favicons are painted by scripts/favicon.py (ringed planet, not ascii); kept here only so old calls don't break."""
    raise SystemExit("run scripts/favicon.py for icons")


if __name__ == "__main__":
    social()
    print("ok")
