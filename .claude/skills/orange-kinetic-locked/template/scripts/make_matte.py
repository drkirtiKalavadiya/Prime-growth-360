"""
Cut the speaker out of the video so headlines and icons can sit BEHIND the head.

  python3 scripts/make_matte.py public/input.mp4

Writes public/subject.webm: the same video, but with a transparent background
(VP9 + alpha). Remotion stacks it on top of the graphics layer.

Needs: pip install mediapipe numpy opencv-python-headless ; ffmpeg on PATH.
The model (~16 MB) is downloaded once into scripts/.models/.
"""
import json, os, subprocess, sys, urllib.request
import numpy as np
import cv2
import mediapipe as mp

MODEL_URL = ("https://storage.googleapis.com/mediapipe-models/image_segmenter/"
             "selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite")
HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, ".models", "selfie_multiclass_256x256.tflite")

src = sys.argv[1] if len(sys.argv) > 1 else "public/input.mp4"
dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(src), "subject.webm")

if not os.path.exists(MODEL):
    os.makedirs(os.path.dirname(MODEL), exist_ok=True)
    print("downloading segmentation model…")
    urllib.request.urlretrieve(MODEL_URL, MODEL)

info = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=width,height,r_frame_rate", "-of", "json", src]))["streams"][0]
W, H = info["width"], info["height"]
num, den = map(int, info["r_frame_rate"].split("/"))
fps = num / den

reader = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo",
                           "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
writer = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba",
                           "-s", f"{W}x{H}", "-r", info["r_frame_rate"], "-i", "-",
                           "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "6M",
                           "-auto-alt-ref", "0", "-row-mt", "1", "-deadline", "realtime",
                           "-cpu-used", "8", dst], stdin=subprocess.PIPE)

opts = mp.tasks.vision.ImageSegmenterOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=MODEL),
    running_mode=mp.tasks.vision.RunningMode.VIDEO,
    output_confidence_masks=True)
seg = mp.tasks.vision.ImageSegmenter.create_from_options(opts)

prev = None
i = 0
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
while True:
    buf = reader.stdout.read(W * H * 3)
    if len(buf) < W * H * 3:
        break
    rgb = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    res = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb),
                                int(i * 1000 / fps))
    bg = res.confidence_masks[0].numpy_view()           # category 0 = background
    a = cv2.resize(1.0 - bg, (W, H), interpolation=cv2.INTER_LINEAR)
    prev = a if prev is None else 0.6 * a + 0.4 * prev  # temporal smoothing, kills flicker
    a = np.clip((prev - 0.35) / 0.3, 0, 1)              # tighten the edge
    a = cv2.erode(a, kernel)                            # pull edge in 2px (no halo)
    a = cv2.GaussianBlur(a, (0, 0), 1.5)                # feather
    rgba = np.dstack([rgb, (a * 255).astype(np.uint8)])
    writer.stdin.write(rgba.tobytes())
    i += 1
    if i % 100 == 0:
        print(f"  {i} frames")

seg.close()
writer.stdin.close(); writer.wait(); reader.wait()
print(f"done: {dst} ({i} frames)")
