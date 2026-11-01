// Demo data provider: realistic, deterministic sample data so the product is fully explorable
// before an Instagram account is connected. Everything it returns is flagged `demo: true`.
const HOUR = 3600 * 1000;

function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

const HOOKS = [
  'Stop scrolling if you struggle with {k} 👇', 'I tried {k} for 30 days. Here is what happened', '3 {k} mistakes everyone makes',
  'The {k} secret nobody talks about', 'How to start {k} as a total beginner', 'Is {k} actually worth it? Honest answer',
  'POV: you finally figured out {k}', 'Save this {k} checklist for later', '{k} in under 60 seconds', 'What I wish I knew before {k}',
];
const BODIES = [
  'Here is the simple routine that works for me. Step 1: start small. Step 2: stay consistent. Step 3: track progress.',
  'Most people overcomplicate this. Focus on the basics and you will see results faster.',
  'Comment "GUIDE" and I will send you the full checklist.', 'Save this for later and share it with a friend who needs it.',
  'Which one are you trying first? Tell me in the comments.', 'Follow for more practical tips every week.',
];
const EXTRA_TAGS = ['reels', 'trending', 'tips', 'viral', 'explore', 'beginners', 'howto', 'routine', 'motivation', 'lifehacks', 'india', 'creator'];

export function demoMedia(hashtag, edge = 'top_media', now = Date.now(), label = '') {
  const k = hashtag.replace(/^#/, '');
  const words = label || k;
  const rnd = seeded(`${k}:${edge}`);
  const count = edge === 'top_media' ? 45 : 50;
  const out = [];
  for (let i = 0; i < count; i++) {
    const isReel = rnd() < (edge === 'top_media' ? 0.78 : 0.6);
    const ageH = edge === 'recent_media' ? rnd() * 24 : 2 + rnd() ** 2 * 24 * 21;
    const base = edge === 'top_media' ? 800 + rnd() ** 3 * 90000 : 5 + rnd() ** 4 * 3000;
    const likes = Math.round(base * (isReel ? 1.6 : 1) * (0.4 + Math.min(1, ageH / 72)));
    const comments = Math.round(likes * (0.01 + rnd() * 0.05));
    const tags = [k, ...EXTRA_TAGS.filter(() => rnd() < 0.25)].slice(0, 2 + Math.floor(rnd() * 4));
    const hook = HOOKS[Math.floor(rnd() * HOOKS.length)].replace('{k}', words);
    const body = BODIES[Math.floor(rnd() * BODIES.length)];
    out.push({
      id: `demo_${k}_${edge}_${i}`,
      media_type: isReel ? 'VIDEO' : rnd() < 0.5 ? 'CAROUSEL_ALBUM' : 'IMAGE',
      caption: `${hook}\n\n${body}\n\n${tags.map((t) => `#${t}`).join(' ')}`,
      permalink: `https://www.instagram.com/explore/tags/${encodeURIComponent(k)}/`,
      timestamp: new Date(now - ageH * HOUR).toISOString(),
      like_count: likes,
      comments_count: comments,
    });
  }
  return out;
}

/** Simulates engagement accruing between live polls so the live board moves in demo mode. */
export function demoTick(media, now = Date.now()) {
  return media.map((m) => {
    const ageH = Math.max(0.5, (now - Date.parse(m.timestamp)) / HOUR);
    const rnd = seeded(`${m.id}:${Math.floor(now / 8000)}`);
    const momentum = (m.like_count || 0) / ageH / 450;
    const gain = Math.round(momentum * (0.5 + rnd() * 1.5) * (ageH < 48 ? 3 : 0.6));
    return { ...m, like_count: (m.like_count || 0) + gain, comments_count: (m.comments_count || 0) + Math.round(gain * 0.04) };
  });
}

export function demoCompetitor(username, now = Date.now()) {
  const rnd = seeded(`competitor:${username}`);
  const media = demoMedia(username.replace(/[^a-z0-9]/gi, '') || 'creator', 'top_media', now).slice(0, 30).map((m) => ({ ...m, media_product_type: m.media_type === 'VIDEO' ? 'REELS' : 'FEED' }));
  return {
    profile: { username, name: username, biography: 'Demo profile: connect Instagram for real data', followers: Math.round(5000 + rnd() * 400000), mediaCount: Math.round(80 + rnd() * 900) },
    media,
  };
}
