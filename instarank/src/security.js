// Password hashing, session tokens, at-rest encryption and rate limiting.
import crypto from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [alg, saltB64, hashB64] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return crypto.timingSafeEqual(expected, actual);
}

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// AES-256-GCM for secrets at rest (Instagram access tokens).
function keyFrom(secret) { return crypto.createHash('sha256').update(`instarank:enc:${secret}`).digest(); }

export function encrypt(plain, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${enc.toString('base64url')}`;
}

export function decrypt(blob, secret) {
  const [v, iv, tag, data] = String(blob || '').split('.');
  if (v !== 'v1') throw new Error('Unknown ciphertext format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

// Fixed-window rate limiter keyed by any string (ip + route group).
export class RateLimiter {
  constructor({ windowMs, max }) { this.windowMs = windowMs; this.max = max; this.hits = new Map(); }
  check(key, now = Date.now()) {
    let e = this.hits.get(key);
    if (!e || now - e.start >= this.windowMs) { e = { start: now, count: 0 }; this.hits.set(key, e); }
    e.count += 1;
    if (this.hits.size > 50_000) for (const [k, v] of this.hits) if (now - v.start >= this.windowMs) this.hits.delete(k);
    return { ok: e.count <= this.max, retryAfter: Math.ceil((e.start + this.windowMs - now) / 1000) };
  }
}

export const isEmail = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
