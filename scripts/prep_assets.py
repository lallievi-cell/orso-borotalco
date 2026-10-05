"""Prepara gli asset: ritaglia lo sfondo bianco dei nuovi sprite e rimpicciolisce le immagini troppo pesanti.

Uso: python scripts/prep_assets.py <cartella_con_i_jpg_generati>
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ROOT / "public" / "sprites"
BG = ROOT / "public" / "bg"

# nome file generato (prefisso) -> (nome di destinazione, lato massimo, soglia)
CUTOUTS = {
    "spr_tomato": ("tomato.png", 256, 46),
    "spr_slipper": ("slipper.png", 256, 46),
    "spr_sock": ("sock.png", 256, 40),
    "spr_goldduck": ("goldduck.png", 256, 46),
    "spr_toilet": ("toilet.png", 320, 70),
}

# sprite esistenti troppo grandi -> lato massimo
SHRINK = {
    "bench.png": 700,
    "brush.png": 256,
    "door.png": 420,
    "heart.png": 192,
    "lamp.png": 220,
    "mat.png": 700,
    "pillow.png": 700,
    "powder.png": 256,
    "ring.png": 256,
}


def cutout(src: Path, dst: Path, side: int, thresh: int) -> None:
    img = Image.open(src).convert("RGB")
    probe = img.copy()
    w, h = probe.size
    key = (255, 0, 255)
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for s in seeds:
        if probe.getpixel(s) != key:
            ImageDraw.floodfill(probe, s, key, thresh=thresh)
    mask = Image.new("L", (w, h), 255)
    mp = mask.load()
    pp = probe.load()
    for y in range(h):
        for x in range(w):
            if pp[x, y] == key:
                mp[x, y] = 0
    # bordo morbido
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = img.convert("RGBA")
    out.putalpha(mask)
    box = mask.point(lambda v: 255 if v > 24 else 0).getbbox()
    if box:
        out = out.crop(box)
    out.thumbnail((side, side), Image.LANCZOS)
    out.save(dst, optimize=True)
    print("cutout", dst.name, out.size)


def shrink(path: Path, side: int) -> None:
    img = Image.open(path)
    if max(img.size) <= side:
        return
    img.thumbnail((side, side), Image.LANCZOS)
    img.save(path, optimize=True)
    print("shrink", path.name, img.size, path.stat().st_size)


def shrink_bg(path: Path, width: int = 1600) -> None:
    img = Image.open(path).convert("RGB")
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    img.save(path, quality=80, optimize=True, progressive=True)
    print("bg", path.name, img.size, path.stat().st_size)


def main() -> None:
    gen = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if gen:
        for prefix, (name, side, thresh) in CUTOUTS.items():
            found = sorted(gen.glob(f"{prefix}_*.jpg"))
            if found:
                cutout(found[-1], SPRITES / name, side, thresh)
    for name, side in SHRINK.items():
        p = SPRITES / name
        if p.exists():
            shrink(p, side)
    for p in BG.glob("*.jpg"):
        shrink_bg(p)


if __name__ == "__main__":
    main()
