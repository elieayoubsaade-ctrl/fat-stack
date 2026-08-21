"""Re-cut the playable cast from the marketing folder's no-background PNGs.

Trims to the visible pixels, pads 4%, caps the height at 700px and writes optimised
PNGs into client/public/assets/chars/. Run: python3 scripts/cut-characters.py
"""
from PIL import Image
import glob, os

SRC = os.path.expanduser("~/Desktop/Fat Sandwich Marketing/References/Characters /No Background")
OUT = "client/public/assets/chars"
NAMES = {
    "Birdman": "birdman", "Captain Tuna": "captain-tuna", "Chop-Chop": "chop-chop", "Egghead": "egghead",
    "Lil Sprout": "lil-sprout", "PB&J": "pbj", "Pastrami Mami No BG": "pastrami-mami",
    "Runny Sunny No BG": "runny-sunny", "The Fat Sandwich": "fat-sandwich", "Uncle Kraut": "uncle-kraut",
}
for path in glob.glob(SRC + "/*.png"):
    stem = os.path.splitext(os.path.basename(path))[0]
    if stem not in NAMES:
        continue
    im = Image.open(path).convert("RGBA")
    # Treat near-transparent fringe as empty so the bbox is tight.
    alpha = im.getchannel("A").point(lambda a: 255 if a > 24 else 0)
    im = im.crop(alpha.getbbox())
    pad = int(im.height * 0.04)
    canvas = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad))
    canvas.paste(im, (pad, pad))
    canvas.thumbnail((1000, 520))
    canvas = canvas.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).convert("RGBA")
    out = f"{OUT}/{NAMES[stem]}.png"
    canvas.save(out, optimize=True)
    print(NAMES[stem], canvas.size, os.path.getsize(out) // 1024, "KB")
