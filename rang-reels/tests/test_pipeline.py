#!/usr/bin/env python3
"""Fast checks: word references, plan rules, synthesised sounds, and the MediaPipe matte on a few frames.
usage: python3 tests/test_pipeline.py   (the full render test: python3 tests/make_test_clip.py tests/out && python3 reel.py examples/plan_demo.json render)"""
import os, sys, tempfile
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rangreels import plan as P, sfx, prep

words = [dict(w='આજે', s=1.0, e=1.3), dict(w='ગ્રોથ,', s=1.5, e=1.9), dict(w='ગ્રોથ', s=4.0, e=4.4), dict(w='CRM.', s=5, e=5.3)]
base = dict(start=1.0, segments=[dict(kind='speaker', **{'from': 0, 'to': 5}, elements=[
    dict(el='caption', top=[['આજે', '@આજે']], accent=['ગ્રોથ', '@ગ્રોથ#2.e+0.1'], bottom=[['CRM', '@crm-0.2']])])])
r = P.resolve(base, words)
e = r['segments'][0]['elements'][0]
assert e['top'][0][1] == 0.0, e
assert abs(e['accent'][1] - 3.5) < 1e-6, e                    # 4.4 + 0.1 - start 1.0
assert abs(e['bottom'][0][1] - 3.8) < 1e-6, e
try:
    P.resolve(dict(base, segments=[dict(kind='speaker', **{'from': 0, 'to': 1}, elements=[dict(el='stamp', t='@નથી')])]), words)
    raise AssertionError('missing word must fail')
except ValueError as x:
    assert 'not in words.json' in str(x)
try:
    P.check(dict(segments=[dict(kind='speaker', **{'from': 0, 'to': 2}), dict(kind='abstract', **{'from': 2.5, 'to': 3})]))
    raise AssertionError('gap must fail')
except ValueError:
    pass
print('plan: ok')

for name, f in sfx.SOUNDS.items():
    x = f(); assert np.isfinite(x).all() and 0.5 < np.abs(x).max() <= 1.0001, name
print('sfx: ok')

with tempfile.TemporaryDirectory() as d:
    fr = os.path.join(d, 'frames'); os.makedirs(fr)
    img = np.full((1920, 1080, 3), 90, np.uint8)
    cv2.circle(img, (540, 760), 150, (120, 160, 205), -1)
    for i in range(3):
        cv2.imwrite(os.path.join(fr, f'f_{i:04d}.png'), img)
    pl = dict(_work=d, _dir=d, clip='x.mp4')
    prep.matte(pl, 3, 30)
    m = cv2.imread(os.path.join(d, 'matte', 'm_0002.png'), 0)
    assert m.shape == (1920, 1080), m.shape
    tr = prep.track(pl, 3, 30)
    assert set(tr['head']) >= {'x', 'top', 'w'}
print('matte + track: ok')
