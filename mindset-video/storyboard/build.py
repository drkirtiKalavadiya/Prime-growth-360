"""Build storyboard.html (self-contained) from shots.json + frames/*.png.
   Usage: python3 -I storyboard/build.py   (run from mindset-video/)"""
import json, base64, subprocess, os, html
here = os.path.dirname(os.path.abspath(__file__))
shots = json.load(open(os.path.join(here, 'shots.json')))
DUR = 54.36

def thumb(t):
    src = os.path.join(here, 'frames', 't_%06d.png' % round(t * 1000))
    jpg = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', 'scale=300:-1', '-q:v', '4', '-f', 'mjpeg', '-'], capture_output=True, check=True).stdout
    return 'data:image/jpeg;base64,' + base64.b64encode(jpg).decode()

def tc(s):
    return '%d:%05.2f' % (int(s // 60), s % 60)

seqs = []
for s in shots:
    if not seqs or seqs[-1]['name'] != s['seq']:
        seqs.append({'name': s['seq'], 'shots': []})
    seqs[-1]['shots'].append(s)

e = html.escape
bar = ''.join(f'<a class="seg s{i % 4}" href="#seq{i}" style="flex:{(q["shots"][-1]["out"] - q["shots"][0]["in"]):.2f}" title="{e(q["name"])}"><span>{e(q["name"].split(" · ")[0])}</span></a>' for i, q in enumerate(seqs))

n = 0
body = ''
for i, q in enumerate(seqs):
    a, b = q['shots'][0]['in'], q['shots'][-1]['out']
    cards = ''
    for s in q['shots']:
        n += 1
        cards += f'''<article class="shot">
  <figure><img src="{thumb(s['thumb'])}" alt="Frame at {s['thumb']}s: {e(s['title'])}" width="300" height="533" loading="lazy"><figcaption><span class="no">{n:02d}</span><span class="tc">{tc(s['in'])} – {tc(s['out'])}</span></figcaption></figure>
  <div class="notes">
    <h3>{e(s['title'])}</h3>
    <p class="len">{s['out'] - s['in']:.2f}s</p>
    <dl>
      <dt>Visual</dt><dd>{e(s['visual'])}</dd>
      <dt>Animation</dt><dd>{e(s['anim'])}</dd>
      <dt>On screen</dt><dd class="ost">{e(s['text'])}</dd>
      <dt>Sound</dt><dd>{e(s['sound'])}</dd>
    </dl>
  </div>
</article>'''
    body += f'''<section class="seq" id="seq{i}">
  <header class="seqhead"><h2>{e(q['name'])}</h2><span class="range">{tc(a)} – {tc(b)} · {len(q['shots'])} shot{'s' if len(q['shots']) > 1 else ''}</span></header>
  <div class="grid">{cards}</div>
</section>'''

page = f'''<title>5 Mindset Rules Storyboard</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Patrick+Hand+SC&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
/* Layout: a shooting script. Timeline strip on top, then one band per sequence with shot cards (9:16 frame left, production notes right). */
:root {{
  --bg: #eef0f5; --surface: #ffffff; --ink: #1d2030; --muted: #5a6078; --line: #d5d9e6;
  --pen: #2f5be0; --s0: #2f5be0; --s1: #5b63a8; --s2: #8a7bc0; --s3: #c08a3e;
  --display: 'Patrick Hand SC', 'Comic Sans MS', cursive;
  --body: 'IBM Plex Sans', system-ui, sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg: #12141d; --surface: #1b1e2b; --ink: #e7e9f2; --muted: #9aa0b8; --line: #2c3043; --pen: #7d9cff; color-scheme: dark; }} }}
:root[data-theme="dark"] {{ --bg: #12141d; --surface: #1b1e2b; --ink: #e7e9f2; --muted: #9aa0b8; --line: #2c3043; --pen: #7d9cff; color-scheme: dark; }}
body {{ background: var(--bg); color: var(--ink); font: 15px/1.55 var(--body); }}
.wrap {{ max-width: 1180px; margin: 0 auto; padding-block: 40px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 40px; }}
.top {{ display: grid; gap: 14px; }}
.top h1 {{ font: 400 clamp(34px, 6vw, 56px)/1 var(--display); margin: 0; letter-spacing: 1px; text-wrap: balance; }}
.top p {{ margin: 0; max-width: 65ch; color: var(--muted); }}
.meta {{ display: flex; flex-wrap: wrap; gap: 8px 22px; font: 500 13px var(--mono); color: var(--muted); }}
.meta b {{ color: var(--ink); font-weight: 500; }}
.timeline {{ display: flex; gap: 3px; height: 44px; border-radius: 6px; overflow: hidden; }}
.seg {{ display: flex; align-items: flex-end; padding: 6px; min-width: 0; color: #fff; text-decoration: none; font: 500 11px var(--mono); }}
.seg span {{ white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
.seg:focus-visible {{ outline: 3px solid var(--ink); outline-offset: 2px; }}
.s0 {{ background: var(--s0); }} .s1 {{ background: var(--s1); }} .s2 {{ background: var(--s2); }} .s3 {{ background: var(--s3); }}
.seq {{ display: grid; gap: 16px; scroll-margin-top: 16px; }}
.seqhead {{ display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 16px; border-bottom: 2px solid var(--ink); padding-bottom: 6px; }}
.seqhead h2 {{ font: 400 30px/1.1 var(--display); margin: 0; letter-spacing: .5px; }}
.range {{ font: 500 13px var(--mono); color: var(--muted); }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 520px), 1fr)); gap: 16px; }}
.shot {{ display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }}
figure {{ margin: 0; display: grid; gap: 6px; align-content: start; }}
figure img {{ width: 100%; height: auto; border-radius: 4px; display: block; border: 1px solid var(--line); }}
figcaption {{ display: flex; justify-content: space-between; font: 500 11.5px var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }}
.no {{ color: var(--pen); }}
.notes {{ min-width: 0; display: grid; gap: 6px; align-content: start; }}
.notes h3 {{ margin: 0; font: 600 17px/1.3 var(--body); text-wrap: balance; }}
.len {{ margin: 0; font: 500 12px var(--mono); color: var(--muted); }}
dl {{ margin: 0; display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 6px 10px; font-size: 13.5px; }}
dt {{ font: 500 10.5px/1.9 var(--mono); text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }}
dd {{ margin: 0; }}
.ost {{ font-family: var(--display); font-size: 16px; color: var(--pen); }}
@media (max-width: 480px) {{ .shot {{ grid-template-columns: 1fr; }} figure {{ max-width: 220px; }} dl {{ grid-template-columns: 1fr; gap: 0 0; }} dd {{ margin-bottom: 6px; }} }}
</style>
<div class="wrap">
  <header class="top">
    <h1>5 Mindset Rules</h1>
    <p>Shot-by-shot storyboard for the coded sketch-and-watercolor short. Every frame below is rendered from the animation code at the shot's key moment.</p>
    <div class="meta"><span>Runtime <b>{DUR}s</b></span><span>Format <b>720×1280 · 9:16</b></span><span>Frame rate <b>30 fps</b></span><span>Shots <b>{n}</b></span><span>Sequences <b>{len(seqs)}</b></span></div>
    <nav class="timeline" aria-label="Sequences">{bar}</nav>
  </header>
  {body}
</div>'''
open(os.path.join(here, 'storyboard.html'), 'w').write(page)
print('shots', n, 'bytes', len(page))
