#!/usr/bin/env node
/*
 * Storyboard: one frame per scene with its timing, on-screen script and visual.
 *
 *   node scripts/storyboard.js reels/<name>.json
 *
 * Writes out/<name>/storyboard.html (self-contained, images inlined, printable) and storyboard.md.
 */
const fs = require('fs');
const path = require('path');
const { parseArgs, timelineFor, openEngine, fmt } = require('./lib');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const emph = (s) => esc(s).replace(/\*(.+?)\*/g, '<mark>$1</mark>');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { reel, outDir, tl } = timelineFor(args._[0], { noVoice: args['no-voice'] });
  const { browser, page } = await openEngine({ scale: 1, glScale: 1 });
  const shots = [];
  try {
    await page.evaluate((t) => window.Reel.init(t), tl);
    for (const s of tl.scenes) {
      const t = s.lines.length ? s.start + s.lines[s.lines.length - 1].end - 0.02 : s.start + s.duration * 0.8;
      await page.evaluate((x) => window.Reel.seek(x), t);
      shots.push((await page.screenshot({ type: 'jpeg', quality: 80 })).toString('base64'));
    }
  } finally {
    await browser.close();
  }

  const describe = (v) => {
    const d = {
      board: (x) => `Corkboard + stamp “${x.stamp ? x.stamp.top + ' ' + x.stamp.big : ''}”`,
      versus: (x) => `${x.bad} ✕ vs ${x.good} ✓`,
      stat: (x) => `Big number ${x.value.replace(/\*/g, '')}`,
      chat: (x) => `Chat with ${x.name}: ${x.messages.length} messages`,
      window: (x) => `App window “${x.title}”${x.rows ? ': ' + x.rows.map((r) => r.text.replace(/\*/g, '')).join(', ') : ''}`,
      steps: (x) => `Grid “${(x.title || '').replace(/\*/g, '')}”: ${x.items.map((i) => i.title).join(' · ')}`,
      bars: (x) => `Bars ${x.before} → ${x.after}: ${x.items.map((i) => i.label).join(', ')}`,
      cta: (x) => `CTA: ${x.pre} ${x.word}`,
      phone: (x) => `Phone building “${x.title.replace(/\*/g, '')}”`,
    }[v.type];
    return d ? d(v) : v.type;
  };

  const rows = tl.scenes.map((s, i) => {
    const src = reel.scenes[i];
    return {
      n: i + 1,
      time: `${fmt(s.start)}–${fmt(s.end)}`,
      kicker: src.kicker || '',
      label: src.label || '',
      say: src.say || [],
      visual: [s.world && `3D ${s.world.env}${s.world.props && s.world.props.hero ? ' (' + s.world.props.hero + ')' : ''} · ${s.world.palette} · ${s.world.light || 'studio'} light · camera ${(s.world.camera || {}).move || 'auto'} · text ${s.textStyle}`, ...s.visuals.map(describe)].filter(Boolean).join(' + '),
      concept: s.concept || '',
      transition: { halftone: 'Halftone wipe + whoosh', dip: 'Dip to black + whoosh', flash: 'White flash + whoosh', leak: 'Warm light-leak + whoosh' }[s.transition] || (i ? 'Cut + pop' : 'Open'),
      img: shots[i],
    };
  });

  const html = `<!doctype html><html lang="${tl.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(tl.title)} · Storyboard</title>
<link href="https://fonts.googleapis.com/css2?family=Hind+Vadodara:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--ink:#141414;--red:#e1251b;--paper:#f1eee8;--line:#ddd8cf;--dim:#6b665e}
@media (prefers-color-scheme:dark){:root{--ink:#eee;--paper:#161514;--line:#333;--dim:#9a958c}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 'Space Grotesk','Hind Vadodara',sans-serif;padding:24px 16px}
main{max-width:1100px;margin:0 auto}h1{font-size:28px;margin:0 0 4px}p.sub{color:var(--dim);margin:0 0 24px}
.scene{display:grid;grid-template-columns:180px 1fr;gap:20px;padding:18px 0;border-top:1px solid var(--line);break-inside:avoid}
.scene img{width:180px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.18)}
.n{font:700 13px 'Space Grotesk';color:var(--red)}.t{color:var(--dim);font-size:13px;margin-left:8px}
.say{font-size:18px;font-weight:600;margin:8px 0;padding-left:12px;border-left:3px solid var(--red)}.say div{margin:2px 0}
mark{background:none;color:var(--red)}dl{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:8px 0 0;font-size:13px}dt{color:var(--dim)}dd{margin:0}
@media (max-width:560px){.scene{grid-template-columns:110px 1fr;gap:12px}.scene img{width:110px}.say{font-size:15px}}
</style></head><body><main>
<h1>${esc(tl.title)}</h1>${tl.direction ? `<p class="sub"><b>Creative direction:</b> ${esc(tl.direction.theme)}${tl.direction.secondary ? ' + ' + esc(tl.direction.secondary) : ''} · ${esc(tl.direction.mood)} · palette ${esc(tl.direction.palette)} · ${tl.direction.music ? tl.direction.music.bpm + ' bpm' : ''}</p>` : ''}<p class="sub">Storyboard · ${tl.scenes.length} scenes · ${fmt(tl.duration)} · 1080×1920 · ${tl.audio.length ? 'voiceover' : 'no voice: captions + music + sfx'}</p>
${rows.map((r) => `<section class="scene"><img src="data:image/jpeg;base64,${r.img}" alt="Scene ${r.n}"><div>
<span class="n">SCENE ${r.n}</span><span class="t">${r.time} · ${esc(r.kicker)}</span>
<div class="say">${r.say.map((l) => `<div>${emph(l)}</div>`).join('')}</div>
<dl>${r.concept ? `<dt>Concept</dt><dd>${esc(r.concept)}</dd>` : ''}${r.label ? `<dt>Label</dt><dd>${emph(r.label)}</dd>` : ''}<dt>Visual</dt><dd>${esc(r.visual)}</dd><dt>Transition</dt><dd>${esc(r.transition)}</dd></dl>
</div></section>`).join('\n')}
</main></body></html>`;
  fs.writeFileSync(path.join(outDir, 'storyboard.html'), html);

  const md = [`# ${tl.title}: storyboard`, '', `${tl.scenes.length} scenes · ${fmt(tl.duration)} · 1080×1920`, '',
    ...(tl.direction ? [`**Direction:** ${tl.direction.theme} · ${tl.direction.mood} · palette ${tl.direction.palette}`, ''] : []),
    '| # | Time | On-screen script | Concept | Visual | Transition |', '|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.n} | ${r.time} | ${r.say.join('<br>')}${r.label ? `<br>**${r.label}**` : ''} | ${r.concept} | ${r.visual} | ${r.transition} |`)].join('\n');
  fs.writeFileSync(path.join(outDir, 'storyboard.md'), md + '\n');
  console.log(`Storyboard: ${path.relative(process.cwd(), path.join(outDir, 'storyboard.html'))} + storyboard.md`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
