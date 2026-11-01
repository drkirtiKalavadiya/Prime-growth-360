// HTTP application: routing, auth, API handlers, live Server-Sent Events and static files.
// Zero framework on purpose: small attack surface, no build step, easy to audit.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Store } from './db.js';
import { hashPassword, verifyPassword, randomToken, sha256, encrypt, RateLimiter, isEmail } from './security.js';
import { PLANS, planOf, consume, usageSummary, QuotaError } from './plans.js';
import { research, scoreFromLive, estimateKeyword } from './keywords.js';
import { rankReels, extractPatterns, liveDelta } from './trends.js';
import { generateCaptions, auditCaption } from './captions.js';
import { generateWithAI, aiAvailable } from './ai.js';
import { DataProvider, cleanHashtag } from './provider.js';
import { InstagramGraph } from './instagram.js';

const SESSION_DAYS = 30;
const MAX_BODY = 64 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v, maxItems = 10, maxLen = 80) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,\n]/) : []).map((x) => str(String(x), maxLen)).filter(Boolean).slice(0, maxItems);

export function createApp({ config, store = new Store(config.dataFile), fetchImpl = fetch } = {}) {
  const provider = new DataProvider({ store, config, fetchImpl });
  const authLimiter = new RateLimiter({ windowMs: 15 * 60_000, max: 20 });
  const apiLimiter = new RateLimiter({ windowMs: 60_000, max: 120 });
  const liveStreams = new Map(); // userId -> count
  const publicDir = path.join(config.root, 'public');

  // ---------- helpers ----------
  const send = (res, status, body, headers = {}) => {
    const data = body === undefined ? '' : JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(data);
  };

  const readJson = (req) => new Promise((resolve, reject) => {
    if (!/application\/json/i.test(req.headers['content-type'] || '')) return reject(new HttpError(415, 'Content-Type must be application/json'));
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new HttpError(413, 'Request body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new HttpError(400, 'Invalid JSON')); } });
    req.on('error', reject);
  });

  const parseCookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter(([k]) => k).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));

  const sessionCookie = (token, maxAge) => `ir_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config.cookieSecure ? '; Secure' : ''}`;

  const currentUser = (req) => {
    const token = parseCookies(req).ir_session;
    if (!token) return null;
    const s = store.sessionByHash(sha256(token));
    return s ? store.userById(s.userId) : null;
  };

  const publicUser = (u) => ({
    id: u.id, email: u.email, name: u.name, plan: u.plan, createdAt: u.createdAt,
    instagram: u.instagram ? { connected: true, username: u.instagram.username, igUserId: u.instagram.igUserId, connectedAt: u.instagram.connectedAt } : { connected: false },
    isAdmin: config.adminEmails.includes(u.email),
  });

  const startSession = (res, user) => {
    const token = randomToken();
    store.addSession({ hash: sha256(token), userId: user.id, created: Date.now(), expires: Date.now() + SESSION_DAYS * 864e5 });
    return sessionCookie(token, SESSION_DAYS * 86400);
  };

  const ip = (req) => req.socket.remoteAddress || 'unknown';

  // ---------- route table ----------
  const routes = [];
  const route = (method, pattern, handler, opts = {}) => routes.push({ method, pattern, handler, auth: opts.auth !== false });

  route('GET', '/api/health', async () => ({ ok: true, time: new Date().toISOString(), ai: aiAvailable(config) }), { auth: false });
  route('GET', '/api/plans', async () => ({ plans: Object.values(PLANS), billing: { pro: !!config.stripeLinks.pro, agency: !!config.stripeLinks.agency, devSelfUpgrade: config.devSelfUpgrade } }), { auth: false });

  // ----- auth -----
  route('POST', '/api/auth/signup', async ({ req, res, body }) => {
    if (!authLimiter.check(`signup:${ip(req)}`).ok) throw new HttpError(429, 'Too many attempts. Try again later.');
    const email = str(body.email, 254).toLowerCase(); const password = typeof body.password === 'string' ? body.password : ''; const name = str(body.name, 80);
    if (!isEmail(email)) throw new HttpError(400, 'Enter a valid email address');
    if (password.length < 8 || password.length > 200) throw new HttpError(400, 'Password must be at least 8 characters');
    if (store.userByEmail(email)) throw new HttpError(409, 'An account with this email already exists');
    const user = store.addUser({ id: store.id(), email, name: name || email.split('@')[0], password: hashPassword(password), plan: 'free', createdAt: new Date().toISOString() });
    res.setHeader('Set-Cookie', startSession(res, user));
    return { user: publicUser(user) };
  }, { auth: false });

  route('POST', '/api/auth/login', async ({ req, res, body }) => {
    const email = str(body.email, 254).toLowerCase();
    if (!authLimiter.check(`login:${ip(req)}:${email}`).ok) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.');
    const user = store.userByEmail(email);
    if (!user || !verifyPassword(String(body.password || ''), user.password)) throw new HttpError(401, 'Incorrect email or password');
    res.setHeader('Set-Cookie', startSession(res, user));
    return { user: publicUser(user) };
  }, { auth: false });

  route('POST', '/api/auth/logout', async ({ req, res }) => {
    const token = parseCookies(req).ir_session;
    if (token) store.removeSession(sha256(token));
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    return { ok: true };
  }, { auth: false });

  route('GET', '/api/me', async ({ user }) => ({ user: publicUser(user), usage: usageSummary(store, user), plan: planOf(user), ai: aiAvailable(config), live: provider.isLive(user) }));

  // ----- Instagram connection -----
  route('PUT', '/api/settings/instagram', async ({ user, body }) => {
    const accessToken = str(body.accessToken, 1000); const igUserId = str(body.igUserId, 40);
    if (!accessToken || !/^\d{5,25}$/.test(igUserId)) throw new HttpError(400, 'Enter a long-lived access token and your numeric Instagram Business Account ID');
    const graph = new InstagramGraph({ accessToken, igUserId, version: config.graphVersion, fetchImpl });
    const acct = await graph.account();
    store.updateUser(user.id, { instagram: { tokenEnc: encrypt(accessToken, config.appSecret), igUserId, username: acct.username, connectedAt: new Date().toISOString() } });
    return { user: publicUser(store.userById(user.id)), account: { username: acct.username, followers: acct.followers_count, mediaCount: acct.media_count } };
  });
  route('DELETE', '/api/settings/instagram', async ({ user }) => { store.updateUser(user.id, { instagram: null }); return { user: publicUser(store.userById(user.id)) }; });
  route('PUT', '/api/settings/profile', async ({ user, body }) => {
    const name = str(body.name, 80);
    if (!name) throw new HttpError(400, 'Name is required');
    return { user: publicUser(store.updateUser(user.id, { name })) };
  });

  // ----- keyword research -----
  route('GET', '/api/keywords/research', async ({ user, query }) => {
    const seed = str(query.get('seed'), 80);
    if (!seed) throw new HttpError(400, 'Enter a seed keyword');
    consume(store, user, 'keywordSearches');
    const out = await research(seed, { location: str(query.get('location'), 60), webSuggest: config.enableWebSuggest, fetchImpl });
    return { ...out, webSuggest: config.enableWebSuggest };
  });

  route('POST', '/api/keywords/analyze', async ({ user, body }) => {
    const keyword = str(body.keyword, 80);
    if (!keyword) throw new HttpError(400, 'keyword is required');
    const tag = cleanHashtag(body.hashtag || keyword);
    consume(store, user, 'liveAnalyses');
    const data = await provider.hashtag(user, body.hashtag || keyword);
    const score = scoreFromLive(keyword, { top: data.top, recent: data.recent });
    const reels = rankReels([...data.top, ...data.recent]);
    return { ...score, hashtag: `#${tag}`, demo: data.demo, fetchedAt: data.fetchedAt, patterns: extractPatterns(reels, { exclude: [tag, ...keyword.toLowerCase().split(/\s+/)] }) };
  });

  // ----- trending reels -----
  route('GET', '/api/reels/trending', async ({ user, query }) => {
    const tag = cleanHashtag(query.get('hashtag'));
    if (!tag) throw new HttpError(400, 'Enter a hashtag');
    consume(store, user, 'liveAnalyses');
    const data = await provider.hashtag(user, tag, { fresh: query.get('fresh') === '1' });
    const byId = new Map([...data.recent, ...data.top].map((m) => [m.id, m]));
    const reels = rankReels([...byId.values()]);
    return {
      hashtag: `#${tag}`, demo: data.demo, fetchedAt: data.fetchedAt,
      counts: { reels: reels.length, breakout: reels.filter((r) => r.status === 'breakout').length, rising: reels.filter((r) => r.status === 'rising').length },
      reels: reels.slice(0, 40),
      patterns: extractPatterns(reels, { exclude: [tag, ...String(query.get('hashtag')).toLowerCase().split(/\s+/)] }),
    };
  });

  // Live board over Server-Sent Events.
  route('GET', '/api/reels/live', async ({ req, res, user, query }) => {
    const tags = strList(query.get('hashtags'), 10, 40).map(cleanHashtag).filter(Boolean);
    if (!tags.length) throw new HttpError(400, 'Choose at least one hashtag to track');
    const maxTracks = planOf(user).limits.liveTracks;
    if (tags.length > maxTracks) throw new QuotaError('liveTracks', maxTracks);
    if ((liveStreams.get(user.id) || 0) >= 3) throw new HttpError(429, 'Too many live boards open. Close another tab first.');
    liveStreams.set(user.id, (liveStreams.get(user.id) || 0) + 1);

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 10000\n\n');
    const live = provider.isLive(user);
    const intervalMs = (live ? config.liveIntervalSec : config.demoLiveIntervalSec) * 1000;
    const state = new Map(); // tag -> { prev snapshot, media }
    let closed = false; let timer = null;

    const tick = async () => {
      for (const tag of tags) {
        if (closed) return;
        try {
          const st = state.get(tag) || {};
          const polled = await provider.poll(user, tag, st.media);
          const ranked = rankReels(polled.media);
          const delta = liveDelta(st.prev, ranked);
          state.set(tag, { prev: { at: delta.at, reels: ranked }, media: polled.media });
          const payload = { hashtag: `#${tag}`, demo: polled.demo, at: delta.at, intervalSec: intervalMs / 1000, sinceMinutes: delta.minutes, reels: delta.reels.slice(0, 15) };
          res.write(`event: update\ndata: ${JSON.stringify(payload)}\n\n`);
        } catch (e) {
          res.write(`event: error\ndata: ${JSON.stringify({ hashtag: `#${tag}`, error: e.message, status: e.status || 500 })}\n\n`);
        }
      }
      if (!closed) timer = setTimeout(tick, intervalMs);
    };
    const ping = setInterval(() => !closed && res.write(': ping\n\n'), 25_000);
    req.on('close', () => { closed = true; clearTimeout(timer); clearInterval(ping); liveStreams.set(user.id, Math.max(0, (liveStreams.get(user.id) || 1) - 1)); });
    tick();
    return undefined; // response is streamed
  });

  // ----- competitor analysis -----
  route('GET', '/api/competitors', async ({ user, query }) => {
    const username = str(query.get('username'), 40);
    if (!username) throw new HttpError(400, 'Enter a username');
    consume(store, user, 'competitorScans');
    const data = await provider.competitor(user, username);
    const reels = rankReels(data.media);
    const avgEng = reels.length ? reels.reduce((s, r) => s + r.engagement, 0) / reels.length : 0;
    return {
      demo: data.demo, profile: data.profile,
      summary: { reelsAnalysed: reels.length, avgEngagement: Math.round(avgEng), engagementRate: data.profile.followers ? +((avgEng / data.profile.followers) * 100).toFixed(2) : null },
      reels: reels.slice(0, 20),
      patterns: extractPatterns(reels),
    };
  });

  // ----- captions -----
  route('POST', '/api/captions/generate', async ({ user, body }) => {
    const input = {
      primaryKeyword: str(body.primaryKeyword, 80), secondaryKeywords: strList(body.secondaryKeywords, 8), topic: str(body.topic, 200),
      audience: str(body.audience, 80), tone: str(body.tone, 20), cta: str(body.cta, 20), location: str(body.location, 60), brand: str(body.brand, 40),
      keyPoints: strList(body.keyPoints, 5, 200), answer: str(body.answer, 400), hashtags: strList(body.hashtags, 5, 40), language: str(body.language, 30),
    };
    if (!input.primaryKeyword) throw new HttpError(400, 'Primary keyword is required');
    if (body.useAI) {
      consume(store, user, 'aiCaptions');
      let insights = null;
      if (body.useLiveInsights) {
        try { const d = await provider.hashtag(user, input.primaryKeyword); insights = extractPatterns(rankReels([...d.top, ...d.recent]), { exclude: [cleanHashtag(input.primaryKeyword)] }); } catch { insights = null; }
      }
      return generateWithAI(config, input, { insights });
    }
    consume(store, user, 'captions');
    return generateCaptions(input);
  });

  route('POST', '/api/captions/audit', async ({ body }) => {
    const caption = typeof body.caption === 'string' ? body.caption.slice(0, 5000) : '';
    if (!caption.trim()) throw new HttpError(400, 'Paste a caption to audit');
    return auditCaption(caption, { primaryKeyword: str(body.primaryKeyword, 80), secondaryKeywords: strList(body.secondaryKeywords, 8) });
  });

  route('POST', '/api/keywords/estimate', async ({ body }) => {
    const list = strList(body.keywords, 50, 80);
    return { keywords: list.map((k) => estimateKeyword(k)) };
  });

  // ----- saved library -----
  route('GET', '/api/saved', async ({ user, query }) => ({ items: store.savedFor(user.id, str(query.get('kind'), 20) || undefined).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
  route('POST', '/api/saved', async ({ user, body }) => {
    const kind = str(body.kind, 20);
    if (!['keyword', 'caption', 'hashtag'].includes(kind)) throw new HttpError(400, 'kind must be keyword, caption or hashtag');
    if (store.savedFor(user.id).length >= planOf(user).limits.saved) throw new QuotaError('saved', planOf(user).limits.saved);
    const value = str(body.value, 3000);
    if (!value) throw new HttpError(400, 'Nothing to save');
    const meta = body.meta && typeof body.meta === 'object' ? JSON.parse(JSON.stringify(body.meta).slice(0, 4000) || '{}') : {};
    return { item: store.addSaved({ id: store.id(), userId: user.id, kind, value, meta, createdAt: new Date().toISOString() }) };
  });
  route('DELETE', '/api/saved/:id', async ({ user, params }) => {
    if (!store.removeSaved(user.id, params.id)) throw new HttpError(404, 'Not found');
    return { ok: true };
  });

  // ----- billing -----
  route('POST', '/api/billing/upgrade', async ({ user, body }) => {
    const plan = str(body.plan, 20);
    if (!PLANS[plan]) throw new HttpError(400, 'Unknown plan');
    if (plan !== 'free' && config.stripeLinks[plan]) {
      const url = new URL(config.stripeLinks[plan]);
      url.searchParams.set('prefilled_email', user.email);
      url.searchParams.set('client_reference_id', user.id);
      return { checkoutUrl: url.toString() };
    }
    if (config.devSelfUpgrade || plan === 'free') return { user: publicUser(store.updateUser(user.id, { plan })), note: plan === 'free' ? 'Switched to Free.' : 'Development mode: plan switched without payment.' };
    throw new HttpError(503, 'Payments are not configured yet. Contact support to upgrade.');
  });
  route('POST', '/api/admin/plan', async ({ user, body }) => {
    if (!config.adminEmails.includes(user.email)) throw new HttpError(403, 'Admins only');
    const target = store.userByEmail(str(body.email, 254));
    if (!target || !PLANS[body.plan]) throw new HttpError(400, 'Unknown user or plan');
    store.updateUser(target.id, { plan: body.plan });
    return { ok: true };
  });

  // compile patterns
  for (const r of routes) {
    const keys = [];
    r.re = new RegExp(`^${r.pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    r.keys = keys;
  }

  // ---------- static files ----------
  const serveStatic = (req, res, pathname) => {
    let rel = decodeURIComponent(pathname);
    if (rel === '/' || !path.extname(rel)) rel = '/index.html';
    const file = path.normalize(path.join(publicDir, rel));
    if (!file.startsWith(publicDir + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': rel === '/index.html' ? 'no-cache' : 'public, max-age=3600' });
      res.end(buf);
    });
  };

  const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  };

  // ---------- request handler ----------
  const handler = async (req, res) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      return serveStatic(req, res, url.pathname);
    }
    try {
      if (!apiLimiter.check(`api:${ip(req)}`).ok) throw new HttpError(429, 'Too many requests. Slow down a little.');
      const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
      if (!r) throw new HttpError(404, 'Not found');
      // CSRF defence: state-changing requests must be same-origin JSON with our custom header.
      if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'InstaRank') throw new HttpError(403, 'Missing request header');
      const m = url.pathname.match(r.re);
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const user = currentUser(req);
      if (r.auth && !user) throw new HttpError(401, 'Please sign in');
      const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readJson(req) : {};
      const result = await r.handler({ req, res, user, body, params, query: url.searchParams });
      if (result !== undefined && !res.headersSent) send(res, 200, result);
    } catch (e) {
      const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
      if (status === 500) console.error('[error]', req.method, url.pathname, e);
      if (!res.headersSent) send(res, status, { error: status === 500 ? 'Something went wrong. Please try again.' : e.message, metric: e.metric });
      else res.end();
    }
  };

  const server = http.createServer(handler);
  setInterval(() => store.pruneSessions(), 3600_000).unref();
  return { server, store, handler };
}
