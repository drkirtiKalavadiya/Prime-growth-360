// Unicode-aware text helpers shared by the keyword, trend and caption engines.
export const STOPWORDS = new Set(`a an the and or but if then so of to in on at for from by with without into over under about as is are was were be been being am do does did done have has had this that these those it its it's i me my we our you your they them their he she his her what which who whom whose when where why how can could should would will shall may might must just very really not no yes all any some more most less than too also only own same such up down out off again once here there both each few other nor s t don now get got make made let lets via per vs`.split(/\s+/));

export const normalize = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

/** Lowercase word tokens (letters/numbers in any script), hashtags and mentions stripped of symbols. */
export function tokenize(s) {
  return normalize(s).match(/[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'’_-]*/gu) || [];
}

export function contentWords(s) {
  return tokenize(s).filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

/** "Home Workout tips!" -> "homeworkouttips" (valid Instagram hashtag body). */
export function toHashtag(s) {
  const body = normalize(s).replace(/^#/, '').replace(/[^\p{L}\p{M}\p{N}_]/gu, '');
  return body ? `#${body}` : '';
}

export function extractHashtags(text) {
  return (String(text || '').match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).map((h) => h.toLowerCase());
}

export function countOccurrences(haystack, needle) {
  const h = normalize(haystack); const n = normalize(needle);
  if (!n) return 0;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (h.match(new RegExp(`(^|[^\\p{L}\\p{N}])${esc}(?=$|[^\\p{L}\\p{N}])`, 'gu')) || []).length;
}

export function sentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

export const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
export const round = (v, d = 0) => { const f = 10 ** d; return Math.round(v * f) / f; };

export function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx];
}

export function titleCase(s) { return String(s).replace(/\b\p{L}/gu, (c) => c.toUpperCase()); }
