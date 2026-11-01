// Tiny JSON-file document store with atomic, debounced writes.
// Good for a single-instance deployment and a few thousand users. Swap this module
// for Postgres/Mongo when you scale: every caller goes through the functions below.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const EMPTY = () => ({ users: [], sessions: [], saved: [], usage: {}, hashtagIds: {}, hashtagQueries: {} });

export class Store {
  constructor(file) {
    this.file = file;
    this.data = EMPTY();
    this.timer = null;
    if (file && fs.existsSync(file)) {
      try { this.data = { ...EMPTY(), ...JSON.parse(fs.readFileSync(file, 'utf8')) }; }
      catch (e) { throw new Error(`Database file ${file} is corrupt: ${e.message}`); }
    }
  }

  save() {
    if (!this.file) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 200);
  }

  flush() {
    if (!this.file) return;
    clearTimeout(this.timer);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }

  id() { return crypto.randomUUID(); }

  // ---- users ----
  userByEmail(email) { return this.data.users.find((u) => u.email === email.toLowerCase()); }
  userById(id) { return this.data.users.find((u) => u.id === id); }
  addUser(user) { this.data.users.push(user); this.save(); return user; }
  updateUser(id, patch) {
    const u = this.userById(id);
    if (!u) return null;
    Object.assign(u, patch);
    this.save();
    return u;
  }

  // ---- sessions ----
  addSession(s) { this.data.sessions.push(s); this.save(); return s; }
  sessionByHash(hash) {
    const s = this.data.sessions.find((x) => x.hash === hash);
    if (s && s.expires < Date.now()) { this.removeSession(hash); return null; }
    return s || null;
  }
  removeSession(hash) {
    this.data.sessions = this.data.sessions.filter((x) => x.hash !== hash);
    this.save();
  }
  pruneSessions() {
    const now = Date.now();
    this.data.sessions = this.data.sessions.filter((x) => x.expires > now);
    this.save();
  }

  // ---- saved items (keywords, captions, tracked hashtags) ----
  savedFor(userId, kind) { return this.data.saved.filter((s) => s.userId === userId && (!kind || s.kind === kind)); }
  addSaved(item) { this.data.saved.push(item); this.save(); return item; }
  removeSaved(userId, id) {
    const before = this.data.saved.length;
    this.data.saved = this.data.saved.filter((s) => !(s.userId === userId && s.id === id));
    this.save();
    return before !== this.data.saved.length;
  }

  // ---- usage counters: usage[userId][YYYY-MM][metric] ----
  getUsage(userId, month) { return { ...((this.data.usage[userId] || {})[month] || {}) }; }
  incUsage(userId, month, metric, by = 1) {
    const u = (this.data.usage[userId] ||= {});
    const m = (u[month] ||= {});
    m[metric] = (m[metric] || 0) + by;
    this.save();
    return m[metric];
  }

  // ---- Instagram hashtag id cache (ids never change) and weekly query log per IG account ----
  getHashtagId(name) { return this.data.hashtagIds[name] || null; }
  setHashtagId(name, id) { this.data.hashtagIds[name] = id; this.save(); }
  logHashtagQuery(igUserId, name, now = Date.now()) {
    const log = (this.data.hashtagQueries[igUserId] ||= {});
    log[name] = now;
    this.save();
  }
  hashtagQueriesInWindow(igUserId, now = Date.now()) {
    const weekAgo = now - 7 * 24 * 3600 * 1000;
    const log = this.data.hashtagQueries[igUserId] || {};
    return Object.entries(log).filter(([, t]) => t > weekAgo).map(([n]) => n);
  }
}
