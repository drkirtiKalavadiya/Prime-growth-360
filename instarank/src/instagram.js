// Instagram Graph API client (Instagram API with Facebook Login, professional accounts).
// Endpoints used:
//   GET /ig_hashtag_search?user_id=&q=            -> hashtag id   (max 30 unique hashtags / 7 days / IG account)
//   GET /{hashtag-id}/top_media?user_id=&fields=  -> most popular posts for the hashtag
//   GET /{hashtag-id}/recent_media?user_id=&fields= -> posts from the last 24 hours
//   GET /{ig-user-id}?fields=business_discovery.username(x){...} -> public metrics of another pro account
//   GET /{ig-user-id}?fields=username,...         -> validate the token
// Required permissions: instagram_basic, pages_show_list, instagram_manage_insights (business discovery)
// and the "Instagram Public Content Access" feature for hashtag search.

export const MEDIA_FIELDS = 'id,media_type,caption,permalink,timestamp,like_count,comments_count';

export class GraphError extends Error {
  constructor(message, { status = 502, code, subcode, type } = {}) {
    super(message); this.status = status; this.code = code; this.subcode = subcode; this.type = type;
  }
}

function mapGraphError(err, httpStatus) {
  const code = err?.code;
  if (code === 190) return new GraphError('Instagram access token is invalid or expired. Reconnect it in Settings.', { status: 401, code });
  if ([4, 17, 32, 613].includes(code) || err?.error_subcode === 2207051) return new GraphError('Instagram rate limit reached. Try again in a few minutes.', { status: 429, code });
  if (code === 24 || err?.error_subcode === 2207024) return new GraphError('You have queried 30 unique hashtags in the last 7 days (Instagram limit). Reuse a recent hashtag or wait.', { status: 429, code });
  if (code === 10 || code === 200) return new GraphError('Permission missing. The token needs instagram_basic and Instagram Public Content Access.', { status: 403, code });
  if (code === 100 && err?.error_subcode === 2207013) return new GraphError('That account is not a public Business/Creator account, so it cannot be analysed.', { status: 404, code });
  return new GraphError(err?.message || `Instagram API error (HTTP ${httpStatus})`, { status: httpStatus >= 500 ? 502 : 400, code, type: err?.type });
}

export class InstagramGraph {
  constructor({ accessToken, igUserId, version = 'v23.0', fetchImpl = fetch, timeoutMs = 12000 }) {
    if (!accessToken || !igUserId) throw new Error('accessToken and igUserId are required');
    this.token = accessToken; this.igUserId = igUserId; this.base = `https://graph.facebook.com/${version}`;
    this.fetch = fetchImpl; this.timeoutMs = timeoutMs;
  }

  async get(pathname, params = {}) {
    const url = new URL(pathname.startsWith('http') ? pathname : this.base + pathname);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (!url.searchParams.has('access_token')) url.searchParams.set('access_token', this.token);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res;
    try { res = await this.fetch(url, { signal: ctrl.signal }); }
    catch (e) { throw new GraphError(e.name === 'AbortError' ? 'Instagram API timed out' : `Network error: ${e.message}`, { status: 504 }); }
    finally { clearTimeout(timer); }
    let body;
    try { body = await res.json(); } catch { body = {}; }
    if (!res.ok || body.error) throw mapGraphError(body.error, res.status);
    return body;
  }

  async account() {
    return this.get(`/${this.igUserId}`, { fields: 'id,username,name,followers_count,media_count,profile_picture_url' });
  }

  async hashtagId(name) {
    const body = await this.get('/ig_hashtag_search', { user_id: this.igUserId, q: name });
    const id = body?.data?.[0]?.id;
    if (!id) throw new GraphError(`Hashtag #${name} was not found on Instagram`, { status: 404 });
    return id;
  }

  async hashtagMedia(hashtagId, edge = 'top_media', { pages = 2 } = {}) {
    const out = [];
    let body = await this.get(`/${hashtagId}/${edge}`, { user_id: this.igUserId, fields: MEDIA_FIELDS, limit: '50' });
    for (let i = 0; ; i++) {
      out.push(...(body.data || []));
      const next = body.paging?.next;
      if (!next || i + 1 >= pages) break;
      body = await this.get(next);
    }
    return out;
  }

  async businessDiscovery(username, { limit = 30 } = {}) {
    const clean = String(username).replace(/^@/, '').trim();
    if (!/^[A-Za-z0-9._]{1,30}$/.test(clean)) throw new GraphError('Invalid Instagram username', { status: 400 });
    const fields = `business_discovery.username(${clean}){username,name,biography,followers_count,media_count,media.limit(${limit}){id,media_type,media_product_type,caption,permalink,timestamp,like_count,comments_count}}`;
    const body = await this.get(`/${this.igUserId}`, { fields });
    const bd = body.business_discovery || {};
    return { profile: { username: bd.username, name: bd.name, biography: bd.biography, followers: bd.followers_count, mediaCount: bd.media_count }, media: bd.media?.data || [] };
  }
}
