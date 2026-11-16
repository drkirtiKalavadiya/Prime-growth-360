"""Compositing.

The page draws the BACK layer opaque (the graded room for speaker scenes, its own background for abstract scenes,
plus every graphic behind the person) so glass can blur the real room behind it. Python then adds, back to front:
BACK -> person (matte, rim light) -> camera (open zoom, slow push, key zoom) -> grade (theme) -> FRONT
-> scene transition (luxe: zoom blur + light flash, kesar: shake) -> grain.
Motion blur: each frame is the average of `motion_blur` sub-frame renders over a 180 degree shutter."""
import os, subprocess
import numpy as np, cv2

W, H = 1080, 1920


def ease_out(p):
    p = min(max(p, 0.0), 1.0); return 1 - (1 - p) ** 3


def ease_io(p):
    p = min(max(p, 0.0), 1.0); return 3 * p * p - 2 * p * p * p


def theme(plan):
    return plan.get('theme', 'luxe')


def samples(plan):
    return int(plan.get('motion_blur', 3 if theme(plan) != 'kesar' else 1))


def segment_at(plan, t):
    return next((s for s in plan['segments'] if s['from'] <= t < s['to']), plan['segments'][-1])


def shot_times(plan, fi, fps):
    """sub-frame times of frame fi, kept inside its own scene so a cut never smears two scenes together"""
    t = fi / fps; seg = segment_at(plan, t); S = samples(plan)
    if S <= 1:
        return [t]
    out = []
    for k in range(S):
        tk = t + ((k + 0.5) / S - 0.5) * 0.5 / fps
        out.append(min(max(tk, seg['from']), seg['to'] - 1e-4))
    return out


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
    push = float(cam.get('push', 0.03 if theme(plan) != 'kesar' else 0))
    if push:                                                    # a slow push-in through every scene: never a frozen frame
        s = segment_at(plan, t)
        z *= 1 + push * ease_io((t - s['from']) / max(1e-3, s['to'] - s['from']))
    return z


def _curve(x, lift, gamma, gain):
    y = np.clip(x / 255.0, 0, 1)
    y = lift + (gain - lift) * y ** gamma
    y = y * y * (3 - 2 * y) * 0.35 + y * 0.65                  # gentle filmic S
    return np.clip(y * 255, 0, 255).astype(np.uint8)


class Looks:
    def __init__(self, plan, head):
        self.theme = theme(plan)
        g = plan.get('grade') or {}
        lux = self.theme != 'kesar'
        self.room = float(g.get('room', 0.42 if lux else 0.5))
        self.blur = float(g.get('room_blur', 2.6 if lux else 2.0))
        self.sat = float(g.get('room_saturation', 0.62 if lux else 1.0))
        self.tint = np.array([1.06, 0.98, 0.92] if lux else [0.80, 0.90, 1.07], np.float32)   # BGR
        self.rim_col = np.array([150, 205, 245] if lux else [51, 153, 255], np.float32)
        self.head = head
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.45) / (H * 0.7)) ** 2)
        self.vignette = (1 - (0.65 if lux else 0.55) * np.clip(d - 0.42, 0, 1) ** 1.3)[..., None]
        shade = np.clip((yy - 1050) / 870, 0, 1)
        self.bottom = (1 - 0.55 * shade ** 1.2)[..., None]
        # luxe grade: cool deep shadows, warm champagne highlights (split tone) through per-channel curves
        if lux:
            self.lut = np.stack([_curve(np.arange(256, dtype=np.float32), 0.035, 1.05, 0.97),    # B: lifted cool blacks
                                 _curve(np.arange(256, dtype=np.float32), 0.012, 1.03, 0.99),    # G
                                 _curve(np.arange(256, dtype=np.float32), 0.0, 0.97, 1.0)], 1)   # R: warm highlights
            self.leak = self._leak(yy, xx)
        else:
            self.lut = None

    def _leak(self, yy, xx):
        g1 = np.exp(-(((xx - 980) / 420) ** 2 + ((yy - 180) / 520) ** 2))
        g2 = np.exp(-(((xx - 60) / 380) ** 2 + ((yy - 1500) / 600) ** 2))
        return g1.astype(np.float32), g2.astype(np.float32)

    def room_bg(self, f):
        bg = f.astype(np.float32)
        if self.sat != 1.0:
            gray = bg.mean(2, keepdims=True); bg = gray + (bg - gray) * self.sat
        bg = bg * self.room * self.tint
        if self.blur > 0:
            bg = cv2.GaussianBlur(bg, (0, 0), self.blur)
        return np.clip(bg, 0, 255).astype(np.uint8)

    def person(self, f):
        p = (f - 128) * 1.07 + 130
        if self.theme != 'kesar':
            gray = p.mean(2, keepdims=True); p = gray + (p - gray) * 0.9
            return p * np.array([0.96, 0.99, 1.03], np.float32)
        return p * np.array([0.97, 1.0, 1.035], np.float32)

    def rim(self, m):
        k = 7 if self.theme != 'kesar' else 11
        e = np.clip(m - cv2.erode(m, np.ones((k, k), np.uint8)), 0, 1)
        e = cv2.GaussianBlur(e, (0, 0), 4 if self.theme != 'kesar' else 7)
        return e[..., None] * self.rim_col * (0.42 if self.theme != 'kesar' else 0.55)

    def grade(self, img, t):
        if self.lut is None:
            return img
        u8 = np.clip(img, 0, 255).astype(np.uint8)
        out = np.dstack([cv2.LUT(u8[..., c], self.lut[:, c].copy()) for c in range(3)]).astype(np.float32)
        g1, g2 = self.leak                                       # slow breathing light leaks
        a1 = 0.10 + 0.05 * np.sin(t * 0.9); a2 = 0.05 + 0.03 * np.sin(t * 0.7 + 1.0)
        out += (g1 * a1)[..., None] * np.array([120, 190, 255], np.float32) + (g2 * a2)[..., None] * np.array([200, 120, 150], np.float32)
        return out

    def grain(self, img, fi):
        n = np.random.default_rng(1000 + fi).standard_normal((H // 2, W // 2)).astype(np.float32)
        n = cv2.resize(n, (W, H), interpolation=cv2.INTER_LINEAR)
        return img + n[..., None] * (3.6 if self.theme != 'kesar' else 3.2)


def over(base, rgb, a):
    return base * (1 - a) + rgb * a


def load_layers(work, fi, S):
    ld = os.path.join(work, 'layers')
    back = np.zeros((H, W, 3), np.float32); prem = np.zeros((H, W, 3), np.float32); alpha = np.zeros((H, W, 1), np.float32)
    for k in range(S):
        back += cv2.imread(os.path.join(ld, f'B_{fi:04d}_{k}.jpg')).astype(np.float32)
        F = cv2.imread(os.path.join(ld, f'F_{fi:04d}_{k}.png'), cv2.IMREAD_UNCHANGED).astype(np.float32)
        a = F[..., 3:4] / 255.0
        prem += F[..., :3] * a; alpha += a
    alpha /= S
    front_rgb = prem / S / np.maximum(alpha, 1e-4)
    return back / S, front_rgb, alpha


def transition(plan, img, t):
    lux = theme(plan) != 'kesar'
    for s in plan['segments'][1:]:
        dt = t - s['from']
        if lux and abs(dt) < 0.14:
            k = 1 - abs(dt) / 0.14
            acc = img.copy(); n = 6
            for i in range(1, n):                               # radial zoom blur around the centre
                z = 1 + 0.06 * k * i / n
                M = np.float32([[z, 0, W / 2 * (1 - z)], [0, z, H * 0.45 * (1 - z)]])
                acc += cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            img = acc / n
            img = img + (k ** 3) * np.array([150, 200, 255], np.float32) * 0.55
            return img
        if not lux and 0 <= dt < 0.3:
            amp = 16 * np.exp(-dt * 14)
            dx, dy = amp * np.sin(dt * 70), amp * 0.5 * np.cos(dt * 55)
            return cv2.warpAffine(img, np.float32([[1, 0, dx], [0, 1, dy]]), (W, H), borderMode=cv2.BORDER_REFLECT)
    return img


def frame(plan, looks, work, fi, fps):
    t = fi / fps
    seg = segment_at(plan, t)
    back, front_rgb, front_a = load_layers(work, fi, samples(plan))
    img = back
    if seg['kind'] == 'speaker':
        f = cv2.imread(os.path.join(work, 'frames', f'f_{fi:04d}.png')).astype(np.float32)
        m = cv2.imread(os.path.join(work, 'matte', f'm_{fi:04d}.png'), 0).astype(np.float32) / 255
        img = over(img, looks.person(f), m[..., None])
        img = img + looks.rim(m) * (1 - m[..., None] * 0.6)
    z = zoom_at(plan, t)
    if abs(z - 1) > 1e-4:
        h = looks.head; cx, cy = (h['x'], h['top'] + h['w'] * 0.8) if seg['kind'] == 'speaker' else (W / 2, H * 0.45)
        M = np.float32([[z, 0, cx - z * cx], [0, z, cy - z * cy]])
        img = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    img = looks.grade(img, t)
    if seg['kind'] == 'speaker':
        img = img * looks.bottom
    img = img * looks.vignette
    img = over(img, front_rgb, front_a)
    img = transition(plan, img, t)
    img = looks.grain(img, fi)
    return np.clip(img, 0, 255).astype(np.uint8)


def encode(plan, looks, work, n, fps, audio, out):
    cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
           '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
           '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for fi in range(n):
        p.stdin.write(frame(plan, looks, work, fi, fps).tobytes())
        if fi % 60 == 59:
            print(f'  compose {fi + 1}/{n}', flush=True)
    p.stdin.close()
    if p.wait() != 0:
        raise SystemExit('ffmpeg failed')
