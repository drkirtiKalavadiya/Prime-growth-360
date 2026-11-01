// Reel performance analytics: who is performing *right now* and why.
import { contentWords, extractHashtags, sentences, round, median, percentile, normalize } from './text.js';

const HOUR = 3600 * 1000;

export const engagementOf = (m) => (m.like_count || 0) + 3 * (m.comments_count || 0);

/**
 * Trend score = engagement velocity with time decay (similar to how feeds rank "hot" items):
 *   velocity = engagement / ageHours
 *   trend    = engagement / (ageHours + 2) ^ 1.3
 * Comments count 3x likes because they are the stronger ranking signal.
 */
export function scoreReel(m, now = Date.now()) {
  const engagement = engagementOf(m);
  const ageHours = Math.max(0.25, (now - Date.parse(m.timestamp)) / HOUR);
  const velocity = engagement / ageHours;
  const trend = engagement / (ageHours + 2) ** 1.3;
  const commentRatio = engagement ? (m.comments_count || 0) / Math.max(1, m.like_count || 0) : 0;
  return { engagement, ageHours: round(ageHours, 1), velocity: round(velocity, 1), trendScore: round(trend, 2), commentRatio: round(commentRatio, 3) };
}

export function classify(reel, p90, p60) {
  if (reel.ageHours <= 48 && reel.trendScore >= p90) return 'breakout';
  if (reel.trendScore >= p60) return 'rising';
  if (reel.ageHours > 24 * 7) return 'evergreen';
  return 'steady';
}

/** Rank media, keeping only Reels/videos unless includeAll is set. */
export function rankReels(media, { now = Date.now(), includeAll = false } = {}) {
  const list = media
    .filter((m) => includeAll || m.media_type === 'VIDEO' || m.media_product_type === 'REELS')
    .map((m) => ({ ...m, ...scoreReel(m, now) }));
  const scores = list.map((r) => r.trendScore);
  const p90 = percentile(scores, 90); const p60 = percentile(scores, 60);
  for (const r of list) r.status = classify(r, p90, p60);
  list.sort((a, b) => b.trendScore - a.trendScore);
  return list;
}

/** What the winners have in common: hashtags, words, hooks, caption shape, best hours. */
export function extractPatterns(reels, { exclude = [] } = {}) {
  const ex = new Set(exclude.map((e) => normalize(e).replace(/^#/, '')));
  const top = reels.slice(0, Math.max(5, Math.ceil(reels.length * 0.4)));
  const tagCount = new Map(); const wordCount = new Map(); const hours = new Array(24).fill(0);
  let questions = 0; let ctas = 0; const lengths = []; const hooks = []; const tagsPerPost = [];
  for (const r of top) {
    const cap = r.caption || '';
    const tags = extractHashtags(cap);
    tagsPerPost.push(tags.length);
    for (const t of new Set(tags)) if (!ex.has(t.slice(1))) tagCount.set(t, (tagCount.get(t) || 0) + 1);
    for (const w of new Set(contentWords(cap.replace(/#[\p{L}\p{M}\p{N}_]+/gu, '')))) if (!ex.has(w)) wordCount.set(w, (wordCount.get(w) || 0) + 1);
    if (/\?/.test(cap)) questions++;
    if (/\b(save|share|comment|follow|send this|tag a|link in bio|dm)\b/i.test(cap)) ctas++;
    lengths.push(cap.length);
    const first = sentences(cap.replace(/#[\p{L}\p{M}\p{N}_]+/gu, ''))[0];
    if (first) hooks.push({ text: first.slice(0, 140), trendScore: r.trendScore, permalink: r.permalink });
    const ts = Date.parse(r.timestamp);
    if (!Number.isNaN(ts)) hours[new Date(ts).getUTCHours()] += 1;
  }
  const top5 = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => ({ term: k, count: v }));
  const n = top.length || 1;
  return {
    sample: top.length,
    hashtags: top5(tagCount),
    keywords: top5(wordCount),
    hooks: hooks.slice(0, 6),
    questionRate: round((questions / n) * 100),
    ctaRate: round((ctas / n) * 100),
    medianCaptionLength: round(median(lengths)),
    medianHashtags: round(median(tagsPerPost)),
    bestHoursUtc: hours.map((c, h) => ({ hour: h, count: c })).filter((x) => x.count).sort((a, b) => b.count - a.count).slice(0, 3).map((x) => x.hour),
  };
}

/**
 * Live delta between two polls of the same hashtag. Gives "+N engagement / min" per Reel,
 * which is what tells you a Reel is performing right now rather than yesterday.
 */
export function liveDelta(prev, cur, now = Date.now()) {
  const before = new Map((prev?.reels || []).map((r) => [r.id, r]));
  const minutes = prev ? Math.max(0.5, (now - prev.at) / 60000) : 0;
  const reels = cur.map((r) => {
    const p = before.get(r.id);
    const gained = p ? r.engagement - p.engagement : 0;
    return { ...r, isNew: !!prev && !p, gained, perMinute: p ? round(gained / minutes, 2) : null };
  });
  reels.sort((a, b) => (b.perMinute ?? -1) - (a.perMinute ?? -1) || b.trendScore - a.trendScore);
  return { at: now, minutes: round(minutes, 1), reels };
}
