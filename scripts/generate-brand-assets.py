"""Generate favicon set, manifest icons and og-image from the official logo.

Usage: python scripts/generate-brand-assets.py  (needs Pillow)
Source: public/logo.jpg (official 1024x1024 logo).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
SRC = PUB / "logo.jpg"
SAGE, CREAM, INK = (120, 154, 112), (251, 243, 222), (47, 62, 44)

src = Image.open(SRC).convert("RGB")
# The JPG has white corners outside its rounded square; make them transparent.
S = 4
mask = Image.new("L", (1024 * S,) * 2, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, 1024 * S - 1, 1024 * S - 1), radius=188 * S, fill=255)
mask = mask.resize((1024, 1024), Image.LANCZOS)
logo = src.copy().convert("RGBA")
logo.putalpha(mask)

def sized(n): return logo.resize((n, n), Image.LANCZOS)

big = sized(256)
big.save(PUB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
sized(48).save(PUB / "favicon-48.png")
sized(96).save(PUB / "favicon-96.png")
sized(192).save(PUB / "icon-192.png")
sized(512).save(PUB / "icon-512.png")
# iOS applies its own mask and dislikes transparency: use the full-bleed square.
src.resize((180, 180), Image.LANCZOS).save(PUB / "apple-touch-icon.png")

# og-image 1200x630
W, H = 1200, 630
og = Image.new("RGB", (W, H), CREAM)
d = ImageDraw.Draw(og)
d.rectangle((0, H - 14, W, H), fill=SAGE)
mark = sized(380)
og.paste(mark, (80, (H - 380) // 2 - 7), mark)
F = "C:/Windows/Fonts/"
title = ImageFont.truetype(F + "georgiab.ttf", 80)
tag = ImageFont.truetype(F + "georgia.ttf", 38)
x = 520
d.text((x, 170), "LarderMind", font=title, fill=INK)
lines = ["AI meal planner that", "cooks from your pantry."]
for i, t in enumerate(lines):
    d.text((x, 285 + i * 52), t, font=tag, fill=(80, 110, 74) if i == 0 else INK)
d.text((x, 420), "Shop only for what's missing.", font=tag, fill=INK)
d.text((x, 500), "lardermind.com", font=ImageFont.truetype(F + "arial.ttf", 30), fill=SAGE)
og.save(PUB / "og-image.png", optimize=True)
print("ok")
