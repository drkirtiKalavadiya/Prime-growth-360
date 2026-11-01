// Loads .env (no dependency) and exposes typed configuration.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv(path.join(ROOT, '.env'));

const env = process.env;
const bool = (v, d = false) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));
const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v !== undefined ? Number(v) : d);

if (!env.APP_SECRET || env.APP_SECRET === 'change-me-to-a-long-random-string') {
  if (env.NODE_ENV === 'production') throw new Error('APP_SECRET must be set in production');
  console.warn('[config] APP_SECRET is not set; using an insecure development secret.');
}

export const config = {
  root: ROOT,
  port: num(env.PORT, 3000),
  appSecret: env.APP_SECRET && env.APP_SECRET !== 'change-me-to-a-long-random-string' ? env.APP_SECRET : 'dev-only-insecure-secret',
  cookieSecure: bool(env.COOKIE_SECURE, false),
  dataFile: path.resolve(ROOT, env.DATA_FILE || './data/db.json'),
  graphVersion: env.GRAPH_API_VERSION || 'v23.0',
  liveIntervalSec: Math.max(30, num(env.LIVE_INTERVAL_SECONDS, 60)),
  demoLiveIntervalSec: 8,
  cacheMs: Math.max(1, num(env.CACHE_MINUTES, 5)) * 60_000,
  enableWebSuggest: bool(env.ENABLE_WEB_SUGGEST, true),
  anthropicKey: env.ANTHROPIC_API_KEY || '',
  claudeModel: env.CLAUDE_MODEL || 'claude-opus-5-5',
  stripeLinks: { pro: env.STRIPE_LINK_PRO || '', agency: env.STRIPE_LINK_AGENCY || '' },
  devSelfUpgrade: bool(env.DEV_ALLOW_SELF_UPGRADE, env.NODE_ENV !== 'production'),
  // Personal mode: single owner, no login, no plans, no billing, unlimited usage.
  personalMode: bool(env.PERSONAL_MODE, false),
  adminEmails: (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
};
