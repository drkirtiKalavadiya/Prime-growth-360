"""Compositing, back to front:
speaker scene:  room (darkened, warm, soft) -> BACK graphics -> person (matte, kesar rim light) -> camera zoom
                -> bottom shade + vignette -> FRONT graphics -> cut shake -> grain
abstract scene: BACK (its own full background) -> FRONT -> cut shake -> grain"""
import os, json, subprocess
import numpy as np, cv2

W, H = 1080, 1920
SAFFRON = np.array([51, 153, 255], np.float32)          # BGR


def ease_out(p):
    p = min(max(p, 0.0), 1.0); return 1 - (1 - p) ** 3


def ease_io(p):
    p = min(max(p, 0.0), 1.0); return 3 * p * p - 2 * p * p * p


def zoom_at(plan, t):
    cam = plan.get('camera') or {}
    z = 1.0
    if 'open' in cam:
        a, b = cam['open']; z0 = float(cam.get('open_zoom', 1.12))
        z *= z0 + (1 - z0) * ease_out((t - a) / max(1e-3, b - a))
    k = cam.get('key')
    if k:
        zk = float(k.get('zoom', 1.1)); (a, b), (c, d) = k['in'], k['out']
        if t >= a:
            p = ease_io((t - a) / max(1e-3, b - a)) if t < c else 1 - ease_io((t - c) / max(1e-3, d - c))
            z *= 1 + (zk - 1) * p
    return z


def cut_shake(plan, t):
    for s in plan['segments'][1:]:
        dt = t - s['from']
        if 0 <= dt < 0.3:
            amp = 16 * np.exp(-dt * 14)
            return amp * np.sin(dt * 70), amp * 0.5 * np.cos(dt * 55)
    return 0.0, 0.0


class Looks:
    def __init__(self, plan, head):
        g = plan.get('grade') or {}
        self.room = float(g.get('room', 0.5))
        self.blur = float(g.get('room_blur', 2.0))
        self.head = head
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.45) / (H * 0.7)) ** 2)
        self.vignette = (1 - 0.55 * np.clip(d - 0.45, 0, 1) ** 1.4)[..., None]
        shade = np.clip((yy - 1050) / 870, 0, 1)
        self.bottom = (1 - 0.5 * shade ** 1.2)[..., None]
        self.rng = np.random.default_rng(11)

    def room_bg(self, f):
        bg = f * self.room * np.array([0.80, 0.90, 1.07], np.float32)
        if self.blur > 0:
            bg = cv2.GaussianBlur(bg, (0, 0), self.blur)
        return bg

    def person(self, f):
        p = (f - 128) * 1.06 + 132
        return p * np.array([0.97, 1.0, 1.035], np.float32)

    def rim(self, m):
        e = np.clip(m - cv2.erode(m, np.ones((11, 11), np.uint8)), 0, 1)
        e = cv2.GaussianBlur(e, (0, 0), 7)
        return e[..., None] * SAFFRON * 0.55

    def grain(self, img, fi):
        n = np.random.default_rng(1000 + fi).standard_normal((H // 2, W // 2)).astype(np.float32)
        n = cv2.resize(n, (W, H), interpolation=cv2.INTER_LINEAR)
        return img + n[..., None] * 3.2


def over(base, rgba):
    a = rgba[..., 3:4] / 255.0
    return base * (1 - a) + rgba[..., :3] * a


def frame(plan, looks, work, fi, fps):
    t = fi / fps
    seg = next((s for s in plan['segments'] if s['from'] <= t < s['to']), plan['segments'][-1])
    L = cv2.imread(os.path.join(work, 'layers', f'L_{fi:04d}.png'), cv2.IMREAD_UNCHANGED).astype(np.float32)
    back, front = L[:, :W], L[:, W:]
    if seg['kind'] == 'speaker':
        f = cv2.imread(os.path.join(work, 'frames', f'f_{fi:04d}.png')).astype(np.float32)
        m = cv2.imread(os.path.join(work, 'matte', f'm_{fi:04d}.png'), 0).astype(np.float32) / 255
        img = over(looks.room_bg(f), back)
        img = img * (1 - m[..., None]) + looks.person(f) * m[..., None]
        img = img + looks.rim(m) * (1 - m[..., None] * 0.6)
        z = zoom_at(plan, t)
        if abs(z - 1) > 1e-4:
            h = looks.head; cx, cy = h['x'], h['top'] + h['w'] * 0.8
            M = np.float32([[z, 0, cx - z * cx], [0, z, cy - z * cy]])
            img = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        img = img * looks.bottom * looks.vignette
    else:
        img = back[..., :3] * (back[..., 3:4] / 255.0)
    img = over(img, front)
    dx, dy = cut_shake(plan, t)
    if dx or dy:
        img = cv2.warpAffine(img, np.float32([[1, 0, dx], [0, 1, dy]]), (W, H), borderMode=cv2.BORDER_REFLECT)
    img = looks.grain(img, fi)
    return np.clip(img, 0, 255).astype(np.uint8)


def encode(plan, looks, work, n, fps, audio, out):
    cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
           '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p',
           '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for fi in range(n):
        p.stdin.write(frame(plan, looks, work, fi, fps).tobytes())
        if fi % 60 == 59:
            print(f'  compose {fi + 1}/{n}', flush=True)
    p.stdin.close()
    if p.wait() != 0:
        raise SystemExit('ffmpeg failed')
