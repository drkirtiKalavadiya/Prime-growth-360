#!/usr/bin/env python3
"""Writes examples/words_example.json (hand-timed words of the example script) and examples/plan_example.json,
the reference plan that uses every element. usage: python3 tests/make_example_plan.py"""
import json, os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ex = os.path.join(HERE, 'examples'); os.makedirs(ex, exist_ok=True)
script = [
    (0.15, "Most"), (0.38, "creators"), (0.78, "post"), (1.0, "every"), (1.22, "day."),
    (1.5, "Views,"), (1.8, "likes,"), (2.05, "zero"), (2.3, "clients."),
    (2.6, "The"), (2.75, "fix"), (2.95, "is"), (3.1, "three"), (3.4, "steps:"), (3.65, "hook,"), (3.9, "offer,"), (4.15, "follow"), (4.35, "up."),
    (4.6, "I'm"), (4.75, "your"), (4.95, "growth"), (5.3, "partner."), (5.6, "Content,"), (5.9, "funnels,"), (6.2, "sales."),
    (6.55, "One"), (6.7, "client"), (6.95, "hit"), (7.15, "fifty"), (7.45, "thousand"), (7.85, "a"), (7.95, "month."),
    (8.45, "Comment"), (8.85, "growth"), (9.2, "for"), (9.32, "the"), (9.45, "guide."),
]
words = []
for i, (t, w) in enumerate(script):
    nxt = script[i + 1][0] - 0.03 if i + 1 < len(script) else t + 0.4
    words.append(dict(w=w, s=t, e=round(min(nxt, t + 0.6), 2)))
json.dump(words, open(os.path.join(ex, 'words_example.json'), 'w'), indent=0)

plan = {
    "theme": "noir",
    "clip": "../tests/out/test_clip.mp4",
    "matte_video": "../tests/out/test_matte.mp4",
    "words": "words_example.json",
    "start": 0, "end": 10, "fps": 30, "output": "halo_example.mp4", "language": "en", "motion_blur": 3,
    "camera": {"open_zoom": 1.14, "open": [0, 1.1], "push": 0.035, "key": {"zoom": 1.08, "in": ["@growth", "@partner"], "out": [6.15, 6.45]}},
    "segments": [
        {"kind": "speaker", "from": 0, "to": 2.5, "elements": [
            {"el": "card", "kicker": "EVERY DAY", "title": "Most *creators*", "rows": [["Views", "@views"], ["Likes", "@likes"], ["Zero clients", "@zero"]]},
            {"el": "caption", "y": 1330, "top": [["Most", "@most"], ["creators", "@creators"]], "accent": ["post", "@post"], "bottom": [["every", "@every"], ["day", "@day"]]}]},
        {"kind": "abstract", "from": 2.5, "to": 4.5, "elements": [
            {"el": "panels", "y": 330, "items": [["Hook", "@hook"], ["Offer", "@offer"], ["Follow up", "@follow"]]},
            {"el": "caption", "y": 1380, "top": [["The", "@the"], ["fix", "@fix"]], "accent": ["three steps", "@three"]}]},
        {"kind": "speaker", "from": 4.5, "to": 6.45, "elements": [
            {"el": "headword", "top": [["I'm", "@i'm"], ["your", "@your"]], "accent": ["growth", "@growth"]},
            {"el": "caption", "y": 1380, "accent": ["partner", "@partner"]},
            {"el": "chips", "y": 1640, "items": [["Content", "@content"], ["Funnels", "@funnels"], ["Sales", "@sales"]]}]},
        {"kind": "abstract", "from": 6.45, "to": 8.35, "elements": [
            {"el": "counter", "t": "@client", "to": 50000, "prefix": "$", "label": "a month", "dur": 1.1, "y": 700},
            {"el": "caption", "y": 1300, "top": [["One", "@one"], ["client", "@client"], ["hit", "@hit"]], "accent": ["$50k", "@fifty"], "bottom": [["a month", "@a"]]}]},
        {"kind": "speaker", "from": 8.35, "to": 10.0, "elements": [
            {"el": "notify", "t": "@comment", "app": "Instagram", "title": "New comment", "text": "GROWTH", "icon": "✦", "y": 170},
            {"el": "caption", "y": 1330, "top": [["Comment", "@comment"]], "accent": ["growth", "@growth#2"], "bottom": [["for the guide", "@for"]]}]},
    ]}


def write(plan, path):
    lines = ['{']
    for k, v in plan.items():
        if k != 'segments':
            lines.append(f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},')
    lines.append('  "segments": [')
    for i, sg in enumerate(plan['segments']):
        head = {k: v for k, v in sg.items() if k != 'elements'}
        lines.append('    ' + json.dumps(head)[:-1] + ', "elements": [')
        lines.append(',\n'.join('      ' + json.dumps(e, ensure_ascii=False) for e in sg['elements']))
        lines.append('    ]}' + (',' if i < len(plan['segments']) - 1 else ''))
    lines += ['  ]', '}']
    open(path, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')


write(plan, os.path.join(ex, 'plan_example.json'))
print('examples written')
