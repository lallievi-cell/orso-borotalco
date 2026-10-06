import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

BRAIN = Path(r"C:\Users\MFCS\.gemini\antigravity-ide\brain\910cd310-faaa-4574-b0c0-bbc1372b126e")
DEST = Path(r"C:\Users\MFCS\Desktop\orsobor\public\sprites\boss")
DEST.mkdir(parents=True, exist_ok=True)

ASSETS = {
    "king_pillow_boss_1791327132330.jpg": ("king_pillow.png", 512, 32),
    "king_pillow_laugh_1791327163693.jpg": ("king_pillow_laugh.png", 512, 32),
}

def clean_cutout(src_path: Path, dst_path: Path, max_side: int, thresh: int):
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    
    probe = img.copy()
    key = (255, 0, 255)
    
    seeds = []
    for x in range(0, w, 8):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(0, h, 8):
        seeds.append((0, y))
        seeds.append((w - 1, y))
        
    for s in seeds:
        if probe.getpixel(s) != key:
            r, g, b = img.getpixel(s)
            if r > 220 and g > 220 and b > 220:
                ImageDraw.floodfill(probe, s, key, thresh=thresh)
                
    mask = Image.new("L", (w, h), 255)
    mp = mask.load()
    pp = probe.load()
    for y in range(h):
        for x in range(w):
            if pp[x, y] == key:
                mp[x, y] = 0
                
    # Smooth edges and remove border fringe
    smooth_mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.0))
    
    out = img.convert("RGBA")
    out.putalpha(smooth_mask)
    
    bbox = smooth_mask.point(lambda v: 255 if v > 15 else 0).getbbox()
    if bbox:
        x1 = max(0, bbox[0] - 2)
        y1 = max(0, bbox[1] - 2)
        x2 = min(w, bbox[2] + 2)
        y2 = min(h, bbox[3] + 2)
        out = out.crop((x1, y1, x2, y2))
        
    cw, ch = out.size
    scale = min(max_side / cw, max_side / ch, 1.0)
    if scale < 1.0:
        nw = int(cw * scale)
        nh = int(ch * scale)
        out = out.resize((nw, nh), Image.Resampling.LANCZOS)
        
    out.save(dst_path, "PNG")
    print(f"Saved: {dst_path.name} ({out.size[0]}x{out.size[1]})")

if __name__ == "__main__":
    for src_name, (dst_name, size, thresh) in ASSETS.items():
        src = BRAIN / src_name
        if not src.exists():
            print(f"Missing: {src}")
            continue
        dst = DEST / dst_name
        clean_cutout(src, dst, size, thresh)
