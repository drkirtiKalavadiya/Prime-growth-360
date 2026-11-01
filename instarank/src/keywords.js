// Keyword research engine.
//
// Instagram does not publish search volume, so InstaRank combines three real signals:
//  1. Demand language: live public autocomplete suggestions (what people actually type),
//  2. Live hashtag activity from the Instagram Graph API (posts in the last 24h, Reel share,
//     engagement of the top posts = how hard it is to rank),
//  3. Answer-engine (AEO) fit: question-shaped, specific, intent-rich phrases that Instagram
//     search and AI answer engines (Meta AI, Google AI Overviews, ChatGPT) surface.
import { normalize, tokenize, contentWords, toHashtag, clamp, round, median } from './text.js';

const YEAR = new Date().getUTCFullYear();

const MODIFIERS = {
  question: ['what is {k}', 'how to start {k}', 'how to do {k} at home', 'best {k} for beginners', 'is {k} worth it', 'how much does {k} cost', 'how often should you do {k}', 'what are the benefits of {k}'],
  longtail: ['{k} tips', '{k} ideas', '{k} hacks', '{k} mistakes', '{k} step by step', '{k} for beginners', '{k} at home', '{k} routine', '{k} tutorial', '{k} before and after', '{k} trends {y}', '{k} for women', '{k} for men', '{k} for students'],
  commercial: ['best {k}', 'best {k} products', 'affordable {k}', '{k} review', '{k} price', '{k} course', '{k} services', 'buy {k}'],
  local: ['{k} near me', '{k} in {loc}', 'best {k} in {loc}', '{loc} {k}'],
};

const INTENT_RULES = [
  { intent: 'local', re: /\b(near me|nearby|in [\p{L}]+|city|local)\b/u },
  { intent: 'transactional', re: /\b(buy|price|cost|cheap|affordable|discount|deal|order|shop|book|hire|services?|course)\b/u },
  { intent: 'commercial', re: /\b(best|top|review|vs|versus|compare|comparison|alternatives?|worth it)\b/u },
  { intent: 'informational', re: /^(how|what|why|when|where|who|which|can|does|is|are|should)\b|\b(tips|ideas|hacks|guide|tutorial|steps?|mistakes|routine|for beginners)\b/u },
];

export function classifyIntent(keyword) {
  const k = normalize(keyword);
  for (const r of INTENT_RULES) if (r.re.test(k)) return r.intent;
  return 'navigational';
}

export const isQuestion = (k) => /^(how|what|why|when|where|who|which|can|does|do|is|are|should|will)\b/.test(normalize(k)) || /\?$/.test(k.trim());

/** Generate keyword ideas from a seed. Pure and deterministic. */
export function expandSeed(seed, { location = '' } = {}) {
  const k = normalize(seed).replace(/^#/, '');
  if (!k) return [];
  const loc = normalize(location);
  const out = new Map();
  const add = (kw, type, source = 'pattern') => {
    const n = normalize(kw);
    if (n && !out.has(n)) out.set(n, { keyword: n, type, source });
  };
  add(k, 'core');
  for (const [type, list] of Object.entries(MODIFIERS)) {
    for (const tpl of list) {
      if (tpl.includes('{loc}') && !loc) continue;
      add(tpl.replace('{k}', k).replace('{loc}', loc).replace('{y}', String(YEAR)), type);
    }
  }
  return [...out.values()];
}

/** Score a keyword before any live data is fetched (labelled "estimate" in the UI). */
export function estimateKeyword(keyword, seed = '') {
  const words = tokenize(keyword);
  const n = words.length;
  // Specificity: 2-5 word phrases rank best in Instagram search; 1 word is too broad, 7+ too niche.
  const specificity = n <= 1 ? 35 : n <= 5 ? 90 - Math.abs(3 - n) * 6 : Math.max(30, 90 - (n - 5) * 15);
  const q = isQuestion(keyword);
  const intent = classifyIntent(keyword);
  const aeo = clamp((q ? 55 : 15) + (n >= 3 ? 20 : 0) + (intent === 'informational' ? 15 : 0) + (/\b(how|step|guide|for beginners)\b/.test(keyword) ? 10 : 0));
  // Broad, single-word terms face more competition; long-tail and local phrases face less.
  const competitionEstimate = clamp(n <= 1 ? 90 : n === 2 ? 70 : n === 3 ? 50 : n === 4 ? 38 : 28) - (intent === 'local' ? 10 : 0);
  const relevance = seed ? clamp(100 * overlap(keyword, seed)) : 100;
  const opportunity = round(clamp(0.35 * specificity + 0.3 * aeo + 0.35 * (100 - competitionEstimate)) * (0.5 + relevance / 200));
  return { keyword: normalize(keyword), words: n, intent, question: q, aeoScore: round(aeo), specificity: round(specificity), competition: round(competitionEstimate), opportunity, hashtag: toHashtag(keyword), basis: 'estimate' };
}

function overlap(a, b) {
  const A = new Set(contentWords(a)); const B = new Set(contentWords(b));
  if (!B.size) return 1;
  let hit = 0; for (const w of B) if (A.has(w)) hit++;
  return hit / B.size;
}

/**
 * Score a keyword with live Instagram data.
 * @param {object} live { top: Media[], recent: Media[], now }
 * Media: { media_type, like_count, comments_count, timestamp, caption }
 */
export function scoreFromLive(keyword, { top = [], recent = [], now = Date.now() }) {
  const eng = (m) => (m.like_count || 0) + 3 * (m.comments_count || 0);
  const day = 24 * 3600 * 1000;
  const posts24h = recent.filter((m) => now - Date.parse(m.timestamp) <= day).length;
  const topEng = top.map(eng);
  const medTop = median(topEng);
  const reels = top.filter((m) => m.media_type === 'VIDEO');
  const reelShare = top.length ? reels.length / top.length : 0;
  const freshTop = top.filter((m) => now - Date.parse(m.timestamp) <= 7 * day).length / (top.length || 1);
  const medReelEng = median(reels.map(eng));

  // Demand: log scale of fresh posting activity (the Graph API caps a page at 50; we fetch up to 4 pages).
  const demand = clamp((Math.log10(posts24h + 1) / Math.log10(201)) * 100);
  // Competition: how much engagement you must beat to enter the top grid (log scale, 10 -> 0, 100k -> 100).
  const competition = clamp(((Math.log10(medTop + 1) - 1) / 4) * 100);
  // Freshness: a top grid full of new posts means the slot rotates, so newcomers can break in.
  const freshness = clamp(freshTop * 100);
  const est = estimateKeyword(keyword);
  const opportunity = round(clamp(0.35 * demand + 0.3 * (100 - competition) + 0.15 * freshness + 0.1 * reelShare * 100 + 0.1 * est.aeoScore));
  return {
    ...est,
    basis: 'live',
    demand: round(demand), competition: round(competition), freshness: round(freshness), opportunity,
    stats: { posts24h, sampledTop: top.length, sampledRecent: recent.length, medianTopEngagement: round(medTop), medianReelEngagement: round(medReelEng), reelShare: round(reelShare * 100) },
    difficulty: competition >= 75 ? 'hard' : competition >= 45 ? 'medium' : 'easy',
  };
}

/** Public autocomplete suggestions: real phrases people type. Fails soft (returns []). */
export async function fetchSuggestions(seed, { fetchImpl = fetch, timeoutMs = 4000 } = {}) {
  const q = normalize(seed);
  if (!q) return [];
  const variants = [q, `how to ${q}`, `${q} for`, `best ${q}`, `${q} ideas`];
  const urls = variants.flatMap((v) => [
    `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=${encodeURIComponent(v)}`,
    `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=en&q=${encodeURIComponent(v)}`,
  ]);
  const results = await Promise.allSettled(urls.map(async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetchImpl(u, { signal: ctrl.signal, headers: { 'User-Agent': 'InstaRank/1.0' } });
      if (!r.ok) return [];
      const j = JSON.parse(await r.text());
      return Array.isArray(j?.[1]) ? j[1] : [];
    } finally { clearTimeout(t); }
  }));
  const seen = new Set();
  const out = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const s of r.value) {
      const n = normalize(s);
      if (n && n !== q && n.length <= 80 && !seen.has(n)) { seen.add(n); out.push(n); }
    }
  }
  return out;
}

/** Full research run: patterns + suggestions, scored, deduped and sorted by opportunity. */
export async function research(seed, { location = '', webSuggest = true, fetchImpl } = {}) {
  const ideas = expandSeed(seed, { location });
  let suggestions = [];
  if (webSuggest) {
    try { suggestions = await fetchSuggestions(seed, { fetchImpl }); } catch { suggestions = []; }
  }
  const map = new Map(ideas.map((i) => [i.keyword, i]));
  for (const s of suggestions) if (!map.has(s)) map.set(s, { keyword: s, type: isQuestion(s) ? 'question' : 'longtail', source: 'autocomplete' });
  const rows = [...map.values()].map((i) => {
    const e = estimateKeyword(i.keyword, seed);
    // Phrases that real users typed get a demand bonus over generated patterns.
    if (i.source === 'autocomplete') e.opportunity = round(clamp(e.opportunity + 8));
    return { ...e, type: i.type, source: i.source };
  });
  rows.sort((a, b) => b.opportunity - a.opportunity);
  return {
    seed: normalize(seed),
    location: normalize(location),
    count: rows.length,
    suggestionsFound: suggestions.length,
    keywords: rows,
    questions: rows.filter((r) => r.question).slice(0, 12).map((r) => r.keyword),
    hashtagSet: buildHashtagSet(seed, rows),
  };
}

/** 3-5 hashtags: 1 broad + 2 niche + 1 long-tail/local + 1 branded slot. Instagram caps posts at 5. */
export function buildHashtagSet(seed, rows) {
  const core = toHashtag(seed);
  const pick = (pred) => rows.filter(pred).map((r) => r.hashtag).filter((h) => h && h.length <= 30 && h !== core);
  const niche = pick((r) => r.words === 2 || r.words === 3);
  const local = pick((r) => r.intent === 'local');
  const set = [core, ...niche.slice(0, 2), ...(local[0] ? [local[0]] : niche.slice(2, 3))].filter(Boolean);
  return [...new Set(set)].slice(0, 5);
}
