"""Halo Reels command line.
  python3 reel.py PLAN.json prep                 frames, words, matte, head track (cached in PLAN_work/); prints the words
  python3 reel.py PLAN.json stills 1.0 3.2 ...   one composed still per time -> PLAN_work/stills/
  python3 reel.py PLAN.json render [--force]     the full reel -> plan "output" (MP4, H.264, AAC, -14 LUFS)"""
import glob, json, os, shutil, subprocess, sys
import cv2
from . import plan as P, prep, compose, sfx

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def layers(plan, rplan, head, fps, frames, looks):
    work = plan['_work']
    ldir = os.path.join(work, 'layers'); os.makedirs(ldir, exist_ok=True)
    rdir = os.path.join(work, 'room'); os.makedirs(rdir, exist_ok=True)
    shots = []
    for fi in frames:
        seg = compose.segment_at(rplan, fi / fps)
        room = None
        if seg['kind'] == 'speaker':
            rp = os.path.join(rdir, f'r_{fi:04d}.jpg')
            if not os.path.exists(rp):
                f = cv2.imread(os.path.join(work, 'frames', f'f_{fi:04d}.png'))
                cv2.imwrite(rp, looks.room_bg(f), [cv2.IMWRITE_JPEG_QUALITY, 95])
            room = 'file://' + rp
        for k, t in enumerate(compose.shot_times(rplan, fi, fps)):
            name = f'{fi:04d}_{k}'
            if not (os.path.exists(os.path.join(ldir, f'B_{name}.jpg')) and os.path.exists(os.path.join(ldir, f'F_{name}.png'))):
                shots.append(dict(name=name, t=round(t, 5), room=room, tc=round(fi / fps, 5)))
    if not shots:
        return
    clean = {k: v for k, v in rplan.items() if not k.startswith('_')}
    jp = os.path.join(work, 'layers_job.json')
    json.dump(dict(plan=clean, head=head, out=ldir, shots=shots), open(jp, 'w', encoding='utf-8'), ensure_ascii=False)
    if not os.path.isdir(os.path.join(HERE, 'node_modules', '@fontsource')):
        raise SystemExit(f'fonts missing: run "npm install" in {HERE}')
    subprocess.run(['node', os.path.join(HERE, 'engine', 'render_layers.mjs'), jp], check=True)


def plan_hash(rplan, head):
    import hashlib
    clean = {k: v for k, v in rplan.items() if not k.startswith('_')}
    s = json.dumps([clean, head], sort_keys=True, ensure_ascii=False)
    s += ''.join(open(os.path.join(HERE, 'engine', f), encoding='utf-8').read() for f in ('stage.js', 'stage.html', 'halo.js', 'halo.css', 'render_layers.mjs'))
    return hashlib.sha1(s.encode()).hexdigest()


def main(argv):
    if len(argv) < 2:
        print(__doc__); return 1
    plan = P.load(argv[0]); cmd = argv[1]; rest = argv[2:]
    n, fps, words, tr = prep.run(plan)
    if cmd == 'prep':
        for w in words:
            print(f'{w["s"]:7.2f} {w["e"]:7.2f}  {w["w"]}')
        return 0
    rplan = P.resolve(plan, words)
    head = tr['head']
    work = plan['_work']
    looks = compose.Looks(rplan, head)
    h = plan_hash(rplan, head) + json.dumps(rplan.get('grade', {})) + rplan.get('theme', 'noir') + str(rplan.get('accent')); hp = os.path.join(work, 'layers.hash')
    if '--force' in rest or not os.path.exists(hp) or open(hp).read() != h:
        shutil.rmtree(os.path.join(work, 'layers'), ignore_errors=True)
        shutil.rmtree(os.path.join(work, 'room'), ignore_errors=True)
        open(hp, 'w').write(h)
    if cmd == 'stills':
        times = [float(x) for x in rest if not x.startswith('--')] or [s['from'] + 0.75 * (s['to'] - s['from']) for s in rplan['segments']]
        fis = sorted({min(n - 1, int(round(t * fps))) for t in times})
        layers(plan, rplan, head, fps, fis, looks)
        sdir = os.path.join(work, 'stills'); os.makedirs(sdir, exist_ok=True)
        for fi in fis:
            p = os.path.join(sdir, f's_{fi / fps:06.2f}.png')
            cv2.imwrite(p, compose.frame(rplan, looks, work, fi, fps)); print('still ->', p)
        return 0
    if cmd == 'render':
        last = min(n, int(round(rplan['segments'][-1]['to'] * fps)))
        layers(plan, rplan, head, fps, list(range(last)), looks)
        mixw = sfx.mix(rplan, os.path.join(work, 'audio.wav'), os.path.join(work, 'mix.wav'))
        out = P.asset(plan, plan.get('output', 'reel.mp4'))
        compose.encode(rplan, looks, work, last, fps, mixw, out)
        print('reel ->', out)
        return 0
    print(__doc__); return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
