#!/usr/bin/env python3
"""Builds library/LIBRARY.pdf and guide/GUIDE.pdf with pictures rendered by the skill itself.
usage: python3 tools/build_docs.py [PLAN.json]
PLAN defaults to examples/plan_example.json. Record your own demo clip, point a copy of the example plan at it
and rebuild: every picture in both PDFs is then your real footage."""
import copy, json, os, shutil, subprocess, sys
import cv2

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HERE)
BUILD = os.path.join(HERE, 'tools', '_docs'); os.makedirs(BUILD, exist_ok=True)
base_path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'examples', 'plan_example.json'))
base = json.load(open(base_path, encoding='utf-8'))
bdir = os.path.dirname(base_path)
for k in ('clip', 'matte_video', 'words'):
    if k in base and not os.path.isabs(base[k]):
        base[k] = os.path.join(bdir, base[k])


def stills(name, plan, times):
    p = os.path.join(BUILD, name + '.json')
    plan = dict(plan, motion_blur=1)
    json.dump(plan, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
    subprocess.run([sys.executable, os.path.join(HERE, 'reel.py'), p, 'stills'] + [str(t) for t in times], check=True,
                   stdout=subprocess.DEVNULL)
    out = []
    for t in times:
        fi = int(round(t * plan.get('fps', 30)))
        out.append(os.path.join(BUILD, name + '_work', 'stills', f's_{fi / plan.get("fps", 30):06.2f}.png'))
    return out


def crop(src, name, box=None, w=540):
    im = cv2.imread(src)
    if box:
        x0, y0, x1, y1 = box; im = im[y0:y1, x0:x1]
    h = int(im.shape[0] * w / im.shape[1])
    dst = os.path.join(BUILD, name + '.jpg')
    cv2.imwrite(dst, cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
    return 'file://' + dst


segs = base['segments']
mid = lambda i, k=0.85: round(segs[i]['from'] + k * (segs[i]['to'] - segs[i]['from']), 2)
print('rendering pictures...')
noir = stills('noir', base, [mid(0), mid(1), mid(2), mid(3), mid(4)])
arctic = stills('arctic', dict(base, theme='arctic'), [mid(0), mid(2)])
ember = stills('ember', dict(base, theme='ember'), [mid(0), mid(2)])
brand = stills('brand', dict(base, accent='#7C9CFF'), [mid(0)])
ital = stills('italic', dict(base, accent_style='italic'), [mid(4)])
bplan = copy.deepcopy(base)
cnt = next(e for e in bplan['segments'][3]['elements'] if e['el'] == 'counter')
bplan['segments'][3]['elements'] = [e for e in bplan['segments'][3]['elements'] if e['el'] != 'counter'] + [
    dict(el='badge', t=cnt['t'], text='$50k', ring='  ✦  ONE CLIENT  ✦  ONE MONTH', x=540, y=720, rotate=0)]
badge = stills('badge', bplan, [mid(3)])

IMG = dict(
    cover=crop(noir[2], 'cover', w=620),
    n1=crop(noir[0], 'n1'), n2=crop(arctic[0], 'n2'), n3=crop(ember[0], 'n3'), n4=crop(brand[0], 'n4'),
    crd=crop(noir[0], 'crd', (0, 150, 1080, 1100)), cap=crop(noir[0], 'cap', (0, 1000, 1080, 1750)),
    hed=crop(noir[2], 'hed', (0, 200, 1080, 1000)), pil=crop(noir[2], 'pil', (0, 1100, 1080, 1800)),
    pnl=crop(noir[1], 'pnl', (0, 250, 1080, 1100)), cnt=crop(noir[3], 'cnt', (0, 380, 1080, 1450)),
    bdg=crop(badge[0], 'bdg', (0, 380, 1080, 1450)), ntf=crop(noir[4], 'ntf', (0, 100, 1080, 520)),
    it=crop(ital[0], 'it', (0, 1000, 1080, 1750)), orb=crop(noir[0], 'orb', (0, 350, 1080, 1100)),
    s1=crop(noir[0], 's1', w=300), s2=crop(noir[1], 's2', w=300), s3=crop(noir[2], 's3', w=300), s4=crop(noir[3], 's4', w=300), s5=crop(noir[4], 's5', w=300),
    a2=crop(arctic[1], 'a2', w=300), e2=crop(ember[1], 'e2', w=300),
)

FONTS = ''.join(f'<link rel="stylesheet" href="file://{HERE}/node_modules/{p}">' for p in (
    '@fontsource/instrument-serif/400-italic.css', '@fontsource-variable/fraunces/index.css', '@fontsource-variable/manrope/index.css'))
CSS = """
@page { size: 1600px 900px; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #0A0A0C; color: #F4EFE6; font-family: 'Manrope Variable', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 1600px; height: 900px; padding: 64px 80px; position: relative; overflow: hidden; page-break-after: always;
  background: radial-gradient(900px 600px at 85% 10%, rgba(230,194,122,.10), transparent 70%), #0A0A0C; }
h1 { font-family: 'Fraunces Variable', serif; font-weight: 600; font-size: 96px; letter-spacing: -0.035em; margin: 0 0 8px; line-height: 1; }
h1 em { font-style: normal; color: #E6C27A; }
h2 { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; font-size: 40px; color: #E6C27A; margin: 0 0 36px; }
.tag { position: absolute; top: 48px; right: 80px; font-weight: 700; letter-spacing: .2em; font-size: 15px; color: rgba(244,239,230,.45); }
p, li { font-size: 22px; line-height: 1.5; color: rgba(244,239,230,.82); }
.grid { display: grid; gap: 24px; }
.card { background: linear-gradient(160deg, rgba(255,255,255,.07), rgba(255,255,255,.02)); border: 1px solid rgba(255,255,255,.12);
  border-radius: 22px; padding: 18px; overflow: hidden; }
.card img { width: 100%; border-radius: 14px; display: block; object-fit: cover; max-height: var(--ih, 420px); }
.code { display: inline-block; font-weight: 800; font-size: 15px; letter-spacing: .12em; color: #0A0A0C; background: #E6C27A; border-radius: 8px; padding: 4px 10px; margin: 14px 0 6px; }
.name { font-weight: 700; font-size: 22px; margin: 2px 0; }
.say { font-size: 16px; color: rgba(244,239,230,.62); border-left: 2px solid #E6C27A; padding-left: 10px; margin-top: 8px; }
.steps { counter-reset: s; list-style: none; padding: 0; }
.steps li { counter-increment: s; margin: 0 0 22px 70px; position: relative; }
.steps li::before { content: counter(s); position: absolute; left: -70px; top: -4px; width: 46px; height: 46px; border-radius: 50%;
  background: #E6C27A; color: #0A0A0C; font-weight: 800; font-size: 22px; display: flex; align-items: center; justify-content: center; }
table { border-collapse: collapse; width: 100%; font-size: 19px; }
td, th { text-align: left; padding: 13px 14px; border-bottom: 1px solid rgba(255,255,255,.1); vertical-align: top; }
th { font-size: 14px; letter-spacing: .16em; color: rgba(244,239,230,.5); }
code { font-family: ui-monospace, Menlo, monospace; font-size: 17px; color: #FFF3D4; }
.form td:last-child { width: 62%; } .box { height: 40px; border: 1px dashed rgba(230,194,122,.5); border-radius: 10px; }
.foot { position: absolute; bottom: 40px; left: 80px; font-size: 15px; color: rgba(244,239,230,.4); }
"""


def page(tag, body):
    return f'<section class="page"><div class="tag">HALO REELS · {tag}</div>{body}</section>'


def el(code, name, img, say):
    return f'<div class="card"><img src="{img}"><div class="code">{code}</div><div class="name">{name}</div><div class="say">«{say}»</div></div>'


lib = [
    page('LIBRARY', f'''<div style="display:flex;gap:70px;align-items:center;height:100%">
      <div style="flex:1"><h1>The <em>Library</em></h1><h2>build your reel like a director</h2>
      <ol class="steps"><li><b>Pick a theme</b> (page 2): N1 Noir, N2 Arctic, N3 Ember or N4 your brand colour.</li>
      <li><b>Pick elements by code</b> for each scene (pages 3–4), or start from a ready recipe (page 5).</li>
      <li><b>Send the order form</b> (last page) with your clip. Claude shows you one still per scene, then renders.</li></ol>
      <p>Not sure? Send your clip and write <b>“you choose”</b>. Claude picks from this Library for what you say.</p></div>
      <img src="{IMG['cover']}" style="width:400px;border-radius:26px;border:1px solid rgba(255,255,255,.14)"></div>'''),
    page('THEMES', f'''<h1>Four <em>looks</em></h1><h2>one theme for the whole reel</h2>
      <div class="grid" style="grid-template-columns:repeat(4,1fr);--ih:430px">
      {el("N1", "Noir · black and champagne gold", IMG['n1'], "Theme N1")}
      {el("N2", "Arctic · night blue and ice", IMG['n2'], "Theme N2")}
      {el("N3", "Ember · warm coral", IMG['n3'], "Theme N3")}
      {el("N4", "Your brand colour", IMG['n4'], "Theme N4 in #7C9CFF")}</div>'''),
    page('SPEAKER SCENES', f'''<h1>Behind and in front <em>of you</em></h1><h2>speaker scenes</h2>
      <div class="grid" style="grid-template-columns:repeat(5,1fr);--ih:400px">
      {el("CRD", "Glass card · rows tick on your words", IMG['crd'], "Scene 1: CRD with my three points")}
      {el("HED", "Headline behind your head", IMG['hed'], "HED on “growth”")}
      {el("CAP", "Kinetic caption · one gold accent", IMG['cap'], "CAP, accent on “post”")}
      {el("+IT", "Italic serif accent", IMG['it'], "Use the italic accent (+IT)")}
      {el("PIL", "Glass pills, one per word", IMG['pil'], "PIL: content, funnels, sales")}'''),
    page('ABSTRACT SCENES', f'''<h1>Between <em>the cuts</em></h1><h2>abstract scenes · your voice keeps playing</h2>
      <div class="grid" style="grid-template-columns:repeat(4,1fr);--ih:400px">
      {el("PNL", "Glass panels from depth", IMG['pnl'], "Scene 2: PNL hook, offer, follow up")}
      {el("CNT", "Counter · counts up on your number", IMG['cnt'], "Scene 4: CNT to $50,000")}
      {el("BDG", "Gold seal with a text ring", IMG['bdg'], "BDG “$50k”")}
      {el("NTF", "Glass notification · once per reel", IMG['ntf'], "NTF: Instagram, New comment")}</div>
      <p style="margin-top:26px">Behind your head in every speaker scene: <b>ORB</b>, orbit lines of light (automatic; say “no ORB in scene 3” to remove it).</p>'''),
    page('RECIPES', f'''<h1>Ready <em>recipes</em></h1><h2>start from one, change only what you want</h2>
      <div style="display:flex;gap:18px;margin-bottom:30px">{''.join(f'<img src="{IMG[k]}" style="width:220px;border-radius:16px">' for k in ('s1', 's2', 's3', 's4', 's5'))}</div>
      <table><tr><th>CODE</th><th>SCENE 1</th><th>SCENE 2</th><th>SCENE 3</th><th>SCENE 4</th><th>SCENE 5</th></tr>
      <tr><td><b>R1 Authority</b> (above)</td><td>CRD + CAP</td><td>PNL + CAP</td><td>HED + CAP + PIL</td><td>CNT + CAP</td><td>NTF + CAP</td></tr>
      <tr><td><b>R2 Minimal</b></td><td>CAP</td><td>CAP</td><td>HED + CAP</td><td>BDG + CAP</td><td>CAP</td></tr>
      <tr><td><b>R3 Proof</b></td><td>HED + CAP</td><td>CNT + CAP</td><td>CRD + CAP</td><td>PNL + CAP</td><td>BDG + CAP</td></tr></table>
      <p style="margin-top:20px">Say: «Recipe R1 for my clip» · «R2, but scene 4 is CNT».</p>'''),
    page('NOT RIGHT? SAY THIS', '''<h1>One line <em>per fix</em></h1><h2>one change per message · Claude shows the same still again</h2>
      <table><tr><th>YOU SEE</th><th>SEND CLAUDE</th></tr>
      <tr><td>A word is wrong</td><td>«I say “…” there. Fix only that word.»</td></tr>
      <tr><td>Text too big / small</td><td>«Make the accent in scene 3 smaller. One still.»</td></tr>
      <tr><td>Text too high / low</td><td>«Move the caption in scene 1 lower, keep everything else.»</td></tr>
      <tr><td>Hair or shoulder cut</td><td>«Show me the cut-out of scene 3 at full size and fix the edge.»</td></tr>
      <tr><td>Room too dark</td><td>«Make my room a little brighter.»</td></tr>
      <tr><td>Too busy</td><td>«Only CAP in scene 3.»</td></tr>
      <tr><td>Too calm</td><td>«Add PIL under the caption in scene 1.»</td></tr>
      <tr><td>You love it</td><td>«This is approved. Keep it in every reel.»</td></tr></table>'''),
    page('ORDER FORM', '''<h1>Your <em>order</em></h1><h2>copy this into your message with your clip</h2>
      <table class="form"><tr><td>Theme (N1–N4, +IT)</td><td><div class="box"></div></td></tr>
      <tr><td>Recipe (R1–R3) or “you choose”</td><td><div class="box"></div></td></tr>
      <tr><td>Scene 1 · speaker (CRD, HED, CAP, PIL)</td><td><div class="box"></div></td></tr>
      <tr><td>Scene 2 · abstract (PNL, CNT, BDG, NTF, CAP)</td><td><div class="box"></div></td></tr>
      <tr><td>Scene 3 · speaker</td><td><div class="box"></div></td></tr>
      <tr><td>Scene 4 · abstract</td><td><div class="box"></div></td></tr>
      <tr><td>Scene 5 · speaker</td><td><div class="box"></div></td></tr></table>
      <p>Also tell Claude: which seconds of the clip (10–15 s), your exact script if you have it, your brand colour.</p>'''),
]

guide = [
    page('GUIDE', f'''<div style="display:flex;gap:70px;align-items:center;height:100%"><div style="flex:1">
      <h1>Halo <em>Reels</em></h1><h2>premium talking-head reels, edited by Claude</h2>
      <p>One raw vertical clip in, one finished reel out: your own room graded cinematic, frosted glass and a gold
      headline behind your head, captions that land on your words, glass scenes between the cuts, motion blur,
      light transitions and sound design. No editing program. No templates to drag.</p>
      <p>Read this guide once (5 minutes), then open the Library.</p></div>
      <img src="{IMG['cover']}" style="width:400px;border-radius:26px;border:1px solid rgba(255,255,255,.14)"></div>'''),
    page('SET UP · 10 MINUTES', '''<h1>Set <em>up</em></h1><h2>once per computer</h2>
      <ol class="steps"><li><b>Claude Code.</b> Install the Claude desktop app (claude.ai/download) and open the <b>Code</b> tab, or install Claude Code in the terminal. A paid Claude plan is needed.</li>
      <li><b>Put the skill in place.</b> Unzip and move the <code>halo-reels</code> folder to <code>~/.claude/skills/</code> (Mac/Linux) or <code>%USERPROFILE%\\.claude\\skills\\</code> (Windows).</li>
      <li><b>Install the tools.</b> In a new Claude Code session write: «Run the halo-reels setup check and install what is missing.» Claude installs Python packages, Node packages, fonts and ffmpeg after your OK.</li>
      <li><b>Choose the model.</b> Use the strongest model available with effort <b>High</b>: on lower settings the design rules get skipped.</li>
      <li><b>First reel.</b> New folder, put your clip in it, open Claude Code there: «Make a halo reel from clip.mp4.»</li></ol>'''),
    page('HOW TO FILM', '''<h1>How to <em>film</em></h1><h2>the edit is only as clean as the clip</h2>
      <table><tr><th>FORMAT</th><td>Vertical 9:16, 1080×1920 or 4K, 24–60 fps. Phone or camera on a tripod.</td></tr>
      <tr><th>FRAMING</th><td>Seated or standing, chest-up or waist-up. The top of your head about a third down the frame: the space above it is where the card and the headline live.</td></tr>
      <tr><th>BACKGROUND</th><td>Your real room, calm, 1–2 m behind you. No screens, no burned-in captions, nothing moving behind your head.</td></tr>
      <tr><th>CONTRAST</th><td>Dark clothes on a light wall, or light clothes in a dark room. Same tone on same tone gives a weak cut-out.</td></tr>
      <tr><th>LIGHT</th><td>Soft light from the front. No window behind you. Your hair edge must be visible.</td></tr>
      <tr><th>SPEECH</th><td>Short, clear sentences with small pauses. 10–15 seconds = 4–6 sentences. A lav or close mic.</td></tr></table>'''),
    page('DOES MY CLIP FIT', '''<h1>Does my clip <em>fit?</em></h1><h2>and what Claude does when it does not</h2>
      <table><tr><th>CLIP</th><th>FITS</th><th>WHAT HAPPENS</th></tr>
      <tr><td>Tripod, seated or standing, chest-up</td><td><b>Best</b></td><td>Every element works.</td></tr>
      <tr><td>Face fills the frame</td><td>Partly</td><td>No headline above the head; the card moves to the side.</td></tr>
      <tr><td>Horizontal 16:9</td><td>Partly</td><td>Cropped to vertical if you stay at least half the frame height.</td></tr>
      <tr><td>Walking / handheld</td><td>Speaker scenes: no</td><td>Those seconds become abstract scenes with your words.</td></tr>
      <tr><td>Two people</td><td>Partly</td><td>One speaker per scene.</td></tr>
      <tr><td>Light clothes on a light wall, backlight</td><td>Weak</td><td>Re-shoot, or export a cut-out from CapCut and give it to Claude.</td></tr></table>'''),
    page('WORKING WITH CLAUDE', f'''<h1>You direct, <em>Claude edits</em></h1><h2>five habits for perfect reels</h2>
      <div style="display:flex;gap:50px"><ol class="steps" style="flex:1">
      <li><b>Stills first.</b> Claude shows one still per scene before the long render. Fix it there.</li>
      <li><b>One change per message,</b> and name the place: «scene 3», «at 4.2 s».</li>
      <li><b>Say what to keep:</b> «keep everything else exactly as it is».</li>
      <li><b>Show it:</b> drag a screenshot in and point at the spot.</li>
      <li><b>Approve what you love:</b> «this is approved, keep it in every reel».</li></ol>
      <div style="display:flex;gap:16px;align-items:flex-start">{''.join(f'<img src="{IMG[k]}" style="width:190px;border-radius:14px">' for k in ('s3', 'a2', 'e2'))}</div></div>'''),
    page('QUESTIONS', '''<h1>Questions <em>buyers ask</em></h1><h2>before your first reel</h2>
      <table><tr><th>EDITING PROGRAM?</th><td>None. You get a finished MP4 with your voice and the sound design. Open it in CapCut, Premiere or DaVinci if you want music or a longer edit.</td></tr>
      <tr><th>HOW LONG?</th><td>Stills in about a minute. The final 10–15 s reel in about 6–12 minutes on a normal laptop.</td></tr>
      <tr><th>LANGUAGES?</th><td>English and the Latin-script languages (Spanish, German, French, Portuguese, Italian, Dutch…). The word timings work in most languages.</td></tr>
      <tr><th>SOUND?</th><td>Built in: rise, whooshes on the cuts, shimmer on accents, glass taps, a deep hit on badges. All synthesised, no licences. Mixed to −14 LUFS for Instagram.</td></tr>
      <tr><th>MY BRAND COLOUR?</th><td>Theme N4: give Claude your hex code. Glow, light and accents follow it.</td></tr>
      <tr><th>HELP?</th><td>Reply to your purchase receipt with your computer type, the setup check output and a screenshot.</td></tr></table>'''),
]


def build(pages, out_pdf, title):
    html = os.path.join(BUILD, os.path.basename(out_pdf).replace('.pdf', '.html'))
    open(html, 'w', encoding='utf-8').write(f'<!doctype html><html><head><meta charset="utf-8"><title>{title}</title>{FONTS}<style>{CSS}</style></head><body>{"".join(pages)}</body></html>')
    js = f"""const {{ chromium }} = require('playwright');
(async () => {{ const b = await chromium.launch({{ args: ['--allow-file-access-from-files'] }}); const p = await b.newPage();
  await p.goto('file://{html}'); await p.evaluate(() => document.fonts.ready);
  await p.pdf({{ path: '{out_pdf}', width: '1600px', height: '900px', printBackground: true }}); await b.close(); }})();"""
    jp = os.path.join(BUILD, 'pdf.cjs'); open(jp, 'w').write(js)
    subprocess.run(['node', jp], check=True, cwd=HERE)
    print('->', out_pdf)


build(lib, os.path.join(HERE, 'library', 'LIBRARY.pdf'), 'Halo Reels Library')
build(guide, os.path.join(HERE, 'guide', 'GUIDE.pdf'), 'Halo Reels Guide')
