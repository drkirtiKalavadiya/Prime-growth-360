#!/usr/bin/env node
/*
 * Creative director: plain script → creative direction → scene-by-scene 3D reel spec.
 *
 *   node scripts/direct.js scripts/my-script.txt [--name slug] [--title "..."] [--seed 7] [--out reels/slug.json]
 *   node scripts/direct.js --text "સફળતા માટે શિસ્ત જરૂરી છે. ..."
 *
 * 1. Analyse   split into sentences, detect language, score themes (business, wealth, health, …)
 * 2. Direct    choose palette, lighting family, typography rhythm, music tempo for the whole reel
 * 3. Map       turn every sentence into a visual concept → 3D environment, hero object, camera move
 * 4. Vary      no two neighbouring shots share environment+camera; text position and transitions
 *              alternate; a seed from the script text makes every script look different
 *
 * The result is a draft. In Claude Code, the director (Claude) reviews every `concept` and refines
 * the spec like a creative director would. See SKILL.md.
 */
const fs = require('fs');
const path = require('path');
const { parseArgs, ROOT } = require('./lib');

// ---------- lexicon ----------
const THEMES = {
  business: ['business', 'બિઝનેસ', 'ધંધ', 'વ્યવસાય', 'company', 'કંપની', 'office', 'ઓફિસ', 'client', 'ક્લાયન્ટ', 'customer', 'ગ્રાહક', 'market', 'માર્કેટ', 'brand', 'બ્રાન્ડ', 'sales', 'વેચાણ', 'startup', 'સ્ટાર્ટઅપ', 'leader', 'team', 'ટીમ'],
  wealth: ['પૈસ', 'money', 'ધન', 'સંપત્તિ', 'wealth', 'rich', 'અમીર', 'રોકાણ', 'invest', 'બચત', 'saving', 'income', 'આવક', 'ખર્ચ', 'expense', 'loan', 'લોન', 'profit', 'નફો', 'રૂપિયા', 'કરોડ', 'લાખ', 'finance', 'ફાઇનાન્સ', 'ધનવાન'],
  health: ['health', 'આરોગ્ય', 'સ્વાસ્થ્ય', 'શરીર', 'body', 'ઊંઘ', 'sleep', 'ખોરાક', 'food', 'diet', 'ડાયટ', 'exercise', 'કસરત', 'yoga', 'યોગ', 'heart', 'હૃદય', 'stress', 'તણાવ', 'doctor', 'ડૉક્ટર', 'immun', 'વિટામિન'],
  spiritual: ['ભગવાન', 'god', 'ધ્યાન', 'meditat', 'આત્મા', 'soul', 'પ્રાર્થના', 'prayer', 'મંદિર', 'temple', 'ભક્તિ', 'કર્મ', 'karma', 'શાંતિ', 'peace', 'બ્રહ્માંડ', 'universe', 'આધ્યાત્મ', 'spiritual', 'ગીતા', 'શ્રદ્ધા', 'faith', 'ઈશ્વર'],
  motivation: ['સફળ', 'success', 'સપન', 'dream', 'મહેનત', 'hard work', 'શિસ્ત', 'discipline', 'હિંમત', 'courage', 'લક્ષ્ય', 'goal', 'જીત', 'win', 'નિષ્ફળ', 'fail', 'પ્રયત્ન', 'effort', 'આત્મવિશ્વાસ', 'confidence', 'સંઘર્ષ', 'struggle', 'motivat', 'ધીરજ', 'patience', 'આદત', 'habit'],
  technology: ['ai', 'technology', 'ટેકનોલોજી', 'software', 'સોફ્ટવેર', 'app', 'એપ', 'api', 'automation', 'ઓટોમેશન', 'data', 'ડેટા', 'digital', 'ડિજિટલ', 'internet', 'ઇન્ટરનેટ', 'robot', 'રોબોટ', 'computer', 'કમ્પ્યુટર', 'code', 'online', 'ઓનલાઇન', 'chatbot', 'bot'],
  communication: ['whatsapp', 'message', 'મેસેજ', 'chat', 'ચેટ', 'call', 'કૉલ', 'sms', 'email', 'ઈમેલ', 'reply', 'જવાબ', 'વાત', 'conversation', 'social', 'instagram', 'connect', 'સંપર્ક', 'સંબંધ', 'relationship'],
  trust: ['ભરોસ', 'trust', 'સુરક્ષ', 'security', 'safe', 'સલામત', 'permission', 'privacy', 'verified', 'સત્ય', 'honest', 'વિશ્વાસ', 'લૉક', 'lock'],
};

const STYLE = {
  business: { palettes: ['midnight', 'ivory', 'ocean'], lights: ['night', 'studio', 'dramatic'], pool: ['city', 'stage', 'network', 'grid'], mood: 'premium, confident, modern', bpm: 104, key: 1 },
  wealth: { palettes: ['gold', 'crimson', 'midnight'], lights: ['golden', 'dramatic', 'studio'], pool: ['vault', 'flow', 'stage', 'city'], mood: 'luxurious, aspirational, cinematic', bpm: 92, key: 0.89 },
  health: { palettes: ['clinical', 'emerald', 'ocean'], lights: ['soft', 'studio'], pool: ['molecule', 'mountains', 'cosmos'], mood: 'calm, clean, trustworthy', bpm: 84, key: 1.12 },
  spiritual: { palettes: ['cosmic', 'dawn'], lights: ['cosmic', 'golden'], pool: ['cosmos', 'mountains', 'staircase'], mood: 'serene, vast, transcendent', bpm: 70, key: 0.84 },
  motivation: { palettes: ['dawn', 'crimson', 'gold'], lights: ['golden', 'dramatic'], pool: ['staircase', 'mountains', 'stage', 'cosmos'], mood: 'powerful, rising, determined', bpm: 100, key: 0.94 },
  technology: { palettes: ['neon', 'midnight', 'ocean'], lights: ['neon', 'night'], pool: ['grid', 'network', 'city', 'stage'], mood: 'futuristic, precise, electric', bpm: 112, key: 1.06 },
  communication: { palettes: ['emerald', 'midnight', 'neon'], lights: ['neon', 'studio'], pool: ['network', 'grid', 'stage', 'city'], mood: 'warm, connected, responsive', bpm: 102, key: 1 },
  trust: { palettes: ['midnight', 'emerald', 'ocean'], lights: ['studio', 'dramatic'], pool: ['stage', 'vault', 'network'], mood: 'secure, credible, steady', bpm: 90, key: 0.94 },
};

/* Sentence meaning → visual concept. First match wins; order = specificity. */
const RULES = [
  { re: /શિસ્ત|પગથિય|સીડી|ધીમે ધીમે|દરરોજ|રોજ|આદત|discipline|habit|step by step|consisten|daily/i, env: 'staircase', tag: 'the climb',
    en: 'A cinematic staircase rising to a glowing portal; a figure climbs it one step at a time.', gu: 'પ્રકાશ તરફ જતી સીડી, જેના પર એક વ્યક્તિ એક-એક પગથિયું ચડે છે.' },
  { re: /(સંભાળ|બચ|મેનેજ|manage|save|budget|બજેટ|ખર્ચ|expense)/i, env: 'flow', tag: 'the flow',
    en: 'Money flows through glowing channels from many sources into one secure vault.', gu: 'અલગ-અલગ સ્ત્રોતમાંથી પૈસા ચમકતી નળીઓ દ્વારા એક સુરક્ષિત તિજોરીમાં વહે છે.' },
  { re: /વધ|ગ્રોથ|growth|increase|પરિણામ|result|ડબલ|double|વેચાણ|sales|scale|ગણું/i, env: 'stage', hero: 'chart', tag: 'the proof',
    en: 'A 3D bar chart rises on a spotlit podium, a growth line arcing upward.', gu: 'Spotlight નીચે 3D chart ઉપર તરફ વધે છે.' },
  { re: /કમા|earn|income|આવક|સંપત્તિ|wealth|અમીર|rich|ધનવાન|કરોડ|લાખ|profit|નફો|પૈસ|money/i, env: 'vault', tag: 'the vault',
    en: 'Gold coins spiral into a monumental vault door flanked by bullion.', gu: 'સોનાના સિક્કા ફરતા-ફરતા એક વિશાળ તિજોરીમાં જાય છે.' },
  { re: /લૉક|lock|privacy|પાસવર્ડ|password/i, env: 'stage', hero: 'lock', tag: 'the lock',
    en: 'A heavy padlock clicks shut under a single dramatic spotlight.', gu: 'એક મજબૂત તાળું spotlight નીચે બંધ થાય છે.' },
  { re: /ભરોસ|વિશ્વાસ|trust|સુરક્ષ|secure|safe|સલામત|permission|verified|ખાતરી/i, env: 'stage', hero: 'shield', tag: 'the shield',
    en: 'A glowing shield with a check mark turns slowly on a podium: protection and credibility.', gu: 'Check mark વાળી ચમકતી ઢાલ: સુરક્ષા અને ભરોસો.' },
  { re: /આઈડિયા|વિચાર|idea|innovation|creative|ક્રિએટિવ|નવું|new/i, env: 'stage', hero: 'bulb', tag: 'the idea',
    en: 'A light bulb ignites on a podium, its filament pulsing with an idea.', gu: 'Podium પર એક bulb ઝળહળી ઊઠે છે: નવો વિચાર.' },
  { re: /ઓફર|offer|ભેટ|gift|free|ફ્રી|discount|ડિસ્કાઉન્ટ|બોનસ|bonus/i, env: 'stage', hero: 'gift', tag: 'the offer',
    en: 'A gift box on a spotlit podium, its lid lifting with sparkles.', gu: 'Spotlight નીચે gift box ખૂલે છે, સાથે ચમકારા.' },
  { re: /ચાવી|key|રહસ્ય|secret|ઉકેલ|solution|રસ્તો/i, env: 'stage', hero: 'key', tag: 'the key',
    en: 'A golden key floats and turns above a podium: the answer revealed.', gu: 'સોનેરી ચાવી podium પર ફરે છે: જવાબ મળી ગયો.' },
  { re: /શરૂ|launch|start|ઝડપ|fast|speed|ઉડાન|rocket|રોકેટ/i, env: 'stage', hero: 'rocket', tag: 'the launch',
    en: 'A rocket hovers on its podium, engines firing, ready to launch.', gu: 'Podium પર rocket ઉડવા માટે તૈયાર, engine ચાલુ.' },
  { re: /જીત|win|award|ઇનામ|champion|ચેમ્પિયન/i, env: 'stage', hero: 'trophy', tag: 'the win',
    en: 'A golden trophy turns under spotlights as sparks rise.', gu: 'Spotlight નીચે સોનેરી trophy ફરે છે, ચમકારા ઊડે છે.' },
  { re: /સફળ|success|લક્ષ્ય|goal|શિખર|ટોચ|summit|peak|મંઝિલ|destination/i, env: 'mountains', tag: 'the summit',
    en: 'A golden-hour mountain range; the camera rises toward a flag on the summit.', gu: 'સોનેરી પ્રકાશમાં પર્વતમાળા; camera શિખર પરના ધ્વજ તરફ ઊંચે જાય છે.' },
  { re: /ભગવાન|god|ધ્યાન|meditat|શાંતિ|peace|આત્મા|soul|કર્મ|karma|પ્રાર્થના|prayer|મંદિર|temple|ઈશ્વર|શ્રદ્ધા/i, env: 'cosmos', props: { temple: true }, tag: 'the light',
    en: 'A luminous temple floats in a cosmic sky of nebulae and stars.', gu: 'તારાઓ અને nebula વચ્ચે તરતું પ્રકાશિત મંદિર.' },
  { re: /સપન|dream|ભવિષ્ય|future|vision|બ્રહ્માંડ|universe|કલ્પના|imagine/i, env: 'cosmos', props: { temple: false }, tag: 'the vision',
    en: 'A vast universe: a ringed planet glows as the camera drifts through stars.', gu: 'વિશાળ બ્રહ્માંડ: તારાઓ વચ્ચે ચમકતો ગ્રહ.' },
  { re: /મેસેજ|message|chat|ચેટ|whatsapp|વાત|customer|ગ્રાહક|connect|સંપર્ક|reply|જવાબ|સંબંધ/i, env: 'network', tag: 'the connection',
    en: 'A glowing globe of people-nodes, message pulses arcing between them, phones floating nearby.', gu: 'લોકોને જોડતો ચમકતો ગ્લોબ, મેસેજ એકથી બીજા સુધી દોડે છે.' },
  { re: /\bai\b|automation|ઓટોમેશન|ડેટા|data|digital|ડિજિટલ|tech|ટેકનોલોજી|software|સોફ્ટવેર|\bapi\b|\bbot\b|\bapp\b|એપ|robot|રોબોટ/i, env: 'grid', tag: 'the system',
    en: 'A neon grid, a rotating AI core and floating holographic panels of data.', gu: 'Neon grid, ફરતું AI core અને હવામાં તરતી hologram screens.' },
  { re: /આરોગ્ય|સ્વાસ્થ્ય|health|શરીર|body|ઊંઘ|sleep|ખોરાક|food|diet|કસરત|exercise|immun|cell|કોષ|હૃદય|heart/i, env: 'molecule', tag: 'the body',
    en: 'A DNA helix turns among molecules and drifting cells in soft clinical light.', gu: 'નરમ પ્રકાશમાં ફરતું DNA, અણુઓ અને કોષો.' },
  { re: /બિઝનેસ|business|ધંધ|વ્યવસાય|company|કંપની|office|ઓફિસ|market|માર્કેટ|brand|બ્રાન્ડ|શહેર|city|corporate/i, env: 'city', tag: 'the business',
    en: 'A premium city avenue at night, towers lit window by window, leading to a glass headquarters.', gu: 'રાત્રે ઝળહળતું premium શહેર, કાચના મુખ્ય ટાવર તરફ જતો રસ્તો.' },
];
const ENV_MOVES = {
  city: ['crane-up', 'dolly-in', 'fly-over', 'push-tilt'], vault: ['dolly-in', 'orbit-left', 'push-tilt', 'crane-down'],
  flow: ['orbit-right', 'crane-up', 'dolly-out', 'pan-left'], staircase: ['crane-up', 'push-tilt', 'orbit-left', 'dolly-in'],
  mountains: ['fly-over', 'crane-up', 'dolly-in', 'orbit-right'], cosmos: ['orbit-left', 'dolly-in', 'crane-up', 'spiral'],
  grid: ['orbit-right', 'dolly-in', 'pan-left', 'spiral'], molecule: ['orbit-left', 'dolly-in', 'crane-down', 'pan-right'],
  network: ['orbit-right', 'dolly-in', 'spiral', 'crane-up'], stage: ['orbit-left', 'push-tilt', 'dolly-in', 'crane-down', 'orbit-right'],
};
const ENV_FX = { city: ['dust'], vault: ['sparks', 'bokeh'], flow: ['dust', 'bokeh'], staircase: ['dust'], mountains: ['dust'], cosmos: ['bokeh'], grid: ['dust', 'bokeh'], molecule: ['bokeh'], network: ['dust', 'bokeh'], stage: ['sparks', 'bokeh'] };
const ENV_LIGHT = { cosmos: 'cosmic', grid: 'neon', molecule: 'soft', mountains: 'golden', city: 'night' };
const CTA = /comment|કમેન્ટ|follow|ફોલો|share|શેર|\bdm\b|link|લિંક|save|સેવ|subscribe|સબ્સ્ક્રાઇબ|contact|સંપર્ક કરો/i;

function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

function sentences(text) {
  return text.replace(/\r/g, '').split(/(?<=[.!?।])\s+|\n+/).map((s) => s.trim()).filter((s) => s.replace(/[\s.!?।]/g, '').length);
}
/* Long sentences become several caption lines (≤ 7 words), splitting at commas first. */
function toLines(sentence, max = 7) {
  const parts = sentence.split(/(?<=,)\s+/);
  const out = [];
  for (const p of parts) {
    const w = p.split(/\s+/).filter(Boolean);
    if (out.length && out[out.length - 1].split(/\s+/).length + w.length <= max - 2) { out[out.length - 1] += ' ' + p; continue; }
    const n = Math.ceil(w.length / max);
    const per = Math.ceil(w.length / n);
    for (let i = 0; i < w.length; i += per) out.push(w.slice(i, i + per).join(' '));
  }
  return out;
}
const allKeywords = Object.values(THEMES).flat().filter((k) => k.length >= 2);
function emphasise(line, extra) {
  const words = line.split(/\s+/);
  let n = 0;
  return words.map((w) => {
    const bare = w.replace(/[^\p{L}\p{M}\p{N}]/gu, '').toLowerCase();
    if (n >= 2 || bare.length < 2 || /^\*/.test(w)) return w;
    const hit = allKeywords.some((k) => bare.includes(k.toLowerCase()) && (k.length >= 3 || bare === k)) || (extra && extra.test(bare));
    if (!hit) return w;
    n++;
    const m = w.match(/^(.*?)([.,!?।:;]*)$/);
    return `*${m[1]}*${m[2]}`;
  }).join(' ');
}

function direct(text, { seed = 0, name, title } = {}) {
  const lang = /[઀-૿]/.test(text) ? 'gu' : 'en';
  const sents = sentences(text);
  if (!sents.length) throw new Error('Script is empty');
  // 1) theme analysis
  const scores = Object.fromEntries(Object.keys(THEMES).map((k) => [k, 0]));
  const low = text.toLowerCase();
  for (const [k, kws] of Object.entries(THEMES)) for (const kw of kws) { const m = low.split(kw.toLowerCase()).length - 1; scores[k] += m; }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const theme = ranked[0][1] > 0 ? ranked[0][0] : 'motivation';
  const second = ranked[1][1] > 0 ? ranked[1][0] : null;
  const st = STYLE[theme];
  const r = mulberry(hashStr(text) + Number(seed) * 7919);
  // 2) reel-wide direction
  const palette = pick(st.palettes, r);
  const direction = {
    theme, secondary: second, mood: st.mood, palette, seed: Number(seed),
    lighting: st.lights.join(' / '),
    typography: lang === 'gu' ? 'Hind Vadodara captions, Baloo Bhai 2 impact lines, accent-coloured key words' : 'Space Grotesk captions, Anton impact lines, accent-coloured key words',
    music: { bpm: st.bpm + Math.round((r() - 0.5) * 8), key: st.key },
    scores,
  };
  // 3+4) scene mapping with variation
  const scenes = [];
  const used = new Map();
  let prev = { env: null, move: null, light: null, text: null, text2: null };
  sents.forEach((s, i) => {
    const isLast = i === sents.length - 1;
    // all concepts this sentence could mean; prefer the one that fits the reel's theme
    const matches = RULES.filter((x) => x.re.test(s));
    let rule = matches.find((x) => st.pool.includes(x.env) && x.env !== prev.env) || matches.find((x) => st.pool.includes(x.env)) || matches[0];
    // never the same world three shots running: switch to a related world from the theme
    if (rule && rule.env === prev.env && prev.env === prev.env2) rule = matches.find((x) => x.env !== prev.env) || null;
    if (isLast && CTA.test(s)) {
      const end = { wealth: ['stage', 'key'], motivation: ['stage', 'trophy'], technology: ['stage', 'rocket'], business: ['stage', 'trophy'], health: ['stage', 'shield'], trust: ['stage', 'shield'], communication: ['network', null], spiritual: ['cosmos', null] }[theme] || ['stage', 'gift'];
      rule = { env: end[0], hero: end[1], props: end[0] === 'cosmos' ? { temple: true } : undefined, tag: 'the takeaway', en: 'Closing shot: the reel\'s symbol returns as the call to action lands.', gu: 'અંતિમ દ્રશ્ય: call to action સાથે reel નું પ્રતીક ફરી દેખાય છે.' };
    }
    let env = rule ? rule.env : null;
    const fromRule = !!rule;
    if (!env || (env === prev.env && !fromRule)) env = st.pool.find((e) => e !== prev.env && !(used.get(e) > 1)) || pick(st.pool.filter((e) => e !== prev.env), r);
    if (!rule) rule = RULES.find((x) => x.env === env && !x.hero) || { tag: 'the story', en: `Atmospheric ${env} environment supporting the line.`, gu: '' };
    used.set(env, (used.get(env) || 0) + 1);
    const moves = (ENV_MOVES[env] || ENV_MOVES.stage).filter((m) => m !== prev.move);
    const move = moves[(used.get(env) - 1 + Math.floor(r() * 2)) % moves.length];
    const lines = toLines(s).map((l) => emphasise(l, rule && rule.re ? new RegExp(rule.re.source, 'iu') : null));
    const words = s.split(/\s+/).length;
    let textStyle = (i === 0 || isLast) && words <= 7 ? 'impact' : words <= 5 ? 'impact' : r() < 0.5 ? 'top' : 'lower';
    if (textStyle !== 'impact' && textStyle === prev.text && textStyle === prev.text2) textStyle = textStyle === 'top' ? 'lower' : 'top';
    if (lines.length > 3) textStyle = 'top';
    const changed = env !== prev.env;
    const warm = /gold|dawn|crimson/.test(palette);
    const transition = i === 0 ? 'cut' : !changed ? 'cut' : warm && r() < 0.35 ? 'leak' : /motivation|technology/.test(theme) && r() < 0.35 ? 'flash' : 'dip';
    const props = { ...(rule.props || {}) };
    if (rule.hero) props.hero = rule.hero;
    if (env === 'flow') props.sources = lang === 'gu' ? ['આવક', 'બચત', 'રોકાણ', 'બિઝનેસ'] : ['Income', 'Savings', 'Invest', 'Business'];
    if (env === 'grid') props.words = lang === 'gu' ? ['AI', 'ડેટા', 'ઓટોમેશન', 'API', '24×7', 'ગ્રોથ'] : ['AI', 'DATA', 'AUTO', 'API', '24×7', 'GROWTH'];
    if (env === 'network') props.messages = lang === 'gu' ? ['નમસ્તે 🙏', 'Order ✅', 'Offer 🎁'] : ['Hi 👋', 'Order ✅', 'Offer 🎁'];
    let light = ENV_LIGHT[env] && r() < 0.6 ? ENV_LIGHT[env] : pick(st.lights, r);
    if (light === prev.light) light = st.lights.find((l) => l !== prev.light) || 'studio'; // never the same light twice in a row
    const scenePalette = env === 'cosmos' && !/cosmic|neon|midnight/.test(palette) ? 'cosmic' : env === 'mountains' && palette === 'neon' ? 'dawn' : palette;
    scenes.push({
      kicker: `// ${String(i + 1).padStart(2, '0')} · ${i === 0 ? 'the hook' : isLast ? 'the takeaway' : rule.tag}`,
      say: lines,
      text: textStyle,
      transition,
      concept: lang === 'gu' && rule.gu ? `${rule.en} / ${rule.gu}` : rule.en,
      minDuration: 3.4, // give every camera move room to breathe
      // a world seen again is shot from a new angle so it never reads as a repeat
      world: { env, palette: scenePalette, light, camera: used.get(env) > 1 ? { move, az: (r() < 0.5 ? -1 : 1) * (0.55 + r() * 0.35), el: 0.06 + r() * 0.2 } : { move }, props, fx: ENV_FX[env] || ['dust'] },
      ...(isLast ? { hold: 1.4 } : {}),
    });
    prev = { env, env2: prev.env, move, light, text: textStyle, text2: prev.text };
  });
  const slug = name || (title || sents[0]).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'reel';
  return { name: slug, title: title || sents[0].replace(/[.!?।]+$/, ''), lang, direction, music: direction.music, scenes };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const text = args.text || (args._[0] && fs.readFileSync(args._[0], 'utf8'));
  if (!text) { console.error('Usage: node scripts/direct.js <script.txt> [--name slug] [--title ...] [--seed n]'); process.exit(1); }
  const reel = direct(text, { seed: args.seed || 0, name: args.name, title: args.title });
  const out = path.resolve(args.out || path.join(ROOT, 'reels', `${reel.name}.json`));
  fs.writeFileSync(out, JSON.stringify(reel, null, 2) + '\n');
  const d = reel.direction;
  console.log(`\nCreative direction: "${reel.title}"`);
  console.log(`  theme     ${d.theme}${d.secondary ? ' + ' + d.secondary : ''} · mood: ${d.mood}`);
  console.log(`  palette   ${d.palette} · lighting ${d.lighting} · music ${d.music.bpm} bpm`);
  console.log(`  scenes    ${reel.scenes.length}\n`);
  reel.scenes.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}. ${s.world.env.padEnd(9)} ${(s.world.props.hero || '').padEnd(7)} ${s.world.camera.move.padEnd(11)} ${s.text.padEnd(6)} ${s.transition.padEnd(5)} │ ${s.say.join(' / ').replace(/\*/g, '')}`));
  console.log(`\nSpec → ${path.relative(process.cwd(), out)}\nNext: review the concepts, then npm run check / storyboard / render.`);
}

module.exports = { direct, sentences, toLines, RULES, STYLE };
