"""
Office-style backdrop matching the reference reel's set (for green-screen recordings).
  python3 office_backdrop.py OUT_DIR
Writes OUT_DIR/backdrop.png (wall + teal screens with boats, blurred) and OUT_DIR/desk.png
(RGBA warm wood desk that sits IN FRONT of the person, like the reference's table).
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1080, 1920
out = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(3)

img = Image.new("RGB", (W, H), "#d7d9d8")
d = ImageDraw.Draw(img)
# wall gradient
for y in range(0, int(H * 0.25)):
    c = int(222 - 18 * y / (H * 0.25)); d.line([(0, y), (W, y)], fill=(c, c + 2, c + 1))
d.rectangle([0, int(H * .245), W, int(H * .262)], fill="#3a2a20")          # dark wood trim
d.rectangle([0, int(H * .262), W, int(H * .325)], fill="#e3e4e1")          # light soffit
d.rectangle([0, int(H * .318), W, int(H * .325)], fill="#b9bbb8")
# monitor wall
top, bot = int(H * .33), int(H * .70)
d.rectangle([0, top - 8, W, bot + 8], fill="#14191a")
panels = [(-200, 130), (150, 500), (530, 880), (910, 1260)]
for x0, x1 in panels:
    teal = np.zeros((bot - top, x1 - x0, 3), np.float32)
    gy = np.linspace(0, 1, bot - top)[:, None]
    teal[..., 0] = 12 + 10 * gy; teal[..., 1] = 140 + 25 * gy; teal[..., 2] = 112 + 18 * gy
    teal += rng.normal(0, 9, teal.shape)                                      # water texture
    p = Image.fromarray(np.clip(teal, 0, 255).astype(np.uint8))
    pd = ImageDraw.Draw(p)
    pw = x1 - x0
    for bx, bw, bh, by in [(0.18, 0.30, 0.62, 0.12), (0.55, 0.22, 0.48, 0.25)]:  # boats seen from above
        L, R = int(pw * bx), int(pw * (bx + bw)); T, B = int((bot - top) * by), int((bot - top) * (by + bh))
        pd.rounded_rectangle([L, T, R, B], radius=(R - L) // 2, fill="#eef3f1")
        pd.rectangle([L + (R - L) // 4, T + (B - T) // 5, R - (R - L) // 4, T + (B - T) // 3], fill="#9fb3ae")
    img.paste(p, (x0 + 6, top))
d.rectangle([0, bot + 8, W, int(H * .74)], fill="#e9e9e6")                 # counter
d.rectangle([0, int(H * .74), W, H], fill="#5b4a40")
img = img.filter(ImageFilter.GaussianBlur(7))                                # depth of field
img.save(os.path.join(out, "backdrop.png"))

# desk in front (warm orange wood, glossy edge)
desk = np.zeros((H, W, 4), np.float32)
y0 = int(H * .79)
for y in range(y0, H):
    k = (y - y0) / (H - y0)
    desk[y, :, :3] = [168 - 60 * k, 78 - 30 * k, 28 - 10 * k]
    desk[y, :, 3] = 255
grain = rng.normal(0, 1, (H - y0, W)).cumsum(1)
grain = (grain - grain.mean(1, keepdims=True)) / (grain.std() + 1e-6)
desk[y0:, :, :3] += grain[..., None] * 6
desk[y0:y0 + 10, :, :3] = [222, 150, 90]                                     # front highlight edge
desk[y0 + 10:y0 + 40, :, :3] += 25 * np.linspace(1, 0, 30)[:, None, None]
Image.fromarray(np.clip(desk, 0, 255).astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(1.5)).save(
    os.path.join(out, "desk.png"))
print("wrote backdrop.png, desk.png ->", out)
