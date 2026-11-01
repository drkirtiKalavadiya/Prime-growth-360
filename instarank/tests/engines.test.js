import test from 'node:test';
import assert from 'node:assert/strict';
import { expandSeed, estimateKeyword, scoreFromLive, classifyIntent, research, buildHashtagSet, fetchSuggestions } from '../src/keywords.js';
import { scoreReel, rankReels, extractPatterns, liveDelta } from '../src/trends.js';
import { generateCaptions, auditCaption, pickHashtags } from '../src/captions.js';
import { toHashtag, countOccurrences, tokenize } from '../src/text.js';
import { demoMedia, demoTick } from '../src/demo.js';

const NOW = Date.parse('2026-11-01T12:00:00Z');
const media = (h, likes, comments, type = 'VIDEO', caption = '') => ({ id: `${h}-${likes}`, media_type: type, like_count: likes, comments_count: comments, timestamp: new Date(NOW - h * 3600e3).toISOString(), caption });

test('text helpers are unicode aware', () => {
  assert.equal(toHashtag('Home Workout tips!'), '#homeworkouttips');
  assert.equal(toHashtag('योग आसन'), '#योगआसन');
  assert.deepEqual(tokenize('Café #Tips, 2026!'), ['café', 'tips', '2026']);
  assert.equal(countOccurrences('Skincare routine. My skincare routine rocks', 'skincare routine'), 2);
  assert.equal(countOccurrences('skincareroutine', 'skincare routine'), 0);
});

test('expandSeed produces questions, long-tail and local ideas without duplicates', () => {
  const ideas = expandSeed('Home Workout', { location: 'Pune' });
  const kws = ideas.map((i) => i.keyword);
  assert.ok(kws.includes('home workout'));
  assert.ok(kws.includes('how to start home workout'));
  assert.ok(kws.includes('home workout in pune'));
  assert.equal(new Set(kws).size, kws.length);
  assert.ok(!expandSeed('x').some((i) => i.keyword.includes('{loc}')));
  assert.deepEqual(expandSeed('   '), []);
});

test('intent classification', () => {
  assert.equal(classifyIntent('how to start a podcast'), 'informational');
  assert.equal(classifyIntent('best running shoes'), 'commercial');
  assert.equal(classifyIntent('yoga classes near me'), 'local');
  assert.equal(classifyIntent('buy protein powder'), 'transactional');
});

test('estimates favour specific question keywords over single broad words', () => {
  const broad = estimateKeyword('fitness');
  const specific = estimateKeyword('how to start fitness at home');
  assert.ok(specific.opportunity > broad.opportunity);
  assert.ok(specific.aeoScore > broad.aeoScore);
  assert.ok(broad.competition > specific.competition);
  assert.equal(specific.hashtag, '#howtostartfitnessathome');
});

test('live scoring: busy hashtag with beatable top posts scores higher than saturated one', () => {
  const recentBusy = Array.from({ length: 150 }, (_, i) => media(i % 23, 5, 0));
  const easyTop = Array.from({ length: 9 }, () => media(30, 400, 20));
  const hardTop = Array.from({ length: 9 }, () => media(300, 90000, 2000, 'IMAGE'));
  const easy = scoreFromLive('easy niche', { top: easyTop, recent: recentBusy, now: NOW });
  const hard = scoreFromLive('hard niche', { top: hardTop, recent: recentBusy.slice(0, 3), now: NOW });
  assert.ok(easy.opportunity > hard.opportunity, `${easy.opportunity} > ${hard.opportunity}`);
  assert.equal(easy.stats.posts24h, 150);
  assert.equal(easy.stats.reelShare, 100);
  assert.equal(hard.difficulty, 'hard');
  assert.equal(easy.basis, 'live');
});

test('reel scoring rewards velocity and recency', () => {
  const fresh = scoreReel(media(2, 1000, 50), NOW);
  const old = scoreReel(media(200, 1000, 50), NOW);
  assert.equal(fresh.engagement, 1150);
  assert.ok(fresh.trendScore > old.trendScore);
  assert.ok(fresh.velocity > old.velocity);
});

test('rankReels filters to Reels, sorts by trend and labels breakouts', () => {
  const list = [media(1, 5000, 300), media(100, 5000, 300), media(5, 10, 0), media(3, 9999, 9, 'IMAGE'), ...Array.from({ length: 10 }, (_, i) => media(50 + i, 100, 1))];
  const ranked = rankReels(list, { now: NOW });
  assert.ok(ranked.every((r) => r.media_type === 'VIDEO'));
  assert.equal(ranked[0].ageHours, 1);
  assert.equal(ranked[0].status, 'breakout');
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].trendScore >= ranked[i].trendScore);
});

test('extractPatterns finds shared hashtags, question rate and hooks', () => {
  const reels = rankReels([
    media(2, 900, 40, 'VIDEO', 'How do you glow? Try this.\n#skincare #glowup'),
    media(3, 800, 30, 'VIDEO', 'Night routine for glow. Save this!\n#skincare #glowup #night'),
    media(4, 700, 20, 'VIDEO', 'Glow tips in 30s\n#skincare #glowup'),
  ], { now: NOW });
  const p = extractPatterns(reels, { exclude: ['skincare'] });
  assert.equal(p.hashtags[0].term, '#glowup');
  assert.ok(!p.hashtags.some((h) => h.term === '#skincare'));
  assert.equal(p.questionRate, 33);
  assert.equal(p.ctaRate, 33);
  assert.ok(p.hooks.length >= 3);
  assert.ok(p.keywords.some((k) => k.term === 'glow'));
});

test('liveDelta computes per-minute gains and flags new reels', () => {
  const a = rankReels([media(2, 100, 0)], { now: NOW });
  const prev = { at: NOW, reels: a };
  const b = rankReels([{ ...media(2, 160, 0) }, media(1, 10, 0)], { now: NOW + 120000 });
  b[0].id = a[0].id; // same reel
  const d = liveDelta(prev, b, NOW + 120000);
  const same = d.reels.find((r) => r.id === a[0].id);
  assert.equal(same.gained, 60);
  assert.equal(same.perMinute, 30);
  assert.ok(d.reels.some((r) => r.isNew));
  assert.equal(liveDelta(null, b).reels[0].perMinute, null);
});

test('generated captions score high on the SEO + AEO audit', () => {
  const out = generateCaptions({
    primaryKeyword: 'skincare routine for oily skin', secondaryKeywords: ['how to reduce oily skin', 'gel cleanser', 'oil control'],
    topic: 'my 3 step morning routine', audience: 'college students', keyPoints: ['use a gel cleanser twice a day', 'never skip a light moisturiser', 'blot oil instead of wiping'],
    location: 'Ahmedabad', cta: 'save',
  });
  assert.equal(out.variants.length, 3);
  for (const v of out.variants) {
    assert.ok(v.caption.length <= 2200);
    assert.ok(v.caption.toLowerCase().slice(0, 125).includes('skincare routine for oily skin'), v.style);
    assert.ok(v.audit.score >= 80, `${v.style} scored ${v.audit.score}: ${v.audit.fixes.join(' | ')}`);
  }
  assert.ok(out.hashtags.length >= 3 && out.hashtags.length <= 5);
  assert.ok(out.faq[0].q.endsWith('?'));
  assert.ok(out.extras.profileNameField.length <= 64);
  assert.throws(() => generateCaptions({ primaryKeyword: '' }), /required/);
});

test('audit catches stuffing, missing keyword, banned and excess hashtags', () => {
  const bad = auditCaption('Nice day!! #followforfollow #a #b #c #d #e', { primaryKeyword: 'home workout' });
  assert.ok(bad.score < 30);
  const failed = bad.checks.filter((c) => !c.pass).map((c) => c.id);
  assert.ok(failed.includes('kw_preview'));
  assert.ok(failed.includes('hashtags'));
  assert.ok(bad.fixes[0].includes('home workout'));

  const stuffed = auditCaption('home workout home workout home workout home workout', { primaryKeyword: 'home workout' });
  assert.equal(stuffed.checks.find((c) => c.id === 'kw_natural').pass, false);

  const huge = auditCaption('home workout '.repeat(300), { primaryKeyword: 'home workout' });
  assert.ok(huge.stats.overLimit);
  assert.ok(huge.score <= 40);
});

test('hashtag picker caps at 5 and drops banned tags', () => {
  const tags = pickHashtags('home workout', ['abs workout', 'gym at home', 'fat loss', 'yoga', 'pilates'], ['#followforfollow']);
  assert.equal(tags.length, 5);
  assert.ok(!tags.includes('#followforfollow'));
  assert.equal(tags[0], '#homeworkout');
  assert.ok(buildHashtagSet('yoga', [estimateKeyword('yoga for beginners'), estimateKeyword('morning yoga routine')]).length <= 5);
});

test('research merges autocomplete suggestions and ranks by opportunity', async () => {
  const fakeFetch = async (url) => ({ ok: true, text: async () => JSON.stringify(['q', url.includes('ds=yt') ? ['yoga for back pain at home'] : ['yoga for beginners at home', 'yoga']]) });
  const r = await research('yoga', { webSuggest: true, fetchImpl: fakeFetch });
  assert.ok(r.suggestionsFound >= 2);
  const auto = r.keywords.find((k) => k.keyword === 'yoga for back pain at home');
  assert.equal(auto.source, 'autocomplete');
  for (let i = 1; i < r.keywords.length; i++) assert.ok(r.keywords[i - 1].opportunity >= r.keywords[i].opportunity);
  const failing = await fetchSuggestions('yoga', { fetchImpl: async () => { throw new Error('offline'); } });
  assert.deepEqual(failing, []);
});

test('demo provider is deterministic and live ticks only grow engagement', () => {
  const a = demoMedia('skincare', 'top_media', NOW); const b = demoMedia('skincare', 'top_media', NOW);
  assert.deepEqual(a, b);
  const t = demoTick(a, NOW + 8000);
  t.forEach((m, i) => assert.ok(m.like_count >= a[i].like_count));
});
