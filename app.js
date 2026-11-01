/* Prime Growth 360 — Premium Habit Tracker
 * Vanilla JS, no build step. All data is stored locally in the browser.
 */
(() => {
  'use strict';

  // ---------- Constants ----------
  const STORE_KEY = 'pg360-habits-v1';
  const SLOTS = [
    { id: 'morning', label: 'Morning', icon: '🌅', hint: '5am – 12pm' },
    { id: 'afternoon', label: 'Afternoon', icon: '☀️', hint: '12pm – 5pm' },
    { id: 'evening', label: 'Evening', icon: '🌇', hint: '5pm – 9pm' },
    { id: 'night', label: 'Night', icon: '🌙', hint: '9pm – sleep' },
    { id: 'anytime', label: 'Anytime', icon: '⏱️', hint: 'whenever you can' },
  ];
  const ICONS = ['💧','🏃','📖','🧘','✍️','🍎','💪','😴','📵','🧹','💊','🎯','🙏','🚶','🥗','💻','🎵','🌱','🧠','☕','🚭','💰','🦷','🌞'];
  const COLORS = ['#7c6cff','#29d3c2','#f5c451','#ff7a59','#ff5d9e','#3ddc84','#4fb3ff','#b86bff'];
  const MOODS = ['😞','😕','😐','🙂','😄'];
  const WATER_GOAL = 8;
  const PERFECT_BONUS = 20;
  const WATER_BONUS = 5;
  const SPIN_COST = 15;
  const RUSH_DAILY = 3;
  const TIMER_DAILY = 5;
  const STREAK_MILESTONES = { 3: 15, 7: 40, 14: 80, 30: 200, 100: 750 };
  const WHEEL = [
    { label: '5', value: 5, color: '#7c6cff' },
    { label: '20', value: 20, color: '#29d3c2' },
    { label: '10', value: 10, color: '#ff7a59' },
    { label: '50', value: 50, color: '#f5c451' },
    { label: '5', value: 5, color: '#4fb3ff' },
    { label: '15', value: 15, color: '#ff5d9e' },
    { label: '0', value: 0, color: '#555b80' },
    { label: '100', value: 100, color: '#3ddc84' },
  ];
  const WHEEL_WEIGHTS = [22, 14, 20, 6, 18, 12, 6, 2];
  const TITLES = ['Beginner','Starter','Committed','Consistent','Disciplined','Achiever','Champion','Master','Legend','Prime 360'];
  const TEMPLATES = [
    { name: 'Wake up early', icon: '🌞', slot: 'morning', points: 10 },
    { name: 'Exercise 30 min', icon: '💪', slot: 'morning', points: 15 },
    { name: 'Healthy breakfast', icon: '🥗', slot: 'morning', points: 5 },
    { name: 'Read 20 pages', icon: '📖', slot: 'afternoon', points: 10 },
    { name: 'Deep work 2h', icon: '💻', slot: 'afternoon', points: 15 },
    { name: 'Walk 10 min', icon: '🚶', slot: 'evening', points: 5 },
    { name: 'Meditate', icon: '🧘', slot: 'evening', points: 10 },
    { name: 'Gratitude journal', icon: '✍️', slot: 'night', points: 5 },
    { name: 'No phone before bed', icon: '📵', slot: 'night', points: 10 },
    { name: 'Take vitamins', icon: '💊', slot: 'anytime', points: 5 },
    { name: 'Save money', icon: '💰', slot: 'anytime', points: 5 },
  ];
  const BADGES = [
    { id: 'first', icon: '🌱', name: 'First Step', desc: 'Complete your first habit' },
    { id: 'perfect', icon: '💎', name: 'Perfect Day', desc: 'Finish every habit in a day' },
    { id: 'streak3', icon: '🔥', name: 'On Fire', desc: '3-day streak' },
    { id: 'streak7', icon: '⚡', name: 'Week Warrior', desc: '7-day streak' },
    { id: 'streak30', icon: '👑', name: 'Habit Royalty', desc: '30-day streak' },
    { id: 'p100', icon: '⭐', name: 'Century', desc: 'Earn 100 points' },
    { id: 'p1000', icon: '🏆', name: 'Point Tycoon', desc: 'Earn 1,000 points' },
    { id: 'hydro', icon: '💧', name: 'Hydrated', desc: 'Drink 8 glasses in a day' },
    { id: 'spin', icon: '🎡', name: 'Lucky Spinner', desc: 'Spin the wheel' },
    { id: 'rush', icon: '⭕', name: 'Ring Master', desc: 'Score 40+ in Ring Rush' },
    { id: 'sniper', icon: '🎯', name: 'Sharp Timing', desc: 'Hit the gold zone' },
    { id: 'treat', icon: '🎁', name: 'Treat Yourself', desc: 'Redeem a reward' },
    { id: 'lv5', icon: '🚀', name: 'Level 5', desc: 'Reach level 5' },
  ];

  // ---------- Utils ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const todayKey = () => keyOf(new Date());
  const fmt = (n) => Number(n).toLocaleString();

  // ---------- State ----------
  function defaultState() {
    const habits = TEMPLATES.slice(0, 6).map((t, i) => ({
      id: uid(), name: t.name, icon: t.icon, slot: t.slot, points: t.points,
      target: 1, color: COLORS[i % COLORS.length], days: [0, 1, 2, 3, 4, 5, 6], created: todayKey(),
    }));
    return {
      version: 1,
      profile: { name: '' },
      habits,
      log: {},
      points: 0,
      totalEarned: 0,
      history: [],
      rewards: [
        { id: uid(), name: 'Favourite snack', icon: '🍫', cost: 50 },
        { id: uid(), name: '1 hour gaming', icon: '🎮', cost: 120 },
        { id: uid(), name: 'Movie night', icon: '🎬', cost: 200 },
        { id: uid(), name: 'New book', icon: '📚', cost: 400 },
        { id: uid(), name: 'Day off / spa', icon: '🧖', cost: 1000 },
      ],
      badges: {},
      milestones: {},
      games: { lastFreeSpin: '', rushBest: 0, rush: {}, timer: {} },
      settings: { theme: 'dark' },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return Object.assign(defaultState(), s, { games: Object.assign(defaultState().games, s.games || {}) });
    } catch { return null; }
  }
  let firstRun = false;
  let state = load();
  if (!state) { state = defaultState(); firstRun = true; }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ } };

  let viewDate = todayKey();
  const dayLog = (k) => (state.log[k] ||= { habits: {}, awarded: {}, water: 0, sleep: 0, mood: null, steps: 0, note: '' });
  const peekLog = (k) => state.log[k] || { habits: {}, awarded: {} };

  // ---------- Points ----------
  function addPoints(amount, label, silent) {
    if (!amount) return;
    state.points += amount;
    if (amount > 0) state.totalEarned += amount;
    else if (/^Undo/.test(label)) state.totalEarned = Math.max(0, state.totalEarned + amount);
    state.history.unshift({ t: Date.now(), amount, label });
    state.history = state.history.slice(0, 300);
    const chip = $('.points-chip');
    chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
    if (!silent && amount > 0) toast(`+${amount} ★ ${label}`);
  }

  function levelInfo() {
    const xp = state.totalEarned;
    let lv = 1;
    while (50 * (lv + 1) * lv <= xp) lv++;
    const base = 50 * lv * (lv - 1);
    const next = 50 * (lv + 1) * lv;
    return { lv, xp, base, next, title: TITLES[Math.min(lv - 1, TITLES.length - 1)] };
  }

  // ---------- Habit logic ----------
  const scheduled = (h, k) => h.days.includes(parseKey(k).getDay());
  const habitsFor = (k) => state.habits.filter((h) => scheduled(h, k));
  const isDone = (h, k) => (peekLog(k).habits[h.id] || 0) >= h.target;

  function dayCompletion(k) {
    const hs = habitsFor(k);
    if (!hs.length) return { done: 0, total: 0, pct: 0 };
    const done = hs.filter((h) => isDone(h, k)).length;
    return { done, total: hs.length, pct: done / hs.length };
  }

  function habitStreak(h) {
    let k = todayKey();
    if (!isDone(h, k)) k = addDays(k, -1);
    let n = 0;
    for (let i = 0; i < 1000; i++) {
      if (scheduled(h, k)) { if (isDone(h, k)) n++; else break; }
      k = addDays(k, -1);
    }
    return n;
  }

  // Day streak: consecutive days with at least half of scheduled habits done.
  const goodDay = (k) => { const c = dayCompletion(k); return c.total > 0 && c.pct >= 0.5; };
  function dayStreak() {
    let k = todayKey();
    if (!goodDay(k)) k = addDays(k, -1);
    let n = 0;
    while (goodDay(k) && n < 3650) { n++; k = addDays(k, -1); }
    return n;
  }
  function bestDayStreak() {
    const keys = Object.keys(state.log).sort();
    if (!keys.length) return 0;
    let best = 0, cur = 0, k = keys[0];
    const end = todayKey();
    while (k <= end) { cur = goodDay(k) ? cur + 1 : 0; best = Math.max(best, cur); k = addDays(k, 1); }
    return best;
  }

  function setCount(h, k, count) {
    const L = dayLog(k);
    const wasDone = isDone(h, k);
    L.habits[h.id] = Math.max(0, Math.min(count, h.target * 3));
    const nowDone = isDone(h, k);
    if (!wasDone && nowDone) {
      L.awarded[h.id] = h.points;
      addPoints(h.points, `${h.icon} ${h.name}`);
      burst();
    } else if (wasDone && !nowDone && L.awarded[h.id]) {
      addPoints(-L.awarded[h.id], `Undo · ${h.name}`, true);
      delete L.awarded[h.id];
    }
    checkPerfect(k);
    checkMilestones();
    afterChange();
  }

  function checkPerfect(k) {
    const L = dayLog(k);
    const c = dayCompletion(k);
    const perfect = c.total > 0 && c.done === c.total;
    if (perfect && !L.perfect) {
      L.perfect = PERFECT_BONUS;
      addPoints(PERFECT_BONUS, '💎 Perfect day bonus');
      unlock('perfect');
      bigConfetti();
    } else if (!perfect && L.perfect) {
      addPoints(-L.perfect, 'Undo · Perfect day bonus', true);
      L.perfect = 0;
    }
  }

  function checkMilestones() {
    const s = dayStreak();
    for (const [days, bonus] of Object.entries(STREAK_MILESTONES)) {
      if (s >= +days && !state.milestones[days]) {
        state.milestones[days] = todayKey();
        addPoints(bonus, `🔥 ${days}-day streak bonus`);
        bigConfetti();
      }
    }
  }

  function unlock(id) {
    if (state.badges[id]) return;
    state.badges[id] = todayKey();
    const b = BADGES.find((x) => x.id === id);
    if (b) toast(`🏅 Badge unlocked: ${b.icon} ${b.name}`);
  }

  function checkBadges() {
    const anyDone = Object.values(state.log).some((L) => Object.keys(L.awarded || {}).length);
    if (anyDone) unlock('first');
    const s = Math.max(dayStreak(), bestDayStreak());
    if (s >= 3) unlock('streak3');
    if (s >= 7) unlock('streak7');
    if (s >= 30) unlock('streak30');
    if (state.totalEarned >= 100) unlock('p100');
    if (state.totalEarned >= 1000) unlock('p1000');
    if (levelInfo().lv >= 5) unlock('lv5');
  }

  function afterChange() { checkBadges(); save(); render(); }

  // ---------- Rendering ----------
  function ringSVG(pct, size, stroke, color, track = true) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - Math.max(0, Math.min(1, pct)));
    return `<svg viewBox="0 0 ${size} ${size}">
      ${track ? `<circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>` : ''}
      <circle class="ring-prog" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"
        stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>`;
  }

  function render() {
    $('#pointsBalance').textContent = fmt(state.points);
    const name = state.profile.name;
    const hr = new Date().getHours();
    const g = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : hr < 21 ? 'Good evening' : 'Good night';
    $('#greeting').textContent = name ? `${g}, ${name}` : g;
    renderToday();
    renderHabits();
    renderRewards();
    renderStats();
    renderGamesInfo();
  }

  function renderToday() {
    const k = viewDate;
    const isToday = k === todayKey();
    const d = parseKey(k);
    $('#dateLabel').textContent = isToday ? `Today · ${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`
      : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    $('#nextDay').disabled = isToday;
    $('#nextDay').style.opacity = isToday ? .3 : 1;

    const c = dayCompletion(k);
    $('#dayRing').innerHTML = `
      <svg viewBox="0 0 160 160">
        <defs><linearGradient id="gradRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#29d3c2"/><stop offset="100%" stop-color="#7c6cff"/></linearGradient></defs>
        <circle class="ring-track" cx="80" cy="80" r="68" stroke-width="14"/>
        <circle class="ring-prog" cx="80" cy="80" r="68" stroke-width="14" stroke="url(#gradRing)"
          stroke-dasharray="${2 * Math.PI * 68}" stroke-dashoffset="${2 * Math.PI * 68 * (1 - c.pct)}"/>
        <circle class="ring-track" cx="80" cy="80" r="50" stroke-width="8"/>
        <circle class="ring-prog" cx="80" cy="80" r="50" stroke-width="8" stroke="#4fb3ff"
          stroke-dasharray="${2 * Math.PI * 50}" stroke-dashoffset="${2 * Math.PI * 50 * (1 - Math.min(1, (state.log[k]?.water || 0) / WATER_GOAL))}"/>
      </svg>
      <div class="ring-center"><div><b>${Math.round(c.pct * 100)}%</b><span>day complete</span></div></div>`;

    const lv = levelInfo();
    $('#levelBadge').textContent = `Lv ${lv.lv}`;
    $('#levelTitle').textContent = lv.title;
    $('#xpFill').style.width = `${((lv.xp - lv.base) / (lv.next - lv.base)) * 100}%`;
    $('#xpText').textContent = `${fmt(lv.xp - lv.base)} / ${fmt(lv.next - lv.base)} XP to Lv ${lv.lv + 1}`;
    $('#statStreak').textContent = dayStreak();
    $('#statDone').textContent = `${c.done}/${c.total}`;
    const L = peekLog(k);
    const todayPts = Object.values(L.awarded || {}).reduce((a, b) => a + b, 0) + (L.perfect || 0) + (L.waterBonus || 0);
    $('#statToday').textContent = todayPts;

    // Wellness
    const water = L.water || 0;
    $('#waterText').textContent = `${water}/${WATER_GOAL}`;
    $('#waterGlasses').innerHTML = Array.from({ length: WATER_GOAL }, (_, i) =>
      `<button class="glass ${i < water ? 'full' : ''}" data-i="${i}" aria-label="Glass ${i + 1}"></button>`).join('');
    $('#sleepRange').value = L.sleep || 0;
    $('#sleepText').textContent = `${L.sleep || 0} h`;
    $('#moods').innerHTML = MOODS.map((m, i) => `<button data-m="${i}" class="${L.mood === i ? 'sel' : ''}" aria-label="Mood ${i + 1}">${m}</button>`).join('');
    $('#stepsInput').value = L.steps || '';
    $('#stepsText').textContent = fmt(L.steps || 0);
    if (document.activeElement !== $('#dayNote')) $('#dayNote').value = L.note || '';

    // Timeline
    const hs = habitsFor(k);
    if (!state.habits.length) {
      $('#timeline').innerHTML = `<div class="card empty">No habits yet.<br><br><button class="btn primary" data-go="habits">＋ Add your first habit</button></div>`;
      return;
    }
    if (!hs.length) {
      $('#timeline').innerHTML = `<div class="card empty">No habits scheduled for this day. Enjoy your rest! 🌿</div>`;
      return;
    }
    $('#timeline').innerHTML = SLOTS.map((s) => {
      const list = hs.filter((h) => h.slot === s.id);
      if (!list.length) return '';
      const doneN = list.filter((h) => isDone(h, k)).length;
      return `<div class="slot"><div class="slot-head">${s.icon} ${s.label} <small>${s.hint}</small>
        <span class="slot-count">${doneN}/${list.length}</span></div>
        ${list.map((h) => habitRow(h, k)).join('')}</div>`;
    }).join('');
  }

  function habitRow(h, k) {
    const cnt = peekLog(k).habits[h.id] || 0;
    const done = cnt >= h.target;
    const st = habitStreak(h);
    return `<div class="habit-row ${done ? 'done' : ''}" style="--hc:${h.color}">
      <button class="habit-ring" data-act="tap" data-id="${h.id}" aria-label="Log ${esc(h.name)}">
        ${ringSVG(cnt / h.target, 48, 5, h.color)}<span class="ic">${done ? '✓' : esc(h.icon)}</span></button>
      <div class="habit-main">
        <div class="habit-name">${esc(h.name)}</div>
        <div class="habit-meta"><span>★ ${h.points}</span>${h.target > 1 ? `<span>${cnt}/${h.target}</span>` : ''}${st ? `<span>🔥 ${st}</span>` : ''}</div>
      </div>
      <div class="habit-actions">
        ${h.target > 1 ? `<button class="round-btn" data-act="minus" data-id="${h.id}" aria-label="Decrease">−</button>` : ''}
        <button class="round-btn ${done ? 'check' : ''}" data-act="${h.target > 1 ? 'plus' : 'tap'}" data-id="${h.id}" aria-label="${done ? 'Undo' : 'Complete'}">${h.target > 1 ? '+' : done ? '✓' : ''}</button>
      </div></div>`;
  }

  function renderHabits() {
    $('#templates').innerHTML = TEMPLATES.filter((t) => !state.habits.some((h) => h.name === t.name))
      .map((t, i) => `<button class="btn" data-tpl="${TEMPLATES.indexOf(t)}">${t.icon} ${esc(t.name)}</button>`).join('');
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    $('#habitList').innerHTML = state.habits.length ? SLOTS.map((s) => {
      const list = state.habits.filter((h) => h.slot === s.id);
      if (!list.length) return '';
      return `<div class="slot"><div class="slot-head">${s.icon} ${s.label}</div>${list.map((h) => `
        <div class="habit-row" style="--hc:${h.color}">
          <span class="color-dot" style="background:${h.color}"></span>
          <span style="font-size:22px">${esc(h.icon)}</span>
          <div class="habit-main"><div class="habit-name">${esc(h.name)}</div>
            <div class="habit-meta"><span>★ ${h.points}</span><span>${h.target}× / day</span>
            <span>${h.days.length === 7 ? 'Every day' : h.days.map((d) => dayNames[d]).join(' ')}</span><span>🔥 ${habitStreak(h)}</span></div></div>
          <div class="habit-actions">
            <button class="round-btn" data-edit="${h.id}" aria-label="Edit">✎</button>
            <button class="round-btn" data-del="${h.id}" aria-label="Delete">🗑</button>
          </div></div>`).join('')}</div>`;
    }).join('') : `<div class="card empty">Tap a template above or “New habit” to begin.</div>`;
  }

  function renderRewards() {
    $('#rewardList').innerHTML = state.rewards.map((r) => `
      <div class="card reward">
        <button class="del" data-rdel="${r.id}" aria-label="Remove reward">✕</button>
        <div class="r-ic">${esc(r.icon)}</div>
        <div class="r-name">${esc(r.name)}</div>
        <div class="r-cost">★ ${fmt(r.cost)}</div>
        <button class="btn gold" data-redeem="${r.id}" ${state.points < r.cost ? 'disabled' : ''}>
          ${state.points < r.cost ? `Need ${fmt(r.cost - state.points)} more` : 'Redeem'}</button>
      </div>`).join('') || `<div class="card empty">Add rewards you want to earn.</div>`;

    $('#badgeList').innerHTML = BADGES.map((b) => `
      <div class="badge ${state.badges[b.id] ? 'got' : 'locked'}">
        <div class="b-ic">${b.icon}</div><div class="b-name">${b.name}</div><div class="b-desc">${b.desc}</div></div>`).join('');

    $('#historyList').innerHTML = state.history.length ? state.history.slice(0, 80).map((h) => `
      <div class="h-item"><span>${esc(h.label)}<br><small class="muted">${new Date(h.t).toLocaleString()}</small></span>
      <span class="${h.amount >= 0 ? 'plus' : 'minus'}">${h.amount >= 0 ? '+' : ''}${h.amount} ★</span></div>`).join('')
      : `<div class="empty">No points yet — complete a habit!</div>`;
  }

  function renderStats() {
    const keys = Object.keys(state.log);
    const perfectDays = keys.filter((k) => state.log[k].perfect).length;
    const totalDone = keys.reduce((a, k) => a + Object.keys(state.log[k].awarded || {}).length, 0);
    const lv = levelInfo();
    const tiles = [
      ['★ ' + fmt(state.points), 'Points balance'],
      [fmt(state.totalEarned), 'Total XP earned'],
      [`Lv ${lv.lv}`, lv.title],
      [dayStreak() + ' 🔥', 'Current streak'],
      [bestDayStreak(), 'Best streak'],
      [perfectDays + ' 💎', 'Perfect days'],
      [fmt(totalDone), 'Habits completed'],
      [Object.keys(state.badges).length + '/' + BADGES.length, 'Badges'],
    ];
    $('#statTiles').innerHTML = tiles.map(([b, s]) => `<div class="tile"><b>${b}</b><span>${s}</span></div>`).join('');

    let html = '';
    for (let i = 6; i >= 0; i--) {
      const k = addDays(todayKey(), -i);
      const c = dayCompletion(k);
      html += `<div class="bar" title="${Math.round(c.pct * 100)}%"><small>${Math.round(c.pct * 100)}%</small>
        <i style="height:${Math.max(2, c.pct * 100)}%"></i><small>${parseKey(k).toLocaleDateString(undefined, { weekday: 'short' })}</small></div>`;
    }
    $('#weekBars').innerHTML = html;

    // Heatmap 12 weeks, columns = weeks starting Sunday
    const end = parseKey(todayKey());
    // last column ends on this week's Saturday; 12 columns of 7 days
    const start = new Date(end); start.setDate(end.getDate() + (6 - end.getDay()) - 83);
    let hm = '';
    for (let i = 0; i < 84; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = keyOf(d);
      if (k > todayKey()) { hm += `<i style="opacity:.2"></i>`; continue; }
      const p = dayCompletion(k).pct;
      const col = p === 0 ? '' : `background:color-mix(in srgb, #29d3c2 ${Math.round(25 + p * 75)}%, var(--line))`;
      hm += `<i style="${col}" title="${k}: ${Math.round(p * 100)}%"></i>`;
    }
    $('#heatmap').innerHTML = hm;

    $('#streakList').innerHTML = state.habits.map((h) => {
      const s = habitStreak(h);
      return `<div class="streak-item"><span>${esc(h.icon)}</span><span class="s-name">${esc(h.name)}</span><b>🔥 ${s}</b></div>`;
    }).join('') || `<div class="muted">No habits yet.</div>`;

    if (document.activeElement !== $('#nameInput')) $('#nameInput').value = state.profile.name || '';
  }

  // ---------- Toast & confetti ----------
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = 0; el.style.transition = '.3s'; }, 2200);
    setTimeout(() => el.remove(), 2600);
  }
  const cv = $('#confetti'); const cx = cv.getContext('2d');
  let parts = []; let animating = false;
  function spawn(n, x, y, spread) {
    for (let i = 0; i < n; i++) {
      parts.push({ x, y, vx: (Math.random() - .5) * spread, vy: -Math.random() * spread * .8 - 2,
        s: 4 + Math.random() * 5, c: COLORS[i % COLORS.length], r: Math.random() * 6, life: 90 + Math.random() * 40 });
    }
    if (!animating) { animating = true; requestAnimationFrame(tick); }
  }
  function tick() {
    cv.width = innerWidth; cv.height = innerHeight;
    parts = parts.filter((p) => p.life-- > 0 && p.y < innerHeight + 20);
    for (const p of parts) {
      p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.r += 0.1;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); cx.restore();
    }
    if (parts.length) requestAnimationFrame(tick); else { animating = false; cx.clearRect(0, 0, cv.width, cv.height); }
  }
  const burst = () => spawn(30, innerWidth / 2, innerHeight / 2, 12);
  const bigConfetti = () => { spawn(80, innerWidth * .25, innerHeight * .6, 16); spawn(80, innerWidth * .75, innerHeight * .6, 16); };

  // ---------- Modals ----------
  function openModal(html, onMount) {
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
    onMount && onMount($('#modalBody'));
  }
  const closeModal = () => { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; };
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !firstRun) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden && !firstRun) closeModal(); });

  function habitForm(h) {
    const isNew = !h;
    h = h || { name: '', icon: ICONS[0], slot: 'morning', points: 10, target: 1, color: COLORS[0], days: [0, 1, 2, 3, 4, 5, 6] };
    const draft = { ...h, days: [...h.days] };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    openModal(`<h3>${isNew ? 'New habit' : 'Edit habit'}</h3>
      <form class="form" id="hForm">
        <label>Name <input name="name" required maxlength="40" value="${esc(draft.name)}" placeholder="e.g. Drink green tea"></label>
        <label>Icon <div class="pick" id="iconPick">${ICONS.map((i) => `<button type="button" data-v="${i}" class="${i === draft.icon ? 'sel' : ''}">${i}</button>`).join('')}</div></label>
        <label>Colour <div class="pick colors" id="colorPick">${COLORS.map((c) => `<button type="button" data-v="${c}" style="background:${c}" class="${c === draft.color ? 'sel' : ''}" aria-label="${c}"></button>`).join('')}</div></label>
        <div class="row2">
          <label>Time of day <select name="slot">${SLOTS.map((s) => `<option value="${s.id}" ${s.id === draft.slot ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}</select></label>
          <label>Reward points <input name="points" type="number" min="1" max="100" value="${draft.points}"></label>
        </div>
        <label>Times per day <input name="target" type="number" min="1" max="20" value="${draft.target}"></label>
        <label>Repeat on <div class="days" id="dayPick">${dayNames.map((d, i) => `<button type="button" data-v="${i}" class="${draft.days.includes(i) ? 'sel' : ''}">${d}</button>`).join('')}</div></label>
        <div class="modal-actions"><button type="button" class="btn" id="cancelH">Cancel</button><button class="btn primary">${isNew ? 'Create' : 'Save'}</button></div>
      </form>`, (root) => {
      $('#iconPick', root).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; draft.icon = b.dataset.v; $$('#iconPick button', root).forEach((x) => x.classList.toggle('sel', x === b)); };
      $('#colorPick', root).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; draft.color = b.dataset.v; $$('#colorPick button', root).forEach((x) => x.classList.toggle('sel', x === b)); };
      $('#dayPick', root).onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return; const v = +b.dataset.v;
        draft.days = draft.days.includes(v) ? draft.days.filter((x) => x !== v) : [...draft.days, v].sort();
        b.classList.toggle('sel', draft.days.includes(v));
      };
      $('#cancelH', root).onclick = closeModal;
      $('#hForm', root).onsubmit = (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const name = String(f.get('name')).trim();
        if (!name) return;
        if (!draft.days.length) { toast('Pick at least one day'); return; }
        Object.assign(draft, {
          name, slot: f.get('slot'),
          points: Math.max(1, Math.min(100, parseInt(f.get('points'), 10) || 10)),
          target: Math.max(1, Math.min(20, parseInt(f.get('target'), 10) || 1)),
        });
        if (isNew) { state.habits.push({ ...draft, id: uid(), created: todayKey() }); toast(`✨ Habit created: ${draft.name}`); }
        else Object.assign(state.habits.find((x) => x.id === h.id), draft);
        closeModal(); afterChange();
      };
    });
  }

  function rewardForm() {
    const icons = ['🎁','🍫','🍕','🎮','🎬','📚','👟','🧖','✈️','🎧','☕','🛍️'];
    let icon = icons[0];
    openModal(`<h3>New reward</h3><form class="form" id="rForm">
      <label>Reward <input name="name" required maxlength="40" placeholder="e.g. Ice cream"></label>
      <label>Icon <div class="pick" id="rIcons">${icons.map((i, n) => `<button type="button" data-v="${i}" class="${n ? '' : 'sel'}">${i}</button>`).join('')}</div></label>
      <label>Cost (points) <input name="cost" type="number" min="1" max="100000" value="100"></label>
      <div class="modal-actions"><button type="button" class="btn" id="cancelR">Cancel</button><button class="btn primary">Add</button></div></form>`, (root) => {
      $('#rIcons', root).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; icon = b.dataset.v; $$('#rIcons button', root).forEach((x) => x.classList.toggle('sel', x === b)); };
      $('#cancelR', root).onclick = closeModal;
      $('#rForm', root).onsubmit = (e) => {
        e.preventDefault(); const f = new FormData(e.target);
        const name = String(f.get('name')).trim(); if (!name) return;
        state.rewards.push({ id: uid(), name, icon, cost: Math.max(1, parseInt(f.get('cost'), 10) || 100) });
        closeModal(); afterChange();
      };
    });
  }

  function onboarding() {
    openModal(`<div style="text-align:center"><img src="icon.svg" alt="" width="72" height="72">
      <h3>Welcome to Prime Growth 360</h3>
      <p class="muted">Track your whole day, complete habits to earn ★ reward points, level up, unlock badges and play circle games.</p></div>
      <form class="form" id="oForm"><label>What should we call you? <input name="name" maxlength="30" placeholder="Your name" autofocus></label>
      <p class="muted small">We've added a few starter habits — edit them anytime in the Habits tab.</p>
      <div class="modal-actions"><button class="btn primary" style="width:100%;justify-content:center">Let's grow 🚀</button></div></form>`, (root) => {
      $('#oForm', root).onsubmit = (e) => {
        e.preventDefault();
        state.profile.name = String(new FormData(e.target).get('name')).trim();
        firstRun = false; closeModal();
        addPoints(10, '🎉 Welcome bonus');
        afterChange();
      };
    });
  }

  // ---------- Events ----------
  $('.bottom-nav').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; go(b.dataset.view);
  });
  function go(v) {
    $$('.bottom-nav button').forEach((x) => x.classList.toggle('active', x.dataset.view === v));
    $$('.view').forEach((x) => x.classList.toggle('active', x.id === `view-${v}`));
    if (v === 'games') drawWheel();
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });

  $('#prevDay').onclick = () => { viewDate = addDays(viewDate, -1); renderToday(); };
  $('#nextDay').onclick = () => { if (viewDate < todayKey()) { viewDate = addDays(viewDate, 1); renderToday(); } };

  $('#timeline').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const h = state.habits.find((x) => x.id === b.dataset.id); if (!h) return;
    const cnt = peekLog(viewDate).habits[h.id] || 0;
    const act = b.dataset.act;
    if (act === 'tap') setCount(h, viewDate, h.target > 1 ? (cnt >= h.target ? 0 : cnt + 1) : (cnt >= 1 ? 0 : 1));
    else if (act === 'plus') setCount(h, viewDate, cnt + 1);
    else if (act === 'minus') setCount(h, viewDate, cnt - 1);
  });

  $('#waterGlasses').addEventListener('click', (e) => {
    const b = e.target.closest('.glass'); if (!b) return;
    const L = dayLog(viewDate); const i = +b.dataset.i;
    L.water = L.water === i + 1 ? i : i + 1;
    if (L.water >= WATER_GOAL && !L.waterBonus) { L.waterBonus = WATER_BONUS; addPoints(WATER_BONUS, '💧 Hydration goal'); unlock('hydro'); burst(); }
    else if (L.water < WATER_GOAL && L.waterBonus) { addPoints(-L.waterBonus, 'Undo · Hydration goal', true); L.waterBonus = 0; }
    afterChange();
  });
  $('#sleepRange').addEventListener('input', (e) => { dayLog(viewDate).sleep = +e.target.value; $('#sleepText').textContent = `${e.target.value} h`; save(); });
  $('#moods').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const L = dayLog(viewDate); const m = +b.dataset.m; L.mood = L.mood === m ? null : m; afterChange();
  });
  $('#stepsInput').addEventListener('change', (e) => { dayLog(viewDate).steps = Math.max(0, parseInt(e.target.value, 10) || 0); afterChange(); });
  $('#dayNote').addEventListener('input', (e) => { dayLog(viewDate).note = e.target.value.slice(0, 2000); save(); });

  $('#addHabitBtn').onclick = () => habitForm();
  $('#templates').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tpl]'); if (!b) return;
    const t = TEMPLATES[+b.dataset.tpl];
    state.habits.push({ id: uid(), ...t, target: 1, color: COLORS[state.habits.length % COLORS.length], days: [0, 1, 2, 3, 4, 5, 6], created: todayKey() });
    toast(`✨ Added ${t.icon} ${t.name}`); afterChange();
  });
  $('#habitList').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]'); const del = e.target.closest('[data-del]');
    if (ed) habitForm(state.habits.find((h) => h.id === ed.dataset.edit));
    if (del) {
      const h = state.habits.find((x) => x.id === del.dataset.del);
      if (h && confirm(`Delete "${h.name}"? Earned points are kept.`)) { state.habits = state.habits.filter((x) => x !== h); afterChange(); }
    }
  });

  $('#addRewardBtn').onclick = rewardForm;
  $('#rewardList').addEventListener('click', (e) => {
    const r = e.target.closest('[data-redeem]'); const d = e.target.closest('[data-rdel]');
    if (r) {
      const rw = state.rewards.find((x) => x.id === r.dataset.redeem);
      if (rw && state.points >= rw.cost && confirm(`Redeem "${rw.name}" for ${rw.cost} ★?`)) {
        addPoints(-rw.cost, `🎁 Redeemed: ${rw.name}`, true); unlock('treat');
        toast(`🎉 Enjoy your ${rw.name}! You earned it.`); bigConfetti(); afterChange();
      }
    }
    if (d) { state.rewards = state.rewards.filter((x) => x.id !== d.dataset.rdel); afterChange(); }
  });

  $('#themeToggle').onclick = () => { state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light'; applyTheme(); save(); };
  function applyTheme() {
    document.documentElement.dataset.theme = state.settings.theme;
    document.querySelector('meta[name=theme-color]').content = state.settings.theme === 'light' ? '#f4f5fb' : '#0d0f1a';
    drawWheel();
  }

  $('#nameInput').addEventListener('change', (e) => { state.profile.name = e.target.value.trim().slice(0, 30); afterChange(); });
  $('#exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `prime-growth-360-backup-${todayKey()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const s = JSON.parse(await file.text());
      if (!Array.isArray(s.habits) || typeof s.log !== 'object') throw new Error('bad');
      state = Object.assign(defaultState(), s, { games: Object.assign(defaultState().games, s.games || {}) });
      save(); applyTheme(); render(); toast('✅ Backup restored');
    } catch { toast('⚠️ That file is not a valid backup'); }
    e.target.value = '';
  });
  $('#resetBtn').onclick = () => {
    if (confirm('Erase ALL habits, points and history? This cannot be undone.')) {
      try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
      state = defaultState(); firstRun = true; save(); render(); onboarding();
    }
  };

  // ---------- Game: Lucky Spin Wheel ----------
  const wheel = $('#wheel'); const wctx = wheel.getContext('2d');
  let wheelAngle = 0; let spinning = false;
  function drawWheel() {
    const W = wheel.width, R = W / 2, n = WHEEL.length, seg = (2 * Math.PI) / n;
    wctx.clearRect(0, 0, W, W);
    wctx.save(); wctx.translate(R, R); wctx.rotate(wheelAngle);
    WHEEL.forEach((s, i) => {
      wctx.beginPath(); wctx.moveTo(0, 0); wctx.arc(0, 0, R, i * seg, (i + 1) * seg); wctx.closePath();
      const g = wctx.createRadialGradient(0, 0, 20, 0, 0, R);
      g.addColorStop(0, s.color + 'cc'); g.addColorStop(1, s.color);
      wctx.fillStyle = g; wctx.fill();
      wctx.strokeStyle = '#ffffff55'; wctx.lineWidth = 2; wctx.stroke();
      wctx.save(); wctx.rotate(i * seg + seg / 2);
      wctx.fillStyle = '#fff'; wctx.font = 'bold 26px system-ui, sans-serif'; wctx.textAlign = 'right'; wctx.textBaseline = 'middle';
      wctx.shadowColor = '#0008'; wctx.shadowBlur = 4;
      wctx.fillText(s.value ? `★${s.label}` : '✕', R - 18, 0);
      wctx.restore();
    });
    // dots on rim
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      wctx.beginPath(); wctx.arc(Math.cos(a) * (R - 6), Math.sin(a) * (R - 6), 3, 0, Math.PI * 2);
      wctx.fillStyle = i % 2 ? '#fff' : '#f5c451'; wctx.fill();
    }
    wctx.restore();
  }
  function pickWeighted() {
    const total = WHEEL_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < WHEEL_WEIGHTS.length; i++) { if ((r -= WHEEL_WEIGHTS[i]) < 0) return i; }
    return 0;
  }
  $('#spinBtn').onclick = () => {
    if (spinning) return;
    const free = state.games.lastFreeSpin !== todayKey();
    if (!free) {
      if (state.points < SPIN_COST) { $('#spinMsg').textContent = `You need ${SPIN_COST} ★ for an extra spin. Come back tomorrow for a free one!`; return; }
      if (!confirm(`Use ${SPIN_COST} ★ for an extra spin?`)) return;
      addPoints(-SPIN_COST, '🎡 Extra spin', true);
    } else state.games.lastFreeSpin = todayKey();
    save(); render();
    spinning = true; $('#spinBtn').disabled = true; $('#spinMsg').textContent = 'Spinning…';
    const idx = pickWeighted();
    const n = WHEEL.length, seg = (2 * Math.PI) / n;
    // pointer at top (-90deg). Segment idx centre must land at -PI/2.
    const jitter = (Math.random() - .5) * seg * .7;
    const targetBase = -Math.PI / 2 - (idx * seg + seg / 2) + jitter;
    const current = wheelAngle % (2 * Math.PI);
    let delta = targetBase - current; while (delta < 0) delta += 2 * Math.PI;
    const totalRot = delta + 2 * Math.PI * (5 + Math.floor(Math.random() * 3));
    const start = wheelAngle, dur = 4200, t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    (function anim(now) {
      const t = Math.min(1, (now - t0) / dur);
      wheelAngle = start + totalRot * ease(t); drawWheel();
      if (t < 1) return requestAnimationFrame(anim);
      spinning = false; $('#spinBtn').disabled = false;
      const prize = WHEEL[idx].value;
      unlock('spin');
      if (prize) { addPoints(prize, '🎡 Lucky spin'); $('#spinMsg').textContent = `🎉 You won ${prize} ★!`; prize >= 50 ? bigConfetti() : burst(); }
      else $('#spinMsg').textContent = 'So close! Better luck next spin.';
      afterChange();
    })(t0);
  };

  // ---------- Game: Ring Rush ----------
  const arena = $('#arena');
  let rush = null;
  const playsToday = (obj) => obj[todayKey()] || 0;
  function renderGamesInfo() {
    $('#rushBest').textContent = state.games.rushBest || 0;
    const left = Math.max(0, RUSH_DAILY - playsToday(state.games.rush));
    $('#rushInfo').textContent = left ? `${left} rewarded game${left > 1 ? 's' : ''} left today` : 'Practice mode — rewards reset tomorrow';
    const free = state.games.lastFreeSpin !== todayKey();
    if (!spinning) $('#spinBtn').textContent = free ? 'FREE' : `${SPIN_COST}★`;
  }
  $('#startRush').onclick = () => {
    if (rush) return;
    $('#arenaOverlay').style.display = 'none';
    rush = { score: 0, time: 30, timers: [] };
    $('#rushScore').textContent = 0; $('#rushTime').textContent = 30;
    const spawnT = () => {
      if (!rush) return;
      const rect = arena.getBoundingClientRect();
      const size = Math.max(34, rect.width * (0.11 + Math.random() * 0.07));
      // random point inside the circular arena
      const R = rect.width / 2 - size / 2 - 6;
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R;
      const gold = Math.random() < 0.14;
      const life = Math.max(700, 1700 - (30 - rush.time) * 28);
      const el = document.createElement('button');
      el.className = 'target' + (gold ? ' goldt' : '');
      el.setAttribute('aria-label', 'target');
      Object.assign(el.style, { width: size + 'px', height: size + 'px', left: rect.width / 2 + Math.cos(a) * d - size / 2 + 'px',
        top: rect.width / 2 + Math.sin(a) * d - size / 2 + 'px', animationDuration: life + 'ms' });
      el.addEventListener('pointerdown', (ev) => {
        ev.preventDefault(); if (!rush) return;
        const pts = gold ? 3 : 1; rush.score += pts; $('#rushScore').textContent = rush.score;
        const p = document.createElement('div'); p.className = 'pop'; p.textContent = `+${pts}`;
        p.style.left = el.style.left; p.style.top = el.style.top; arena.appendChild(p); setTimeout(() => p.remove(), 700);
        el.remove();
      });
      el.addEventListener('animationend', () => el.remove());
      arena.appendChild(el);
      rush.timers.push(setTimeout(spawnT, Math.max(330, 750 - (30 - rush.time) * 14)));
    };
    spawnT();
    rush.clock = setInterval(() => {
      rush.time--; $('#rushTime').textContent = rush.time;
      if (rush.time <= 0) endRush();
    }, 1000);
  };
  function endRush() {
    clearInterval(rush.clock); rush.timers.forEach(clearTimeout);
    $$('.target', arena).forEach((x) => x.remove());
    const score = rush.score; rush = null;
    const g = state.games;
    const newBest = score > (g.rushBest || 0);
    if (newBest) g.rushBest = score;
    if (score >= 40) unlock('rush');
    let msg = `Score ${score}${newBest ? ' — new best! 🏆' : ''}`;
    if (playsToday(g.rush) < RUSH_DAILY) {
      g.rush = { [todayKey()]: playsToday(g.rush) + 1 };
      const pts = Math.floor(score / 4);
      if (pts) { addPoints(pts, '⭕ Ring Rush'); msg += ` · +${pts} ★`; }
    }
    $('#arenaOverlay').style.display = '';
    $('#startRush').textContent = '↻ Play again';
    toast(msg); if (newBest) bigConfetti();
    afterChange();
  }

  // ---------- Game: Perfect Circle Timer ----------
  const tDot = $('#timerDot'), tZone = $('#timerZone');
  let tState = { running: false, angle: 0, zone: 0, zoneW: 0.5, speed: 3.2, raf: 0 };
  const polar = (a, r = 80) => [100 + r * Math.cos(a - Math.PI / 2), 100 + r * Math.sin(a - Math.PI / 2)];
  function newZone() {
    tState.zoneW = 0.32 + Math.random() * 0.22;
    tState.zone = Math.random() * Math.PI * 2;
    const [x1, y1] = polar(tState.zone - tState.zoneW / 2), [x2, y2] = polar(tState.zone + tState.zoneW / 2);
    tZone.setAttribute('d', `M ${x1} ${y1} A 80 80 0 0 1 ${x2} ${y2}`);
  }
  function placeDot() { const [x, y] = polar(tState.angle); tDot.setAttribute('cx', x); tDot.setAttribute('cy', y); }
  newZone(); placeDot();
  $('#timerBtn').onclick = () => {
    if (!tState.running) {
      tState.running = true; $('#timerBtn').textContent = 'STOP'; $('#timerMsg').textContent = '';
      tState.speed = 2.6 + Math.random() * 1.8;
      let last = performance.now();
      const step = (now) => {
        const dt = (now - last) / 1000; last = now;
        tState.angle = (tState.angle + tState.speed * dt) % (Math.PI * 2); placeDot();
        if (tState.running) tState.raf = requestAnimationFrame(step);
      };
      tState.raf = requestAnimationFrame(step);
      return;
    }
    tState.running = false; cancelAnimationFrame(tState.raf); $('#timerBtn').textContent = 'START';
    let diff = Math.abs(((tState.angle - tState.zone + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (diff <= tState.zoneW / 2) {
      unlock('sniper');
      const g = state.games;
      if (playsToday(g.timer) < TIMER_DAILY) {
        g.timer = { [todayKey()]: playsToday(g.timer) + 1 };
        addPoints(3, '🎯 Perfect timing');
        $('#timerMsg').textContent = `🎯 Bullseye! +3 ★ (${TIMER_DAILY - playsToday(g.timer)} rewarded hits left today)`;
      } else $('#timerMsg').textContent = '🎯 Bullseye! (daily rewards used — keep practising)';
      burst(); afterChange();
    } else $('#timerMsg').textContent = 'Missed! Try again.';
    newZone();
  };

  // ---------- Init ----------
  applyTheme();
  render();
  drawWheel();
  if (firstRun) onboarding();
  // Refresh when the day rolls over or the tab becomes visible again.
  let lastKey = todayKey();
  const refreshDay = () => { const k = todayKey(); if (k !== lastKey) { if (viewDate === lastKey) viewDate = k; lastKey = k; render(); } };
  setInterval(refreshDay, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDay(); });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
