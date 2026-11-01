// InstaRank front-end (vanilla JS, no build step).
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => (n == null ? '–' : Intl.NumberFormat('en', { notation: Math.abs(n) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n));
const ago = (iso) => { const h = (Date.now() - Date.parse(iso)) / 36e5; return h < 1 ? `${Math.max(1, Math.round(h * 60))}m ago` : h < 48 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`; };
const safeUrl = (u) => (/^https:\/\/(www\.)?instagram\.com\//.test(u || '') ? u : '#');

const state = { me: null, live: null, prefill: null };

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method, credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json', 'X-Requested-With': 'InstaRank' } : { 'X-Requested-With': 'InstaRank' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth')) showAuth();
    const err = new Error(data.error || `Request failed (${res.status})`); err.status = res.status; throw err;
  }
  return data;
}

let toastTimer;
function toast(msg, isErr = false) {
  const t = $('#toast'); t.textContent = msg; t.className = `toast show${isErr ? ' err' : ''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = 'toast'), 3200);
}
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); } catch { toast('Copy failed: select and copy manually', true); } }
async function save(kind, value, meta = {}) { try { await api('/api/saved', { method: 'POST', body: { kind, value, meta } }); toast('Saved ⭐'); } catch (e) { toast(e.message, true); } }

async function busy(btn, fn) {
  const label = btn?.innerHTML; if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }
  try { return await fn(); } catch (e) { toast(e.message, true); if (e.status === 402) location.hash = '#settings'; return null; }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = label; } }
}

const meter = (v, inv = false) => `<span class="meter${inv ? ' inv' : ''}" title="${v}/100"><span style="width:${Math.max(2, Math.min(100, v))}%"></span></span> <span class="num small">${Math.round(v)}</span>`;
const ring = (score) => `<div class="score-ring" style="--p:${score}"><b>${score}</b></div>`;

// ---------------- auth ----------------
let authMode = 'login';
function showAuth() { stopLive(); $('#app').classList.add('hidden'); $('#auth').classList.remove('hidden'); }
function setAuthMode(mode) {
  authMode = mode;
  $$('[data-auth-tab]').forEach((b) => b.classList.toggle('active', b.dataset.authTab === mode));
  $$('.signup-only').forEach((el) => el.classList.toggle('hidden', mode !== 'signup'));
  $('#authSubmit').textContent = mode === 'signup' ? 'Create free account' : 'Sign in';
  $('#authForm [name=password]').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
  $('#authError').textContent = '';
}
$$('[data-auth-tab]').forEach((b) => b.addEventListener('click', () => setAuthMode(b.dataset.authTab)));
$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  $('#authError').textContent = '';
  await busy($('#authSubmit'), async () => {
    try { await api(`/api/auth/${authMode}`, { method: 'POST', body: Object.fromEntries(f) }); await boot(); }
    catch (err) { $('#authError').textContent = err.message; }
  });
});
$('#logoutBtn').addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST', body: {} }).catch(() => {}); showAuth(); });
$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

async function refreshMe() {
  state.me = await api('/api/me');
  const { user, plan, live } = state.me;
  $('#whoami').textContent = user.personal ? 'Personal mode' : user.email;
  $('#logoutBtn').classList.toggle('hidden', !!user.personal);
  $('#planBadge').textContent = plan.name;
  $('#modeBadge').className = `badge ${live ? 'live' : 'demo'}`;
  $('#modeBadge').textContent = live ? `● Live: @${user.instagram.username}` : '● Demo data';
  $('#demoBanner').classList.toggle('hidden', live);
}

async function boot() {
  try { await refreshMe(); } catch { return showAuth(); }
  $('#auth').classList.add('hidden'); $('#app').classList.remove('hidden');
  route();
}

// ---------------- router ----------------
const VIEWS = {
  dashboard: ['Dashboard', viewDashboard], keywords: ['Keyword Research', viewKeywords], reels: ['Trending Reels', viewReels],
  live: ['Live Reel Tracker', viewLive], competitors: ['Competitor Reels', viewCompetitors], captions: ['SEO + AEO Caption Studio', viewCaptions],
  audit: ['Caption Audit', viewAudit], saved: ['Saved Library', viewSaved], settings: ['Settings & Plan', viewSettings],
};
function route() {
  const [name, query] = (location.hash.slice(1) || 'dashboard').split('?');
  const [title, fn] = VIEWS[name] || VIEWS.dashboard;
  if (name !== 'live') stopLive();
  $('#viewTitle').textContent = title;
  $$('.sidebar nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === (VIEWS[name] ? name : 'dashboard')));
  $('#sidebar').classList.remove('open');
  const view = $('#view'); view.innerHTML = '';
  fn(view, new URLSearchParams(query || ''));
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => { if (state.me) route(); });

// ---------------- dashboard ----------------
async function viewDashboard(v) {
  await refreshMe().catch(() => {});
  const { usage, plan, live, ai, user } = state.me;
  const saved = await api('/api/saved').catch(() => ({ items: [] }));
  v.innerHTML = `
    <div class="stack">
      <div class="card"><div class="row"><div><h3>Welcome, ${esc(user.name)} 👋</h3>
        <p class="muted">Find keywords people search on Instagram, see which Reels are winning right now, then publish captions built to rank and get quoted.</p></div>
        <div class="spacer"></div><span class="badge ${live ? 'live' : 'demo'}">${live ? 'Live Instagram data' : 'Demo mode'}</span>
        <span class="badge">${ai ? 'AI captions on' : 'Template captions'}</span></div></div>
      <div class="grid g4">
        ${[['🔍', 'Research a keyword', '#keywords'], ['🔥', 'See trending Reels', '#reels'], ['📡', 'Start live tracker', '#live'], ['✍️', 'Write a caption', '#captions']]
          .map(([i, t, h]) => `<a class="card" href="${h}" style="text-decoration:none;color:inherit"><div style="font-size:26px">${i}</div><b>${t}</b></a>`).join('')}
      </div>
      <div class="grid g2">
        <div class="card"><h3>This month's usage <span class="badge plan">${esc(plan.name)}</span></h3>
          ${usage.map((u) => `<div class="bar-row"><span>${esc(u.label)}</span><div class="bar"><span style="width:${Math.min(100, (u.used / u.limit) * 100)}%"></span></div><span class="num small">${u.used}/${u.limit >= 1e9 ? "∞" : fmt(u.limit)}</span></div>`).join('')}
          ${user.personal ? '' : '<a href="#settings" class="btn small">Upgrade plan</a>'}</div>
        <div class="card"><h3>Recently saved</h3>
          ${saved.items.length ? `<ul class="checklist">${saved.items.slice(0, 8).map((s) => `<li><span class="badge">${esc(s.kind)}</span> ${esc(s.value.slice(0, 80))}</li>`).join('')}</ul>` : '<p class="empty">Nothing saved yet. Star keywords and captions to build your library.</p>'}</div>
      </div>
      <div class="card"><h3>Your Instagram SEO playbook</h3>
        <ol class="small">
          <li><b>Pick 1 primary keyword</b> with high opportunity (Keyword Research) and 2-3 related ones.</li>
          <li><b>Put the keyword everywhere Instagram reads:</b> first line of the caption, on-screen text, spoken in the first 3 seconds, alt text, and your profile name field.</li>
          <li><b>Answer the question (AEO):</b> include the exact question people search and a 1-2 sentence direct answer.</li>
          <li><b>Use 3-5 specific hashtags</b>: one broad, two niche, one long-tail/local.</li>
          <li><b>Post while the topic is rising:</b> watch the Live Tracker, copy the pattern, not the content.</li>
        </ol></div>
    </div>`;
}

// ---------------- keyword research ----------------
function viewKeywords(v, q) {
  v.innerHTML = `
    <div class="stack">
      <form class="card inline-form" id="kwForm">
        <label>Seed keyword<input name="seed" required maxlength="80" placeholder="e.g. home workout, skincare routine, digital marketing" value="${esc(q.get('seed') || '')}"></label>
        <label style="flex:0 1 220px">Location (optional)<input name="location" maxlength="60" placeholder="e.g. mumbai"></label>
        <button class="btn primary" id="kwBtn">Research</button>
      </form>
      <div id="kwOut"></div>
    </div>`;
  $('#kwForm').addEventListener('submit', (e) => { e.preventDefault(); runKeywordResearch(new FormData(e.target)); });
  if (q.get('seed')) runKeywordResearch(new FormData($('#kwForm')));
}

let kwRows = []; let kwSort = { key: 'opportunity', dir: -1 };
async function runKeywordResearch(f) {
  const seed = f.get('seed'); const location = f.get('location') || '';
  const data = await busy($('#kwBtn'), () => api(`/api/keywords/research?seed=${encodeURIComponent(seed)}&location=${encodeURIComponent(location)}`));
  if (!data) return;
  kwRows = data.keywords;
  $('#kwOut').innerHTML = `
    <div class="grid g3">
      <div class="card stat"><div class="value">${data.count}</div><div class="label">Keyword ideas</div></div>
      <div class="card stat"><div class="value">${data.suggestionsFound}</div><div class="label">Real search phrases found${data.suggestionsFound ? '' : `<br><span class="small">${data.webSuggest ? 'Autocomplete source unreachable right now; showing pattern ideas.' : 'Live autocomplete is turned off on this server.'}</span>`}</div></div>
      <div class="card stat"><div class="value">${data.questions.length}</div><div class="label">Question keywords (AEO)</div></div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><div class="copy-row"><h3>Suggested hashtag set</h3><button class="btn small" data-copy="${esc(data.hashtagSet.join(' '))}">Copy</button></div>
        <div class="chips">${data.hashtagSet.map((h) => `<span class="chip">${esc(h)}</span>`).join('')}</div>
        <p class="muted small">Instagram allows up to 5 hashtags. Mix 1 broad, 2 niche and 1 long-tail or local tag.</p></div>
      <div class="card"><h3>Questions people ask (use in captions for AEO)</h3>
        <div class="chips">${data.questions.map((qq) => `<button class="chip" data-caption="${esc(qq)}">${esc(qq)}</button>`).join('') || '<span class="muted">No question keywords found.</span>'}</div></div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="row"><h3>Keyword opportunities</h3><div class="spacer"></div><span class="muted small">Scores are estimates until you click <b>Analyze live</b>.</span></div>
      <div class="table-wrap"><table><thead><tr>
        <th data-sort="keyword">Keyword</th><th data-sort="intent">Intent</th><th data-sort="opportunity">Opportunity</th>
        <th data-sort="competition">Competition</th><th data-sort="aeoScore">AEO fit</th><th data-sort="source">Source</th><th></th></tr></thead>
        <tbody id="kwBody"></tbody></table></div>
    </div>
    <div id="kwLive"></div>`;
  renderKwTable();
  $$('#kwOut th[data-sort]').forEach((th) => th.addEventListener('click', () => { const k = th.dataset.sort; kwSort = { key: k, dir: kwSort.key === k ? -kwSort.dir : -1 }; renderKwTable(); }));
  wireCommon($('#kwOut'));
}

function renderKwTable() {
  const { key, dir } = kwSort;
  const rows = [...kwRows].sort((a, b) => (typeof a[key] === 'number' ? (a[key] - b[key]) : String(a[key]).localeCompare(String(b[key]))) * dir);
  $('#kwBody').innerHTML = rows.map((r) => `
    <tr><td><b>${esc(r.keyword)}</b><div class="muted small">${esc(r.hashtag)}</div></td>
      <td><span class="badge">${esc(r.intent)}</span></td>
      <td>${meter(r.opportunity)}</td><td>${meter(r.competition, true)}</td><td>${meter(r.aeoScore)}</td>
      <td><span class="badge ${r.source === 'autocomplete' ? 'live' : ''}">${r.source === 'autocomplete' ? 'real search' : 'pattern'}</span></td>
      <td class="row" style="flex-wrap:nowrap">
        <button class="btn small" data-analyze="${esc(r.keyword)}">Analyze live</button>
        <button class="btn small ghost" data-caption="${esc(r.keyword)}" title="Write caption">✍️</button>
        <button class="btn small ghost" data-save-kw="${esc(r.keyword)}" title="Save">⭐</button></td></tr>`).join('');
  wireCommon($('#kwBody'));
}

async function analyzeKeyword(keyword, btn) {
  const d = await busy(btn, () => api('/api/keywords/analyze', { method: 'POST', body: { keyword } }));
  if (!d) return;
  const row = kwRows.find((r) => r.keyword === keyword);
  if (row) Object.assign(row, { opportunity: d.opportunity, competition: d.competition });
  renderKwTable();
  $('#kwLive').innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="row"><h3>Live analysis: ${esc(d.keyword)} <span class="muted">(${esc(d.hashtag)})</span></h3><div class="spacer"></div>
        <span class="badge ${d.demo ? 'demo' : 'live'}">${d.demo ? 'demo data' : 'live Instagram data'}</span><span class="badge ${d.difficulty}">${d.difficulty}</span></div>
      <div class="grid g4">
        <div class="stat"><div class="value">${d.opportunity}</div><div class="label">Opportunity score</div></div>
        <div class="stat"><div class="value">${fmt(d.stats.posts24h)}${d.stats.posts24h >= d.stats.sampledRecent && d.stats.sampledRecent >= 50 ? '+' : ''}</div><div class="label">Posts in last 24h (sampled)</div></div>
        <div class="stat"><div class="value">${fmt(d.stats.medianTopEngagement)}</div><div class="label">Median top-post engagement to beat</div></div>
        <div class="stat"><div class="value">${d.stats.reelShare}%</div><div class="label">Of top posts are Reels</div></div>
      </div>
      ${patternsHtml(d.patterns)}
    </div>`;
  wireCommon($('#kwLive'));
  $('#kwLive').scrollIntoView({ behavior: 'smooth' });
}

function patternsHtml(p) {
  if (!p) return '';
  const hours = p.bestHoursUtc.map((h) => { const d = new Date(); d.setUTCHours(h, 0, 0, 0); return d.toLocaleTimeString([], { hour: 'numeric' }); });
  return `
    <h4 style="margin-top:16px">What the top Reels have in common</h4>
    <div class="grid g2">
      <div><p class="muted small">Co-used hashtags</p><div class="chips">${p.hashtags.map((h) => `<span class="chip">${esc(h.term)} <span class="muted">×${h.count}</span></span>`).join('') || '–'}</div>
        <p class="muted small" style="margin-top:12px">Recurring words in captions</p><div class="chips">${p.keywords.map((h) => `<button class="chip" data-caption="${esc(h.term)}">${esc(h.term)}</button>`).join('') || '–'}</div></div>
      <div><dl class="kv">
        <dt>Captions with a question</dt><dd>${p.questionRate}%</dd><dt>Captions with a CTA</dt><dd>${p.ctaRate}%</dd>
        <dt>Median caption length</dt><dd>${p.medianCaptionLength} chars</dd><dt>Median hashtags</dt><dd>${p.medianHashtags}</dd>
        <dt>Best posting hours</dt><dd>${hours.join(', ') || '–'} <span class="muted small">(your time)</span></dd></dl></div>
    </div>
    ${p.hooks.length ? `<p class="muted small" style="margin-top:12px">Winning hook lines (copy the pattern, not the words)</p><ul class="checklist">${p.hooks.map((h) => `<li>“${esc(h.text)}”</li>`).join('')}</ul>` : ''}`;
}

// ---------------- trending reels ----------------
function viewReels(v, q) {
  v.innerHTML = `
    <div class="stack">
      <form class="card inline-form" id="reelForm">
        <label>Hashtag or keyword<input name="hashtag" required maxlength="40" placeholder="e.g. skincare, fitnessmotivation" value="${esc(q.get('hashtag') || '')}"></label>
        <button class="btn primary" id="reelBtn">Find trending Reels</button>
      </form>
      <div id="reelOut"></div>
    </div>`;
  const run = async () => {
    const tag = new FormData($('#reelForm')).get('hashtag');
    const d = await busy($('#reelBtn'), () => api(`/api/reels/trending?hashtag=${encodeURIComponent(tag)}`));
    if (!d) return;
    $('#reelOut').innerHTML = `
      <div class="grid g4">
        <div class="card stat"><div class="value">${d.counts.reels}</div><div class="label">Reels analysed</div></div>
        <div class="card stat"><div class="value">${d.counts.breakout}</div><div class="label">🔥 Breakout (under 48h)</div></div>
        <div class="card stat"><div class="value">${d.counts.rising}</div><div class="label">📈 Rising</div></div>
        <div class="card stat"><div class="value"><span class="badge ${d.demo ? 'demo' : 'live'}">${d.demo ? 'demo' : 'live'}</span></div><div class="label">Updated ${ago(new Date(d.fetchedAt).toISOString())}</div></div>
      </div>
      <div class="card" style="margin-top:16px"><div class="row"><h3>Patterns behind ${esc(d.hashtag)}</h3><div class="spacer"></div>
        <a class="btn small" href="#live?hashtags=${encodeURIComponent(d.hashtag.slice(1))}">📡 Track live</a>
        <a class="btn small" href="#captions?kw=${encodeURIComponent(d.hashtag.slice(1))}">✍️ Write caption</a></div>${patternsHtml(d.patterns)}</div>
      <div class="grid g3" style="margin-top:16px">${d.reels.map(reelCard).join('')}</div>`;
    wireCommon($('#reelOut'));
  };
  $('#reelForm').addEventListener('submit', (e) => { e.preventDefault(); run(); });
  if (q.get('hashtag')) run();
}

function reelCard(r) {
  return `<div class="card reel-card">
    <div class="row"><span class="badge ${r.status}">${esc(r.status)}</span><span class="muted small">${ago(r.timestamp)}</span><div class="spacer"></div><span class="small num">score ${fmt(r.trendScore)}</span></div>
    <div class="cap">${esc(r.caption || '(no caption)')}</div>
    <div class="metrics"><span>❤️ ${fmt(r.like_count)}</span><span>💬 ${fmt(r.comments_count)}</span><span>⚡ ${fmt(r.velocity)}/h</span></div>
    <div class="row"><a class="btn small" href="${esc(safeUrl(r.permalink))}" target="_blank" rel="noopener noreferrer">Open ↗</a>
      <button class="btn small ghost" data-audit-text="${esc(r.caption || '')}">Audit caption</button></div></div>`;
}

// ---------------- live tracker ----------------
function stopLive() { if (state.live) { state.live.close(); state.live = null; } }
function viewLive(v, q) {
  const limit = state.me?.plan?.limits?.liveTracks ?? 1;
  v.innerHTML = `
    <div class="stack">
      <form class="card inline-form" id="liveForm">
        <label>Hashtags to track (comma separated, up to ${limit} on your plan)<input name="hashtags" required placeholder="e.g. skincare, glowup" value="${esc(q.get('hashtags') || '')}"></label>
        <button class="btn primary" id="liveStart">Start live tracking</button>
        <button class="btn" type="button" id="liveStop" disabled>Stop</button>
      </form>
      <p class="muted small">The board refreshes automatically and ranks Reels by <b>engagement gained per minute</b> since the last refresh: what is performing right now, not last week.</p>
      <div id="liveOut" class="stack"></div>
    </div>`;
  const start = () => {
    stopLive();
    const tags = new FormData($('#liveForm')).get('hashtags');
    $('#liveOut').innerHTML = '<div class="card empty"><span class="spinner"></span> Connecting…</div>';
    const es = new EventSource(`/api/reels/live?hashtags=${encodeURIComponent(tags)}`);
    state.live = es; $('#liveStop').disabled = false; let first = true;
    es.addEventListener('update', (ev) => {
      const d = JSON.parse(ev.data);
      if (first) { $('#liveOut').innerHTML = ''; first = false; }
      const id = `live-${d.hashtag.slice(1)}`;
      let box = document.getElementById(id);
      if (!box) { box = document.createElement('div'); box.id = id; box.className = 'card'; $('#liveOut').append(box); }
      box.innerHTML = `<div class="row"><span class="pulse"></span><h3 style="margin:0">${esc(d.hashtag)}</h3><span class="badge ${d.demo ? 'demo' : 'live'}">${d.demo ? 'demo' : 'live'}</span>
        <div class="spacer"></div><span class="muted small">Updated ${new Date(d.at).toLocaleTimeString()} · every ${d.intervalSec}s</span></div>
        <div class="table-wrap"><table><thead><tr><th>#</th><th>Reel</th><th>Status</th><th>Gained</th><th>Per min</th><th>Likes</th><th>Comments</th><th>Age</th><th></th></tr></thead><tbody>
        ${d.reels.map((r, i) => `<tr class="${r.gained > 0 ? 'flash' : ''}"><td>${i + 1}</td><td style="max-width:320px"><div class="small">${esc((r.caption || '').split('\n')[0].slice(0, 90))}</div></td>
          <td><span class="badge ${r.status}">${esc(r.status)}</span>${r.isNew ? ' <span class="badge live">new</span>' : ''}</td>
          <td class="num ${r.gained > 0 ? 'up' : ''}">${r.perMinute == null ? '–' : `+${fmt(r.gained)}`}</td>
          <td class="num ${r.perMinute > 0 ? 'up' : ''}">${r.perMinute == null ? '<span class="muted small">baseline</span>' : fmt(r.perMinute)}</td>
          <td class="num">${fmt(r.like_count)}</td><td class="num">${fmt(r.comments_count)}</td><td class="small">${ago(r.timestamp)}</td>
          <td><a class="btn small ghost" href="${esc(safeUrl(r.permalink))}" target="_blank" rel="noopener noreferrer">↗</a></td></tr>`).join('')}
        </tbody></table></div>`;
    });
    es.addEventListener('error', (ev) => {
      if (ev.data) { const d = JSON.parse(ev.data); toast(`${d.hashtag}: ${d.error}`, true); return; }
      if (es.readyState === EventSource.CLOSED) { toast('Live connection closed. Check your plan limit and try again.', true); $('#liveStop').disabled = true; }
    });
  };
  $('#liveForm').addEventListener('submit', (e) => { e.preventDefault(); start(); });
  $('#liveStop').addEventListener('click', () => { stopLive(); $('#liveStop').disabled = true; toast('Live tracking stopped'); });
  if (q.get('hashtags')) start();
}

// ---------------- competitors ----------------
function viewCompetitors(v) {
  v.innerHTML = `
    <div class="stack">
      <form class="card inline-form" id="compForm">
        <label>Competitor username (public Business or Creator account)<input name="username" required maxlength="40" placeholder="@username"></label>
        <button class="btn primary" id="compBtn">Analyse</button>
      </form>
      <div id="compOut"></div>
    </div>`;
  $('#compForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = new FormData(e.target).get('username');
    const d = await busy($('#compBtn'), () => api(`/api/competitors?username=${encodeURIComponent(u)}`));
    if (!d) return;
    $('#compOut').innerHTML = `
      <div class="grid g4">
        <div class="card stat"><div class="value">@${esc(d.profile.username)}</div><div class="label">${esc(d.profile.name || '')} <span class="badge ${d.demo ? 'demo' : 'live'}">${d.demo ? 'demo' : 'live'}</span></div></div>
        <div class="card stat"><div class="value">${fmt(d.profile.followers)}</div><div class="label">Followers</div></div>
        <div class="card stat"><div class="value">${fmt(d.summary.avgEngagement)}</div><div class="label">Avg engagement / post</div></div>
        <div class="card stat"><div class="value">${d.summary.engagementRate ?? '–'}%</div><div class="label">Engagement rate</div></div>
      </div>
      <div class="card" style="margin-top:16px"><h3>Their best Reels right now</h3>${patternsHtml(d.patterns)}</div>
      <div class="grid g3" style="margin-top:16px">${d.reels.map(reelCard).join('')}</div>`;
    wireCommon($('#compOut'));
  });
}

// ---------------- caption studio ----------------
function viewCaptions(v, q) {
  const ai = state.me?.ai;
  const pf = state.prefill || {}; state.prefill = null;
  v.innerHTML = `
    <div class="grid g2" style="align-items:start">
      <form class="card" id="capForm">
        <label>Primary keyword *<input name="primaryKeyword" required maxlength="80" value="${esc(q.get('kw') || pf.kw || '')}" placeholder="e.g. skincare routine for oily skin"></label>
        <label>Related keywords (comma separated)<input name="secondaryKeywords" maxlength="400" placeholder="e.g. oily skin tips, best face wash, how to reduce oil"></label>
        <label>What is the Reel about?<input name="topic" maxlength="200" placeholder="e.g. my 3-step morning routine that stopped my shine"></label>
        <label>Key points / tips (one per line)<textarea name="keyPoints" placeholder="Use a gel cleanser twice a day&#10;Don't skip moisturiser&#10;Blot, don't wipe"></textarea></label>
        <label>Direct answer (1-2 sentences, optional)<input name="answer" maxlength="400" placeholder="The short answer people are searching for"></label>
        <div class="grid g2">
          <label>Audience<input name="audience" maxlength="80" placeholder="e.g. college students"></label>
          <label>Location<input name="location" maxlength="60" placeholder="e.g. Ahmedabad"></label>
          <label>Tone<select name="tone"><option value="educational">Educational</option><option value="friendly">Friendly</option><option value="bold">Bold</option><option value="professional">Professional</option></select></label>
          <label>Call to action<select name="cta"><option value="save">Save &amp; share</option><option value="comment">Comment</option><option value="follow">Follow</option><option value="dm">Comment keyword for DM</option><option value="shop">Shop / link in bio</option></select></label>
          <label>Brand (optional)<input name="brand" maxlength="40"></label>
          <label>Language<input name="language" maxlength="30" value="English"></label>
        </div>
        <label class="check"><input type="checkbox" name="useAI" ${ai ? '' : 'disabled'}> Write with AI ${ai ? '' : '<span class="muted small">(not configured on this server)</span>'}</label>
        <label class="check"><input type="checkbox" name="useLiveInsights" ${ai ? '' : 'disabled'}> Teach the AI what top Reels for this keyword do</label>
        <button class="btn primary block" id="capBtn">Generate captions</button>
      </form>
      <div id="capOut" class="stack"><div class="card empty">Your SEO + AEO captions will appear here, each with a ranking score and fixes.</div></div>
    </div>`;
  $('#capForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = Object.fromEntries(f);
    body.secondaryKeywords = String(body.secondaryKeywords || '').split(',').map((s) => s.trim()).filter(Boolean);
    body.keyPoints = String(body.keyPoints || '').split('\n').map((s) => s.trim()).filter(Boolean);
    body.useAI = f.get('useAI') === 'on'; body.useLiveInsights = f.get('useLiveInsights') === 'on';
    const d = await busy($('#capBtn'), () => api('/api/captions/generate', { method: 'POST', body }));
    if (!d) return;
    renderCaptions(d, body);
  });
}

function renderCaptions(d, input) {
  const ex = d.extras || {};
  $('#capOut').innerHTML = `
    ${d.variants.map((vv) => `
      <div class="card">
        <div class="row">${ring(vv.audit.score)}<div><h3 style="margin:0">${esc(vv.label)}</h3><span class="muted small">Grade ${vv.audit.grade} · ${vv.audit.stats.characters} chars · ${vv.audit.stats.hashtags} hashtags</span></div>
          <div class="spacer"></div><button class="btn small" data-copy="${esc(vv.caption)}">Copy</button><button class="btn small ghost" data-save-cap="${esc(vv.caption)}" data-kw="${esc(d.primaryKeyword)}">⭐</button></div>
        <div class="caption-out" style="margin-top:12px">${esc(vv.caption)}</div>
        <details style="margin-top:10px"><summary>SEO/AEO checklist</summary>${checklistHtml(vv.audit)}</details>
      </div>`).join('')}
    <div class="card"><h3>Make Instagram read your keyword everywhere</h3>
      <dl class="kv">
        ${ex.onScreenText ? `<dt>On-screen text</dt><dd>${esc(ex.onScreenText)}</dd>` : ''}
        ${ex.spokenHook ? `<dt>Spoken hook</dt><dd>${esc(ex.spokenHook)}</dd>` : ''}
        ${ex.altText ? `<dt>Alt text</dt><dd>${esc(ex.altText)}</dd>` : ''}
        ${ex.coverTitle ? `<dt>Cover title</dt><dd>${esc(ex.coverTitle)}</dd>` : ''}
        ${ex.profileNameField ? `<dt>Profile name field</dt><dd>${esc(ex.profileNameField)}</dd>` : ''}
        ${ex.bioLine ? `<dt>Bio line</dt><dd>${esc(ex.bioLine)}</dd>` : ''}
        ${ex.fileName ? `<dt>Video file name</dt><dd>${esc(ex.fileName)}</dd>` : ''}
      </dl></div>
    ${d.faq?.length ? `<div class="card"><h3>FAQ block (AEO): add to captions, carousels or comments</h3>${d.faq.map((f) => `<p><b>${esc(f.q)}</b><br>${esc(f.a)}</p>`).join('')}</div>` : ''}
    <p class="muted small">Engine: ${d.engine === 'ai' ? `AI (${esc(d.model || '')})` : 'SEO template'}. Replace any [bracketed] text with your own words before posting.</p>`;
  wireCommon($('#capOut'));
}

function checklistHtml(a) {
  return `<ul class="checklist">${a.checks.map((c) => `<li class="${c.pass ? 'ok' : 'no'}"><span>${esc(c.label)} <span class="muted small">(${c.weight} pts)</span>${c.pass ? '' : `<br><span class="muted small">${esc(c.tip)}</span>`}</span></li>`).join('')}</ul>`;
}

// ---------------- audit ----------------
function viewAudit(v) {
  const pre = state.prefill?.audit || ''; state.prefill = null;
  v.innerHTML = `
    <div class="grid g2" style="align-items:start">
      <form class="card" id="auditForm">
        <label>Caption<textarea name="caption" required style="min-height:260px" placeholder="Paste a caption">${esc(pre)}</textarea></label>
        <label>Primary keyword<input name="primaryKeyword" maxlength="80"></label>
        <label>Related keywords (comma separated)<input name="secondaryKeywords" maxlength="400"></label>
        <button class="btn primary block" id="auditBtn">Score caption</button>
      </form>
      <div id="auditOut"><div class="card empty">Get a 0-100 Instagram SEO + AEO score with exact fixes.</div></div>
    </div>`;
  $('#auditForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    b.secondaryKeywords = String(b.secondaryKeywords || '').split(',').map((s) => s.trim()).filter(Boolean);
    const a = await busy($('#auditBtn'), () => api('/api/captions/audit', { method: 'POST', body: b }));
    if (!a) return;
    $('#auditOut').innerHTML = `<div class="card stack">
      <div class="row">${ring(a.score)}<div><h3 style="margin:0">Grade ${a.grade}</h3><span class="muted small">${a.stats.characters} chars · ${a.stats.words} words · ${a.stats.hashtags} hashtags · keyword ×${a.stats.keywordCount}</span></div></div>
      ${a.fixes.length ? `<div><h4>Top fixes</h4><ol class="small">${a.fixes.map((f) => `<li>${esc(f)}</li>`).join('')}</ol></div>` : '<p class="up">Excellent: this caption passes every check.</p>'}
      <div><h4>Preview (first 125 characters shown before "more")</h4><div class="caption-out">${esc(a.stats.previewText)}…</div></div>
      ${checklistHtml(a)}</div>`;
  });
}

// ---------------- saved ----------------
async function viewSaved(v) {
  const d = await api('/api/saved').catch((e) => (toast(e.message, true), { items: [] }));
  v.innerHTML = `<div class="card">${d.items.length ? `<div class="table-wrap"><table><thead><tr><th>Type</th><th>Item</th><th>Saved</th><th></th></tr></thead><tbody>
    ${d.items.map((s) => `<tr><td><span class="badge">${esc(s.kind)}</span></td><td style="white-space:pre-wrap;max-width:600px" class="small">${esc(s.value.slice(0, 400))}${s.value.length > 400 ? '…' : ''}</td>
      <td class="small">${ago(s.createdAt)}</td><td class="row" style="flex-wrap:nowrap"><button class="btn small" data-copy="${esc(s.value)}">Copy</button>
      ${s.kind === 'keyword' ? `<button class="btn small ghost" data-caption="${esc(s.value)}">✍️</button>` : ''}
      <button class="btn small ghost" data-del="${esc(s.id)}">🗑</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">Nothing saved yet.</p>'}</div>`;
  wireCommon(v);
  $$('[data-del]', v).forEach((b) => b.addEventListener('click', async () => { await busy(b, () => api(`/api/saved/${encodeURIComponent(b.dataset.del)}`, { method: 'DELETE', body: {} })); viewSaved(v); }));
}

// ---------------- settings ----------------
async function viewSettings(v) {
  await refreshMe().catch(() => {});
  const { user, plan } = state.me;
  const plans = await api('/api/plans');
  const ig = user.instagram;
  v.innerHTML = `
    <div class="stack">
      <div class="grid g2" style="align-items:start">
        <div class="card"><h3>Instagram connection</h3>
          ${ig.connected ? `<p><span class="badge live">Connected</span> @${esc(ig.username)} <span class="muted small">(ID ${esc(ig.igUserId)})</span></p>
            <button class="btn" id="igDisconnect">Disconnect</button>` : `
          <form id="igForm">
            <label>Long-lived access token<input name="accessToken" type="password" required autocomplete="off"></label>
            <label>Instagram Business Account ID<input name="igUserId" required inputmode="numeric" pattern="\\d{5,25}" placeholder="17841400000000000"></label>
            <button class="btn primary" id="igBtn">Connect</button>
          </form>
          <details style="margin-top:12px"><summary>How do I get these?</summary><ol class="small">
            <li>Switch your Instagram to a <b>Business</b> or <b>Creator</b> account and link it to a Facebook Page.</li>
            <li>Create an app at <b>developers.facebook.com</b> → add the <b>Instagram</b> product (Instagram API with Facebook Login).</li>
            <li>Request permissions <code>instagram_basic</code>, <code>pages_show_list</code>, <code>instagram_manage_insights</code> and the <b>Instagram Public Content Access</b> feature (needed for hashtag search).</li>
            <li>In Graph API Explorer generate a User token, exchange it for a <b>long-lived token</b> (60 days).</li>
            <li>Call <code>GET /me/accounts?fields=instagram_business_account</code> to get your numeric Instagram Business Account ID.</li>
          </ol><p class="muted small">Your token is encrypted (AES-256-GCM) before it is stored. Instagram allows 30 unique hashtag lookups per 7 days per account; InstaRank caches results to save that budget.</p></details>`}
        </div>
        <div class="card"><h3>Profile</h3>
          <form id="profileForm" class="${user.personal ? 'hidden' : ''}"><label>Name<input name="name" maxlength="80" value="${esc(user.name)}"></label><label>Email<input value="${esc(user.email)}" disabled></label>
          <button class="btn">Save</button></form></div>
      </div>
      ${plans.personal ? '<div class="card"><h3>Personal mode</h3><p class="muted">Unlimited use for you only. No plans, no payments.</p></div>' : ''}
      <div class="grid g3">${plans.plans.map((p) => `
        <div class="card plan-card ${p.id === plan.id ? 'current' : ''}">
          <h3>${esc(p.name)}</h3><div class="price">$${p.priceUsd}<small>/month</small></div>
          <ul class="small">${Object.entries({ keywordSearches: 'keyword searches', liveAnalyses: 'live analyses', captions: 'captions', aiCaptions: 'AI captions', liveTracks: 'live hashtags at once', competitorScans: 'competitor scans' })
            .map(([k, l]) => `<li>${fmt(p.limits[k])} ${l}${k === 'liveTracks' ? '' : '/mo'}</li>`).join('')}</ul>
          ${p.id === plan.id ? '<span class="badge plan">Current plan</span>' : `<button class="btn ${p.priceUsd ? 'primary' : ''}" data-plan="${p.id}">${p.priceUsd ? 'Upgrade' : 'Downgrade'}</button>`}
        </div>`).join('')}</div>
    </div>`;
  $('#igForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await busy($('#igBtn'), () => api('/api/settings/instagram', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }));
    if (r) { toast(`Connected @${r.account.username}`); viewSettings(v); refreshMe(); }
  });
  $('#igDisconnect')?.addEventListener('click', async (e) => { if (await busy(e.target, () => api('/api/settings/instagram', { method: 'DELETE', body: {} }))) { toast('Disconnected'); viewSettings(v); refreshMe(); } });
  $('#profileForm').addEventListener('submit', async (e) => { e.preventDefault(); if (await busy(e.submitter, () => api('/api/settings/profile', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }))) toast('Saved'); });
  $$('[data-plan]', v).forEach((b) => b.addEventListener('click', async () => {
    const r = await busy(b, () => api('/api/billing/upgrade', { method: 'POST', body: { plan: b.dataset.plan } }));
    if (!r) return;
    if (r.checkoutUrl) { location.href = r.checkoutUrl; return; }
    toast(r.note || 'Plan updated'); await refreshMe(); viewSettings(v);
  }));
}

// ---------------- shared delegated actions ----------------
function wireCommon(root) {
  $$('[data-copy]', root).forEach((b) => b.addEventListener('click', () => copy(b.dataset.copy)));
  $$('[data-caption]', root).forEach((b) => b.addEventListener('click', () => { state.prefill = { kw: b.dataset.caption }; location.hash = '#captions'; }));
  $$('[data-analyze]', root).forEach((b) => b.addEventListener('click', () => analyzeKeyword(b.dataset.analyze, b)));
  $$('[data-save-kw]', root).forEach((b) => b.addEventListener('click', () => save('keyword', b.dataset.saveKw)));
  $$('[data-save-cap]', root).forEach((b) => b.addEventListener('click', () => save('caption', b.dataset.saveCap, { keyword: b.dataset.kw })));
  $$('[data-audit-text]', root).forEach((b) => b.addEventListener('click', () => { state.prefill = { audit: b.dataset.auditText }; location.hash = '#audit'; }));
}

setAuthMode('login');
boot();
