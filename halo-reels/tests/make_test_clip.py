#!/usr/bin/env python3
"""A synthetic 10 s test clip (a simple seated figure in a room) and its exact matte video, so the whole pipeline can be
tested without a real recording.  usage: python3 tests/make_test_clip.py OUT_DIR"""
import os, subprocess, sys
import numpy as np, cv2

out = sys.argv[1] if len(sys.argv) > 1 else 'tests/out'
os.makedirs(out, exist_ok=True)
W, H, FPS, N = 1080, 1920, 30, 300
room = np.zeros((H, W, 3), np.uint8)
for y in range(H):
    room[y] = (60 + y * 40 // H, 80 + y * 30 // H, 110 + y * 20 // H)
for i, (x, y, w, h) in enumerate([(80, 300, 300, 22), (80, 520, 300, 22), (700, 380, 300, 22), (700, 640, 300, 22)]):
    cv2.rectangle(room, (x, y), (x + w, y + h), (40, 70, 110), -1)
    for k in range(5):
        cv2.rectangle(room, (x + 20 + k * 55, y - 90 + (k % 2) * 20), (x + 60 + k * 55, y), (60 + 30 * k, 90, 150 - 20 * k), -1)
cv2.circle(room, (900, 1000), 90, (120, 190, 240), -1)


def person(t):
    cx = 540 + 18 * np.sin(t * 1.3)
    m = np.zeros((H, W), np.uint8)
    cv2.ellipse(m, (int(cx), 760), (125, 160), 0, 0, 360, 255, -1)                      # head
    cv2.rectangle(m, (int(cx) - 55, 880), (int(cx) + 55, 1000), 255, -1)                # neck
    pts = np.array([[cx - 330, 1920], [cx - 300, 1080], [cx - 120, 980], [cx + 120, 980], [cx + 300, 1080], [cx + 330, 1920]], np.int32)
    cv2.fillPoly(m, [pts], 255)                                                         # shoulders and body
    return cv2.GaussianBlur(m, (0, 0), 1.5), cx


vw = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-f', 'lavfi', '-i', f'sine=frequency=220:sample_rate=48000:duration={N / FPS}',
                       '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', os.path.join(out, 'test_clip.mp4')], stdin=subprocess.PIPE)
mw = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-crf', '10', '-pix_fmt', 'yuv420p', os.path.join(out, 'test_matte.mp4')], stdin=subprocess.PIPE)
for i in range(N):
    t = i / FPS
    m, cx = person(t)
    img = room.copy()
    body = np.full_like(img, (70, 40, 140))                                             # maroon kurta
    skin = np.full_like(img, (120, 160, 205))
    a = (m.astype(np.float32) / 255)[..., None]
    sk = np.zeros((H, W), np.uint8); cv2.ellipse(sk, (int(cx), 760), (125, 160), 0, 0, 360, 255, -1); cv2.rectangle(sk, (int(cx) - 55, 880), (int(cx) + 55, 1000), 255, -1)
    col = np.where(sk[..., None] > 0, skin, body)
    cv2.ellipse(col, (int(cx), 650), (130, 70), 0, 180, 360, (30, 30, 40), -1)          # hair
    img = (img * (1 - a) + col * a).astype(np.uint8)
    vw.stdin.write(img.tobytes()); mw.stdin.write(m.tobytes())
vw.stdin.close(); mw.stdin.close(); vw.wait(); mw.wait()
print('test clip ->', out)
