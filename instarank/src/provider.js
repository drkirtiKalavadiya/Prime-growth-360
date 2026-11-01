// Chooses live Instagram data or demo data per user, with caching and quota protection.
import { InstagramGraph, GraphError } from './instagram.js';
import { demoMedia, demoTick, demoCompetitor } from './demo.js';
import { decrypt } from './security.js';

export const cleanHashtag = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/^#/, '').replace(/[^\p{L}\p{M}\p{N}_]/gu, '');

export class TTLCache {
  constructor(ttlMs, max = 2000) { this.ttl = ttlMs; this.max = max; this.map = new Map(); }
  get(k) { const e = this.map.get(k); if (!e) return undefined; if (Date.now() > e.exp) { this.map.delete(k); return undefined; } return e.v; }
  set(k, v) { if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value); this.map.set(k, { v, exp: Date.now() + this.ttl }); return v; }
}

export class DataProvider {
  constructor({ store, config, fetchImpl = fetch }) {
    this.store = store; this.config = config; this.fetch = fetchImpl;
    this.cache = new TTLCache(config.cacheMs);
    this.inflight = new Map();
  }

  /** Returns a Graph client for the user, or null when they are in demo mode. */
  clientFor(user) {
    const ig = user?.instagram;
    if (!ig?.tokenEnc || !ig.igUserId) return null;
    return new InstagramGraph({ accessToken: decrypt(ig.tokenEnc, this.config.appSecret), igUserId: ig.igUserId, version: this.config.graphVersion, fetchImpl: this.fetch });
  }

  isLive(user) { return !!user?.instagram?.tokenEnc; }

  async once(key, fn) {
    const hit = this.cache.get(key);
    if (hit !== undefined) return { ...hit, cached: true };
    if (this.inflight.has(key)) return this.inflight.get(key);
    const p = fn().then((v) => { this.cache.set(key, v); return v; }).finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  async resolveHashtagId(client, igUserId, name) {
    let id = this.store.getHashtagId(name);
    const used = this.store.hashtagQueriesInWindow(igUserId);
    if (!used.includes(name) && used.length >= 30) {
      throw new GraphError(`Instagram allows 30 unique hashtags per 7 days per account; you have used ${used.length}. Reuse one of: ${used.slice(0, 8).map((u) => '#' + u).join(', ')}`, { status: 429 });
    }
    if (!id) { id = await client.hashtagId(name); this.store.setHashtagId(name, id); }
    this.store.logHashtagQuery(igUserId, name);
    return id;
  }

  /** { hashtag, top, recent, demo, fetchedAt } */
  async hashtag(user, rawTag, { fresh = false } = {}) {
    const name = cleanHashtag(rawTag);
    if (!name) throw new GraphError('Enter a hashtag or keyword', { status: 400 });
    const client = this.clientFor(user);
    if (!client) {
      const now = Date.now();
      const label = String(rawTag).replace(/^#/, '').toLowerCase().trim();
      return { hashtag: name, top: demoMedia(name, 'top_media', now, label), recent: demoMedia(name, 'recent_media', now, label), demo: true, fetchedAt: now };
    }
    const key = `ht:${user.instagram.igUserId}:${name}`;
    if (fresh) this.cache.map.delete(key);
    return this.once(key, async () => {
      const id = await this.resolveHashtagId(client, user.instagram.igUserId, name);
      const [top, recent] = await Promise.all([client.hashtagMedia(id, 'top_media', { pages: 1 }), client.hashtagMedia(id, 'recent_media', { pages: 4 })]);
      return { hashtag: name, top, recent, demo: false, fetchedAt: Date.now() };
    });
  }

  /** Live poll for SSE: bypasses cache for real data, simulates movement for demo data. */
  async poll(user, rawTag, prevMedia) {
    const name = cleanHashtag(rawTag);
    const client = this.clientFor(user);
    if (!client) {
      const media = prevMedia || [...demoMedia(name, 'top_media'), ...demoMedia(name, 'recent_media')];
      return { hashtag: name, media: demoTick(media), demo: true };
    }
    const id = await this.resolveHashtagId(client, user.instagram.igUserId, name);
    const [top, recent] = await Promise.all([client.hashtagMedia(id, 'top_media', { pages: 1 }), client.hashtagMedia(id, 'recent_media', { pages: 2 })]);
    const byId = new Map([...recent, ...top].map((m) => [m.id, m]));
    return { hashtag: name, media: [...byId.values()], demo: false };
  }

  async competitor(user, username) {
    const client = this.clientFor(user);
    const clean = String(username || '').replace(/^@/, '').trim().toLowerCase();
    if (!clean) throw new GraphError('Enter a username', { status: 400 });
    if (!client) return { ...demoCompetitor(clean), demo: true };
    return this.once(`bd:${user.instagram.igUserId}:${clean}`, async () => ({ ...(await client.businessDiscovery(clean)), demo: false }));
  }
}
