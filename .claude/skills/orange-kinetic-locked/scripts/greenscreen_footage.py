"""
Turn a green-screen recording (any shape) into the two footage files the locked template needs.
  python3 greenscreen_footage.py IN.mp4 TEMPLATE_PUBLIC_DIR [--start 0] [--dur 35.6]
       [--scale auto] [--head-y 0.33]
Outputs:
  input.mp4    1080x1920/30fps: office backdrop + keyed person + desk, original audio
  subject.webm person + desk with alpha (so locked "behind" headlines sit behind the head)
The person is scaled so their shoulders fill ~80% of the width and the top of the head sits at
--head-y (the reference reel's framing), bottom gap hidden by the desk.
"""
import argparse, json, os, subprocess, sys
import numpy as np, cv2
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("outdir")
ap.add_argument("--start", type=float, default=0); ap.add_argument("--dur", type=float, default=35.6)
ap.add_argument("--head-y", type=float, default=0.33); ap.add_argument("--width-frac", type=float, default=0.82)
a = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS = 1080, 1920, 30
tmp = os.path.join(a.outdir, "_gs"); os.makedirs(tmp, exist_ok=True)
subprocess.check_call([sys.executable, os.path.join(HERE, "office_backdrop.py"), tmp])
bg = np.array(Image.open(os.path.join(tmp, "backdrop.png")).convert("RGB")).astype(np.float32)
desk = np.array(Image.open(os.path.join(tmp, "desk.png")).convert("RGBA")).astype(np.float32)
dA = desk[..., 3:] / 255

info = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                           "stream=width,height", "-of", "json", a.src]))["streams"][0]
sw, sh = info["width"], info["height"]


def key(rgb):
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    h, s, v = hsv[..., 0], hsv[..., 1] / 255, hsv[..., 2] / 255
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    greenness = (g - np.maximum(r, b)) / 255                      # >0 on the screen
    hue_ok = ((h > 35) & (h < 90)).astype(np.float32)
    alpha = 1 - np.clip((greenness * hue_ok - 0.06) / 0.12, 0, 1)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.8)
    # despill: clamp green to max(r,b) (+ a touch) so edges/skin lose the green cast
    g2 = np.minimum(g, np.maximum(r, b) * 1.05)
    out = np.dstack([r, g2, b])
    return out, alpha


# framing from a sample frame
probe = subprocess.check_output(["ffmpeg", "-v", "error", "-ss", str(a.start + 1), "-i", a.src, "-frames:v", "1",
                                 "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
_, al = key(np.frombuffer(probe, np.uint8).reshape(sh, sw, 3))
ys, xs = np.where(al > 0.5)
rows = np.where((al > 0.5).sum(1) > 4)[0]
head_top = rows[0]
cols = np.where((al > 0.5).sum(0) > 0.35 * sh)[0]            # shoulders/torso columns
cx = (xs.min() + xs.max()) / 2 if len(cols) == 0 else (cols[0] + cols[-1]) / 2
body_w = xs.max() - xs.min()
scale = a.width_frac * W / body_w
ox = W / 2 - cx * scale
oy = a.head_y * H - head_top * scale
print(f"source {sw}x{sh}, scale {scale:.2f}, head top -> {a.head_y:.2f}")

reader = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(a.start), "-t", str(a.dur), "-i", a.src, "-r", str(FPS),
                           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = ["-c:v", "libx264", "-crf", "15", "-preset", "fast", "-pix_fmt", "yuv420p"]
w_full = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                           "-i", "-", "-ss", str(a.start), "-t", str(a.dur), "-i", a.src, "-map", "0:v", "-map", "1:a",
                           *enc, "-c:a", "aac", "-b:a", "192k", "-shortest", os.path.join(a.outdir, "input.mp4")],
                          stdin=subprocess.PIPE)
w_sub = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "6M", "-auto-alt-ref", "0",
                          "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", os.path.join(a.outdir, "subject.webm")],
                         stdin=subprocess.PIPE)
M = np.float32([[scale, 0, ox], [0, scale, oy]])
n = 0
while True:
    buf = reader.stdout.read(sw * sh * 3)
    if len(buf) < sw * sh * 3:
        break
    rgb, al = key(np.frombuffer(buf, np.uint8).reshape(sh, sw, 3))
    big = cv2.warpAffine(rgb, M, (W, H), flags=cv2.INTER_CUBIC, borderValue=0)
    bl = cv2.GaussianBlur(big, (0, 0), 1.2)
    big = np.clip(big * 1.6 - bl * 0.6, 0, 255)                     # unsharp to offset upscale softness
    A = cv2.warpAffine(al, M, (W, H), flags=cv2.INTER_LINEAR, borderValue=0)[..., None]
    person = big * A
    # subject layer = person + desk in front
    sub_rgb = person * (1 - dA) + desk[..., :3] * dA
    sub_a = A + dA * (1 - A)
    full = bg * (1 - sub_a) + sub_rgb
    w_full.stdin.write(np.clip(full, 0, 255).astype(np.uint8).tobytes())
    un = np.where(sub_a > 1e-3, sub_rgb / np.maximum(sub_a, 1e-3), 0)
    w_sub.stdin.write(np.dstack([np.clip(un, 0, 255), sub_a * 255]).astype(np.uint8).tobytes())
    n += 1
for p in (w_full, w_sub):
    p.stdin.close(); p.wait()
reader.wait()
print(f"done: {n} frames -> input.mp4 + subject.webm")
