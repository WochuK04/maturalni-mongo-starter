/* ==========================================================================
   Zaplecze v2 — front-end controller
   Wires the ported "Zaplecze v2 (od zera)" design to the live backend
   (Login + Launcher + Sprzęt). Vanilla JS, no build step.
   ========================================================================== */
(function () {
  'use strict';

  // -------------------------------------------------------------- utilities
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const state = {
    user: null,
    screen: 'login',
    view: 'pulpit',
    loaded: {},          // which sprzęt views already fetched
    cache: {},           // fetched data per view
    users: null,         // /users cache for transfer target
    magTab: 'przeglad',  // active Magazyn tab
    magReport: 'stock',  // active Raportowanie sub-report
    magOpType: 'receipt',// active Operacje sub-tab
    mag: {}              // Magazyn data cache
  };

  async function api(path, opts) {
    const res = await fetch(path, Object.assign({
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    }, opts));
    if (res.status === 401) { showScreen('login'); throw new Error('unauth'); }
    let body = null;
    try { body = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) {
      const msg = (body && (body.message || body.error)) || ('Błąd ' + res.status);
      const err = new Error(msg); err.status = res.status; err.body = body;
      throw err;
    }
    return body;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function initials(name) {
    const parts = String(name || '').trim().split(/[\s./_-]+/).filter(Boolean);
    if (!parts.length) return '—';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function fmtDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d)) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function conditionChip(cond) {
    const c = String(cond || '').toLowerCase();
    if (c.includes('now')) return 'chip chip-new';
    if (c.includes('bardzo')) return 'chip chip-blue';
    return 'chip chip-grey';
  }

  let toastTimer = null;
  function toast(msg, isErr) {
    const prev = $('.toast'); if (prev) prev.remove();
    const el = document.createElement('div');
    el.className = 'toast' + (isErr ? ' err' : '');
    el.textContent = msg;
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 3400);
  }

  // -------------------------------------------------------------- screens
  function showScreen(name) {
    state.screen = name;
    $('#boot').classList.add('hidden');
    ['login', 'launcher', 'sprzet', 'magazyn', 'licencje', 'onboarding', 'settings'].forEach((s) => {
      $('#screen-' + s).classList.toggle('hidden', s !== name);
    });
    if (name === 'login') { closeDrawer(); closeSheet(); }
    window.scrollTo(0, 0);
  }

  function applyUser() {
    const u = state.user || {};
    const name = u.fullName || u.email || 'Użytkownik';
    const first = name.split(/\s+/)[0] || name;
    $$('[data-avatar]').forEach((n) => (n.textContent = initials(name)));
    $$('[data-username]').forEach((n) => (n.textContent = name));
    $$('[data-firstname]').forEach((n) => (n.textContent = first));
    $$('[data-role]').forEach((n) => (n.textContent = u.role || 'user'));
    $$('[data-email]').forEach((n) => (n.textContent = u.email || '—'));
    const isManager = u.role === 'manager' || u.role === 'admin';
    $$('[data-manager-only]').forEach((n) => n.classList.toggle('hidden', !isManager));
    const isWarehouse = ['viewer', 'manager', 'admin'].includes(u.role);
    $$('[data-warehouse-only]').forEach((n) => n.classList.toggle('hidden', !isWarehouse));
    const isAdmin = u.role === 'admin';
    $$('[data-admin-only]').forEach((n) => n.classList.toggle('hidden', !isAdmin));
    const p = $('[data-pulpit-greeting]');
    if (p) p.textContent = 'Dzień dobry, ' + first + ' 👋';
  }

  // -------------------------------------------------------------- theme & prefs
  const THEME_KEY = 'zaplecze.theme';
  const DEFAULT_PREFS = { theme: 'system', notifyEmail: true, notifyInbox: true };
  let mqlDark = null;

  function effectiveTheme(pref) {
    if (pref === 'dark' || pref === 'light') return pref;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function applyThemeAttr(pref) {
    document.documentElement.setAttribute('data-theme', effectiveTheme(pref));
  }
  function watchSystemTheme() {
    if (!window.matchMedia) return;
    if (!mqlDark) mqlDark = window.matchMedia('(prefers-color-scheme: dark)');
    // pojedynczy listener — reaguje tylko gdy użytkownik trzyma tryb „system”
    mqlDark.onchange = () => {
      if ((state.prefs && state.prefs.theme) === 'system') applyThemeAttr('system');
    };
  }
  function renderPrefsUI() {
    const p = state.prefs || DEFAULT_PREFS;
    $$('[data-theme-opt]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-theme-opt') === p.theme));
    $$('[data-pref-toggle]').forEach((b) => b.classList.toggle('on', p[b.getAttribute('data-pref-toggle')] !== false));
  }
  function initPrefs(prefs) {
    state.prefs = Object.assign({}, DEFAULT_PREFS, prefs || {});
    try { localStorage.setItem(THEME_KEY, state.prefs.theme); } catch (_) { /* ignore */ }
    applyThemeAttr(state.prefs.theme);
    watchSystemTheme();
    renderPrefsUI();
  }
  function savePrefs(patch) {
    api('/me/preferences', { method: 'PUT', body: JSON.stringify(patch) })
      .catch(() => toast('Nie udało się zapisać preferencji.', true));
  }
  function setTheme(pref) {
    if (!['light', 'dark', 'system'].includes(pref)) return;
    state.prefs = Object.assign({}, state.prefs || DEFAULT_PREFS, { theme: pref });
    try { localStorage.setItem(THEME_KEY, pref); } catch (_) { /* ignore */ }
    applyThemeAttr(pref);
    renderPrefsUI();
    savePrefs({ theme: pref });
  }
  function togglePref(key) {
    const next = !((state.prefs && state.prefs[key]) !== false);
    state.prefs = Object.assign({}, state.prefs || DEFAULT_PREFS, { [key]: next });
    renderPrefsUI();
    savePrefs({ [key]: next });
  }

  async function refreshWarehouseCounts() {
    if (!state.user || !['viewer', 'manager', 'admin'].includes(state.user.role)) return;
    try {
      const val = await api('/warehouse/valuation');
      state.mag.valuation = val;
      $$('[data-stat="whQty"]').forEach((n) => (n.textContent = fmtInt(val.totalQty)));
      $$('[data-stat="whProducts"]').forEach((n) => (n.textContent = fmtInt(val.productCount)));
    } catch (_) { /* brak dostępu / błąd — zostaw „—” */ }
  }

  async function refreshLicenseCounts() {
    if (!state.user || !['manager', 'admin'].includes(state.user.role)) return;
    try {
      const s = await api('/licenses/summary');
      $$('[data-stat="licMonthly"]').forEach((n) => (n.textContent = fmtMoney(s.monthlyTotal)));
      $$('[data-stat="licActive"]').forEach((n) => (n.textContent = fmtInt(s.activeCount)));
    } catch (_) { /* brak dostępu */ }
  }

  async function refreshOnboardingCounts() {
    try {
      const s = await api('/onboarding/summary');
      $$('[data-stat="onbPct"]').forEach((n) => (n.textContent = s.pct + '%'));
      $$('[data-stat="onbSteps"]').forEach((n) => (n.textContent = `${s.done}/${s.total}`));
    } catch (_) { /* ignore */ }
  }

  // -------------------------------------------------------------- Sprzęt views
  function setView(view) {
    state.view = view;
    $$('#railNav .rail-link').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    $$('#mobileNav button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== view));
    loadView(view);
    const main = $('#screen-sprzet .main'); if (main) main.scrollTop = 0;
  }

  function loadView(view) {
    if (view === 'pulpit') return loadPulpit();
    if (view === 'available') return loadAvailable();
    if (view === 'mojsprzet') return loadMine();
    if (view === 'skrzynka') { loadInbox(); loadHistory(); return; }
    if (view === 'zespol') return loadTeam();
  }

  async function refreshCounts() {
    try {
      const [avail, mine, inbox] = await Promise.all([
        api('/items/available').catch(() => []),
        api('/my/items').catch(() => []),
        api('/my/action-items').catch(() => [])
      ]);
      state.cache.available = avail;
      state.cache.mine = mine;
      state.cache.inbox = inbox;
      state.loaded.available = true; state.loaded.mojsprzet = true; state.loaded.skrzynka = true;
      const availCount = avail.reduce((s, i) => s + (Number(i.available) || 0), 0);
      $$('[data-stat="available"]').forEach((n) => (n.textContent = availCount));
      $$('[data-stat="mine"]').forEach((n) => (n.textContent = mine.length));
      $$('[data-stat="inbox"]').forEach((n) => (n.textContent = inbox.length));
      const badge = $('[data-inbox-count]');
      if (badge) { badge.textContent = inbox.length; badge.classList.toggle('hidden', inbox.length === 0); }
    } catch (_) { /* handled by api */ }
  }

  // ---- Pulpit
  async function loadPulpit() {
    if (!state.cache.available) await refreshCounts();
    else {
      const availCount = (state.cache.available || []).reduce((s, i) => s + (Number(i.available) || 0), 0);
      $$('[data-stat="available"]').forEach((n) => (n.textContent = availCount));
      $$('[data-stat="mine"]').forEach((n) => (n.textContent = (state.cache.mine || []).length));
      $$('[data-stat="inbox"]').forEach((n) => (n.textContent = (state.cache.inbox || []).length));
    }
    const sub = $('[data-pulpit-subtitle]');
    if (sub) {
      const mine = (state.cache.mine || []).length;
      const inbox = (state.cache.inbox || []).length;
      sub.textContent = `Masz ${mine} ${plural(mine, 'sprzęt', 'sprzęty', 'sprzętów')} u siebie i ${inbox} ${plural(inbox, 'zgłoszenie', 'zgłoszenia', 'zgłoszeń')} w skrzynce.`;
    }
    const wrap = $('[data-pulpit-activity]');
    if (!wrap) return;
    try {
      const [reqs, loans] = await Promise.all([
        api('/my/loan-requests').catch(() => []),
        api('/my/loans').catch(() => [])
      ]);
      const acts = [];
      (reqs || []).slice(0, 5).forEach((r) => acts.push({
        color: statusColor(r.status), text: activityText(r), when: fmtDate(r.requestedAt)
      }));
      (loans || []).slice(0, 3).forEach((l) => acts.push({
        color: '#5F4B8B', text: 'Wypożyczenie: ' + (l.itemName || l.itemCode || 'sprzęt'), when: fmtDate(l.borrowedAt)
      }));
      acts.sort((a, b) => (b.when || '').localeCompare(a.when || ''));
      if (!acts.length) { wrap.innerHTML = emptyBlock('Brak aktywności', 'Twoje wnioski i wypożyczenia pojawią się tutaj.'); return; }
      wrap.innerHTML = acts.slice(0, 6).map((a) => `
        <div class="act"><span class="dot" style="background:${a.color}"></span>
          <div><div class="t">${esc(a.text)}</div><div class="w">${esc(a.when)}</div></div></div>`).join('');
    } catch (_) { wrap.innerHTML = emptyBlock('Nie udało się wczytać', ''); }
  }

  function activityText(r) {
    const label = r.kind === 'purchase' ? 'Wniosek o zakup' : 'Wniosek o wypożyczenie';
    return `${label} — ${r.itemName || r.itemCode || ''} (${statusLabel(r.status)})`;
  }

  // ---- Dostępny sprzęt
  function loadAvailable() {
    const list = $('[data-available-list]');
    const render = (items) => {
      const sub = $('[data-available-sub]');
      const totalUnits = items.reduce((s, i) => s + (Number(i.available) || 0), 0);
      if (sub) sub.textContent = `${items.length} ${plural(items.length, 'pozycja', 'pozycje', 'pozycji')} · ${totalUnits} ${plural(totalUnits, 'sztuka', 'sztuki', 'sztuk')} gotowych do wypożyczenia.`;
      if (!items.length) { list.innerHTML = emptyBlock('Brak dostępnego sprzętu', 'Wszystko jest aktualnie wypożyczone.'); return; }
      list.innerHTML = items.map((it) => {
        const sub2 = [it.category, it.model || it.brand].filter(Boolean).join(' · ');
        return `<div class="eq-card">
          <div class="eq-thumb"><span class="mono">${esc(initials(it.name))}</span>
            <span class="eq-state"><span class="${conditionChip(it.conditionStatus)}">${esc(it.conditionStatus || 'Dostępny')}</span></span></div>
          <div class="eq-body">
            <div class="eq-name">${esc(it.name || it.itemCode)}</div>
            <div class="eq-sub">${esc(sub2 || '')}</div>
            <div class="eq-actions">
              <button class="btn-ghost btn" data-detail="${esc(it.itemCode)}">Szczegóły</button>
              <button class="btn-primary btn" data-request="${esc(it.itemCode)}" data-name="${esc(it.name || it.itemCode)}">Wniosek</button>
            </div>
          </div></div>`;
      }).join('');
    };
    const applyFilter = () => {
      const q = ($('[data-available-search]').value || '').toLowerCase().trim();
      const items = (state.cache.available || []).filter((it) =>
        !q || (it.name || '').toLowerCase().includes(q) ||
        (it.itemCode || '').toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q) ||
        (it.brand || '').toLowerCase().includes(q) ||
        (it.model || '').toLowerCase().includes(q));
      render(items);
    };
    const search = $('[data-available-search]');
    if (search && !search._bound) { search._bound = true; search.addEventListener('input', applyFilter); }

    if (state.cache.available) { applyFilter(); return; }
    list.innerHTML = '<div class="loading">Ładowanie…</div>';
    api('/items/available').then((items) => { state.cache.available = items; applyFilter(); })
      .catch(() => { list.innerHTML = emptyBlock('Nie udało się wczytać', ''); });
  }

  // ---- Mój sprzęt
  function loadMine() {
    const list = $('[data-mojsprzet-list]');
    const render = (items) => {
      if (!items.length) { list.innerHTML = emptyBlock('Nie masz przypisanego sprzętu', 'Złóż wniosek w zakładce „Dostępny sprzęt”.'); return; }
      list.innerHTML = items.map((it) => {
        const sub = [it.category, it.currentLocation, it.conditionStatus].filter(Boolean).join(' · ');
        const qty = it.heldQuantity && it.heldQuantity > 1 ? ` ×${it.heldQuantity}` : '';
        return `<div class="row-card">
          <span class="row-mono">${esc(initials(it.name))}</span>
          <div class="row-main"><div class="n">${esc(it.name || it.itemCode)}${qty}</div><div class="s">${esc(sub)}</div></div>
          <div class="row-actions">
            <button class="btn-primary btn" data-return="${esc(it.itemCode)}" data-name="${esc(it.name || it.itemCode)}">Oddaj</button>
            <button class="btn-ghost btn" data-transfer="${esc(it.itemCode)}" data-name="${esc(it.name || it.itemCode)}">Przenieś</button>
            <button class="btn-danger-ghost btn" data-report="${esc(it.itemCode)}" data-name="${esc(it.name || it.itemCode)}">Zgłoś problem</button>
          </div></div>`;
      }).join('');
    };
    if (state.cache.mine) { render(state.cache.mine); return; }
    list.innerHTML = '<div class="loading">Ładowanie…</div>';
    api('/my/items').then((items) => { state.cache.mine = items; render(items); })
      .catch(() => { list.innerHTML = emptyBlock('Nie udało się wczytać', ''); });
  }

  // ---- Skrzynka (action items)
  function loadInbox() {
    const list = $('[data-skrzynka-list]');
    const render = (items) => {
      if (!items.length) { list.innerHTML = emptyBlock('Skrzynka jest pusta', 'Nie masz obecnie nic do decyzji.'); return; }
      const canDecide = state.user && (state.user.role === 'manager' || state.user.role === 'admin');
      list.innerHTML = items.map((r) => {
        const badgeClass = r.kind === 'purchase' ? 'chip chip-orange' : 'chip chip-blue';
        const badge = r.kind === 'purchase' ? 'Zakup' : 'Wypożyczenie';
        const actionable = canDecide && (r.status === 'pending_manager' || r.status === 'pending_admin' || r.status === 'pending');
        return `<div class="inbox-card">
          <div class="h"><span class="${badgeClass}">${badge}</span><span class="title">${esc(r.itemName || r.itemCode || 'Wniosek')}</span>
            <span class="chip chip-grey" style="margin-left:auto;">${esc(statusLabel(r.status))}</span></div>
          <div class="meta">Wnioskujący: ${esc(r.requesterName || r.requesterEmail || '—')} · ${esc(fmtDate(r.requestedAt))}${r.purpose ? ' · ' + esc(r.purpose) : ''}</div>
          ${actionable ? `<div class="row-actions">
            <button class="btn-primary btn btn-sm" data-approve="${esc(r._id)}">Zatwierdź</button>
            <button class="btn-danger-ghost btn btn-sm" data-reject="${esc(r._id)}">Odrzuć</button>
          </div>` : `<div class="done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>W toku obiegu</div>`}
        </div>`;
      }).join('');
    };
    if (state.cache.inbox) { render(state.cache.inbox); return; }
    list.innerHTML = '<div class="loading">Ładowanie…</div>';
    api('/my/action-items').then((items) => { state.cache.inbox = items; render(items); })
      .catch(() => { list.innerHTML = emptyBlock('Nie udało się wczytać', ''); });
  }

  // ---- Historia (read-only): zgłoszenia, transfery i wnioski użytkownika
  function histIcon(type) {
    if (type === 'issue') return '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>';
    if (type === 'transfer') return '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>';
    if (type === 'purchase') return '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>';
    return '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>';
  }
  function loadHistory() {
    const box = $('[data-skrzynka-history]');
    if (!box) return;
    const render = (events) => {
      if (!events.length) { box.innerHTML = emptyBlock('Brak historii', 'Twoje zgłoszenia, transfery i wnioski pojawią się tutaj.'); return; }
      box.innerHTML = events.map((ev) => {
        const name = ev.itemName || ev.itemCode || '';
        const bits = [];
        if (ev.message) bits.push(esc(ev.message));
        if (ev.status) bits.push(esc(statusLabel(ev.status)));
        return `<div class="hist-item">
          <span class="hist-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${histIcon(ev.type)}</svg></span>
          <div class="hist-body">
            <div class="hist-title">${esc(ev.title)}${name ? ' · ' + esc(name) : ''}</div>
            ${bits.length ? `<div class="hist-meta">${bits.join(' · ')}</div>` : ''}
          </div>
          <span class="hist-when">${esc(fmtDate(ev.at))}</span>
        </div>`;
      }).join('');
    };
    if (state.cache.history) { render(state.cache.history); return; }
    box.innerHTML = '<div class="loading">Ładowanie…</div>';
    api('/my/history').then((ev) => { state.cache.history = ev; render(ev); })
      .catch(() => { box.innerHTML = emptyBlock('Nie udało się wczytać historii', ''); });
  }

  // ---- Zespół
  function loadTeam() {
    const list = $('[data-zespol-list]');
    if (state.cache.team) { renderTeam(list, state.cache.team); return; }
    list.innerHTML = '<div class="loading">Ładowanie…</div>';
    api('/manager/team').then((team) => { state.cache.team = team; renderTeam(list, team); })
      .catch((e) => { list.innerHTML = emptyBlock('Brak dostępu do zespołu', e.message || ''); });
  }
  function renderTeam(list, team) {
    if (!team.length) { list.innerHTML = emptyBlock('Nikt nie jest do Ciebie przypisany', 'Przypisania nadaje administrator w panelu użytkowników.'); return; }
    list.innerHTML = team.map((m) => {
      const eq = (m.items || []).map((e) =>
        `<div class="item"><span class="n">${esc(e.name || e.itemCode)}</span><span class="l">${esc(e.currentLocation || '—')}</span></div>`).join('')
        || '<div class="item"><span class="l">Brak przypisanego sprzętu.</span></div>';
      return `<div class="team-card">
        <div class="team-head">
          <div class="team-id"><span class="team-avatar">${esc(initials(m.fullName))}</span>
            <div><div class="n">${esc(m.fullName)}</div><div class="e">${esc(m.email)} · ${esc(m.role || 'user')}</div></div></div>
          <span class="team-count">Sprzęt: ${(m.items || []).length}</span>
        </div>
        <div class="team-eq">${eq}</div>
      </div>`;
    }).join('');
  }

  // -------------------------------------------------------------- detail drawer
  function openDetail(code) {
    const wrap = $('#drawer-wrap');
    const box = $('#drawer');
    wrap.classList.remove('hidden');
    box.innerHTML = '<div class="loading">Ładowanie…</div>';
    api('/items/' + encodeURIComponent(code)).then((it) => {
      const tags = (it.tags || []).map((t) => `<span class="chip chip-blue">${esc(t)}</span>`).join('') || '<span class="eq-sub">Brak tagów</span>';
      const assign = it.assignedToName || it.assignedToEmail || 'Brak';
      box.innerHTML = `
        <div class="drawer-head">
          <div class="tags"><span class="${conditionChip(it.conditionStatus)}">${esc(it.conditionStatus || 'Dostępny')}</span><span class="chip chip-grey">${esc(it.category || '—')}</span></div>
          <button class="x-btn" data-close-drawer><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        <div class="drawer-body">
          <div class="drawer-hero"><span class="mono">${esc(initials(it.name))}</span></div>
          <h2>${esc(it.name || it.itemCode)}</h2>
          <p class="sub">${esc([it.category, it.details].filter(Boolean).join(' · ') || it.itemCode)}</p>
          <div class="kv-grid">
            <div class="kv"><div class="k">Marka / model</div><div class="v">${esc([it.brand, it.model].filter(Boolean).join(' / ') || '—')}</div></div>
            <div class="kv"><div class="k">Lokalizacja</div><div class="v">${esc(it.currentLocation || '—')}</div></div>
            <div class="kv"><div class="k">Stan</div><div class="v">${esc(it.conditionStatus || '—')}</div></div>
            <div class="kv"><div class="k">Przypisanie</div><div class="v">${esc(assign)}</div></div>
          </div>
          <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px;">Tagi</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">${tags}</div>
        </div>
        <div class="drawer-foot">
          <button class="btn btn-primary" style="flex:1;" data-request="${esc(it.itemCode)}" data-name="${esc(it.name || it.itemCode)}">Złóż wniosek</button>
          <button class="btn btn-ghost" data-close-drawer>Zamknij</button>
        </div>`;
    }).catch((e) => { box.innerHTML = `<div class="drawer-body">${emptyBlock('Nie udało się wczytać', e.message || '')}</div>`; });
  }
  function closeDrawer() { $('#drawer-wrap').classList.add('hidden'); }

  // -------------------------------------------------------------- modal sheet
  const sheetDefs = {
    purchase: {
      eyebrow: 'Zapotrzebowanie', title: 'Poproś o nowy sprzęt',
      hint: 'Wniosek o zakup trafi do akceptacji tak samo jak wypożyczenie.', cta: 'Wyślij wniosek',
      fields: () => `
        <label class="field"><span>Co potrzebujesz? *</span><input name="itemName" placeholder="np. Podkładka pod mysz XL"></label>
        <label class="field"><span>Link do sklepu *</span><input name="shopUrl" placeholder="https://sklep.pl/produkt"></label>
        <label class="field"><span>Uzasadnienie *</span><textarea name="justification" rows="3" placeholder="Do czego i dlaczego"></textarea></label>`,
      submit: async (data) => {
        if (!data.itemName || !data.shopUrl || !data.justification) throw new Error('Uzupełnij wymagane pola.');
        await api('/purchase-requests', { method: 'POST', body: JSON.stringify(data) });
        invalidate(['inbox', 'history']); toast('Wniosek o zakup wysłany.');
      }
    },
    request: {
      eyebrow: 'Dostępny sprzęt', title: 'Złóż wniosek o wypożyczenie',
      hint: (ctx) => `Wypożyczasz „${ctx.name || 'sprzęt'}”. Wniosek trafi do akceptacji.`, cta: 'Wyślij wniosek',
      fields: () => `
        <label class="field"><span>Cel wypożyczenia</span><input name="purpose" placeholder="np. montaż nagrań"></label>
        <label class="field"><span>Gdzie będzie używany?</span><input name="targetUseLocation" placeholder="np. Dom / Studio" value="Dom"></label>
        <label class="field"><span>Planowana data zwrotu *</span><input name="requestedReturnDate" type="date"></label>
        <label class="field"><span>Notatka</span><input name="note" placeholder="opcjonalnie"></label>`,
      submit: async (data, ctx) => {
        if (!data.requestedReturnDate) throw new Error('Podaj planowaną datę zwrotu.');
        await api('/loan-requests', { method: 'POST', body: JSON.stringify(Object.assign({ itemCode: ctx.itemCode }, data)) });
        invalidate(['inbox', 'history']); toast('Wniosek o wypożyczenie wysłany.');
      }
    },
    transfer: {
      eyebrow: 'Mój sprzęt', title: 'Przenieś sprzęt',
      hint: (ctx) => `Przenosisz „${ctx.name || 'sprzęt'}” na inną osobę.`, cta: 'Przenieś',
      fields: (ctx) => `
        <label class="field"><span>Przenieś na *</span><select name="toEmail">${ctx._userOptions || '<option value="">— ładowanie —</option>'}</select></label>
        <label class="field"><span>Notatka</span><input name="note" placeholder="np. zmiana opiekuna"></label>`,
      onOpen: async (ctx) => {
        if (!state.users) { try { state.users = await api('/users'); } catch (_) { state.users = []; } }
        ctx._userOptions = '<option value="">— wybierz osobę —</option>' +
          state.users.filter((u) => u.email !== (state.user && state.user.email))
            .map((u) => `<option value="${esc(u.email)}">${esc(u.fullName)}</option>`).join('');
      },
      submit: async (data, ctx) => {
        if (!data.toEmail) throw new Error('Wskaż osobę.');
        await api('/my/items/' + encodeURIComponent(ctx.itemCode) + '/transfer', { method: 'POST', body: JSON.stringify(data) });
        invalidate(['mine', 'available', 'history']); toast('Sprzęt przeniesiony.'); if (state.view === 'mojsprzet') loadMine();
      }
    },
    report: {
      eyebrow: 'Mój sprzęt', title: 'Zgłoś problem',
      hint: (ctx) => `Zgłoszenie dot. „${ctx.name || 'sprzęt'}” trafi do administracji.`, cta: 'Wyślij zgłoszenie',
      fields: () => `
        <label class="field"><span>Rodzaj zgłoszenia *</span><select name="issueType"><option value="damage">Uszkodzenie</option><option value="lost">Zgubienie</option><option value="other">Inne</option></select></label>
        <label class="field"><span>Opis *</span><textarea name="message" rows="4" placeholder="Opisz, co się stało"></textarea></label>`,
      submit: async (data, ctx) => {
        if (!data.message) throw new Error('Opisz zgłoszenie.');
        await api('/my/items/' + encodeURIComponent(ctx.itemCode) + '/report-issue', { method: 'POST', body: JSON.stringify(data) });
        invalidate(['history']); toast('Zgłoszenie wysłane.');
      }
    },
    newOp: {
      eyebrow: 'Magazyn · Operacje', title: (ctx) => 'Nowa operacja: ' + (ctx.typeLabel || ''),
      hint: 'Utwórz wersję roboczą — pozycje dodasz w następnym kroku.', cta: 'Utwórz wersję roboczą',
      fields: (ctx) => {
        const f = ctx.form || {};
        const locOpts = (sel) => optList(f.locations || [], (l) => l.id, (l) => l.name, sel);
        const party = ctx.type === 'receipt'
          ? `<label class="field"><span>Dostawca</span><select name="supplierId"><option value="">— brak —</option>${optList(f.suppliers || [], (s) => s.id, (s) => s.name)}</select></label>`
          : ctx.type === 'delivery'
            ? `<label class="field"><span>Miejsce dostawy</span><select name="destinationId"><option value="">— brak —</option>${optList(f.deliveryDestinations || [], (d) => d.id, (d) => d.name)}</select></label>`
            : '';
        return `<div class="field-2">
            <label class="field"><span>Z lokalizacji</span><select name="fromLocationId"><option value="">— domyślna —</option>${locOpts()}</select></label>
            <label class="field"><span>Do lokalizacji</span><select name="toLocationId"><option value="">— domyślna —</option>${locOpts()}</select></label>
          </div>
          ${party}
          <label class="field"><span>Kontakt</span><input name="contact" placeholder="np. dostawca / pracownik"></label>
          <label class="field"><span>Dokument źródłowy</span><input name="sourceDocument" placeholder="np. nr faktury / zamówienia"></label>`;
      },
      submit: async (data, ctx) => {
        const r = await api('/warehouse/operations', { method: 'POST', body: JSON.stringify(Object.assign({ type: ctx.type }, data)) });
        state.mag.formData = null;
        toast('Utworzono ' + (r.reference || 'wersję roboczą') + '.');
        setTimeout(() => openOpEditor(r.id), 60);
      }
    },
    supplier: {
      eyebrow: 'Magazyn · Konfiguracja', title: (ctx) => ctx.id ? 'Edytuj dostawcę' : 'Nowy dostawca',
      hint: 'Dostawca będzie dostępny przy przyjęciach.', cta: 'Zapisz',
      fields: (ctx) => `
        <label class="field"><span>Nazwa *</span><input name="name" value="${esc(ctx.name || '')}" placeholder="np. Rafael Sp. z o.o."></label>
        <label class="field"><span>Kontakt</span><input name="contact" value="${esc(ctx.contact || '')}" placeholder="e-mail / telefon"></label>
        <label class="field"><span>Notatka</span><input name="notes" value="${esc(ctx.notes || '')}" placeholder="opcjonalnie"></label>`,
      submit: async (data, ctx) => {
        if (!data.name) throw new Error('Podaj nazwę dostawcy.');
        if (ctx.id) await api('/warehouse/suppliers/' + encodeURIComponent(ctx.id), { method: 'PATCH', body: JSON.stringify(data) });
        else await api('/warehouse/suppliers', { method: 'POST', body: JSON.stringify(data) });
        toast('Zapisano dostawcę.'); afterConfigChange();
      }
    },
    location: {
      eyebrow: 'Magazyn · Konfiguracja', title: (ctx) => ctx.id ? 'Edytuj lokalizację' : 'Nowa lokalizacja',
      hint: 'Zdefiniuj lokalizację magazynową i jej typ.', cta: 'Zapisz',
      fields: (ctx) => `
        <label class="field"><span>Nazwa *</span><input name="name" value="${esc(ctx.name || '')}" placeholder="np. Serwis"></label>
        <label class="field"><span>Typ</span><select name="kind"><option value="internal"${ctx.kind === 'internal' ? ' selected' : ''}>Magazyn</option><option value="employee"${ctx.kind === 'employee' ? ' selected' : ''}>U pracownika</option></select></label>`,
      submit: async (data, ctx) => {
        if (!data.name) throw new Error('Podaj nazwę lokalizacji.');
        if (ctx.id) await api('/warehouse/locations/' + encodeURIComponent(ctx.id), { method: 'PATCH', body: JSON.stringify(data) });
        else await api('/warehouse/locations', { method: 'POST', body: JSON.stringify(data) });
        toast('Zapisano lokalizację.'); afterConfigChange();
      }
    },
    license: {
      eyebrow: 'Licencje', title: (ctx) => ctx.id ? 'Edytuj licencję' : 'Nowa licencja',
      hint: 'Nie zapisujemy haseł — tylko login, URL panelu i notatkę „gdzie jest hasło”.', cta: 'Zapisz',
      onOpen: async (ctx) => { if (!state.users) { try { state.users = await api('/users'); } catch (_) { state.users = []; } } },
      fields: (ctx) => {
        const owner = '<option value="">— brak —</option>' + (state.users || []).map((u) => `<option value="${esc(u.email)}"${u.email === ctx.ownerEmail ? ' selected' : ''}>${esc(u.fullName)}</option>`).join('');
        const cyc = (v) => `<option value="monthly"${(ctx.costCycle || 'monthly') === 'monthly' ? ' selected' : ''}>miesięcznie</option><option value="yearly"${ctx.costCycle === 'yearly' ? ' selected' : ''}>rocznie</option>`;
        const st = (v) => ['active', 'trial', 'cancelled'].map((s) => `<option value="${s}"${(ctx.status || 'active') === s ? ' selected' : ''}>${({ active: 'Aktywna', trial: 'Trial', cancelled: 'Anulowana' })[s]}</option>`).join('');
        return `
        <label class="field"><span>Nazwa *</span><input name="name" value="${esc(ctx.name || '')}" placeholder="np. Figma Organization"></label>
        <div class="field-2">
          <label class="field"><span>Dostawca</span><input name="vendor" value="${esc(ctx.vendor || '')}" placeholder="np. Figma Inc."></label>
          <label class="field"><span>Kategoria</span><input name="category" value="${esc(ctx.category || '')}" placeholder="np. Design"></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Koszt (zł)</span><input name="costAmount" type="number" min="0" step="0.01" value="${ctx.costAmount != null ? ctx.costAmount : ''}" placeholder="0,00"></label>
          <label class="field"><span>Cykl</span><select name="costCycle">${cyc()}</select></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Stanowiska</span><input name="seats" type="number" min="0" step="1" value="${ctx.seats != null ? ctx.seats : ''}" placeholder="np. 5"></label>
          <label class="field"><span>Data odnowienia</span><input name="renewalDate" type="date" value="${esc((ctx.renewalDate || '').slice(0, 10))}"></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Status</span><select name="status">${st()}</select></label>
          <label class="field"><span>Właściciel</span><select name="ownerEmail">${owner}</select></label>
        </div>
        <label class="field"><span>Używają (osoby/zespół, po przecinku)</span><input name="assignedTo" value="${esc((ctx.assignedTo || []).join(', '))}" placeholder="np. Kinga, Michał, Design"></label>
        <div class="field-2">
          <label class="field"><span>Login</span><input name="loginUsername" value="${esc(ctx.loginUsername || '')}" placeholder="np. billing@firma.pl"></label>
          <label class="field"><span>URL panelu</span><input name="panelUrl" value="${esc(ctx.panelUrl || '')}" placeholder="https://…"></label>
        </div>
        <label class="field"><span>Gdzie jest hasło</span><input name="passwordLocation" value="${esc(ctx.passwordLocation || '')}" placeholder="np. 1Password › Zespół"></label>
        <label class="field"><span>Notatka</span><input name="notes" value="${esc(ctx.notes || '')}" placeholder="opcjonalnie"></label>`;
      },
      submit: async (data, ctx) => {
        if (!data.name) throw new Error('Podaj nazwę licencji.');
        if (ctx.id) await api('/licenses/' + encodeURIComponent(ctx.id), { method: 'PATCH', body: JSON.stringify(data) });
        else await api('/licenses', { method: 'POST', body: JSON.stringify(data) });
        toast('Zapisano licencję.'); state.lic = null; loadLicencje(); refreshLicenseCounts();
      }
    },
    onbStep: {
      eyebrow: 'Onboarding', title: (ctx) => ctx.id ? 'Edytuj krok' : 'Nowy krok',
      hint: 'Krok pojawi się na liście onboardingu dla wszystkich osób.', cta: 'Zapisz',
      fields: (ctx) => `
        <label class="field"><span>Tytuł *</span><input name="title" value="${esc(ctx.title || '')}" placeholder="np. Skonfiguruj konto Google Workspace"></label>
        <label class="field"><span>Opis</span><textarea name="description" rows="2" placeholder="Szczegóły / kontekst">${esc(ctx.description || '')}</textarea></label>
        <div class="field-2">
          <label class="field"><span>Kategoria</span><input name="category" value="${esc(ctx.category || '')}" placeholder="np. Konta i dostępy"></label>
          <label class="field"><span>Kolejność</span><input name="sortOrder" type="number" step="1" value="${ctx.sortOrder != null ? ctx.sortOrder : ''}" placeholder="0"></label>
        </div>
        <label class="field"><span>Link (opcjonalnie)</span><input name="url" value="${esc(ctx.url || '')}" placeholder="https://…"></label>`,
      submit: async (data, ctx) => {
        if (!data.title) throw new Error('Podaj tytuł kroku.');
        if (ctx.id) await api('/onboarding/steps/' + encodeURIComponent(ctx.id), { method: 'PATCH', body: JSON.stringify(data) });
        else await api('/onboarding/steps', { method: 'POST', body: JSON.stringify(data) });
        toast('Zapisano krok.'); state.onb = null; loadOnboarding(); refreshOnboardingCounts();
      }
    }
  };

  function afterConfigChange() {
    state.mag.formData = null; state.mag.locations = null;
    if (state.magTab === 'konfiguracja') renderKonfiguracja();
    const sub = $('[data-mag-subtitle]'); if (sub) loadMagazyn();
  }
  function delSupplier(id) {
    if (!confirm('Usunąć dostawcę?')) return;
    api('/warehouse/suppliers/' + encodeURIComponent(id), { method: 'DELETE' }).then(() => { toast('Usunięto.'); afterConfigChange(); }).catch((e) => toast(e.message || 'Nie udało się.', true));
  }
  function delLocation(id) {
    if (!confirm('Usunąć lokalizację?')) return;
    api('/warehouse/locations/' + encodeURIComponent(id), { method: 'DELETE' }).then(() => { toast('Usunięto.'); afterConfigChange(); }).catch((e) => toast(e.message || 'Nie udało się.', true));
  }

  // -------------------------------------------------------------- Licencje
  const LIC_STATUS = { active: 'Aktywna', trial: 'Trial', cancelled: 'Anulowana' };
  function licStatusChip(s) { return s === 'active' ? 'chip chip-new' : s === 'trial' ? 'chip chip-blue' : 'chip chip-grey'; }
  function renewalChip(days) {
    if (days == null) return '';
    if (days < 0) return `<span class="chip chip-red">Po terminie (${Math.abs(days)} dni)</span>`;
    if (days <= 30) return `<span class="chip chip-orange">Odnowienie za ${days} dni</span>`;
    return '';
  }

  async function loadLicencje() {
    const list = $('[data-lic-list]'); const statsEl = $('[data-lic-stats]'); const sub = $('[data-lic-subtitle]');
    const render = () => {
      const items = state.lic || [];
      const live = items.filter((l) => l.status !== 'cancelled');
      const monthly = live.reduce((s, l) => s + (l.monthlyCost || 0), 0);
      const upcoming = live.filter((l) => l.daysToRenewal != null && l.daysToRenewal >= 0 && l.daysToRenewal <= 30).length;
      const overdue = live.filter((l) => l.daysToRenewal != null && l.daysToRenewal < 0).length;
      if (sub) sub.textContent = `${items.length} ${plural(items.length, 'licencja', 'licencje', 'licencji')} · ${fmtMoney(monthly)}/mies · ${upcoming} ${plural(upcoming, 'odnowienie', 'odnowienia', 'odnowień')} ≤30 dni`;
      if (statsEl) statsEl.innerHTML = `<div class="stat-row">
        <div class="stat"><div class="k">Koszt miesięczny</div><div class="v" style="color:#1B7A4F;">${esc(fmtMoney(monthly))}</div><div class="s">${live.length} aktywnych</div></div>
        <div class="stat"><div class="k">Koszt roczny</div><div class="v">${esc(fmtMoney(monthly * 12))}</div><div class="s">szacunkowo</div></div>
        <div class="stat"><div class="k">Odnowienia ≤30 dni</div><div class="v" style="color:${upcoming ? '#E57200' : '#0C1C44'};">${fmtInt(upcoming)}</div><div class="s">${overdue ? overdue + ' po terminie' : 'na czas'}</div></div>
        <div class="stat"><div class="k">Wszystkich</div><div class="v">${fmtInt(items.length)}</div><div class="s">w rejestrze</div></div>
      </div>`;
      if (!items.length) { list.innerHTML = emptyBlock('Brak licencji', 'Dodaj pierwszą subskrypcję przyciskiem „Dodaj licencję”.'); return; }
      list.innerHTML = items.map((l) => {
        const sub2 = [l.vendor, l.category].filter(Boolean).join(' · ');
        const cost = `${fmtMoney(l.costAmount)} / ${l.costCycle === 'yearly' ? 'rok' : 'mies'}`;
        return `<div class="row-card">
          <span class="row-mono" style="background:#E7F6EF;color:#1B7A4F;">${esc(initials(l.name))}</span>
          <div class="row-main"><div class="n">${esc(l.name)}</div><div class="s">${esc(sub2 || '—')}</div></div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;min-width:120px;">
            <span style="font-size:14px;font-weight:600;color:var(--ink);">${esc(cost)}</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;"><span class="${licStatusChip(l.status)}">${esc(LIC_STATUS[l.status] || l.status)}</span>${renewalChip(l.daysToRenewal)}</div>
          </div>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" data-lic-detail="${esc(l.id)}">Szczegóły</button>
            <button class="btn btn-ghost btn-sm" data-lic-edit="${esc(l.id)}">Edytuj</button>
            <button class="btn btn-danger-ghost btn-sm" data-lic-del="${esc(l.id)}">Usuń</button>
          </div></div>`;
      }).join('');
    };
    if (state.lic) { render(); return; }
    list.innerHTML = '<div class="loading">Ładowanie…</div>';
    try { state.lic = await api('/licenses'); render(); }
    catch (e) { list.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }

  function openLicenseDetail(id) {
    const l = (state.lic || []).find((x) => x.id === id); if (!l) return;
    const wrap = $('#drawer-wrap'); const box = $('#drawer');
    wrap.classList.remove('hidden');
    const assigned = (l.assignedTo || []).map((a) => `<span class="chip chip-blue">${esc(a)}</span>`).join('') || '<span class="eq-sub">—</span>';
    const link = l.panelUrl ? `<a href="${esc(l.panelUrl)}" target="_blank" rel="noopener" style="color:#3F5FBE;word-break:break-all;">${esc(l.panelUrl)}</a>` : '—';
    box.innerHTML = `
      <div class="drawer-head"><div class="tags"><span class="${licStatusChip(l.status)}">${esc(LIC_STATUS[l.status] || l.status)}</span>${l.category ? `<span class="chip chip-grey">${esc(l.category)}</span>` : ''}</div>
        <button class="x-btn" data-close-drawer><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>
      <div class="drawer-body">
        <h2>${esc(l.name)}</h2>
        <p class="sub">${esc(l.vendor || '—')}</p>
        <div class="kv-grid">
          <div class="kv"><div class="k">Koszt</div><div class="v">${esc(fmtMoney(l.costAmount))} / ${l.costCycle === 'yearly' ? 'rok' : 'mies'}</div></div>
          <div class="kv"><div class="k">Miesięcznie</div><div class="v">${esc(fmtMoney(l.monthlyCost))}</div></div>
          <div class="kv"><div class="k">Stanowiska</div><div class="v">${l.seats != null ? fmtInt(l.seats) : '—'}</div></div>
          <div class="kv"><div class="k">Odnowienie</div><div class="v">${esc(fmtDay(l.renewalDate) || '—')}</div></div>
        </div>
        ${renewalChip(l.daysToRenewal) ? `<div style="margin-bottom:18px;">${renewalChip(l.daysToRenewal)}</div>` : ''}
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px;">Dostęp</div>
        <div class="kv" style="margin-bottom:10px;"><div class="k">Login</div><div class="v" style="font-family:ui-monospace,monospace;">${esc(l.loginUsername || '—')}</div></div>
        <div class="kv" style="margin-bottom:10px;"><div class="k">Panel</div><div class="v">${link}</div></div>
        <div class="kv" style="margin-bottom:18px;"><div class="k">Gdzie hasło</div><div class="v">${esc(l.passwordLocation || '—')}</div></div>
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px;">Właściciel</div>
        <p class="sub" style="margin-bottom:14px;">${esc(l.ownerName || l.ownerEmail || '—')}</p>
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px;">Używają</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">${assigned}</div>
        ${l.notes ? `<div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:6px;">Notatka</div><p class="sub">${esc(l.notes)}</p>` : ''}
      </div>
      <div class="drawer-foot"><button class="btn btn-primary" style="flex:1;" data-lic-edit="${esc(l.id)}">Edytuj</button><button class="btn btn-ghost" data-close-drawer>Zamknij</button></div>`;
  }

  function delLicense(id) {
    if (!confirm('Usunąć licencję z rejestru?')) return;
    api('/licenses/' + encodeURIComponent(id), { method: 'DELETE' }).then(() => { toast('Usunięto.'); state.lic = null; loadLicencje(); refreshLicenseCounts(); }).catch((e) => toast(e.message || 'Nie udało się.', true));
  }

  // -------------------------------------------------------------- Onboarding
  const CHECK_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  async function loadOnboarding() {
    const list = $('[data-onb-list]'); const prog = $('[data-onb-progress]'); const sub = $('[data-onb-subtitle]');
    const isAdmin = state.user && state.user.role === 'admin';
    const render = () => {
      const steps = state.onb || [];
      const done = steps.filter((s) => s.done).length;
      const total = steps.length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      if (sub) sub.textContent = total ? `${done} z ${total} ${plural(total, 'kroku', 'kroków', 'kroków')} ukończonych` : 'Brak kroków onboardingu.';
      if (prog) prog.innerHTML = `<div class="onb-progress-card">
        <div class="onb-progress-head"><span class="pct">${pct}%</span><span class="lbl">${done} z ${total} kroków</span></div>
        <div class="onb-bar"><div class="fill" style="width:${pct}%;"></div></div>
      </div>`;
      if (!total) { list.innerHTML = emptyBlock('Brak kroków', isAdmin ? 'Dodaj pierwszy krok przyciskiem „Dodaj krok”.' : 'Administrator jeszcze nie skonfigurował onboardingu.'); return; }
      // group by category preserving order
      const groups = [];
      const idx = new Map();
      steps.forEach((s) => {
        const c = s.category || 'Ogólne';
        if (!idx.has(c)) { idx.set(c, groups.length); groups.push({ cat: c, items: [] }); }
        groups[idx.get(c)].items.push(s);
      });
      list.innerHTML = groups.map((g) => `<div class="onb-cat">${esc(g.cat)}</div>` + g.items.map((s) => `
        <div class="onb-item${s.done ? ' done' : ''}">
          <div class="onb-check" data-onb-toggle="${esc(s.id)}" data-done="${s.done ? '1' : '0'}">${CHECK_SVG}</div>
          <div class="onb-body">
            <div class="onb-title">${esc(s.title)}</div>
            ${s.description ? `<div class="onb-desc">${esc(s.description)}</div>` : ''}
            ${s.url ? `<a class="onb-link" href="${esc(s.url)}" target="_blank" rel="noopener">Otwórz odnośnik →</a>` : ''}
          </div>
          ${isAdmin ? `<div class="onb-admin"><button class="btn btn-ghost btn-sm" data-onb-edit="${esc(s.id)}">Edytuj</button><button class="btn btn-danger-ghost btn-sm" data-onb-del="${esc(s.id)}">Usuń</button></div>` : ''}
        </div>`).join('')).join('');
    };
    if (state.onb) { render(); return; }
    list.innerHTML = '<div class="loading">Ładowanie…</div>';
    try { state.onb = await api('/onboarding'); render(); }
    catch (e) { list.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }

  async function toggleStep(id, currentlyDone) {
    // optimistic
    const step = (state.onb || []).find((s) => s.id === id);
    if (step) step.done = !currentlyDone;
    loadOnboarding();
    try {
      await api('/onboarding/' + encodeURIComponent(id) + '/toggle', { method: 'POST', body: JSON.stringify({ done: !currentlyDone }) });
      refreshOnboardingCounts();
    } catch (e) {
      if (step) step.done = currentlyDone; loadOnboarding();
      toast(e.message || 'Nie udało się.', true);
    }
  }

  function delStep(id) {
    if (!confirm('Usunąć ten krok onboardingu?')) return;
    api('/onboarding/steps/' + encodeURIComponent(id), { method: 'DELETE' }).then(() => { toast('Usunięto.'); state.onb = null; loadOnboarding(); refreshOnboardingCounts(); }).catch((e) => toast(e.message || 'Nie udało się.', true));
  }

  let currentSheet = null;
  async function openSheet(type, ctx) {
    const def = sheetDefs[type];
    if (!def) return;
    ctx = ctx || {};
    currentSheet = { type, ctx };
    const wrap = $('#sheet-wrap');
    const box = $('#sheet');
    wrap.classList.remove('hidden');
    if (def.onOpen) { box.innerHTML = '<div class="loading">Ładowanie…</div>'; try { await def.onOpen(ctx); } catch (_) {} }
    const hint = typeof def.hint === 'function' ? def.hint(ctx) : def.hint;
    const title = typeof def.title === 'function' ? def.title(ctx) : def.title;
    box.innerHTML = `
      <div class="sheet-top"><div class="sheet-eyebrow">${esc(def.eyebrow)}</div>
        <button class="x-btn" data-close-sheet><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>
      <h3>${esc(title)}</h3>
      <p class="hint">${esc(hint)}</p>
      <form class="sheet-fields" id="sheetForm">${def.fields(ctx)}</form>
      <div class="sheet-actions">
        <button class="btn btn-primary" id="sheetSubmit">${esc(def.cta)}</button>
        <button class="btn btn-ghost" data-close-sheet>Anuluj</button>
      </div>`;
  }
  function closeSheet() { $('#sheet-wrap').classList.add('hidden'); currentSheet = null; }

  async function submitSheet() {
    if (!currentSheet) return;
    const def = sheetDefs[currentSheet.type];
    const form = $('#sheetForm');
    const data = {};
    $$('[name]', form).forEach((el) => (data[el.name] = el.value.trim ? el.value.trim() : el.value));
    const btn = $('#sheetSubmit');
    btn.disabled = true; const old = btn.textContent; btn.textContent = 'Wysyłanie…';
    try {
      await def.submit(data, currentSheet.ctx);
      closeSheet();
    } catch (e) {
      toast(e.message || 'Nie udało się wysłać.', true);
      btn.disabled = false; btn.textContent = old;
    }
  }

  // -------------------------------------------------------------- actions
  async function doReturn(code, name) {
    if (!confirm(`Oddać „${name}” do magazynu?`)) return;
    try {
      await api('/items/' + encodeURIComponent(code) + '/return', { method: 'POST', body: JSON.stringify({ returnLocation: 'Magazyn' }) });
      toast('Sprzęt oddany.'); invalidate(['mine', 'available']); loadMine();
    } catch (e) { toast(e.message || 'Nie udało się oddać.', true); }
  }

  async function decide(id, approve) {
    const isAdmin = state.user && state.user.role === 'admin';
    const base = isAdmin ? '/admin/loan-requests/' : '/manager/loan-requests/';
    try {
      await api(base + encodeURIComponent(id) + (approve ? '/approve' : '/reject'), { method: 'POST', body: JSON.stringify({}) });
      toast(approve ? 'Wniosek zatwierdzony.' : 'Wniosek odrzucony.');
      invalidate(['inbox']); loadInbox();
    } catch (e) { toast(e.message || 'Nie udało się.', true); }
  }

  function invalidate(keys) {
    keys.forEach((k) => { delete state.cache[k]; });
    // counts depend on these — refresh silently
    refreshCounts();
  }

  // -------------------------------------------------------------- helpers text
  function statusLabel(s) {
    return ({
      pending_manager: 'Czeka na kierownika', pending_admin: 'Czeka na admina', pending: 'Oczekuje',
      approved: 'Zatwierdzony', rejected: 'Odrzucony', fulfilled: 'Zrealizowany',
      to_order: 'Do zamówienia', ordered: 'Zamówiony', cancelled: 'Anulowany', completed: 'Zakończony',
      open: 'Otwarte', resolved: 'Zamknięte'
    })[s] || s || '—';
  }
  function statusColor(s) {
    if (s === 'approved' || s === 'fulfilled' || s === 'completed') return '#22A06B';
    if (s === 'rejected' || s === 'cancelled') return '#BF1932';
    if (s === 'to_order' || s === 'ordered') return '#E57200';
    return '#3F5FBE';
  }
  function plural(n, one, few, many) {
    n = Math.abs(n);
    if (n === 1) return one;
    const d = n % 10, h = n % 100;
    if (d >= 2 && d <= 4 && !(h >= 12 && h <= 14)) return few;
    return many;
  }
  function emptyBlock(t, s) {
    return `<div class="empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C6D0F5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg><div class="t">${esc(t)}</div>${s ? `<div class="s">${esc(s)}</div>` : ''}</div>`;
  }
  function fmtInt(n) { return Number(n || 0).toLocaleString('pl-PL'); }
  function fmtMoney(n) { return Number(n || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł'; }
  function fmtDay(v) {
    if (!v) return '';
    const d = new Date(v); if (isNaN(d)) return '';
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

  // -------------------------------------------------------------- Magazyn
  const OP_STATE = { draft: 'Wersja robocza', ready: 'Gotowe', done: 'Zatwierdzono', cancelled: 'Anulowano' };
  const MOVE_KIND = { receipt: 'Przyjęcie', delivery: 'Wydanie', internal: 'Przesunięcie', scrap: 'Odpad', adjustment: 'Korekta', conversion: 'Konwersja', in: 'Przyjęcie', out: 'Wydanie' };
  const LOC_KIND = { view: 'Grupa', internal: 'Magazyn', employee: 'U pracownika', customer: 'Klienci', supplier: 'Dostawcy', transit: 'Tranzyt', inventory: 'Inwentaryzacja', scrap: 'Odpad' };
  const OP_META = {
    receipt: { label: 'Przyjęcia', emoji: '📥', color: '#3F5FBE', bg: '#EEF1FB' },
    delivery: { label: 'Dostawy', emoji: '📤', color: '#5F4B8B', bg: '#EDE9F6' },
    internal: { label: 'Wewnętrzne', emoji: '🔁', color: '#3F5FBE', bg: '#EEF1FB' },
    scrap: { label: 'Odpad', emoji: '🗑️', color: '#BF1932', bg: '#FBEEF0' },
    adjustment: { label: 'Inwentarz', emoji: '📋', color: '#22A06B', bg: '#E7F6EF' },
    conversion: { label: 'Konwersje', emoji: '♻️', color: '#E57200', bg: '#FBEDE0' }
  };
  const OP_TAB_ORDER = ['receipt', 'delivery', 'scrap', 'adjustment', 'conversion'];
  const REPORTS = [
    ['stock', 'Stan'], ['valuation', 'Wycena stanu'], ['moves', 'Historia ruchów'],
    ['period', 'Ruchy w okresie'], ['gift', 'Prezenty ≤20 zł'], ['aging', 'Wiek zapasu'], ['health', 'Spójność danych']
  ];

  function tableHTML(headers, rows) {
    const th = headers.map((h) => `<th class="${h.num ? 'num' : ''}">${esc(h.t)}</th>`).join('');
    const tb = rows.map((r) => {
      const attrs = r.click ? ` class="click" data-mag-op="${esc(r.click)}"` : '';
      const tds = r.cells.map((c) => `<td class="${c.cls || ''}">${c.html != null ? c.html : esc(c.v)}</td>`).join('');
      return `<tr${attrs}>${tds}</tr>`;
    }).join('');
    return `<div class="wtable-wrap"><table class="wtable"><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
  }

  function setMagTab(tab) {
    state.magTab = tab;
    $$('#magTabs .mag-tab').forEach((b) => b.classList.toggle('active', b.dataset.magTab === tab));
    $$('[data-mag-panel]').forEach((p) => (p.hidden = p.dataset.magPanel !== tab));
    renderMagTab(tab);
    const sc = $('#screen-magazyn'); if (sc) sc.scrollTop = 0;
  }

  async function loadMagazyn() {
    setMagTab(state.magTab || 'przeglad');
    // subtitle from valuation + locations
    try {
      const [val, locs] = await Promise.all([
        state.mag.valuation ? Promise.resolve(state.mag.valuation) : api('/warehouse/valuation'),
        state.mag.locations ? Promise.resolve(state.mag.locations) : api('/warehouse/locations')
      ]);
      state.mag.valuation = val; state.mag.locations = locs;
      const physical = locs.filter((l) => l.onHand > 0 || l.kind === 'internal' || l.kind === 'employee').length || locs.length;
      const sub = $('[data-mag-subtitle]');
      if (sub) sub.textContent = `${fmtInt(val.totalQty)} szt. na stanie · ${fmtInt(val.productCount)} pozycji · ${fmtInt(locs.length)} lokalizacji · ${fmtMoney(val.totalValue)}`;
    } catch (_) { const sub = $('[data-mag-subtitle]'); if (sub) sub.textContent = 'Brak dostępu do magazynu.'; }
  }

  function renderMagTab(tab) {
    if (tab === 'przeglad') return renderPrzeglad();
    if (tab === 'operacje') return renderOperacje();
    if (tab === 'produkty') return renderProdukty();
    if (tab === 'raportowanie') return renderRaportowanie();
    if (tab === 'konfiguracja') return renderKonfiguracja();
  }

  // ---- Przegląd
  async function renderPrzeglad() {
    const el = $('[data-mag-panel="przeglad"]');
    el.innerHTML = '<div class="loading">Ładowanie…</div>';
    try {
      const [ov, val, locs] = await Promise.all([
        api('/warehouse/overview'),
        state.mag.valuation ? Promise.resolve(state.mag.valuation) : api('/warehouse/valuation'),
        state.mag.locations ? Promise.resolve(state.mag.locations) : api('/warehouse/locations')
      ]);
      state.mag.valuation = val; state.mag.locations = locs;
      const stats = `<div class="stat-row">
        <div class="stat"><div class="k">Na stanie</div><div class="v" style="color:#5F4B8B;">${fmtInt(val.totalQty)}</div></div>
        <div class="stat"><div class="k">Pozycji</div><div class="v">${fmtInt(val.productCount)}</div></div>
        <div class="stat"><div class="k">Lokalizacji</div><div class="v">${fmtInt(locs.length)}</div></div>
        <div class="stat"><div class="k">Wartość</div><div class="v">${esc(fmtMoney(val.totalValue))}</div></div>
      </div>`;
      const byType = new Map((ov.types || []).map((t) => [t.type, t]));
      const cards = OP_TAB_ORDER.map((type) => {
        const m = OP_META[type]; const t = byType.get(type) || {};
        const todo = (t.draft || 0) + (t.ready || 0);
        return `<div class="op-card" style="border-top-color:${m.color};">
          <div class="h"><span class="emoji" style="background:${m.bg};">${m.emoji}</span><span class="title">${m.label}</span></div>
          <div class="nums"><div><div class="n">${fmtInt(todo)}</div><div class="l">do zrobienia</div></div><div><div class="n">${fmtInt(t.done || 0)}</div><div class="l">wykonano</div></div></div>
        </div>`;
      }).join('');
      const repl = ov.replenishment || { below: 0, rules: 0 };
      const replCard = `<div class="op-card" style="border-top-color:#E57200;">
        <div class="h"><span class="emoji" style="background:#FBEDE0;">🛒</span><span class="title">Zapotrzebowanie</span></div>
        <div class="nums"><div><div class="n">${fmtInt(repl.below)}</div><div class="l">poniżej minimum</div></div><div><div class="n">${fmtInt(repl.rules)}</div><div class="l">reguł</div></div></div>
      </div>`;
      el.innerHTML = `<div class="anim-fadeup">${stats}<h3 style="margin:0 0 14px;font-size:16px;font-weight:600;color:var(--ink);">Operacje</h3><div class="op-cards">${cards}${replCard}</div></div>`;
    } catch (e) { el.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }

  // ---- Operacje
  async function renderOperacje() {
    const el = $('[data-mag-panel="operacje"]');
    const subtabs = OP_TAB_ORDER.map((type) =>
      `<button class="op-subtab ${state.magOpType === type ? 'active' : ''}" data-mag-optab="${type}">${OP_META[type].label}</button>`).join('');
    el.innerHTML = `<div class="anim-fadeup">
      <div class="op-subtabs">${subtabs}</div>
      <button class="btn btn-primary" data-mag-new-op style="margin-bottom:18px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>Nowa operacja</button>
      <div data-mag-op-list><div class="loading">Ładowanie…</div></div></div>`;
    const list = $('[data-mag-op-list]');
    try {
      const ops = await api('/warehouse/operations?type=' + encodeURIComponent(state.magOpType));
      if (!ops.length) { list.innerHTML = emptyBlock('Brak operacji w tym widoku', 'Utwórz operację w klasycznym widoku magazynu.'); return; }
      list.innerHTML = tableHTML(
        [{ t: 'Odnośnik' }, { t: 'Z' }, { t: 'Do' }, { t: 'Kontakt' }, { t: 'Dokument' }, { t: 'Status', num: true }],
        ops.map((o) => ({
          click: o.id,
          cells: [
            { v: o.reference, cls: '' }, { v: o.fromName || '—', cls: 'mut' }, { v: o.toName || '—', cls: 'mut' },
            { v: o.supplierName || o.contact || '—', cls: 'mut' }, { v: o.sourceDocument || '—', cls: 'mut' },
            { html: `<span class="chip chip-grey">${esc(OP_STATE[o.state] || o.state)}</span>`, cls: 'num' }
          ]
        }))
      );
    } catch (e) { list.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }

  async function magForm() {
    if (!state.mag.formData) state.mag.formData = await api('/warehouse/form-data');
    return state.mag.formData;
  }
  function optList(items, valOf, labelOf, selected) {
    return items.map((x) => { const v = valOf(x); return `<option value="${esc(v)}"${String(v) === String(selected || '') ? ' selected' : ''}>${esc(labelOf(x))}</option>`; }).join('');
  }

  // Operation editor: read-only for done/cancelled, editable for draft/ready.
  const opEdit = { id: null, type: null, lines: [] };

  async function openOpEditor(id) {
    const wrap = $('#drawer-wrap'); const box = $('#drawer');
    wrap.classList.remove('hidden');
    box.innerHTML = '<div class="loading">Ładowanie…</div>';
    try {
      const [op, form] = await Promise.all([api('/warehouse/operations/' + encodeURIComponent(id)), magForm()]);
      if (op.state === 'done' || op.state === 'cancelled') return renderOpReadonly(box, op);
      opEdit.id = op.id; opEdit.type = op.type;
      opEdit.lines = (op.lines || []).map((l) => ({ itemCode: l.itemCode, quantity: l.quantity, unitPrice: l.unitPrice, targetItemCode: l.targetItemCode, countedQty: l.countedQty }));
      renderOpEditor(box, op, form);
    } catch (e) { box.innerHTML = `<div class="drawer-body">${emptyBlock('Nie udało się wczytać', e.message || '')}</div>`; }
  }

  function renderOpReadonly(box, op) {
    const lines = (op.lines || []).map((l) =>
      `<div class="team-eq"><div class="item"><span class="n">${esc(l.itemName || l.itemCode)}${l.targetName ? ' → ' + esc(l.targetName) : ''}</span><span class="l">${fmtInt(l.quantity != null ? l.quantity : l.countedQty)} szt.${l.unitPrice != null ? ' · ' + fmtMoney(l.unitPrice) : ''}</span></div></div>`).join('')
      || '<p class="sub">Brak pozycji.</p>';
    const canReverse = op.state === 'done';
    box.innerHTML = `
      <div class="drawer-head"><div class="tags"><span class="chip chip-blue">${esc(op.typeLabel)}</span><span class="chip chip-grey">${esc(OP_STATE[op.state] || op.state)}</span></div>
        <button class="x-btn" data-close-drawer><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>
      <div class="drawer-body">
        <h2>${esc(op.reference)}</h2>
        <p class="sub">${esc([op.fromName, op.toName].filter(Boolean).join(' → ') || '—')}</p>
        <div class="kv-grid">
          <div class="kv"><div class="k">Kontakt</div><div class="v">${esc(op.supplierName || op.contact || '—')}</div></div>
          <div class="kv"><div class="k">Dokument</div><div class="v">${esc(op.sourceDocument || '—')}</div></div>
          <div class="kv"><div class="k">Utworzono</div><div class="v">${esc(fmtDay(op.createdAt) || '—')}</div></div>
          <div class="kv"><div class="k">Zatwierdzono</div><div class="v">${esc(fmtDay(op.doneAt) || '—')}</div></div>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin:4px 0 8px;">Pozycje (${(op.lines || []).length})</div>
        ${lines}
      </div>
      <div class="drawer-foot">${canReverse ? `<button class="btn btn-ghost" style="flex:1;" data-op-reverse="${esc(op.id)}">Cofnij do roboczej</button>` : ''}<button class="btn btn-ghost" ${canReverse ? '' : 'style="flex:1;"'} data-close-drawer>Zamknij</button></div>`;
  }

  function renderOpEditor(box, op, form) {
    const t = op.type;
    const locOpts = (sel) => optList(form.locations, (l) => l.id, (l) => l.name, sel);
    const supOpts = (sel) => '<option value="">— brak —</option>' + optList(form.suppliers, (s) => s.id, (s) => s.name, sel);
    const dstOpts = (sel) => '<option value="">— brak —</option>' + optList(form.deliveryDestinations, (d) => d.id, (d) => d.name, sel);
    const partyField = t === 'receipt'
      ? `<label class="field"><span>Dostawca</span><select data-op-h="supplierId">${supOpts(op.supplierId)}</select></label>`
      : t === 'delivery'
        ? `<label class="field"><span>Miejsce dostawy</span><select data-op-h="destinationId">${dstOpts(op.destinationId)}</select></label>`
        : '';
    box.innerHTML = `
      <div class="drawer-head"><div class="tags"><span class="chip chip-blue">${esc(op.typeLabel)}</span><span class="chip chip-orange">${esc(OP_STATE[op.state] || op.state)}</span></div>
        <button class="x-btn" data-close-drawer><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>
      <div class="drawer-body">
        <h2>${esc(op.reference)}</h2>
        <p class="sub">Wersja robocza — uzupełnij pozycje i zatwierdź.</p>
        <div class="sheet-fields" style="margin-bottom:18px;">
          <div class="field-2">
            <label class="field"><span>Z lokalizacji</span><select data-op-h="fromLocationId">${locOpts(op.fromLocationId)}</select></label>
            <label class="field"><span>Do lokalizacji</span><select data-op-h="toLocationId">${locOpts(op.toLocationId)}</select></label>
          </div>
          ${partyField}
          <label class="field"><span>Kontakt</span><input data-op-h="contact" value="${esc(op.contact || '')}" placeholder="np. dostawca / pracownik"></label>
          <label class="field"><span>Dokument źródłowy</span><input data-op-h="sourceDocument" value="${esc(op.sourceDocument || '')}" placeholder="np. nr faktury"></label>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><div style="font-size:13px;font-weight:600;color:var(--ink);">Pozycje</div><button class="btn btn-ghost btn-sm" data-op-addline>+ Dodaj</button></div>
        <div data-op-lines></div>
      </div>
      <div class="drawer-foot" style="flex-wrap:wrap;gap:8px;">
        <button class="btn btn-primary" style="flex:1;min-width:120px;" data-op-validate>Zatwierdź operację</button>
        <button class="btn btn-ghost" data-op-save>Zapisz</button>
        <button class="btn btn-danger-ghost" data-op-cancel>Anuluj</button>
      </div>`;
    renderOpLines();
  }

  function renderOpLines() {
    const wrap = $('[data-op-lines]'); if (!wrap) return;
    const t = opEdit.type; const items = (state.mag.formData || {}).items || [];
    if (!opEdit.lines.length) { wrap.innerHTML = '<p class="sub" style="margin:0 0 4px;">Brak pozycji — dodaj przyciskiem „+ Dodaj”.</p>'; return; }
    const itemOpts = (sel) => '<option value="">— wybierz produkt —</option>' + optList(items, (i) => i.itemCode, (i) => `${i.name} (dostępne: ${i.available})`, sel);
    wrap.innerHTML = opEdit.lines.map((l, i) => {
      let extra = '';
      if (t === 'receipt') extra = `<input data-line-field="unitPrice" data-idx="${i}" type="number" min="0" step="0.01" value="${l.unitPrice != null ? l.unitPrice : ''}" placeholder="cena" style="width:80px;">`;
      else if (t === 'conversion') extra = `<select data-line-field="targetItemCode" data-idx="${i}" style="flex:1;min-width:120px;">${itemOpts(l.targetItemCode)}</select>`;
      const qtyField = t === 'adjustment'
        ? `<input data-line-field="countedQty" data-idx="${i}" type="number" min="0" step="1" value="${l.countedQty != null ? l.countedQty : ''}" placeholder="policzono" style="width:90px;">`
        : `<input data-line-field="quantity" data-idx="${i}" type="number" min="1" step="1" value="${l.quantity != null ? l.quantity : ''}" placeholder="ilość" style="width:80px;">`;
      return `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
        <select data-line-field="itemCode" data-idx="${i}" style="flex:1;min-width:140px;">${itemOpts(l.itemCode)}</select>
        ${t === 'conversion' ? extra : ''}${qtyField}${t === 'receipt' ? extra : ''}
        <button class="x-btn" data-op-delline="${i}" style="width:32px;height:32px;flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>`;
    }).join('');
    // style line inputs
    $$('[data-line-field]').forEach((el) => { el.style.border = '1px solid var(--line-2)'; el.style.borderRadius = '9px'; el.style.padding = '9px 11px'; el.style.fontSize = '13.5px'; el.style.background = '#fff'; el.style.outline = 'none'; });
  }

  function readOpLinesFromDOM() {
    $$('[data-line-field]').forEach((el) => {
      const i = Number(el.dataset.idx); const f = el.dataset.lineField;
      if (!opEdit.lines[i]) return;
      opEdit.lines[i][f] = f === 'itemCode' || f === 'targetItemCode' ? el.value : (el.value === '' ? null : Number(el.value));
    });
  }
  function readOpHeaderFromDOM() {
    const h = {};
    $$('[data-op-h]').forEach((el) => { h[el.dataset.opH] = el.value; });
    return h;
  }

  async function saveOp(silent) {
    readOpLinesFromDOM();
    const h = readOpHeaderFromDOM();
    const body = Object.assign({ lines: opEdit.lines }, h);
    await api('/warehouse/operations/' + encodeURIComponent(opEdit.id), { method: 'PATCH', body: JSON.stringify(body) });
    if (!silent) toast('Zapisano.');
  }
  async function validateOp() {
    const btn = $('[data-op-validate]'); if (btn) { btn.disabled = true; btn.textContent = 'Zatwierdzanie…'; }
    try {
      await saveOp(true);
      const r = await api('/warehouse/operations/' + encodeURIComponent(opEdit.id) + '/validate', { method: 'POST', body: JSON.stringify({}) });
      toast(r.message || 'Wykonano operację.');
      closeDrawer(); afterOpChange();
    } catch (e) { toast(e.message || 'Nie udało się zatwierdzić.', true); if (btn) { btn.disabled = false; btn.textContent = 'Zatwierdź operację'; } }
  }
  async function cancelOp() {
    if (!confirm('Anulować tę operację?')) return;
    try { await api('/warehouse/operations/' + encodeURIComponent(opEdit.id) + '/cancel', { method: 'POST', body: JSON.stringify({}) }); toast('Anulowano.'); closeDrawer(); afterOpChange(); }
    catch (e) { toast(e.message || 'Nie udało się.', true); }
  }
  async function reverseOp(id) {
    if (!confirm('Cofnąć wykonaną operację do wersji roboczej?')) return;
    try { const r = await api('/warehouse/operations/' + encodeURIComponent(id) + '/reverse', { method: 'POST', body: JSON.stringify({}) }); toast(r.message || 'Cofnięto.'); closeDrawer(); afterOpChange(); }
    catch (e) { toast(e.message || 'Nie udało się.', true); }
  }
  function afterOpChange() {
    state.mag.formData = null; state.mag.valuation = null; state.mag.products = null;
    if (state.magTab === 'operacje') renderOperacje();
    if (state.magTab === 'przeglad') renderPrzeglad();
    loadMagazyn();
  }

  async function openNewOp(type) {
    try {
      const form = await magForm();
      const cfg = (form.types || {})[type] || {};
      openSheet('newOp', { type, typeLabel: cfg.label || 'Operacja', form });
    } catch (e) { toast(e.message || 'Nie udało się otworzyć formularza.', true); }
  }

  // ---- Produkty
  async function renderProdukty() {
    const el = $('[data-mag-panel="produkty"]');
    el.innerHTML = `<div class="anim-fadeup">
      <div class="mag-toolbar">
        <div class="search mag-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A2AEB9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input placeholder="Szukaj po nazwie, kodzie, kategorii…" data-mag-prod-search></div>
        <button class="btn btn-ghost" data-mag-csv>Eksportuj CSV</button>
      </div>
      <div data-mag-prod-list><div class="loading">Ładowanie…</div></div></div>`;
    const list = $('[data-mag-prod-list]');
    const render = (items) => {
      if (!items.length) { list.innerHTML = emptyBlock('Brak produktów', ''); return; }
      list.innerHTML = tableHTML(
        [{ t: 'Kod' }, { t: 'Nazwa' }, { t: 'Kategoria' }, { t: 'Ilość', num: true }],
        items.map((p) => ({ cells: [
          { v: p.itemCode, cls: 'mono-cell' }, { v: p.name }, { html: `<span class="chip chip-grey">${esc(p.category)}</span>` }, { v: fmtInt(p.quantity), cls: 'num' }
        ] }))
      );
    };
    const filt = () => {
      const q = ($('[data-mag-prod-search]').value || '').toLowerCase().trim();
      const items = (state.mag.products || []).filter((p) => !q ||
        (p.name || '').toLowerCase().includes(q) || (p.itemCode || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
      render(items);
    };
    const s = $('[data-mag-prod-search]'); if (s) s.addEventListener('input', filt);
    try {
      if (!state.mag.products) state.mag.products = await api('/warehouse/products');
      filt();
    } catch (e) { list.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }

  function exportProductsCSV() {
    const items = state.mag.products || [];
    const q = (($('[data-mag-prod-search]') || {}).value || '').toLowerCase().trim();
    const rows = items.filter((p) => !q || (p.name || '').toLowerCase().includes(q) || (p.itemCode || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    const csv = [['Kod', 'Nazwa', 'Kategoria', 'Ilość', 'Wartość']].concat(
      rows.map((p) => [p.itemCode, p.name, p.category, p.quantity, p.totalValue])
    ).map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'produkty-magazyn.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    toast('Wyeksportowano ' + rows.length + ' pozycji.');
  }

  // ---- Raportowanie
  function renderRaportowanie() {
    const el = $('[data-mag-panel="raportowanie"]');
    const nav = REPORTS.map(([id, lbl]) => `<button class="${state.magReport === id ? 'active' : ''}" data-mag-report="${id}">${lbl}</button>`).join('');
    el.innerHTML = `<div class="anim-fadeup"><div class="subnav">${nav}</div><div data-mag-report-body><div class="loading">Ładowanie…</div></div></div>`;
    renderReport(state.magReport);
  }

  async function renderReport(id) {
    const body = $('[data-mag-report-body]');
    if (!body) return;
    body.innerHTML = '<div class="loading">Ładowanie…</div>';
    try {
      if (id === 'stock') {
        const rows = await api('/warehouse/stock');
        body.innerHTML = rows.length ? tableHTML(
          [{ t: 'Kod' }, { t: 'Nazwa' }, { t: 'Lokalizacja' }, { t: 'Ilość', num: true }, { t: 'Dostępne', num: true }],
          rows.map((r) => ({ cells: [
            { v: r.itemCode, cls: 'mono-cell' }, { v: r.name }, { v: r.locationName, cls: 'mut' },
            { v: fmtInt(r.quantity), cls: 'num' }, { html: `<span style="color:#1B7A4F;font-weight:600;">${fmtInt(r.available)}</span>`, cls: 'num' }
          ] }))
        ) : emptyBlock('Brak stanu', '');
      } else if (id === 'valuation') {
        const val = await api('/warehouse/valuation'); state.mag.valuation = val;
        const products = (val.categories || []).flatMap((c) => c.products.map((p) => ({ ...p, category: c.category })));
        const banner = `<div class="valuation-banner"><span class="lbl">Wartość zapasu łącznie</span><span class="val">${esc(fmtMoney(val.totalValue))}</span></div>`;
        body.innerHTML = banner + (products.length ? tableHTML(
          [{ t: 'Kod' }, { t: 'Nazwa' }, { t: 'Ilość', num: true }, { t: 'Cena', num: true }, { t: 'Wartość', num: true }],
          products.map((p) => ({ cells: [
            { v: p.itemCode, cls: 'mono-cell' }, { v: p.name }, { v: fmtInt(p.qty), cls: 'num' },
            { v: fmtMoney(p.avgUnitPrice), cls: 'num mut' }, { v: fmtMoney(p.value), cls: 'num' }
          ] }))
        ) : emptyBlock('Brak danych wyceny', ''));
      } else if (id === 'moves') {
        const rows = await api('/warehouse/moves?limit=200');
        body.innerHTML = rows.length ? tableHTML(
          [{ t: 'Kiedy' }, { t: 'Kod' }, { t: 'Ruch' }, { t: 'Ilość', num: true }, { t: 'Lokalizacja' }],
          rows.map((m) => ({ cells: [
            { v: fmtDay(m.doneAt), cls: 'mut' }, { v: m.itemCode, cls: 'mono-cell' }, { v: MOVE_KIND[m.kind] || m.kind },
            { v: fmtInt(m.quantity), cls: 'num' }, { v: m.toName || m.fromName || '—', cls: 'mut' }
          ] }))
        ) : emptyBlock('Brak ruchów', '');
      } else if (id === 'period') {
        const rep = await api('/warehouse/moves-report');
        const rows = rep.rows || [];
        const cnt = (k) => rows.filter((m) => m.kind === k).length;
        const tiles = `<div class="mini-tiles">
          <div class="mini-tile"><div class="k">Przyjęcia</div><div class="v" style="color:#1B7A4F;">${fmtInt(cnt('receipt'))}</div></div>
          <div class="mini-tile"><div class="k">Wydania</div><div class="v" style="color:#BF1932;">${fmtInt(cnt('delivery') + cnt('scrap'))}</div></div>
          <div class="mini-tile"><div class="k">Ruchów</div><div class="v" style="color:var(--heading);">${fmtInt(rows.length)}</div></div>
        </div>`;
        body.innerHTML = tiles + (rows.length ? tableHTML(
          [{ t: 'Kiedy' }, { t: 'Kod' }, { t: 'Ruch' }, { t: 'Ilość', num: true }],
          rows.slice(0, 300).map((m) => ({ cells: [
            { v: fmtDay(m.doneAt), cls: 'mut' }, { v: m.itemCode, cls: 'mono-cell' }, { v: MOVE_KIND[m.kind] || m.kind }, { v: fmtInt(m.quantity), cls: 'num' }
          ] }))
        ) : emptyBlock('Brak ruchów w okresie', 'Domyślnie ostatnie 30 dni.'));
      } else if (id === 'gift') {
        const rep = await api('/warehouse/gift-threshold');
        const rows = rep.items || [];
        const note = `<p style="margin:0 0 16px;font-size:13.5px;color:var(--muted);">Pozycje z konwersji, których jednostkowy koszt przekracza próg ${fmtMoney(rep.threshold)} — rodzą obowiązek VAT przy wydaniu jako prezent.</p>`;
        body.innerHTML = note + (rows.length ? tableHTML(
          [{ t: 'Kod' }, { t: 'Nazwa' }, { t: 'Maks. cena', num: true }, { t: 'Ilość', num: true }],
          rows.map((g) => ({ cells: [
            { v: g.itemCode, cls: 'mono-cell' }, { v: g.name }, { v: fmtMoney(g.maxUnitPrice), cls: 'num' }, { v: fmtInt(g.overQty), cls: 'num' }
          ] }))
        ) : emptyBlock('Brak pozycji powyżej progu', ''));
      } else if (id === 'aging') {
        const rep = await api('/warehouse/aging');
        const rows = rep.products || [];
        const bucket = (d) => d == null ? 'bez daty' : d <= 30 ? '0–30 dni' : d <= 90 ? '31–90 dni' : d <= 180 ? '91–180 dni' : '>180 dni';
        body.innerHTML = rows.length ? tableHTML(
          [{ t: 'Kod' }, { t: 'Nazwa' }, { t: 'Najstarsze (dni)', num: true }, { t: 'Przedział' }],
          rows.map((g) => ({ cells: [
            { v: g.itemCode, cls: 'mono-cell' }, { v: g.name }, { v: g.oldestDays == null ? '—' : fmtInt(g.oldestDays), cls: 'num' }, { v: bucket(g.oldestDays), cls: 'mut' }
          ] }))
        ) : emptyBlock('Brak danych wieku', '');
      } else if (id === 'health') {
        const h = await api('/warehouse/health');
        const chip = (ok) => ok ? '<span class="chip chip-new">OK</span>' : '<span class="chip chip-orange">Do sprawdzenia</span>';
        const checks = [
          ['Rozjazdy ilości (cache/quant/partie)', (h.mismatches || []).length],
          ['Ujemne stany', (h.negativeQuants || []).length],
          ['Quanty-sieroty', (h.orphanQuants || []).length]
        ];
        body.innerHTML = tableHTML(
          [{ t: 'Sprawdzenie' }, { t: 'Liczba', num: true }, { t: 'Stan', num: true }],
          checks.map(([name, n]) => ({ cells: [
            { v: name }, { v: fmtInt(n), cls: 'num' }, { html: chip(n === 0), cls: 'num' }
          ] }))
        );
      }
    } catch (e) { body.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }

  // ---- Konfiguracja
  async function renderKonfiguracja() {
    const el = $('[data-mag-panel="konfiguracja"]');
    el.innerHTML = '<div class="loading">Ładowanie…</div>';
    try {
      const [suppliers, locs] = await Promise.all([
        api('/warehouse/suppliers'),
        state.mag.locations ? Promise.resolve(state.mag.locations) : api('/warehouse/locations')
      ]);
      state.mag.locations = locs; state.mag.suppliers = suppliers;
      const acts = (edit, del, id) => `<div style="display:flex;gap:6px;justify-content:flex-end;"><button class="btn btn-ghost btn-sm" data-${edit}="${esc(id)}">Edytuj</button><button class="btn btn-danger-ghost btn-sm" data-${del}="${esc(id)}">Usuń</button></div>`;
      const supTable = suppliers.length ? tableHTML(
        [{ t: 'Nazwa' }, { t: 'Kontakt' }, { t: 'Notatka' }, { t: '', num: true }],
        suppliers.map((s) => ({ cells: [
          { v: s.name }, { v: s.contact || '—', cls: 'mut' }, { v: s.notes || '—', cls: 'mut' },
          { html: acts('sup-edit', 'sup-del', s.id), cls: 'num' }
        ] }))
      ) : emptyBlock('Brak dostawców', '');
      const locTable = locs.length ? tableHTML(
        [{ t: 'Lokalizacja' }, { t: 'Kod' }, { t: 'Typ' }, { t: 'Na stanie', num: true }, { t: '', num: true }],
        locs.map((l) => ({ cells: [
          { v: l.name }, { v: l.code || '—', cls: 'mono-cell' }, { v: LOC_KIND[l.kind] || l.kind || '—', cls: 'mut' },
          { v: l.onHand ? fmtInt(l.onHand) : '—', cls: 'num' },
          { html: l.editable ? acts('loc-edit', 'loc-del', l.id) : '<span class="eq-sub">systemowa</span>', cls: 'num' }
        ] }))
      ) : emptyBlock('Brak lokalizacji', '');
      el.innerHTML = `<div class="anim-fadeup">
        <div class="mag-config-section"><div class="mag-config-head"><h3>Dostawcy</h3><button class="btn btn-ghost btn-sm" data-mag-config-add="dostawca">+ Nowy dostawca</button></div>${supTable}</div>
        <div class="mag-config-section"><div class="mag-config-head"><h3>Lokalizacje</h3><button class="btn btn-ghost btn-sm" data-mag-config-add="lokalizacja">+ Nowa lokalizacja</button></div>${locTable}</div>
      </div>`;
    } catch (e) { el.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }

  // -------------------------------------------------------------- global events
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-view],[data-sheet],[data-detail],[data-request],[data-transfer],[data-report],[data-return],[data-approve],[data-reject],[data-close-drawer],[data-close-sheet],[data-soon],#sheetSubmit,[data-stop],[data-mag-tab],[data-mag-optab],[data-mag-report],[data-mag-op],[data-mag-csv],[data-mag-new-op],[data-mag-config-add],[data-op-addline],[data-op-delline],[data-op-save],[data-op-validate],[data-op-cancel],[data-op-reverse],[data-sup-edit],[data-sup-del],[data-loc-edit],[data-loc-del],[data-lic-new],[data-lic-detail],[data-lic-edit],[data-lic-del],[data-onb-new],[data-onb-toggle],[data-onb-edit],[data-onb-del],[data-theme-opt],[data-pref-toggle]');
    if (!t) return;

    if (t.hasAttribute('data-theme-opt')) { setTheme(t.getAttribute('data-theme-opt')); return; }
    if (t.hasAttribute('data-pref-toggle')) { togglePref(t.getAttribute('data-pref-toggle')); return; }

    if (t.hasAttribute('data-lic-new')) { openSheet('license', {}); return; }
    if (t.hasAttribute('data-lic-detail')) { openLicenseDetail(t.getAttribute('data-lic-detail')); return; }
    if (t.hasAttribute('data-lic-edit')) { const l = (state.lic || []).find((x) => x.id === t.getAttribute('data-lic-edit')); openSheet('license', l || {}); return; }
    if (t.hasAttribute('data-lic-del')) { delLicense(t.getAttribute('data-lic-del')); return; }
    if (t.hasAttribute('data-onb-new')) { openSheet('onbStep', {}); return; }
    if (t.hasAttribute('data-onb-toggle')) { toggleStep(t.getAttribute('data-onb-toggle'), t.getAttribute('data-done') === '1'); return; }
    if (t.hasAttribute('data-onb-edit')) { const s = (state.onb || []).find((x) => x.id === t.getAttribute('data-onb-edit')); openSheet('onbStep', s || {}); return; }
    if (t.hasAttribute('data-onb-del')) { delStep(t.getAttribute('data-onb-del')); return; }

    if (t.dataset.magTab) { setMagTab(t.dataset.magTab); return; }
    if (t.dataset.magOptab) { state.magOpType = t.dataset.magOptab; renderOperacje(); return; }
    if (t.dataset.magReport) { state.magReport = t.dataset.magReport; $$('[data-mag-report]').forEach((b) => b.classList.toggle('active', b === t)); renderReport(t.dataset.magReport); return; }
    if (t.hasAttribute('data-mag-op')) { openOpEditor(t.getAttribute('data-mag-op')); return; }
    if (t.hasAttribute('data-mag-csv')) { exportProductsCSV(); return; }
    if (t.hasAttribute('data-mag-new-op')) { openNewOp(state.magOpType); return; }
    if (t.hasAttribute('data-mag-config-add')) { openSheet(t.getAttribute('data-mag-config-add') === 'dostawca' ? 'supplier' : 'location', {}); return; }
    if (t.hasAttribute('data-op-addline')) { readOpLinesFromDOM(); opEdit.lines.push({}); renderOpLines(); return; }
    if (t.hasAttribute('data-op-delline')) { readOpLinesFromDOM(); opEdit.lines.splice(Number(t.getAttribute('data-op-delline')), 1); renderOpLines(); return; }
    if (t.hasAttribute('data-op-save')) { saveOp().catch((err) => toast(err.message || 'Nie udało się zapisać.', true)); return; }
    if (t.hasAttribute('data-op-validate')) { validateOp(); return; }
    if (t.hasAttribute('data-op-cancel')) { cancelOp(); return; }
    if (t.hasAttribute('data-op-reverse')) { reverseOp(t.getAttribute('data-op-reverse')); return; }
    if (t.hasAttribute('data-sup-edit')) { const s = (state.mag.suppliers || []).find((x) => x.id === t.getAttribute('data-sup-edit')); openSheet('supplier', s || {}); return; }
    if (t.hasAttribute('data-sup-del')) { delSupplier(t.getAttribute('data-sup-del')); return; }
    if (t.hasAttribute('data-loc-edit')) { const l = (state.mag.locations || []).find((x) => x.id === t.getAttribute('data-loc-edit')); openSheet('location', l || {}); return; }
    if (t.hasAttribute('data-loc-del')) { delLocation(t.getAttribute('data-loc-del')); return; }

    if (t.hasAttribute('data-stop')) { e.stopPropagation(); return; }
    if (t.id === 'sheetSubmit') { e.preventDefault(); submitSheet(); return; }
    if (t.hasAttribute('data-close-drawer')) { closeDrawer(); return; }
    if (t.hasAttribute('data-close-sheet')) { closeSheet(); return; }
    if (t.hasAttribute('data-soon')) { toast(t.getAttribute('data-soon')); return; }

    if (t.dataset.go) {
      const g = t.dataset.go;
      if (g === 'sprzet') { showScreen('sprzet'); setView('pulpit'); }
      else if (g === 'magazyn') { showScreen('magazyn'); loadMagazyn(); }
      else if (g === 'licencje') { showScreen('licencje'); loadLicencje(); }
      else if (g === 'onboarding') { showScreen('onboarding'); loadOnboarding(); }
      else showScreen(g === 'launcher' ? 'launcher' : g);
      return;
    }
    if (t.dataset.view) { if (state.screen !== 'sprzet') showScreen('sprzet'); setView(t.dataset.view); return; }
    if (t.dataset.sheet) { openSheet(t.dataset.sheet, {}); return; }
    if (t.dataset.detail) { openDetail(t.dataset.detail); return; }
    if (t.dataset.request) { openSheet('request', { itemCode: t.dataset.request, name: t.dataset.name }); return; }
    if (t.dataset.transfer) { openSheet('transfer', { itemCode: t.dataset.transfer, name: t.dataset.name }); return; }
    if (t.dataset.report) { openSheet('report', { itemCode: t.dataset.report, name: t.dataset.name }); return; }
    if (t.dataset.return) { doReturn(t.dataset.return, t.dataset.name); return; }
    if (t.dataset.approve) { decide(t.dataset.approve, true); return; }
    if (t.dataset.reject) { decide(t.dataset.reject, false); return; }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSheet(); closeDrawer(); }
  });

  // -------------------------------------------------------------- boot
  async function boot() {
    try {
      const me = await api('/me');
      if (me && me.authenticated) {
        state.user = me.user;
        applyUser();
        initPrefs(me.user.preferences);
        showScreen('launcher');
        refreshCounts();
        refreshWarehouseCounts();
        refreshLicenseCounts();
        refreshOnboardingCounts();
      } else {
        showScreen('login');
      }
    } catch (e) {
      if (e.message !== 'unauth') showScreen('login');
    }
  }
  boot();
})();
