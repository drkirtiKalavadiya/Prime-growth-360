import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { Store } from '../src/db.js';
import { encrypt, decrypt, hashPassword, verifyPassword } from '../src/security.js';
import { config as baseConfig } from '../src/config.js';

const config = { ...baseConfig, enableWebSuggest: false, anthropicKey: '', devSelfUpgrade: true, stripeLinks: { pro: '', agency: '' }, adminEmails: [] };

async function withServer(fn, { fetchImpl } = {}) {
  const store = new Store(null);
  const { server } = createApp({ config, store, fetchImpl });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), 'X-Requested-With': 'InstaRank', ...(cookie ? { Cookie: cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, headers: res.headers, data: ct.includes('json') ? await res.json() : await res.text() };
  };
  try { await fn({ call, base, store, getCookie: () => cookie }); } finally { server.closeAllConnections?.(); await new Promise((r) => server.close(r)); }
}

test('crypto helpers round trip and reject tampering', () => {
  const blob = encrypt('EAAG-token', 'secret');
  assert.equal(decrypt(blob, 'secret'), 'EAAG-token');
  assert.throws(() => decrypt(blob, 'other'));
  const h = hashPassword('correct horse');
  assert.ok(verifyPassword('correct horse', h));
  assert.ok(!verifyPassword('wrong', h));
});

test('auth flow, protected routes and CSRF header', async () => {
  await withServer(async ({ call, base }) => {
    assert.equal((await call('GET', '/api/me')).status, 401);
    assert.equal((await call('POST', '/api/auth/signup', { email: 'bad', password: 'x' })).status, 400);
    const s = await call('POST', '/api/auth/signup', { email: 'Kirti@Example.com', password: 'supersecret', name: 'Kirti' });
    assert.equal(s.status, 200);
    assert.equal(s.data.user.email, 'kirti@example.com');
    assert.ok(!('password' in s.data.user));
    assert.equal((await call('POST', '/api/auth/signup', { email: 'kirti@example.com', password: 'supersecret' })).status, 409);
    const me = await call('GET', '/api/me');
    assert.equal(me.status, 200);
    assert.equal(me.data.plan.id, 'free');
    assert.equal(me.data.live, false);
    const noHeader = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(noHeader.status, 403);
    await call('POST', '/api/auth/logout', {});
    assert.equal((await call('GET', '/api/me')).status, 401);
    assert.equal((await call('POST', '/api/auth/login', { email: 'kirti@example.com', password: 'nope' })).status, 401);
    assert.equal((await call('POST', '/api/auth/login', { email: 'kirti@example.com', password: 'supersecret' })).status, 200);
  });
});

test('keyword, reels, competitor, caption and audit endpoints work in demo mode', async () => {
  await withServer(async ({ call }) => {
    await call('POST', '/api/auth/signup', { email: 'a@b.co', password: 'password1' });
    const kw = await call('GET', '/api/keywords/research?seed=home%20workout&location=pune');
    assert.equal(kw.status, 200);
    assert.ok(kw.data.keywords.length > 20);

    const an = await call('POST', '/api/keywords/analyze', { keyword: 'home workout' });
    assert.equal(an.status, 200);
    assert.equal(an.data.demo, true);
    assert.equal(an.data.basis, 'live');
    assert.ok(an.data.patterns.hashtags.length > 0);

    const reels = await call('GET', '/api/reels/trending?hashtag=%23HomeWorkout');
    assert.equal(reels.status, 200);
    assert.equal(reels.data.hashtag, '#homeworkout');
    assert.ok(reels.data.reels.every((r) => r.media_type === 'VIDEO'));

    const comp = await call('GET', '/api/competitors?username=@somebrand');
    assert.equal(comp.status, 200);
    assert.ok(comp.data.reels.length > 0);

    const cap = await call('POST', '/api/captions/generate', { primaryKeyword: 'home workout for beginners', secondaryKeywords: 'no equipment workout, how to lose belly fat', keyPoints: ['start with 10 minutes a day', 'focus on form over speed', 'rest one day a week'] });
    assert.equal(cap.status, 200);
    assert.equal(cap.data.variants.length, 3);

    const ai = await call('POST', '/api/captions/generate', { primaryKeyword: 'x', useAI: true });
    assert.equal(ai.status, 503);

    const audit = await call('POST', '/api/captions/audit', { caption: cap.data.variants[0].caption, primaryKeyword: 'home workout for beginners' });
    assert.equal(audit.status, 200);
    assert.ok(audit.data.score >= 70);

    const saved = await call('POST', '/api/saved', { kind: 'keyword', value: 'home workout for beginners' });
    assert.equal(saved.status, 200);
    const list = await call('GET', '/api/saved');
    assert.equal(list.data.items.length, 1);
    assert.equal((await call('DELETE', `/api/saved/${saved.data.item.id}`, {})).status, 200);
    assert.equal((await call('DELETE', `/api/saved/${saved.data.item.id}`, {})).status, 404);
  });
});

test('plan quotas are enforced and upgrades lift them', async () => {
  await withServer(async ({ call }) => {
    await call('POST', '/api/auth/signup', { email: 'q@b.co', password: 'password1' });
    for (let i = 0; i < 3; i++) assert.equal((await call('GET', `/api/competitors?username=brand${i}`)).status, 200);
    const blocked = await call('GET', '/api/competitors?username=brand4');
    assert.equal(blocked.status, 402);
    assert.equal(blocked.data.metric, 'competitorScans');
    const up = await call('POST', '/api/billing/upgrade', { plan: 'pro' });
    assert.equal(up.data.user.plan, 'pro');
    assert.equal((await call('GET', '/api/competitors?username=brand4')).status, 200);
  });
});

test('live tracker streams Server-Sent Events', async () => {
  await withServer(async ({ call, base, getCookie }) => {
    await call('POST', '/api/auth/signup', { email: 'live@b.co', password: 'password1' });
    const tooMany = await call('GET', '/api/reels/live?hashtags=a,b');
    assert.equal(tooMany.status, 402);
    const ctrl = new AbortController();
    const res = await fetch(`${base}/api/reels/live?hashtags=skincare`, { headers: { Cookie: getCookie() }, signal: ctrl.signal });
    assert.equal(res.headers.get('content-type'), 'text/event-stream');
    const reader = res.body.getReader();
    let text = '';
    while (!text.includes('event: update')) text += new TextDecoder().decode((await reader.read()).value);
    const dataLine = text.split('\n').find((l) => l.startsWith('data: {'));
    const payload = JSON.parse(dataLine.slice(6));
    assert.equal(payload.hashtag, '#skincare');
    assert.ok(payload.reels.length > 0);
    ctrl.abort();
  });
});

test('Instagram connection validates the token with the Graph API and encrypts it', async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(String(url));
    return { ok: true, status: 200, json: async () => ({ id: '17841400000000001', username: 'primegrowth360', followers_count: 1200, media_count: 50 }) };
  };
  await withServer(async ({ call, store }) => {
    await call('POST', '/api/auth/signup', { email: 'ig@b.co', password: 'password1' });
    assert.equal((await call('PUT', '/api/settings/instagram', { accessToken: 'tok', igUserId: 'abc' })).status, 400);
    const r = await call('PUT', '/api/settings/instagram', { accessToken: 'EAAG-secret', igUserId: '17841400000000001' });
    assert.equal(r.status, 200);
    assert.equal(r.data.user.instagram.username, 'primegrowth360');
    assert.ok(calls[0].startsWith('https://graph.facebook.com/'));
    const u = store.userByEmail('ig@b.co');
    assert.ok(!JSON.stringify(u).includes('EAAG-secret'));
    assert.equal((await call('GET', '/api/me')).data.live, true);
  }, { fetchImpl: fakeFetch });
});

test('Graph API errors map to friendly messages', async () => {
  const fakeFetch = async (url) => {
    const u = String(url);
    if (u.includes('ig_hashtag_search')) return { ok: false, status: 400, json: async () => ({ error: { code: 190, message: 'expired' } }) };
    return { ok: true, status: 200, json: async () => ({ id: '17841400000000001', username: 'x' }) };
  };
  await withServer(async ({ call }) => {
    await call('POST', '/api/auth/signup', { email: 'err@b.co', password: 'password1' });
    await call('PUT', '/api/settings/instagram', { accessToken: 'tok', igUserId: '17841400000000001' });
    const r = await call('GET', '/api/reels/trending?hashtag=fitness');
    assert.equal(r.status, 401);
    assert.match(r.data.error, /expired/i);
  }, { fetchImpl: fakeFetch });
});

test('static files are served with security headers and no path traversal', async () => {
  await withServer(async ({ base }) => {
    const r = await fetch(`${base}/`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    const t = await fetch(`${base}/..%2f..%2fpackage.json`);
    assert.notEqual(t.status, 200);
  });
});

test('personal mode: no login, no plans, unlimited usage', async () => {
  const store = new Store(null);
  const { server } = createApp({ config: { ...config, personalMode: true }, store });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const me = await (await fetch(`${base}/api/me`)).json();
    assert.equal(me.user.personal, true);
    assert.equal(me.plan.id, 'personal');
    for (let i = 0; i < 5; i++) assert.equal((await fetch(`${base}/api/competitors?username=b${i}`)).status, 200);
    const plans = await (await fetch(`${base}/api/plans`)).json();
    assert.deepEqual(plans.plans, []);
    const up = await fetch(`${base}/api/billing/upgrade`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'InstaRank' }, body: '{"plan":"pro"}' });
    assert.equal(up.status, 400);
  } finally { server.closeAllConnections?.(); await new Promise((r) => server.close(r)); }
});
