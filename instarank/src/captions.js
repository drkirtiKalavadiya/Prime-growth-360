// SEO + AEO caption engine for Instagram.
//
// How Instagram search reads a post (and what this engine optimises):
//   - the caption text (first 125 characters weigh most: they are shown before "...more"),
//   - hashtags (max 5 per post), alt text, on-screen text and the spoken audio transcript of Reels,
//   - the account name and username fields.
// AEO (answer engine optimisation): write a clear question and a direct 1-2 sentence answer so
// Instagram search, Meta AI and external answer engines can quote the post as an answer.
import { normalize, tokenize, toHashtag, extractHashtags, countOccurrences, sentences, clamp, round, titleCase } from './text.js';
import { isQuestion } from './keywords.js';

export const LIMITS = { caption: 2200, preview: 125, hashtagsMax: 5, altText: 100, nameField: 64 };

const BANNED_TAGS = new Set(['#followforfollow', '#follow4follow', '#f4f', '#like4like', '#l4l', '#likeforlike', '#followback', '#instalike', '#tagsforlikes', '#likeforlikes', '#followme', '#spam', '#commentforcomment', '#alone', '#adulting', '#beautyblogger']);

const CTA = {
  save: 'Save this so you have it when you need it, and share it with someone who should see it.',
  comment: 'Which tip are you trying first? Tell me in the comments.',
  follow: 'Follow for more {k} tips every week.',
  dm: 'Comment "GUIDE" and I will send you the full checklist.',
  shop: 'Tap the link in bio to get yours.',
};

const TONES = {
  educational: { emoji: ['📌', '✅', '👉'], open: '' },
  friendly: { emoji: ['✨', '💛', '👉'], open: '' },
  bold: { emoji: ['🔥', '⚡', '👉'], open: '' },
  professional: { emoji: ['•', '•', '→'], open: '' },
};

const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function hookLines(k, { audience, topic }) {
  const K = cap1(k);
  const forWho = audience ? ` for ${audience}` : '';
  return {
    question: `${isQuestion(k) ? cap1(k.replace(/\?*$/, '?')) : `Struggling with ${k}${forWho}?`} Here is the simple answer 👇`,
    howto: `${K}${forWho}: ${topic ? clean(topic).replace(/[.!]$/, '') : 'the step-by-step guide'} (save this)`,
    story: `I tested ${k} so you don't have to 👇`,
  };
}

function buildQuestion(k, secondary) {
  const q = [k, ...secondary].find(isQuestion);
  if (q) return cap1(q.replace(/\?*$/, '?'));
  return `What is the best way to get started with ${k}?`;
}

/**
 * Build three caption variants (question-led, how-to, story) for one Reel/post.
 * @param {object} input { primaryKeyword, secondaryKeywords[], topic, audience, tone, cta, location, brand, keyPoints[], answer, hashtags[] }
 */
export function generateCaptions(input) {
  const k = normalize(input.primaryKeyword);
  if (!k) throw Object.assign(new Error('primaryKeyword is required'), { status: 400 });
  const secondary = (input.secondaryKeywords || []).map(normalize).filter((s) => s && s !== k).slice(0, 6);
  const tone = TONES[input.tone] || TONES.educational;
  const points = (input.keyPoints || []).map(clean).filter(Boolean).slice(0, 5);
  const hooks = hookLines(k, { audience: clean(input.audience), topic: input.topic });
  const question = buildQuestion(k, secondary);
  const answer = clean(input.answer) || (points[0] ? `${cap1(k)} works best when you ${points[0].replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/[.!]$/, '')}.` : `[Write a direct 1-2 sentence answer here that mentions ${k}.]`);
  const bulletPoints = points.length ? points : ['[Tip 1: the first thing to do]', '[Tip 2: the mistake to avoid]', '[Tip 3: the quick win]'];
  const ctaLine = (CTA[input.cta] || CTA.save).replace('{k}', k);
  const coverage = secondary.filter((s) => !isQuestion(s)).slice(0, 3);
  const coverageLine = coverage.length ? `This ${k} guide covers ${coverage.length > 1 ? `${coverage.slice(0, -1).join(', ')} and ${coverage.at(-1)}` : coverage[0]}.` : '';
  const locLine = input.location ? `📍 ${titleCase(clean(input.location))}` : '';
  const hashtags = pickHashtags(k, secondary, input.hashtags, input.location, input.brand);

  const body = (hook, style) => {
    const lines = [hook, ''];
    if (style === 'question') {
      lines.push(answer, '');
      bulletPoints.forEach((p, i) => lines.push(`${tone.emoji[1]} ${i + 1}. ${cap1(p)}`));
    } else if (style === 'howto') {
      lines.push(`Q: ${question}`, `A: ${answer}`, '');
      bulletPoints.forEach((p, i) => lines.push(`Step ${i + 1}: ${cap1(p)}`));
    } else {
      lines.push(question, `Short answer: ${answer}`, '');
      bulletPoints.forEach((p) => lines.push(`${tone.emoji[0]} ${cap1(p)}`));
    }
    lines.push('');
    if (coverageLine) lines.push(coverageLine);
    if (locLine) lines.push(locLine);
    lines.push(`${tone.emoji[2]} ${ctaLine}`, '', hashtags.join(' '));
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  const variants = [
    { style: 'question', label: 'Question-led (best for AEO)', caption: body(hooks.question, 'question') },
    { style: 'howto', label: 'How-to with FAQ block', caption: body(hooks.howto, 'howto') },
    { style: 'story', label: 'Story / result hook', caption: body(hooks.story, 'story') },
  ].map((v) => ({ ...v, audit: auditCaption(v.caption, { primaryKeyword: k, secondaryKeywords: secondary }) }));

  return {
    primaryKeyword: k,
    variants,
    hashtags,
    extras: seoExtras({ k, secondary, topic: input.topic, audience: input.audience, brand: input.brand, question, answer }),
    faq: buildFaq(k, secondary, answer),
    engine: 'template',
  };
}

export function pickHashtags(k, secondary = [], provided = [], location = '', brand = '') {
  const tags = [];
  const push = (t) => { const h = t?.startsWith('#') ? t.toLowerCase() : toHashtag(t); if (h && h.length <= 31 && !BANNED_TAGS.has(h) && !tags.includes(h)) tags.push(h); };
  (provided || []).forEach(push);
  push(k);
  secondary.filter((s) => tokenize(s).length <= 3 && !isQuestion(s)).forEach(push);
  if (location) push(`${tokenize(k).slice(-1)[0] || ''}${normalize(location)}`);
  if (brand) push(brand);
  return tags.slice(0, LIMITS.hashtagsMax);
}

function seoExtras({ k, secondary, topic, audience, brand, question, answer }) {
  const K = titleCase(k);
  const sec = secondary.find((s) => !isQuestion(s));
  const nameField = clean(brand ? `${brand} | ${K}` : `${K}${sec ? ` & ${titleCase(sec)}` : ''} Tips`).slice(0, LIMITS.nameField);
  return {
    onScreenText: `${K}: ${topic ? clean(topic).slice(0, 40) : '3 things to know'}`,
    spokenHook: `Say this in the first 3 seconds (Instagram transcribes Reel audio): "${question.replace(/\?$/, '')}? ${answer.split(/(?<=\.)\s/)[0]}"`,
    altText: clean(`${K}${audience ? ` for ${audience}` : ''}${topic ? `: ${topic}` : ''}`).slice(0, LIMITS.altText),
    coverTitle: `${K}${sec ? ` | ${titleCase(sec)}` : ''}`.slice(0, 60),
    profileNameField: nameField,
    bioLine: `Helping ${audience || 'you'} with ${k}${sec ? ` & ${sec}` : ''} 👇`.slice(0, 150),
    fileName: `${tokenize(k).join('-')}.mp4`,
  };
}

function buildFaq(k, secondary, answer) {
  const qs = [k, ...secondary].filter(isQuestion).slice(0, 4);
  if (!qs.length) qs.push(`what is ${k}`, `how to start ${k}`);
  return qs.map((q, i) => ({ q: cap1(q.replace(/\?*$/, '?')), a: i === 0 ? answer : `[Answer in 1-2 sentences and mention "${k}".]` }));
}

/**
 * Score a caption 0-100 for Instagram SEO + AEO with actionable fixes.
 */
export function auditCaption(caption, { primaryKeyword = '', secondaryKeywords = [] } = {}) {
  const text = String(caption || '');
  const k = normalize(primaryKeyword);
  const noTags = text.replace(/#[\p{L}\p{M}\p{N}_]+/gu, ' ');
  const preview = text.slice(0, LIMITS.preview);
  const firstLine = text.split('\n')[0] || '';
  const tags = extractHashtags(text);
  const uniqueTags = [...new Set(tags)];
  const banned = uniqueTags.filter((t) => BANNED_TAGS.has(t));
  const sents = sentences(noTags).filter((s) => tokenize(s).length > 0);
  const words = tokenize(noTags);
  const avgSentence = sents.length ? words.length / sents.length : 0;
  const kwCount = k ? countOccurrences(noTags, k) : 0;
  const sec = secondaryKeywords.map(normalize).filter(Boolean);
  const secCovered = sec.filter((s) => countOccurrences(text, s) > 0 || uniqueTags.includes(toHashtag(s)));
  const qIdx = sents.findIndex((s) => /\?$/.test(s));
  const answerSentence = qIdx >= 0 ? sents.slice(qIdx + 1).find((s) => !/\?$/.test(s)) : null;
  const answerWords = answerSentence ? tokenize(answerSentence).length : 0;
  const hasCta = /\b(save|share|comment|follow|send (this|it)|tag (a|someone)|link in bio|dm me|tell me)\b/i.test(text);
  const lineBreaks = (text.match(/\n/g) || []).length;
  const emojis = (text.match(/\p{Extended_Pictographic}/gu) || []).length;

  const checks = [
    { id: 'kw_preview', weight: 20, label: 'Primary keyword in the first 125 characters', pass: !!k && countOccurrences(preview, k) > 0,
      tip: `Put "${k || 'your keyword'}" in the opening line. Only the first 125 characters show before "more" and they weigh most in search.` },
    { id: 'kw_natural', weight: 10, label: 'Keyword used naturally (1-3 times)', pass: kwCount >= 1 && kwCount <= 3,
      tip: kwCount > 3 ? `"${k}" appears ${kwCount} times. Repetition reads as spam; keep it to 1-3.` : 'Use the primary keyword at least once in the caption body.' },
    { id: 'secondary', weight: 10, label: 'Related keywords covered', pass: !sec.length || secCovered.length >= Math.min(2, sec.length),
      tip: `Mention related phrases naturally: ${sec.filter((s) => !secCovered.includes(s)).slice(0, 3).join(', ') || 'add 2-3 related phrases'}.` },
    { id: 'aeo_question', weight: 10, label: 'Asks the question people search (AEO)', pass: qIdx >= 0,
      tip: 'Add the exact question your audience searches, e.g. "How do I…?". Answer engines match questions to answers.' },
    { id: 'aeo_answer', weight: 10, label: 'Direct 8-45 word answer right after the question', pass: answerWords >= 8 && answerWords <= 45,
      tip: 'Follow the question with one clear, quotable answer sentence (8-45 words). This is the snippet answer engines lift.' },
    { id: 'hook', weight: 7, label: 'Short hook line (under 90 characters)', pass: firstLine.length > 0 && firstLine.length <= 90,
      tip: 'Keep the first line short and curiosity-driven so it reads fully in the feed.' },
    { id: 'hashtags', weight: 10, label: '3-5 relevant hashtags, no banned tags', pass: uniqueTags.length >= 3 && uniqueTags.length <= LIMITS.hashtagsMax && !banned.length,
      tip: banned.length ? `Remove banned/spammy tags: ${banned.join(' ')}.` : uniqueTags.length > LIMITS.hashtagsMax ? `Instagram allows ${LIMITS.hashtagsMax} hashtags per post; you have ${uniqueTags.length}.` : 'Use 3-5 specific hashtags: one broad, two niche, one long-tail or local.' },
    { id: 'cta', weight: 8, label: 'Clear call to action (save / share / comment)', pass: hasCta,
      tip: 'Ask for a save, share or comment. Sends and saves are strong ranking signals.' },
    { id: 'length', weight: 8, label: 'Searchable length (200-1500 characters)', pass: text.length >= 200 && text.length <= 1500,
      tip: text.length > LIMITS.caption ? `Caption is ${text.length} characters; Instagram's limit is ${LIMITS.caption}.` : text.length < 200 ? 'Too short to rank: add context, the answer and related keywords.' : 'Long captions dilute keywords; tighten to under 1500 characters.' },
    { id: 'readable', weight: 7, label: 'Easy to read (line breaks, short sentences)', pass: lineBreaks >= 2 && avgSentence <= 22,
      tip: 'Break the caption into short lines and keep sentences under ~22 words.' },
  ];
  const score = round(checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0));
  const overLimit = text.length > LIMITS.caption;
  return {
    score: overLimit ? Math.min(score, 40) : score,
    grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F',
    checks,
    fixes: checks.filter((c) => !c.pass).sort((a, b) => b.weight - a.weight).map((c) => c.tip),
    stats: { characters: text.length, words: words.length, hashtags: uniqueTags.length, keywordCount: kwCount, emojis, previewText: preview, overLimit },
  };
}

export const _internals = { BANNED_TAGS, clamp };
