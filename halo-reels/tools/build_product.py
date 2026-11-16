#!/usr/bin/env python3
"""Packs the product for the buyer: dist/halo-reels-<version>.zip with only what the buyer needs
(no node_modules, no work folders, no tests output, no seller files). usage: python3 tools/build_product.py"""
import json, os, zipfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
version = json.load(open(os.path.join(HERE, 'package.json')))['version']
INCLUDE = ['SKILL.md', 'HANDBOOK.md', 'README.md', 'TERMS.md', 'THIRD_PARTY.md', 'package.json', 'requirements.txt',
           'reel.py', 'setup_check.py', 'halo', 'engine', 'library/LIBRARY.pdf', 'library/LIBRARY.md', 'guide/GUIDE.pdf',
           'examples/plan_example.json', 'examples/words_example.json', 'tests/make_test_clip.py', 'tests/test_pipeline.py']
SKIP_DIRS = {'__pycache__', 'node_modules'}
for need in ('library/LIBRARY.pdf', 'guide/GUIDE.pdf'):
    if not os.path.exists(os.path.join(HERE, need)):
        raise SystemExit(f'{need} is missing: run python3 tools/build_docs.py first')
os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
out = os.path.join(HERE, 'dist', f'halo-reels-{version}.zip')
n = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for item in INCLUDE:
        p = os.path.join(HERE, item)
        files = [p] if os.path.isfile(p) else [os.path.join(r, f) for r, ds, fs in os.walk(p) for f in fs
                                               if not (set(os.path.relpath(r, HERE).split(os.sep)) & SKIP_DIRS)]
        for f in files:
            if f.endswith('.pyc'):
                continue
            z.write(f, os.path.join('halo-reels', os.path.relpath(f, HERE))); n += 1
print(f'{n} files -> {out} ({os.path.getsize(out) / 1e6:.1f} MB)')
