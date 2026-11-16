"""Clip preparation, cached in <plan>_work/:
1. frames at the plan's frame rate, scaled and cropped to 1080x1920 (HDR tone-mapped to SDR), plus the audio;
2. word timings (words.json) from faster-whisper if the plan brings none and it is installed;
3. the person matte: MediaPipe selfie segmenter (Apache-2.0, downloaded once) refined with a guided filter and
   smoothed in time, or the user's own matte video (`matte_video`, white = person);
4. the head track (head top, centre and width) read from the matte."""
import glob, json, os, subprocess, sys, urllib.request
import numpy as np, cv2
from . import plan as P

W, H = 1080, 1920
MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'
CACHE = os.path.expanduser('~/.cache/halo-reels')


def sh(cmd):
    subprocess.run(cmd, check=True)


def probe(clip):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_transfer',
                          '-of', 'json', clip], capture_output=True, text=True, check=True).stdout
    return (json.loads(out).get('streams') or [{}])[0]


def seg_args(plan):
    ss = float(plan.get('start', 0) or 0)
    end = plan.get('end')
    return ['-ss', str(ss)] + (['-t', str(float(end) - ss)] if end else [])


def frames(plan):
    work = plan['_work']
    fdir = os.path.join(work, 'frames'); os.makedirs(fdir, exist_ok=True)
    clip = P.asset(plan, plan['clip']); fps = int(plan.get('fps', 30))
    vf = []
    if probe(clip).get('color_transfer') in ('arib-std-b67', 'smpte2084'):
        vf.append('zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p')
    vf += [f'fps={fps}', f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos', f'crop={W}:{H}']
    if not glob.glob(os.path.join(fdir, 'f_*.png')):
        sh(['ffmpeg', '-nostdin', '-v', 'error', '-y'] + seg_args(plan) + ['-i', clip, '-vf', ','.join(vf),
            '-start_number', '0', os.path.join(fdir, 'f_%04d.png')])
    wav = os.path.join(work, 'audio.wav')
    if not os.path.exists(wav):
        r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y'] + seg_args(plan) + ['-i', clip, '-vn', '-ac', '2', '-ar', '48000', wav])
        if r.returncode != 0 or not os.path.exists(wav):          # a clip without sound: silence of the same length
            n = len(glob.glob(os.path.join(fdir, 'f_*.png')))
            sh(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', str(n / fps), wav])
    n = len(glob.glob(os.path.join(fdir, 'f_*.png')))
    print(f'frames: {n} at {fps} fps', flush=True)
    return n, fps


def words(plan):
    """-> list of {w, s, e} in clip seconds, or [] when there is no words file and no faster-whisper."""
    if plan.get('words'):
        p = P.asset(plan, plan['words'])
        if os.path.exists(p):
            return json.load(open(p, encoding='utf-8'))
    p = os.path.join(plan['_work'], 'words.json')
    if os.path.exists(p):
        return json.load(open(p, encoding='utf-8'))
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        print('words: no words.json and faster-whisper is not installed; use plain seconds in the plan '
              '(or pip install faster-whisper).', flush=True)
        return []
    here = os.path.dirname(os.path.abspath(__file__))
    sh([sys.executable, os.path.join(here, 'words.py'), P.asset(plan, plan['clip']), p, '--lang', plan.get('language', 'en')])
    return json.load(open(p, encoding='utf-8'))


def _segmenter():
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions, vision
    os.makedirs(CACHE, exist_ok=True)
    model = os.path.join(CACHE, 'selfie_multiclass_256x256.tflite')
    if not os.path.exists(model):
        print('downloading the segmentation model once...', flush=True)
        urllib.request.urlretrieve(MODEL_URL, model)
    opts = vision.ImageSegmenterOptions(base_options=BaseOptions(model_asset_path=model),
                                        running_mode=vision.RunningMode.VIDEO, output_confidence_masks=True)
    return mp, vision.ImageSegmenter.create_from_options(opts)


def matte(plan, n, fps):
    work = plan['_work']
    mdir = os.path.join(work, 'matte'); os.makedirs(mdir, exist_ok=True)
    if len(glob.glob(os.path.join(mdir, 'm_*.png'))) >= n:
        return mdir
    if plan.get('matte_video'):                                   # the user's own matte (CapCut, RVM, After Effects...)
        sh(['ffmpeg', '-nostdin', '-v', 'error', '-y'] + seg_args(plan) + ['-i', P.asset(plan, plan['matte_video']),
            '-vf', f'fps={fps},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},format=gray',
            '-start_number', '0', os.path.join(mdir, 'm_%04d.png')])
        return mdir
    mp, seg = _segmenter()
    guided = hasattr(cv2, 'ximgproc')
    prev = None
    for i in range(n):
        bgr = cv2.imread(os.path.join(work, 'frames', f'f_{i:04d}.png'))
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        res = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(i * 1000 / fps))
        m = 1.0 - np.squeeze(res.confidence_masks[0].numpy_view()).astype(np.float32)   # category 0 = background
        if m.shape != (H, W):
            m = cv2.resize(m, (W, H), interpolation=cv2.INTER_LINEAR)
        if guided:                                                # snap the soft edge to the real hair / shoulder edges
            m = cv2.ximgproc.guidedFilter(bgr, m, 8, 1e-4)
        m = np.clip((m - 0.12) / 0.76, 0, 1)
        prev = m if prev is None else 0.55 * m + 0.45 * prev      # calm the flicker
        cv2.imwrite(os.path.join(mdir, f'm_{i:04d}.png'), (prev * 255).astype(np.uint8))
        if i % 60 == 59:
            print(f'  matte {i + 1}/{n}', flush=True)
    seg.close()
    print('matte done', flush=True)
    return mdir


def track(plan, n, fps):
    p = os.path.join(plan['_work'], 'track.json')
    if os.path.exists(p):
        return json.load(open(p))
    tops, xs, ws = [], [], []
    for i in range(n):
        m = cv2.imread(os.path.join(plan['_work'], 'matte', f'm_{i:04d}.png'), 0) > 128
        rows = m.sum(1)
        hit = np.nonzero(rows >= 30)[0]
        if len(hit) == 0:
            continue
        top = int(hit[0])
        _, xx = np.nonzero(m[top:top + 110])
        xs.append(float(xx.mean()) if len(xx) else W / 2); tops.append(top)
        row = m[min(H - 1, top + 95)]
        cols = np.nonzero(row)[0]
        if len(cols):                                             # the run of matte under the head centre = head width
            c = int(np.clip(xs[-1], 0, W - 1)); l = r = c
            if row[c]:
                while l > 0 and row[l - 1]: l -= 1
                while r < W - 1 and row[r + 1]: r += 1
                ws.append(r - l + 1)
    if tops:
        head = dict(x=round(float(np.median(xs)), 1), top=round(float(np.median(tops)), 1),
                    w=round(float(np.clip(np.median(ws) if ws else 220, 120, 520)), 1), found=True)
    else:
        print('track: no person found in the matte; using the centre of the frame', flush=True)
        head = dict(x=540.0, top=620.0, w=230.0, found=False)
    d = dict(fps=fps, n=n, head=head)
    json.dump(d, open(p, 'w'), indent=1)
    print(f'head: x {head["x"]}, top {head["top"]}, width {head["w"]}', flush=True)
    return d


def run(plan):
    os.makedirs(plan['_work'], exist_ok=True)
    n, fps = frames(plan)
    w = words(plan)
    matte(plan, n, fps)
    tr = track(plan, n, fps)
    return n, fps, w, tr
