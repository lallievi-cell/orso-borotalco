import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

BRAIN = Path(r"C:\Users\MFCS\.gemini\antigravity-ide\brain\910cd310-faaa-4574-b0c0-bbc1372b126e")
DEST = Path(r"C:\Users\MFCS\Desktop\orsobor\public\sprites\hub")
DEST.mkdir(parents=True, exist_ok=True)

ASSETS = {
    "mamma_orsa_sprite_1791294041625.jpg": ("mamma.png", 512, 32),
    "papa_orso_sprite_1791294059605.jpg": ("papa.png", 512, 32),
    "micio_cat_sprite_1791294078084.jpg": ("micio.png", 420, 32),
    "bazar_shop_sprite_1791294100518.jpg": ("bazar.png", 512, 28),
    "hub_fountain_sprite_1791294122227.jpg": ("fountain.png", 512, 32),
    "hub_apple_tree_1791294151964.jpg": ("tree.png", 512, 35),
    "hub_rose_bush_1791294172956.jpg": ("bush.png", 420, 35),
    "hub_trampoline_toy_1791294196679.jpg": ("trampoline.png", 420, 32),
    "hub_door_arch_1791294240811.jpg": ("arch.png", 512, 32),
    "hub_garden_fence_1791294287786.jpg": ("fence.png", 420, 32),
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
            if r > 225 and g > 225 and b > 225:
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
        
    out.thumbnail((max_side, max_side), Image.LANCZOS)
    out.save(dst_path, optimize=True)
    print(f"Processed {src_path.name} -> {dst_path.name} ({out.size})")


for src_name, (dst_name, max_side, thresh) in ASSETS.items():
    src = BRAIN / src_name
    dst = DEST / dst_name
    clean_cutout(src, dst, max_side, thresh)

print("All hub assets cut out successfully!")
