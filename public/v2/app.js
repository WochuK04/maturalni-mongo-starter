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

  // Miniatura sprzętu: zdjęcie z bazy (imageUrl/thumbnailUrl) z fallbackiem do
  // inicjałów, gdy brak URL lub obrazek się nie wczyta (onerror). Ten sam wzorzec
  // co hero w szczegółach sprzętu.
  function itemThumb(it, monoClass, imgClass) {
    const url = String((it && (it.imageUrl || it.thumbnailUrl)) || '').trim();
    const init = esc(initials(it && it.name));
    if (!url) return `<span class="${monoClass}">${init}</span>`;
    return `<img class="${imgClass}" src="${esc(url)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span class="${monoClass}" style="display:none;">${init}</span>`;
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
    if (view === 'skrzynka') { loadInbox(); loadReports(); loadMyRequests(); loadHistory(); return; }
    if (view === 'zespol') return loadTeam();
    if (view === 'stats') return loadStats();
    if (view === 'users') return loadUsers();
    if (view === 'rejestry') return loadRejestry();
    if (view === 'admin') return loadAdminItems();
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
          <div class="eq-thumb">${itemThumb(it, 'mono', 'eq-thumb-img')}
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
          ${itemThumb(it, 'row-mono', 'row-mono row-img')}
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

  // ---- Skrzynka: wnioski (decyzje + moje) z pełnym obiegiem i komentarzami
  function reqBadge(r) {
    return r.kind === 'purchase' ? '<span class="chip chip-orange">Zakup</span>' : '<span class="chip chip-blue">Wypożyczenie</span>';
  }
  // Akcje wg statusu/rodzaju — odwzorowanie getActionConfig z v1 (routing po STATUSIE).
  function reqActionsFor(r) {
    const purchase = r.kind === 'purchase'; const st = r.status;
    if (st === 'pending_manager') return [{ key: 'mgr-approve', label: 'Przekaż do administracji', cls: 'btn-primary' }, { key: 'mgr-reject', label: 'Odrzuć', cls: 'btn-danger-ghost' }];
    if (st === 'pending_admin' || st === 'pending') return purchase
      ? [{ key: 'adm-approve', label: 'Zatwierdź zakup', cls: 'btn-primary' }, { key: 'adm-reject', label: 'Odrzuć', cls: 'btn-danger-ghost' }]
      : [{ key: 'adm-approve', label: 'Wydaj sprzęt', cls: 'btn-primary' }, { key: 'adm-reject', label: 'Odrzuć', cls: 'btn-danger-ghost' }];
    if (purchase && st === 'to_order') return [{ key: 'order', label: 'Oznacz jako zamówiony', cls: 'btn-primary' }, { key: 'cancel-purchase', label: 'Anuluj zakup', cls: 'btn-danger-ghost' }];
    if (purchase && st === 'ordered') return [{ key: 'stock', label: 'Dodaj do magazynu', cls: 'btn-primary' }, { key: 'cancel-purchase', label: 'Anuluj zakup', cls: 'btn-danger-ghost' }];
    return [];
  }
  function reqMetaLine(r) {
    const bits = [];
    bits.push('Wnioskujący: ' + esc(r.requesterName || r.requesterEmail || '—'));
    bits.push(esc(fmtDate(r.requestedAt)));
    if (r.purpose) bits.push(esc(r.purpose));
    if (r.kind === 'purchase' && r.justification) bits.push(esc(r.justification));
    if (r.decisionNote) bits.push('Uwaga: ' + esc(r.decisionNote));
    return bits.join(' · ');
  }
  function requestCard(r, mode) {
    const decide = mode === 'decide';
    const actions = decide ? reqActionsFor(r) : [];
    const canCancel = mode === 'mine' && ['pending_manager', 'pending_admin', 'pending'].includes(r.status);
    const noteBox = actions.length ? `<textarea class="req-note" data-decision-note rows="1" placeholder="Uwaga do decyzji (opcjonalnie)"></textarea>` : '';
    const actionsHtml = actions.length
      ? `${noteBox}<div class="row-actions">${actions.map((a) => `<button class="btn ${a.cls} btn-sm" data-req-act="${a.key}" data-req-id="${esc(r._id)}">${esc(a.label)}</button>`).join('')}</div>`
      : (decide ? `<div class="done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>W toku obiegu</div>` : '');
    const cancelHtml = canCancel ? `<div class="row-actions"><button class="btn btn-danger-ghost btn-sm" data-req-cancel="${esc(r._id)}">Anuluj wniosek</button></div>` : '';
    return `<div class="inbox-card" data-req-card>
      <div class="h">${reqBadge(r)}<span class="title">${esc(r.itemName || r.itemCode || 'Wniosek')}</span>
        <span class="chip chip-grey" style="margin-left:auto;">${esc(statusLabel(r.status))}</span></div>
      <div class="meta">${reqMetaLine(r)}</div>
      ${actionsHtml}${cancelHtml}
      ${commentsThreadHtml(r._id)}
    </div>`;
  }

  function loadInbox() {
    const wrap = $('[data-skrzynka-decide-wrap]'); const list = $('[data-skrzynka-list]');
    const render = (items) => {
      if (wrap) wrap.hidden = !items.length;
      if (!items.length) { list.innerHTML = ''; return; }
      list.innerHTML = items.map((r) => requestCard(r, 'decide')).join('');
      bindCommentThreads(list);
    };
    if (state.cache.inbox) { render(state.cache.inbox); return; }
    list.innerHTML = '<div class="loading">Ładowanie…</div>';
    api('/my/action-items').then((items) => { state.cache.inbox = items; render(items); })
      .catch(() => { if (wrap) wrap.hidden = false; list.innerHTML = emptyBlock('Nie udało się wczytać', ''); });
  }

  function loadMyRequests() {
    const list = $('[data-skrzynka-mine]'); if (!list) return;
    const render = (items) => {
      if (!items.length) { list.innerHTML = emptyBlock('Brak wniosków', 'Twoje wnioski o wypożyczenie i zakup pojawią się tutaj.'); return; }
      list.innerHTML = items.map((r) => requestCard(r, 'mine')).join('');
      bindCommentThreads(list);
    };
    if (state.cache.myreq) { render(state.cache.myreq); return; }
    list.innerHTML = '<div class="loading">Ładowanie…</div>';
    api('/my/loan-requests').then((items) => { state.cache.myreq = items; render(items); })
      .catch(() => { list.innerHTML = emptyBlock('Nie udało się wczytać', ''); });
  }

  // ---- Zgłoszenia admina (notifications: usterki + transfery)
  const ISSUE_LABELS = { damage: 'Uszkodzenie', lost: 'Zgubienie', other: 'Inne' };
  function loadReports() {
    const wrap = $('[data-skrzynka-reports-wrap]'); const list = $('[data-skrzynka-reports]');
    if (!wrap || !list) return;
    const isAdmin = state.user && state.user.role === 'admin';
    if (!isAdmin) { wrap.hidden = true; return; }
    const render = (items) => {
      wrap.hidden = false;
      if (!items.length) { list.innerHTML = emptyBlock('Brak zgłoszeń', 'Usterki i transfery pojawią się tutaj.'); return; }
      list.innerHTML = items.map((n) => {
        const resolved = n.status === 'resolved';
        const title = n.kind === 'transfer' ? `🔄 Transfer: ${esc(n.itemName || n.itemCode || '')}` : `⚠️ ${esc(ISSUE_LABELS[n.issueType] || 'Zgłoszenie')}: ${esc(n.itemName || n.itemCode || '')}`;
        const meta = n.kind === 'transfer'
          ? `Z: ${esc(n.fromName || n.fromEmail || 'magazynu')} → na: ${esc(n.toName || n.toEmail || '—')} · wykonał: ${esc(n.createdByName || n.createdByEmail || '—')} · ${esc(fmtDate(n.createdAt))}`
          : `Zgłosił: ${esc(n.createdByName || n.createdByEmail || '—')} · ${esc(fmtDate(n.createdAt))}`;
        return `<div class="inbox-card${resolved ? ' report-resolved' : ''}">
          <div class="h"><span class="title">${title}</span><span class="chip ${resolved ? 'chip-grey' : n.kind === 'transfer' ? 'chip-blue' : 'chip-orange'}" style="margin-left:auto;">${resolved ? 'Załatwione' : 'Otwarte'}</span></div>
          <div class="meta">${meta}</div>
          ${n.message ? `<div class="meta">📝 ${esc(n.message)}</div>` : ''}
          ${resolved ? `<div class="done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Załatwione przez ${esc(n.resolvedByEmail || '—')}</div>`
            : `<div class="row-actions"><button class="btn btn-primary btn-sm" data-notif-resolve="${esc(n._id)}">Oznacz jako załatwione</button></div>`}
        </div>`;
      }).join('');
    };
    if (state.cache.reports) { render(state.cache.reports); return; }
    list.innerHTML = '<div class="loading">Ładowanie…</div>';
    api('/admin/notifications').then((items) => { state.cache.reports = items; render(items); })
      .catch(() => { wrap.hidden = false; list.innerHTML = emptyBlock('Nie udało się wczytać zgłoszeń', ''); });
  }
  function resolveNotif(id) {
    api('/admin/notifications/' + encodeURIComponent(id) + '/resolve', { method: 'POST', body: JSON.stringify({}) })
      .then(() => { toast('Oznaczono jako załatwione.'); delete state.cache.reports; loadReports(); })
      .catch((e) => toast(e.message || 'Nie udało się.', true));
  }

  // ---- Komentarze pod wnioskiem (lazy-load przy rozwinięciu)
  function commentsThreadHtml(id) {
    return `<details class="cmt" data-cmt="${esc(id)}"><summary>💬 Komentarze</summary>
      <div class="cmt-list" data-cmt-list><div class="loading" style="padding:12px;">Ładowanie…</div></div>
      <div class="cmt-form"><input data-cmt-input maxlength="2000" placeholder="Napisz komentarz…"><button class="btn btn-primary btn-sm" data-cmt-send="${esc(id)}">Wyślij</button></div>
    </details>`;
  }
  function bindCommentThreads(root) {
    $$('details.cmt', root).forEach((d) => {
      if (d._bound) return; d._bound = true;
      d.addEventListener('toggle', () => { if (d.open && !d._loaded) { d._loaded = true; loadComments(d); } });
    });
  }
  function loadComments(details) {
    const id = details.getAttribute('data-cmt'); const box = $('[data-cmt-list]', details);
    api('/loan-requests/' + encodeURIComponent(id) + '/comments').then((cs) => {
      if (!cs.length) { box.innerHTML = '<div class="cmt-empty">Brak komentarzy. Napisz pierwszy.</div>'; return; }
      box.innerHTML = cs.map((c) => `<div class="cmt-item"><div class="cmt-who">${esc(c.authorName || c.authorEmail)} <span class="cmt-when">${esc(fmtDate(c.createdAt))}</span></div><div class="cmt-text">${esc(c.text)}</div></div>`).join('');
    }).catch(() => { box.innerHTML = '<div class="cmt-empty">Nie udało się wczytać komentarzy.</div>'; });
  }
  async function sendComment(id, details) {
    const inp = $('[data-cmt-input]', details); const text = (inp.value || '').trim();
    if (!text) return;
    try {
      await api('/loan-requests/' + encodeURIComponent(id) + '/comments', { method: 'POST', body: JSON.stringify({ text }) });
      inp.value = ''; details._loaded = true; loadComments(details);
    } catch (e) { toast(e.message || 'Nie udało się dodać komentarza.', true); }
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
          <div class="drawer-hero">${(it.imageUrl || it.thumbnailUrl)
            ? `<img class="drawer-img" src="${esc(it.imageUrl || it.thumbnailUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span class="mono" style="display:none;">${esc(initials(it.name))}</span>`
            : `<span class="mono">${esc(initials(it.name))}</span>`}</div>
          <h2>${esc(it.name || it.itemCode)}</h2>
          <p class="sub">${esc([it.category, it.details].filter(Boolean).join(' · ') || it.itemCode)}</p>
          <div class="kv-grid">
            <div class="kv"><div class="k">Marka / model</div><div class="v">${esc([it.brand, it.model].filter(Boolean).join(' / ') || '—')}</div></div>
            <div class="kv"><div class="k">Lokalizacja</div><div class="v">${esc(it.currentLocation || '—')}</div></div>
            <div class="kv"><div class="k">Stan</div><div class="v">${esc(condLabel(it.conditionStatus))}</div></div>
            <div class="kv"><div class="k">Status</div><div class="v">${esc(ITEM_STATUS[it.operationalStatus] || it.operationalStatus || '—')}</div></div>
            <div class="kv"><div class="k">Przypisanie</div><div class="v">${esc(assign)}</div></div>
            <div class="kv"><div class="k">Nr seryjny</div><div class="v">${esc(it.serialNumber || '—')}</div></div>
            ${it.qrCodeValue ? `<div class="kv"><div class="k">Kod QR</div><div class="v mono-cell" style="font-size:13px;">${esc(it.qrCodeValue)}</div></div>` : ''}
            ${it.warrantyUntil ? `<div class="kv"><div class="k">Gwarancja do</div><div class="v">${esc(it.warrantyUntil)}</div></div>` : ''}
          </div>
          ${it.activeLoan ? `<div class="kv" style="margin-bottom:22px;"><div class="k">Aktywne wypożyczenie</div><div class="v" style="font-weight:500;font-size:13.5px;">od ${esc(fmtDate(it.activeLoan.borrowedAt))} · ${esc(it.activeLoan.userDisplayName || it.activeLoan.userEmail || '')}${it.activeLoan.targetUseLocation ? ' · ' + esc(it.activeLoan.targetUseLocation) : ''}</div></div>` : ''}
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
    destination: {
      eyebrow: 'Magazyn · Konfiguracja', title: (ctx) => ctx.id ? 'Edytuj miejsce dostawy' : 'Nowe miejsce dostawy',
      hint: 'Miejsce dostawy będzie dostępne przy wydaniach.', cta: 'Zapisz',
      fields: (ctx) => `
        <label class="field"><span>Nazwa *</span><input name="name" value="${esc(ctx.name || '')}" placeholder="np. Biuro Kraków"></label>
        <label class="field"><span>Kontakt</span><input name="contact" value="${esc(ctx.contact || '')}" placeholder="e-mail / telefon"></label>
        <label class="field"><span>Notatka</span><input name="notes" value="${esc(ctx.notes || '')}" placeholder="opcjonalnie"></label>`,
      submit: async (data, ctx) => {
        if (!data.name) throw new Error('Podaj nazwę miejsca.');
        if (ctx.id) await api('/warehouse/delivery-destinations/' + encodeURIComponent(ctx.id), { method: 'PATCH', body: JSON.stringify(data) });
        else await api('/warehouse/delivery-destinations', { method: 'POST', body: JSON.stringify(data) });
        toast('Zapisano miejsce dostawy.'); afterConfigChange();
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
    },
    twEvent: {
      eyebrow: 'Wyjazdy', title: (ctx) => ctx._id ? 'Edytuj wyjazd' : 'Nowy wyjazd',
      hint: 'Współrzędne uzupełnią się z listy miast, jeśli je zostawisz puste.', cta: 'Zapisz',
      fields: (ctx) => {
        const cityOpts = Object.keys(TW_CITIES).sort((a, b) => a.localeCompare(b)).map((c) => `<option value="${esc(c)}"></option>`).join('');
        return `
        <datalist id="twCityList">${cityOpts}</datalist>
        <div class="field-2">
          <label class="field"><span>Typ wyjazdu</span><input name="eventType" value="${esc(ctx.eventType || '')}" placeholder="np. Turbo Weekend"></label>
          <label class="field"><span>Miasto *</span><input name="city" list="twCityList" value="${esc(ctx.city || '')}" placeholder="np. Kraków"></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Region</span><input name="region" value="${esc(ctx.region || '')}" placeholder="np. Małopolska"></label>
          <label class="field"><span>Data</span><input name="eventDate" value="${esc(ctx.eventDate || '')}" placeholder="np. 12–14.09"></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Uczestnicy</span><input name="participants" type="number" min="0" step="1" value="${ctx.participants != null ? ctx.participants : ''}" placeholder="np. 48"></label>
          <label class="field"><span>Bus</span><input name="bus" value="${esc(ctx.bus || '')}" placeholder="np. Bus A"></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Szer. geogr. (lat)</span><input name="lat" type="number" step="any" value="${ctx.lat != null ? ctx.lat : ''}" placeholder="auto"></label>
          <label class="field"><span>Dł. geogr. (lng)</span><input name="lng" type="number" step="any" value="${ctx.lng != null ? ctx.lng : ''}" placeholder="auto"></label>
        </div>`;
      },
      submit: async (data, ctx) => {
        if (!data.city) throw new Error('Podaj miasto.');
        if ((!data.lat || !data.lng) && TW_CITIES[data.city]) { data.lng = TW_CITIES[data.city][0]; data.lat = TW_CITIES[data.city][1]; }
        if (ctx._id) await api('/admin/tw/' + encodeURIComponent(ctx._id), { method: 'PATCH', body: JSON.stringify(data) });
        else await api('/admin/tw', { method: 'POST', body: JSON.stringify(data) });
        toast('Zapisano wyjazd.'); await loadTwEvents();
      }
    },
    twPacking: {
      eyebrow: 'Wyjazdy · lista pakowania', title: (ctx) => ctx._id ? 'Edytuj pozycję' : 'Nowa pozycja',
      hint: 'Tryb „na osobę” liczy wg uczestników; „stała” to zawsze ta sama ilość. Podepnij produkt z magazynu, by odejmować stan.', cta: 'Zapisz',
      onOpen: async (ctx) => { if (!state.tw || !state.tw.products) { try { (state.tw = state.tw || {}).products = await api('/packing-products'); } catch (_) { (state.tw = state.tw || {}).products = []; } } },
      fields: (ctx) => {
        const mode = ctx.mode || 'per_person';
        const prodOpts = (state.tw.products || []).map((p) => `<option value="${esc(p.itemCode)}">${esc(p.name || '')}${p.quantity != null ? ' (stan ' + p.quantity + ')' : ''}</option>`).join('');
        return `
        <datalist id="twProdList">${prodOpts}</datalist>
        <label class="field"><span>Nazwa *</span><input name="name" value="${esc(ctx.name || '')}" placeholder="np. Koszulki"></label>
        <div class="field-2">
          <label class="field"><span>Jednostka</span><input name="unit" value="${esc(ctx.unit || 'szt.')}" placeholder="szt."></label>
          <label class="field"><span>Tryb</span><select name="mode"><option value="per_person"${mode === 'per_person' ? ' selected' : ''}>Na osobę</option><option value="fixed"${mode === 'fixed' ? ' selected' : ''}>Stała ilość</option></select></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Na osobę</span><input name="perPerson" type="number" min="0" step="any" value="${ctx.perPerson != null ? ctx.perPerson : 1}"></label>
          <label class="field"><span>Stała ilość</span><input name="fixed" type="number" min="0" step="1" value="${ctx.fixed != null ? ctx.fixed : 1}"></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Zaokrąglaj do (paczki)</span><input name="roundUpTo" type="number" min="1" step="1" value="${ctx.roundUpTo || 1}"></label>
          <label class="field"><span>Kategoria</span><input name="category" value="${esc(ctx.category || '')}" placeholder="np. Materiały"></label>
        </div>
        <label class="field"><span>Produkt z magazynu (kod)</span><input name="itemCode" list="twProdList" value="${esc(ctx.itemCode || '')}" placeholder="opcjonalnie — odejmuje stan"></label>`;
      },
      submit: async (data, ctx) => {
        if (!data.name) throw new Error('Podaj nazwę pozycji.');
        if (ctx._id) await api('/admin/packing-items/' + encodeURIComponent(ctx._id), { method: 'PATCH', body: JSON.stringify(data) });
        else await api('/admin/packing-items', { method: 'POST', body: JSON.stringify(data) });
        toast('Zapisano pozycję.'); state.tw.packingItems = null; await renderWyjazdy(); if (state.tw.selectedId) selectTw(state.tw.selectedId);
      }
    },
    adminItem: {
      eyebrow: 'Zarządzanie sprzętem', title: (ctx) => ctx._id ? 'Edytuj sprzęt' : 'Dodaj sprzęt',
      hint: 'Kod nadaje się automatycznie z kategorii, jeśli zostawisz puste.', cta: 'Zapisz',
      onOpen: async (ctx) => { if (!state.adminOpts) { try { state.adminOpts = await api('/admin/form-options'); } catch (_) { state.adminOpts = { locations: [], categories: [], conditions: [], users: [] }; } } },
      fields: (ctx) => {
        const o = state.adminOpts || {};
        const condOpts = (o.conditions || Object.keys(CONDITION_LABELS)).map((c) => `<option value="${esc(c)}"${(ctx.conditionStatus || 'ok') === c ? ' selected' : ''}>${esc(condLabel(c))}</option>`).join('');
        const locList = [...new Set([...(o.locations || []), ctx.currentLocation].filter(Boolean))];
        const locOpts = locList.map((l) => `<option value="${esc(l)}"${(ctx.currentLocation || 'Magazyn') === l ? ' selected' : ''}>${esc(l)}</option>`).join('');
        const catOpts = (o.categories || []).map((c) => `<option value="${esc(c)}"></option>`).join('');
        const userOpts = '<option value="">— nikt —</option>' + (o.users || []).map((u) => `<option value="${esc(u.email)}"${ctx.assignedToEmail === u.email ? ' selected' : ''}>${esc(u.fullName)}</option>`).join('');
        return `
        <datalist id="aiCatList">${catOpts}</datalist>
        <div class="field-2">
          <label class="field"><span>Kategoria *</span><input name="category" list="aiCatList" value="${esc(ctx.category || '')}" placeholder="np. Lampy"></label>
          <label class="field"><span>Nazwa *</span><input name="name" value="${esc(ctx.name || '')}" placeholder="np. Streamplify Light 10"></label>
        </div>
        <label class="field"><span>Opis / szczegóły</span><input name="details" value="${esc(ctx.details || '')}" placeholder="opcjonalnie"></label>
        <div class="field-2">
          <label class="field"><span>Ilość</span><input name="quantity" type="number" min="1" step="1" value="${ctx.quantity != null ? ctx.quantity : 1}"></label>
          <label class="field"><span>Stan techniczny</span><select name="conditionStatus">${condOpts}</select></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Lokalizacja</span><select name="currentLocation">${locOpts}</select></label>
          <label class="field"><span>Kod (opcjonalnie)</span><input name="itemCode" value="${esc(ctx.itemCode || '')}" placeholder="auto"></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Marka</span><input name="brand" value="${esc(ctx.brand || '')}" placeholder="np. Sony"></label>
          <label class="field"><span>Model</span><input name="model" value="${esc(ctx.model || '')}" placeholder="np. A7 IV"></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Nr seryjny</span><input name="serialNumber" value="${esc(ctx.serialNumber || '')}" placeholder="opcjonalnie"></label>
          <label class="field"><span>Tagi (po przecinku)</span><input name="tags" value="${esc((ctx.tags || []).join(', '))}" placeholder="np. studio, foto"></label>
        </div>
        <div class="field-2">
          <label class="field"><span>Zdjęcie (URL)</span><input name="imageUrl" value="${esc(ctx.imageUrl || '')}" placeholder="https://… — pokaże się na kafelku i w szczegółach"></label>
          <label class="field"><span>Miniatura (URL)</span><input name="thumbnailUrl" value="${esc(ctx.thumbnailUrl || '')}" placeholder="opcjonalnie, gdy inna niż zdjęcie"></label>
        </div>
        ${ctx._id ? '' : `<label class="field"><span>Przypisz od razu do</span><select name="assignedToEmail">${userOpts}</select></label>`}
        <label class="field"><span>Notatka</span><input name="notes" value="${esc(ctx.notes || '')}" placeholder="opcjonalnie"></label>`;
      },
      submit: async (data, ctx) => {
        if (!data.category || !data.name) throw new Error('Podaj kategorię i nazwę.');
        data.tags = String(data.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (!data.itemCode) delete data.itemCode;
        if (ctx._id) await api('/admin/items/' + encodeURIComponent(ctx._id), { method: 'PATCH', body: JSON.stringify(data) });
        else await api('/admin/items', { method: 'POST', body: JSON.stringify(data) });
        toast('Zapisano sprzęt.'); invalidate(['available', 'mine']); loadAdminItems();
      }
    },
    adminDiscard: {
      eyebrow: 'Zarządzanie sprzętem', title: 'Wycofaj sprzęt',
      hint: (ctx) => `„${ctx.name || 'sprzęt'}” zostanie oznaczony jako wycofany i zniknie z list.`, cta: 'Wycofaj',
      fields: () => `<label class="field"><span>Powód</span><input name="reason" placeholder="np. uszkodzony, sprzedany"></label>`,
      submit: async (data, ctx) => {
        await api('/admin/items/' + encodeURIComponent(ctx._id) + '/discard', { method: 'POST', body: JSON.stringify(data) });
        toast('Sprzęt wycofany.'); invalidate(['available', 'mine']); loadAdminItems();
      }
    },
    adminTransfer: {
      eyebrow: 'Zarządzanie sprzętem', title: 'Przenieś sprzęt',
      hint: (ctx) => `Przypisz „${ctx.name || 'sprzęt'}” do wybranej osoby.`, cta: 'Przenieś',
      onOpen: async (ctx) => { if (!state.adminOpts) { try { state.adminOpts = await api('/admin/form-options'); } catch (_) { state.adminOpts = { users: [] }; } } },
      fields: (ctx) => {
        const userOpts = '<option value="">— wybierz osobę —</option>' + ((state.adminOpts || {}).users || []).map((u) => `<option value="${esc(u.email)}">${esc(u.fullName)}</option>`).join('');
        return `<label class="field"><span>Przenieś na *</span><select name="toEmail">${userOpts}</select></label>
        <label class="field"><span>Notatka</span><input name="note" placeholder="opcjonalnie"></label>`;
      },
      submit: async (data, ctx) => {
        if (!data.toEmail) throw new Error('Wskaż osobę.');
        await api('/admin/items/' + encodeURIComponent(ctx._id) + '/transfer', { method: 'POST', body: JSON.stringify(data) });
        toast('Sprzęt przeniesiony.'); invalidate(['available', 'mine']); loadAdminItems();
      }
    },
    adminImport: {
      eyebrow: 'Zarządzanie sprzętem', title: 'Import CSV',
      hint: 'Wklej CSV z nagłówkiem. Wymagane kolumny: itemCode, name, category. Opcjonalne: quantity, conditionStatus, currentLocation, brand, model, serialNumber.', cta: 'Importuj',
      fields: () => `<label class="field"><span>Dane CSV *</span><textarea name="csv" rows="8" placeholder="itemCode,name,category,quantity&#10;L100,Lampa LED,Lampy,2"></textarea></label>`,
      submit: async (data) => {
        const rows = parseCSV(data.csv || '');
        if (!rows.length) throw new Error('Brak wierszy do importu.');
        const items = rows.map((r) => ({ ...r, quantity: r.quantity ? Number(r.quantity) : undefined }));
        const res = await api('/admin/items/bulk', { method: 'POST', body: JSON.stringify({ items }) });
        const ins = res.insertedCount != null ? res.insertedCount : (res.inserted || 0);
        const errs = (res.errors || []).length;
        toast(`Import: dodano ${ins}${errs ? `, błędów ${errs}` : ''}.`, errs > 0);
        invalidate(['available', 'mine']); loadAdminItems();
      }
    },
    reorderRule: {
      eyebrow: 'Magazyn · Zapotrzebowanie', title: (ctx) => ctx.id ? 'Edytuj regułę' : 'Nowa reguła min-max',
      hint: 'Gdy dostępny stan spadnie poniżej minimum, pozycja trafi do braków. Dla reguły „Sprzęt” można od razu uzupełnić.', cta: 'Zapisz',
      onOpen: async (ctx) => { if (!ctx.id && !state.mag.products) { try { state.mag.products = await api('/warehouse/products'); } catch (_) { state.mag.products = []; } } },
      fields: (ctx) => {
        const edit = !!ctx.id;
        const prodOpts = (state.mag.products || []).map((p) => `<option value="${esc(p.itemCode)}">${esc(p.name || '')}</option>`).join('');
        const scopeSel = edit
          ? `<input value="${ctx.scope === 'item' ? 'Sprzęt' : 'Kategoria'}" disabled>`
          : `<select name="scope"><option value="category">Kategoria</option><option value="item">Sprzęt (kod)</option></select>`;
        const targetField = edit
          ? `<input value="${esc(ctx.label || ctx.target || '')}" disabled>`
          : `<input name="target" list="rrProdList" placeholder="kategoria lub kod sprzętu">`;
        return `
        <datalist id="rrProdList">${prodOpts}</datalist>
        <div class="field-2">
          <label class="field"><span>Poziom</span>${scopeSel}</label>
          <label class="field"><span>Cel${edit ? '' : ' *'}</span>${targetField}</label>
        </div>
        <div class="field-2">
          <label class="field"><span>Minimum *</span><input name="minQty" type="number" min="0" step="1" value="${ctx.minQty != null ? ctx.minQty : ''}" placeholder="np. 3"></label>
          <label class="field"><span>Maksimum *</span><input name="maxQty" type="number" min="1" step="1" value="${ctx.maxQty != null ? ctx.maxQty : ''}" placeholder="np. 6"></label>
        </div>
        <label class="field"><span>Notatka</span><input name="note" value="${esc(ctx.note || '')}" placeholder="opcjonalnie"></label>`;
      },
      submit: async (data, ctx) => {
        if (ctx.id) {
          await api('/warehouse/reorder-rules/' + encodeURIComponent(ctx.id), { method: 'PATCH', body: JSON.stringify({ minQty: data.minQty, maxQty: data.maxQty, note: data.note }) });
        } else {
          if (!data.target) throw new Error('Podaj kategorię lub kod sprzętu.');
          await api('/warehouse/reorder-rules', { method: 'POST', body: JSON.stringify(data) });
        }
        toast('Zapisano regułę.'); renderZapotrzebowanie(); if (state.magTab === 'przeglad') renderPrzeglad();
      }
    },
    newUser: {
      eyebrow: 'Użytkownicy', title: 'Dodaj użytkownika',
      hint: 'Konto zostanie utworzone; osoba dokończy je przy pierwszym logowaniu Google.', cta: 'Dodaj',
      fields: () => {
        const managers = (state.userAdmin || []).filter((u) => u.role === 'manager' || u.role === 'admin');
        const mgrOpts = '<option value="">— bezpośrednio do administracji —</option>' + managers.map((m) => `<option value="${esc(m.email)}">${esc(m.fullName || m.email)}</option>`).join('');
        const roleOpts = Object.keys(ROLE_LABELS).map((r) => `<option value="${r}"${r === 'user' ? ' selected' : ''}>${esc(ROLE_LABELS[r])}</option>`).join('');
        return `
        <label class="field"><span>E-mail *</span><input name="email" type="email" placeholder="imie.nazwisko@maturalni.com"></label>
        <label class="field"><span>Imię i nazwisko</span><input name="fullName" placeholder="np. Jan Kowalski"></label>
        <div class="field-2">
          <label class="field"><span>Rola</span><select name="role">${roleOpts}</select></label>
          <label class="field"><span>Wnioski trafiają do</span><select name="managerEmail">${mgrOpts}</select></label>
        </div>`;
      },
      submit: async (data) => {
        if (!data.email) throw new Error('Podaj e-mail.');
        await api('/admin/users', { method: 'POST', body: JSON.stringify(data) });
        toast('Dodano użytkownika.'); loadUsers();
      }
    },
    returnItem: {
      eyebrow: 'Mój sprzęt', title: 'Oddaj sprzęt',
      hint: (ctx) => `Oddajesz „${ctx.name || 'sprzęt'}”. Wskaż miejsce zwrotu.`, cta: 'Oddaj',
      onOpen: async (ctx) => { if (!state.locations) { try { state.locations = await api('/locations'); } catch (_) { state.locations = ['Magazyn', 'Studio', 'Biuro', 'Serwis']; } } },
      fields: () => {
        const opts = (state.locations || ['Magazyn']).map((l) => `<option value="${esc(l)}"${l === 'Magazyn' ? ' selected' : ''}>${esc(l)}</option>`).join('');
        return `<label class="field"><span>Miejsce zwrotu</span><select name="returnLocation">${opts}</select></label>
        <label class="field"><span>Notatka</span><input name="returnNote" placeholder="np. stan, uwagi (opcjonalnie)"></label>`;
      },
      submit: async (data, ctx) => {
        await api('/items/' + encodeURIComponent(ctx.itemCode) + '/return', { method: 'POST', body: JSON.stringify({ returnLocation: data.returnLocation || 'Magazyn', returnNote: data.returnNote || '' }) });
        toast('Sprzęt oddany.'); invalidate(['mine', 'available', 'history']); loadMine();
      }
    },
    newProduct: {
      eyebrow: 'Magazyn · Produkty', title: 'Nowy produkt',
      hint: 'Utwórz pozycję magazynową. Ilość i wartość ustawisz partiami cenowymi w edycji.', cta: 'Utwórz',
      fields: () => `
        <label class="field"><span>Nazwa *</span><input name="name" placeholder="np. Koszulka L"></label>
        <div class="field-2">
          <label class="field"><span>Kategoria</span><input name="category" placeholder="np. Gadżet" value="Towar"></label>
          <label class="field"><span>Marka</span><input name="brand" placeholder="opcjonalnie"></label>
        </div>
        <label class="field"><span>Model</span><input name="model" placeholder="opcjonalnie"></label>
        <label class="field"><span>Notatka</span><input name="notes" placeholder="opcjonalnie"></label>`,
      submit: async (data) => {
        if (!data.name) throw new Error('Podaj nazwę.');
        await api('/warehouse/products', { method: 'POST', body: JSON.stringify(data) });
        toast('Utworzono produkt.'); state.mag.products = null; renderProdukty();
      }
    },
    prodImport: {
      eyebrow: 'Magazyn · Produkty', title: 'Import CSV produktów',
      hint: 'Nagłówek + wiersze. Wymagane: name, category. Opcjonalne: itemCode, quantity, unitPrice, brand, model, notes.', cta: 'Importuj',
      fields: () => `<label class="field"><span>Dane CSV *</span><textarea name="csv" rows="8" placeholder="name,category,quantity,unitPrice&#10;Koszulka L,Gadżet,50,19.99"></textarea></label>`,
      submit: async (data) => {
        const rows = parseCSV(data.csv || '');
        if (!rows.length) throw new Error('Brak wierszy do importu.');
        const items = rows.map((r) => ({ ...r, quantity: r.quantity ? Number(r.quantity) : undefined, unitPrice: r.unitPrice ? Number(r.unitPrice) : undefined }));
        const res = await api('/warehouse/products/bulk', { method: 'POST', body: JSON.stringify({ items }) });
        const added = res.added != null ? res.added : (res.insertedCount || 0);
        const errs = (res.errors || []).length;
        toast(`Import: dodano ${added}${errs ? `, błędów ${errs}` : ''}.`, errs > 0);
        state.mag.products = null; renderProdukty();
      }
    }
  };

  function afterConfigChange() {
    state.mag.formData = null; state.mag.locations = null; state.mag.destinations = null;
    if (state.magTab === 'konfiguracja') renderKonfiguracja();
    const sub = $('[data-mag-subtitle]'); if (sub) loadMagazyn();
  }
  function delSupplier(id) {
    if (!confirm('Usunąć dostawcę?')) return;
    api('/warehouse/suppliers/' + encodeURIComponent(id), { method: 'DELETE' }).then(() => { toast('Usunięto.'); afterConfigChange(); }).catch((e) => toast(e.message || 'Nie udało się.', true));
  }
  function delDestination(id) {
    if (!confirm('Usunąć miejsce dostawy?')) return;
    api('/warehouse/delivery-destinations/' + encodeURIComponent(id), { method: 'DELETE' }).then(() => { toast('Usunięto.'); afterConfigChange(); }).catch((e) => toast(e.message || 'Nie udało się.', true));
  }
  function recomputeHealth() {
    toast('Przeliczam…');
    api('/warehouse/health/recompute', { method: 'POST', body: JSON.stringify({}) })
      .then((r) => { toast('Przeliczono ' + (r.recomputed != null ? r.recomputed : '') + ' pozycji.'); if (state.magReport === 'health') renderReport('health'); })
      .catch((e) => toast(e.message || 'Nie udało się.', true));
  }
  function openOpPdf(id) {
    window.open('/warehouse/operations/' + encodeURIComponent(id) + '/pdf', '_blank');
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
  const REQ_ACTION_MAP = {
    'mgr-approve': ['/manager/loan-requests/', '/approve', 'Przekazano do administracji'],
    'mgr-reject': ['/manager/loan-requests/', '/reject', 'Wniosek odrzucony'],
    'adm-approve': ['/admin/loan-requests/', '/approve', 'Wniosek zatwierdzony'],
    'adm-reject': ['/admin/loan-requests/', '/reject', 'Wniosek odrzucony'],
    order: ['/admin/purchase-requests/', '/order', 'Oznaczono jako zamówiony'],
    stock: ['/admin/purchase-requests/', '/stock', 'Dodano do magazynu'],
    'cancel-purchase': ['/admin/purchase-requests/', '/cancel', 'Zakup anulowany']
  };
  async function requestAction(id, key, note) {
    const cfg = REQ_ACTION_MAP[key]; if (!cfg) return;
    try {
      await api(cfg[0] + encodeURIComponent(id) + cfg[1], { method: 'POST', body: JSON.stringify({ decisionNote: note || '' }) });
      toast(cfg[2]);
      invalidate(['inbox', 'myreq', 'history']); loadInbox(); loadMyRequests();
    } catch (e) { toast(e.message || 'Nie udało się.', true); }
  }
  async function cancelOwnRequest(id) {
    if (!confirm('Anulować ten wniosek?')) return;
    try {
      await api('/my/loan-requests/' + encodeURIComponent(id) + '/cancel', { method: 'POST', body: JSON.stringify({}) });
      toast('Wniosek anulowany.'); invalidate(['inbox', 'myreq', 'history']); loadMyRequests(); loadInbox();
    } catch (e) { toast(e.message || 'Nie udało się anulować.', true); }
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
    if (tab === 'zapotrzebowanie') return renderZapotrzebowanie();
    if (tab === 'wyjazdy') return renderWyjazdy();
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
      const shortageItems = (repl.items || []);
      const shortage = shortageItems.length ? `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:22px 0 12px;">
          <h3 style="margin:0;font-size:16px;font-weight:600;color:var(--ink);">Braki (poniżej minimum)</h3>
          <button class="btn btn-ghost btn-sm" data-mag-tab="zapotrzebowanie">Zobacz reguły</button>
        </div>
        ${tableHTML(
          [{ t: 'Cel' }, { t: 'Poziom' }, { t: 'Dostępne', num: true }, { t: 'Minimum', num: true }, { t: 'Do zamówienia', num: true }],
          shortageItems.map((r) => ({ cells: [
            { v: r.label }, { v: r.scope === 'item' ? 'Sprzęt' : 'Kategoria', cls: 'mut' },
            { v: fmtInt(r.available), cls: 'num' }, { v: fmtInt(r.minQty), cls: 'num' },
            { html: `<strong>${fmtInt(r.toOrder)}</strong>`, cls: 'num' }
          ] }))
        )}` : '';
      el.innerHTML = `<div class="anim-fadeup">${stats}<h3 style="margin:0 0 14px;font-size:16px;font-weight:600;color:var(--ink);">Operacje</h3><div class="op-cards">${cards}${replCard}</div>${shortage}</div>`;
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
      <div class="drawer-foot"><button class="btn btn-ghost" data-op-pdf="${esc(op.id)}">PDF</button>${canReverse ? `<button class="btn btn-ghost" style="flex:1;" data-op-reverse="${esc(op.id)}">Cofnij do roboczej</button>` : ''}<button class="btn btn-ghost" ${canReverse ? '' : 'style="flex:1;"'} data-close-drawer>Zamknij</button></div>`;
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
    const isAdmin = state.user && state.user.role === 'admin';
    el.innerHTML = `<div class="anim-fadeup">
      <div class="mag-toolbar">
        <div class="search mag-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A2AEB9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input placeholder="Szukaj po nazwie, kodzie, kategorii…" data-mag-prod-search></div>
        ${isAdmin ? '<button class="btn btn-ghost" data-prod-import>Import CSV</button>' : ''}
        <button class="btn btn-ghost" data-mag-csv>Eksportuj CSV</button>
        ${isAdmin ? '<button class="btn btn-primary" data-prod-new><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>Nowy produkt</button>' : ''}
      </div>
      <div data-mag-prod-list><div class="loading">Ładowanie…</div></div></div>`;
    const list = $('[data-mag-prod-list]');
    const render = (items) => {
      if (!items.length) { list.innerHTML = emptyBlock('Brak produktów', ''); return; }
      const cols = [{ t: 'Kod' }, { t: 'Nazwa' }, { t: 'Kategoria' }, { t: 'Ilość', num: true }, { t: 'Partie', num: true }, { t: 'Wartość', num: true }];
      if (isAdmin) cols.push({ t: '', num: true });
      list.innerHTML = tableHTML(cols,
        items.map((p) => ({ cells: [
          { v: p.itemCode, cls: 'mono-cell' }, { v: p.name }, { html: `<span class="chip chip-grey">${esc(p.category)}</span>` },
          { v: fmtInt(p.quantity), cls: 'num' }, { v: p.batchCount ? fmtInt(p.batchCount) : '—', cls: 'num' }, { v: p.totalValue ? fmtMoney(p.totalValue) : '—', cls: 'num' }
        ].concat(isAdmin ? [{ html: `<button class="btn btn-ghost btn-sm" data-prod-edit="${esc(p.itemCode)}">Edytuj</button>`, cls: 'num' }] : []) }))
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

  // ---- Edytor produktu (partie cenowe + historia)
  const prodEdit = { id: null, code: null, batches: [] };
  function openProductEditor(code) {
    const p = (state.mag.products || []).find((x) => x.itemCode === code); if (!p) return;
    prodEdit.id = p.id; prodEdit.code = p.itemCode;
    prodEdit.batches = (p.priceBatches || []).map((b) => ({ qty: b.qty, unitPrice: b.unitPrice, note: b.note }));
    const wrap = $('#drawer-wrap'); const box = $('#drawer'); wrap.classList.remove('hidden');
    box.innerHTML = `
      <div class="drawer-head"><div class="tags"><span class="chip chip-grey">${esc(p.category || '—')}</span><span class="chip chip-blue mono-cell">${esc(p.itemCode)}</span></div>
        <button class="x-btn" data-close-drawer><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>
      <div class="drawer-body">
        <h2>Edytuj produkt</h2>
        <div class="sheet-fields">
          <label class="field"><span>Nazwa *</span><input data-prod-f="name" value="${esc(p.name || '')}"></label>
          <div class="field-2">
            <label class="field"><span>Kategoria</span><input data-prod-f="category" value="${esc(p.category || '')}"></label>
            <label class="field"><span>Kod</span><input data-prod-f="itemCode" value="${esc(p.itemCode || '')}"></label>
          </div>
          <div class="field-2">
            <label class="field"><span>Marka</span><input data-prod-f="brand" value="${esc(p.brand || '')}"></label>
            <label class="field"><span>Model</span><input data-prod-f="model" value="${esc(p.model || '')}"></label>
          </div>
          <label class="field"><span>Notatka</span><input data-prod-f="notes" value="${esc(p.notes || '')}"></label>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin:18px 0 8px;">
          <div style="font-size:13px;font-weight:600;color:var(--ink);">Partie cenowe</div>
          <button class="btn btn-ghost btn-sm" data-batch-add>+ Dodaj partię</button>
        </div>
        <div data-batch-rows></div>
        <div data-batch-total class="prod-batch-total"></div>
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin:20px 0 8px;">Historia ruchów</div>
        <div data-prod-history><div class="loading">Ładowanie…</div></div>
      </div>
      <div class="drawer-foot"><button class="btn btn-primary" style="flex:1;" data-prod-save>Zapisz</button><button class="btn btn-ghost" data-close-drawer>Zamknij</button></div>`;
    renderBatchRows();
    loadProdHistory(p.itemCode);
  }
  function readBatchesFromDOM() {
    const rows = $$('[data-batch-row]');
    prodEdit.batches = rows.map((r) => ({
      qty: Number($('[data-batch-qty]', r).value) || 0,
      unitPrice: Number($('[data-batch-price]', r).value) || 0,
      note: $('[data-batch-note]', r).value || ''
    }));
  }
  function renderBatchRows() {
    const box = $('[data-batch-rows]'); if (!box) return;
    box.innerHTML = prodEdit.batches.map((b, i) => `<div class="prod-batch-row" data-batch-row>
      <input type="number" min="0" step="1" data-batch-qty value="${b.qty != null ? b.qty : ''}" placeholder="szt.">
      <input type="number" min="0" step="0.01" data-batch-price value="${b.unitPrice != null ? b.unitPrice : ''}" placeholder="cena/szt.">
      <input type="text" data-batch-note value="${esc(b.note || '')}" placeholder="notatka">
      <button class="btn btn-danger-ghost btn-sm" data-batch-del="${i}">×</button>
    </div>`).join('') || '<div class="eq-sub" style="padding:6px 0;">Brak partii — dodaj, by ustawić ilość i wartość.</div>';
    const total = prodEdit.batches.reduce((a, b) => a + (Number(b.qty) || 0), 0);
    const val = prodEdit.batches.reduce((a, b) => a + (Number(b.qty) || 0) * (Number(b.unitPrice) || 0), 0);
    const t = $('[data-batch-total]'); if (t) t.textContent = `Łącznie: ${fmtInt(total)} szt. · wartość ${fmtMoney(val)}`;
  }
  function loadProdHistory(code) {
    const box = $('[data-prod-history]'); if (!box) return;
    api('/warehouse/moves?itemCode=' + encodeURIComponent(code) + '&limit=200').then((moves) => {
      if (!moves.length) { box.innerHTML = '<div class="eq-sub">Brak ruchów.</div>'; return; }
      box.innerHTML = tableHTML(
        [{ t: 'Data' }, { t: 'Z' }, { t: 'Do' }, { t: 'Ilość', num: true }, { t: 'Rodzaj' }],
        moves.map((m) => ({ cells: [
          { v: fmtDate(m.doneAt), cls: 'mut' }, { v: m.fromName || '—', cls: 'mut' }, { v: m.toName || '—', cls: 'mut' },
          { v: fmtInt(m.quantity), cls: 'num' }, { v: MOVE_KIND[m.kind] || m.kind || '—', cls: 'mut' }
        ] }))
      );
    }).catch(() => { box.innerHTML = '<div class="eq-sub">Nie udało się wczytać historii.</div>'; });
  }
  async function saveProduct() {
    readBatchesFromDOM();
    const payload = { priceBatches: prodEdit.batches.filter((b) => b.qty > 0 || b.unitPrice > 0 || b.note) };
    $$('[data-prod-f]').forEach((el) => (payload[el.getAttribute('data-prod-f')] = el.value.trim()));
    if (!payload.name) { toast('Podaj nazwę.', true); return; }
    try {
      await api('/admin/items/' + encodeURIComponent(prodEdit.id), { method: 'PATCH', body: JSON.stringify(payload) });
      toast('Zapisano produkt.'); closeDrawer(); state.mag.products = null; state.mag.valuation = null; renderProdukty();
    } catch (e) { toast(e.message || 'Nie udało się zapisać.', true); }
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
        const table = tableHTML(
          [{ t: 'Sprawdzenie' }, { t: 'Liczba', num: true }, { t: 'Stan', num: true }],
          checks.map(([name, n]) => ({ cells: [
            { v: name }, { v: fmtInt(n), cls: 'num' }, { html: chip(n === 0), cls: 'num' }
          ] }))
        );
        const isAdmin = state.user && state.user.role === 'admin';
        body.innerHTML = table + (isAdmin ? '<div style="margin-top:14px;"><button class="btn btn-ghost btn-sm" data-health-recompute>Przelicz kondycję wszystkich</button></div>' : '');
      }
    } catch (e) { body.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }

  // ---- Konfiguracja
  async function renderKonfiguracja() {
    const el = $('[data-mag-panel="konfiguracja"]');
    el.innerHTML = '<div class="loading">Ładowanie…</div>';
    try {
      const [suppliers, locs, dests] = await Promise.all([
        api('/warehouse/suppliers'),
        state.mag.locations ? Promise.resolve(state.mag.locations) : api('/warehouse/locations'),
        api('/warehouse/delivery-destinations')
      ]);
      state.mag.locations = locs; state.mag.suppliers = suppliers; state.mag.destinations = dests;
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
      const dstTable = dests.length ? tableHTML(
        [{ t: 'Nazwa' }, { t: 'Kontakt' }, { t: 'Notatka' }, { t: '', num: true }],
        dests.map((d) => ({ cells: [
          { v: d.name }, { v: d.contact || '—', cls: 'mut' }, { v: d.notes || '—', cls: 'mut' },
          { html: acts('dst-edit', 'dst-del', d.id), cls: 'num' }
        ] }))
      ) : emptyBlock('Brak miejsc dostaw', '');
      el.innerHTML = `<div class="anim-fadeup">
        <div class="mag-config-section"><div class="mag-config-head"><h3>Dostawcy</h3><button class="btn btn-ghost btn-sm" data-mag-config-add="dostawca">+ Nowy dostawca</button></div>${supTable}</div>
        <div class="mag-config-section"><div class="mag-config-head"><h3>Miejsca dostaw</h3><button class="btn btn-ghost btn-sm" data-mag-config-add="destynacja">+ Nowe miejsce</button></div>${dstTable}</div>
        <div class="mag-config-section"><div class="mag-config-head"><h3>Lokalizacje</h3><button class="btn btn-ghost btn-sm" data-mag-config-add="lokalizacja">+ Nowa lokalizacja</button></div>${locTable}</div>
      </div>`;
    } catch (e) { el.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }

  // -------------------------------------------------------------- Użytkownicy (admin)
  const ROLE_LABELS = { user: 'Użytkownik', viewer: 'Podgląd (read-only)', manager: 'Kierownik', admin: 'Administrator' };
  function loadUsers() {
    const list = $('[data-users-list]'); const sub = $('[data-users-sub]'); if (!list) return;
    list.innerHTML = '<div class="loading">Ładowanie…</div>';
    api('/admin/users').then((users) => {
      state.userAdmin = users;
      state.users = users.map((u) => ({ email: u.email, fullName: u.fullName || u.email })); // odśwież cache selecta transferu
      if (sub) sub.textContent = `${users.length} ${plural(users.length, 'osoba', 'osoby', 'osób')}`;
      const managers = users.filter((u) => u.role === 'manager' || u.role === 'admin');
      const me = state.user && state.user.email;
      const roleSel = (u) => `<select class="usel" data-user-role="${esc(u.email)}">${Object.keys(ROLE_LABELS).map((r) => `<option value="${r}"${(u.role || 'user') === r ? ' selected' : ''}>${esc(ROLE_LABELS[r])}</option>`).join('')}</select>`;
      const mgrSel = (u) => `<select class="usel" data-user-mgr="${esc(u.email)}"><option value="">— bezpośrednio do administracji —</option>${managers.filter((m) => m.email !== u.email).map((m) => `<option value="${esc(m.email)}"${u.managerEmail === m.email ? ' selected' : ''}>${esc(m.fullName || m.email)} (${esc(ROLE_LABELS[m.role] || m.role)})</option>`).join('')}</select>`;
      list.innerHTML = tableHTML(
        [{ t: 'Użytkownik' }, { t: 'E-mail' }, { t: 'Rola' }, { t: 'Wnioski trafiają do' }, { t: '', num: true }],
        users.map((u) => ({ cells: [
          { html: `${esc(u.fullName || u.email)}${u.pendingFirstLogin ? ' <span class="chip chip-orange">oczekuje na logowanie</span>' : ''}` },
          { v: u.email, cls: 'mut' }, { html: roleSel(u) }, { html: mgrSel(u) },
          { html: u.email === me ? '<span class="eq-sub">to Ty</span>' : `<button class="btn btn-danger-ghost btn-sm" data-user-del="${esc(u.email)}">Usuń</button>`, cls: 'num' }
        ] }))
      );
      bindUserSelects(list);
    }).catch((e) => { list.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); });
  }
  function bindUserSelects(root) {
    $$('[data-user-role]', root).forEach((s) => s.addEventListener('change', () => patchUser(s.getAttribute('data-user-role'), { role: s.value })));
    $$('[data-user-mgr]', root).forEach((s) => s.addEventListener('change', () => patchUser(s.getAttribute('data-user-mgr'), { managerEmail: s.value })));
  }
  function patchUser(email, body) {
    api('/admin/users/' + encodeURIComponent(email), { method: 'PATCH', body: JSON.stringify(body) })
      .then(() => { toast('Zapisano.'); loadUsers(); })
      .catch((e) => { toast(e.message || 'Nie udało się.', true); loadUsers(); });
  }
  function delUser(email) {
    if (!confirm('Usunąć użytkownika ' + email + '?')) return;
    api('/admin/users/' + encodeURIComponent(email), { method: 'DELETE' })
      .then(() => { toast('Usunięto użytkownika.'); loadUsers(); })
      .catch((e) => toast(e.message || 'Nie udało się.', true));
  }

  // -------------------------------------------------------------- Rejestry (admin)
  const AUDIT_ACTION_LABELS = {
    loan_request_created: 'Złożył wniosek o wypożyczenie', purchase_request_created: 'Złożył wniosek o zakup',
    loan_request_cancelled: 'Anulował swój wniosek', loan_request_manager_approved: 'Zaakceptował (kierownik)',
    loan_request_manager_rejected: 'Odrzucił (kierownik)', loan_request_approved: 'Zatwierdził i wydał sprzęt',
    loan_request_rejected: 'Odrzucił wniosek', purchase_request_approved: 'Zatwierdził zakup (do zamówienia)',
    purchase_request_ordered: 'Oznaczył zakup jako zamówiony', purchase_request_stocked: 'Dodał zakup do magazynu',
    purchase_request_cancelled: 'Anulował zakup', loan_request_auto_rejected: 'Odrzucił (sprzęt wycofany)',
    request_comment_added: 'Dodał komentarz', loan_created: 'Utworzył wypożyczenie', loan_returned: 'Przyjął zwrot',
    item_created: 'Dodał sprzęt', item_updated: 'Zaktualizował sprzęt', item_deactivated: 'Wycofał sprzęt',
    item_discarded: 'Wyrzucił sprzęt', item_transferred: 'Przeniósł sprzęt', issue_reported: 'Zgłosił problem',
    user_created: 'Dodał użytkownika', user_updated: 'Zmienił użytkownika', user_deleted: 'Usunął użytkownika',
    warehouse_operation_done: 'Zatwierdził operację', warehouse_operation_reversed: 'Cofnął operację',
    reorder_rule_created: 'Dodał regułę min-max'
  };
  const REJ_DEFS = {
    loans: { url: '/admin/loans', sub: (n) => `${n} ${plural(n, 'wypożyczenie', 'wypożyczenia', 'wypożyczeń')}`,
      cols: [
        { t: 'Kod', f: (r) => r.itemCode || '—', cls: 'mono-cell' }, { t: 'Nazwa', f: (r) => r.itemName || '—' },
        { t: 'Osoba', f: (r) => r.userDisplayName || r.userEmail || '—' }, { t: 'Ilość', f: (r) => r.quantity || 1, num: true },
        { t: 'Status', f: (r) => r.status === 'active' ? 'Aktywne' : r.status === 'returned' ? 'Zwrócone' : (r.status || '—') },
        { t: 'Wypożyczono', f: (r) => fmtDate(r.borrowedAt) }, { t: 'Zwrócono', f: (r) => r.returnedAt ? fmtDate(r.returnedAt) : '—' }
      ] },
    requests: { url: '/admin/loan-requests', sub: (n) => `${n} ${plural(n, 'wniosek', 'wnioski', 'wniosków')}`,
      cols: [
        { t: 'Rodzaj', f: (r) => r.kind === 'purchase' ? 'Zakup' : 'Wypożyczenie' }, { t: 'Pozycja', f: (r) => r.itemName || r.itemCode || '—' },
        { t: 'Wnioskujący', f: (r) => r.requesterName || r.requesterEmail || '—' },
        { t: 'Status', f: (r) => statusLabel(r.status) }, { t: 'Data', f: (r) => fmtDate(r.requestedAt) }
      ] },
    audit: { url: '/admin/audit-logs', sub: (n) => `${n} ${plural(n, 'wpis', 'wpisy', 'wpisów')}`,
      cols: [
        { t: 'Kiedy', f: (r) => fmtDate(r.createdAt) }, { t: 'Osoba', f: (r) => r.actorEmail || '—' },
        { t: 'Akcja', f: (r) => AUDIT_ACTION_LABELS[r.actionType] || r.actionType || '—' },
        { t: 'Czego dotyczy', f: (r) => (r.payload && (r.payload.itemCode || r.payload.itemName || r.payload.email)) || r.entityId || '—' }
      ] }
  };
  function loadRejestry() { setRejTab(state.rejTab || 'loans'); }
  function setRejTab(tab) {
    state.rejTab = tab;
    $$('[data-rej-tab]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-rej-tab') === tab));
    renderRejTab(tab);
  }
  async function renderRejTab(tab) {
    const body = $('[data-rej-body]'); const sub = $('[data-rej-sub]'); const def = REJ_DEFS[tab]; if (!body || !def) return;
    body.innerHTML = '<div class="loading">Ładowanie…</div>';
    try {
      const rows = await api(def.url);
      state.rej = state.rej || {}; state.rej[tab] = rows;
      if (sub) sub.textContent = def.sub(rows.length);
      if (!rows.length) { body.innerHTML = emptyBlock('Brak danych', ''); return; }
      body.innerHTML = tableHTML(
        def.cols.map((c) => ({ t: c.t, num: c.num })),
        rows.map((r) => ({ cells: def.cols.map((c) => ({ v: c.f(r), cls: (c.num ? 'num ' : '') + (c.cls || '') })) }))
      );
    } catch (e) { body.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }
  function exportRejCSV() {
    const tab = state.rejTab || 'loans'; const def = REJ_DEFS[tab]; const rows = (state.rej && state.rej[tab]) || [];
    if (!rows.length) { toast('Brak danych do eksportu.'); return; }
    const escC = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = [def.cols.map((c) => c.t).join(',')].concat(rows.map((r) => def.cols.map((c) => escC(c.f(r))).join(','))).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'rejestr-' + tab + '.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // -------------------------------------------------------------- Zapotrzebowanie (min-max)
  async function renderZapotrzebowanie() {
    const el = $('[data-mag-panel="zapotrzebowanie"]'); if (!el) return;
    el.innerHTML = '<div class="loading">Ładowanie…</div>';
    try {
      const rules = await api('/warehouse/reorder-rules');
      state.mag.reorder = rules;
      const isAdmin = state.user && state.user.role === 'admin';
      const below = rules.filter((r) => r.below).length;
      const head = `<div class="page-head-row" style="margin-bottom:16px;">
        <div><h3 style="margin:0 0 4px;font-size:18px;font-weight:600;color:var(--heading);">Zapotrzebowanie</h3>
        <p style="margin:0;font-size:13.5px;color:var(--muted);">${rules.length} ${plural(rules.length, 'reguła', 'reguły', 'reguł')} min-max · ${below} poniżej minimum</p></div>
        ${isAdmin ? '<button class="btn btn-primary btn-sm" data-rr-new><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>Nowa reguła</button>' : ''}</div>`;
      if (!rules.length) { el.innerHTML = `<div class="anim-fadeup">${head}${emptyBlock('Brak reguł zapotrzebowania', isAdmin ? 'Dodaj regułę min-max dla kategorii lub konkretnego sprzętu.' : '')}</div>`; return; }
      const rows = rules.map((r) => {
        const statusChip = !r.isActive ? '<span class="chip chip-grey">Nieaktywna</span>'
          : r.below ? '<span class="chip chip-red">Poniżej minimum</span>' : '<span class="chip chip-new">OK</span>';
        const acts = isAdmin ? `<div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;">
          ${r.below && r.scope === 'item' && r.toOrder > 0 ? `<button class="btn btn-ghost btn-sm" data-rr-replenish="${esc(r.id)}">Uzupełnij</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-rr-edit="${esc(r.id)}">Edytuj</button>
          <button class="btn btn-danger-ghost btn-sm" data-rr-del="${esc(r.id)}">Usuń</button></div>` : '';
        return { cells: [
          { v: r.label }, { v: r.scope === 'item' ? 'Sprzęt' : 'Kategoria', cls: 'mut' },
          { v: fmtInt(r.minQty), cls: 'num' }, { v: fmtInt(r.maxQty), cls: 'num' },
          { v: fmtInt(r.available), cls: 'num' }, { html: `<strong>${r.toOrder > 0 ? fmtInt(r.toOrder) : '—'}</strong>`, cls: 'num' },
          { html: statusChip }, { html: acts, cls: 'num' }
        ] };
      });
      el.innerHTML = `<div class="anim-fadeup">${head}${tableHTML(
        [{ t: 'Cel' }, { t: 'Poziom' }, { t: 'Min', num: true }, { t: 'Max', num: true }, { t: 'Dostępne', num: true }, { t: 'Do zamówienia', num: true }, { t: 'Status' }, { t: '', num: true }],
        rows
      )}</div>`;
    } catch (e) { el.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }
  function delReorderRule(id) {
    if (!confirm('Usunąć regułę zapotrzebowania?')) return;
    api('/warehouse/reorder-rules/' + encodeURIComponent(id), { method: 'DELETE' }).then(() => { toast('Usunięto regułę.'); renderZapotrzebowanie(); if (state.magTab === 'przeglad') renderPrzeglad(); }).catch((e) => toast(e.message || 'Nie udało się.', true));
  }
  async function replenishRule(id) {
    try {
      const r = await api('/warehouse/reorder-rules/' + encodeURIComponent(id) + '/replenish', { method: 'POST', body: JSON.stringify({}) });
      toast(r.message || 'Utworzono roboczą operację przyjęcia.');
      renderZapotrzebowanie();
    } catch (e) { toast(e.message || 'Nie udało się uzupełnić.', true); }
  }

  // -------------------------------------------------------------- Wyjazdy (Turbo Weekend)
  const TW_CITIES = {
    'Warszawa': [21.01, 52.23], 'Kraków': [19.94, 50.06], 'Łódź': [19.46, 51.76],
    'Wrocław': [17.04, 51.11], 'Poznań': [16.93, 52.41], 'Gdańsk': [18.65, 54.35],
    'Szczecin': [14.55, 53.43], 'Bydgoszcz': [18.0, 53.12], 'Lublin': [22.57, 51.25],
    'Białystok': [23.16, 53.13], 'Katowice': [19.02, 50.26], 'Rzeszów': [22.0, 50.04],
    'Kielce': [20.63, 50.87], 'Olsztyn': [20.49, 53.78], 'Opole': [17.93, 50.67],
    'Toruń': [18.6, 53.01], 'Zielona Góra': [15.5, 51.94], 'Gorzów Wielkopolski': [15.24, 52.74],
    'Częstochowa': [19.12, 50.81], 'Radom': [21.15, 51.4], 'Płock': [19.71, 52.55],
    'Koszalin': [16.18, 54.19], 'Słupsk': [17.03, 54.46], 'Elbląg': [19.4, 54.16],
    'Tarnów': [20.98, 50.01], 'Nowy Sącz': [20.7, 49.62], 'Przemyśl': [22.77, 49.78],
    'Suwałki': [22.93, 54.1], 'Chełm': [23.47, 51.13], 'Gniezno': [17.6, 52.53]
  };
  const TW_BORDER = [
    [14.27,53.91],[15.0,54.05],[16.2,54.28],[17.0,54.62],[18.35,54.75],[18.65,54.42],
    [19.3,54.36],[19.65,54.45],[20.6,54.38],[21.5,54.35],[22.7,54.36],[23.0,54.38],
    [23.48,54.15],[23.52,53.95],[23.92,53.19],[23.6,52.6],[23.18,52.28],[23.63,52.0],
    [23.2,51.58],[23.68,50.88],[24.14,50.85],[23.7,50.4],[22.9,49.98],[22.65,49.55],
    [22.55,49.09],[21.85,49.4],[21.0,49.35],[20.08,49.18],[19.63,49.2],[19.2,49.4],
    [18.85,49.52],[18.55,49.92],[18.03,50.0],[17.72,50.2],[16.9,50.44],[16.45,50.65],
    [15.38,50.78],[14.98,50.86],[14.6,51.55],[14.72,51.9],[14.6,52.5],[14.13,52.85],
    [14.44,53.25],[14.27,53.72]
  ];
  const TW_BOUNDS = { latMin: 48.9, latMax: 55.0, lngMin: 13.9, lngMax: 24.25 };
  const TW_VIEW = { w: 640, h: 620, pad: 26 };
  function twProject(lng, lat) {
    const { latMin, latMax, lngMin, lngMax } = TW_BOUNDS;
    const cos = Math.cos(((latMin + latMax) / 2) * Math.PI / 180);
    const lngSpan = (lngMax - lngMin) * cos;
    const latSpan = latMax - latMin;
    const scale = Math.min((TW_VIEW.w - 2 * TW_VIEW.pad) / lngSpan, (TW_VIEW.h - 2 * TW_VIEW.pad) / latSpan);
    const offX = (TW_VIEW.w - lngSpan * scale) / 2;
    const offY = (TW_VIEW.h - latSpan * scale) / 2;
    return [offX + (lng - lngMin) * cos * scale, offY + (latMax - lat) * scale];
  }
  function twCoords(ev) {
    if (ev.lat != null && ev.lng != null && ev.lat !== '' && ev.lng !== '') return [Number(ev.lng), Number(ev.lat)];
    return TW_CITIES[ev.city] || TW_CITIES[String(ev.city || '').trim()] || null;
  }
  function twRuleText(it) {
    if (it.mode === 'fixed') return `stała: ${it.fixed} ${it.unit}`;
    const per = Number(it.perPerson) || 0; const round = Number(it.roundUpTo) || 1;
    return `${per}/os.${round > 1 ? ` · paczki po ${round}` : ''}`;
  }

  async function renderWyjazdy() {
    const el = $('[data-mag-panel="wyjazdy"]');
    state.tw = state.tw || {};
    el.innerHTML = '<div class="loading">Ładowanie…</div>';
    try {
      state.tw.events = await api('/tw');
    } catch (e) { el.innerHTML = emptyBlock('Nie udało się wczytać wyjazdów', e.message || ''); return; }
    const isAdmin = state.user && state.user.role === 'admin';
    const n = state.tw.events.length;
    el.innerHTML = `<div class="anim-fadeup">
      <div class="tw-head">
        <div class="tw-head-title"><h3>Wyjazdy</h3><p>${n} ${plural(n, 'wyjazd', 'wyjazdy', 'wyjazdów')} · kliknij bus lub pinezkę, aby policzyć listę pakowania.</p></div>
        <div class="tw-head-actions">
          <button class="btn btn-ghost btn-sm hidden" data-tw-return-mode>Powrót busa</button>
          ${isAdmin ? '<button class="btn btn-ghost btn-sm" data-tw-new>+ Nowy wyjazd</button>' : ''}
        </div>
      </div>
      <div class="tw-layout">
        <div class="tw-map card" data-tw-map></div>
        <div class="tw-side">
          <div class="card"><h3 style="margin:0 0 12px;font-size:15px;">Busy</h3><div class="tw-bus-list" data-tw-buses></div></div>
          <div class="card tw-panel" data-tw-panel><div class="tw-empty">Wybierz bus, aby policzyć listę pakowania.</div></div>
        </div>
      </div>
      ${isAdmin ? '<div class="tw-admin-wrap" data-tw-admin></div>' : ''}
    </div>`;
    renderTwMap(); renderTwBuses();
    if (state.tw.selectedId && state.tw.events.some((e) => String(e._id) === String(state.tw.selectedId))) selectTw(state.tw.selectedId);
    else { state.tw.selectedId = null; state.tw.packing = null; updateTwReturnBtn(); }
    if (isAdmin) renderTwAdmin();
  }

  function renderTwMap() {
    const wrap = $('[data-tw-map]'); if (!wrap) return;
    const border = TW_BORDER.map(([lng, lat], i) => { const [x, y] = twProject(lng, lat); return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ') + ' Z';
    const pins = (state.tw.events || []).map((ev) => {
      const c = twCoords(ev); if (!c) return '';
      const [x, y] = twProject(c[0], c[1]);
      const active = String(ev._id) === String(state.tw.selectedId);
      const label = esc(`${ev.city}${ev.participants ? ` · ${ev.participants}` : ''}`);
      return `<g class="tw-pin${active ? ' is-active' : ''}" data-tw-pin="${esc(ev._id)}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})" tabindex="0" role="button" aria-label="${esc(ev.city)}">
        <circle class="tw-pin-halo" r="16"></circle><circle class="tw-pin-dot" r="6"></circle>
        <text class="tw-pin-label" x="0" y="-20" text-anchor="middle">${label}</text></g>`;
    }).join('');
    wrap.innerHTML = `<svg viewBox="0 0 ${TW_VIEW.w} ${TW_VIEW.h}" class="tw-map-svg" preserveAspectRatio="xMidYMid meet" role="img"><path class="tw-map-land" d="${border}"></path>${pins}</svg>`;
    wrap.querySelectorAll('.tw-pin').forEach((pin) => {
      const id = pin.getAttribute('data-tw-pin');
      pin.addEventListener('click', () => selectTw(id));
      pin.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTw(id); } });
    });
  }

  function renderTwBuses() {
    const list = $('[data-tw-buses]'); if (!list) return;
    const evs = state.tw.events || [];
    if (!evs.length) { list.innerHTML = `<div class="tw-empty">Brak wyjazdów.${state.user && state.user.role === 'admin' ? ' Dodaj je przyciskiem „Nowy wyjazd”.' : ''}</div>`; return; }
    list.innerHTML = evs.map((ev) => {
      const active = String(ev._id) === String(state.tw.selectedId);
      return `<button class="tw-bus${active ? ' is-active' : ''}" data-tw-bus="${esc(ev._id)}">
        <span class="tw-bus-icon">🚌</span>
        <span class="tw-bus-main"><span class="tw-bus-title">${esc(ev.bus || 'Bus')} · ${esc(ev.city)}</span>
        <span class="tw-bus-meta">${esc(ev.eventType || 'Wyjazd')}${ev.eventDate ? ' · ' + esc(ev.eventDate) : ''} · ${esc(String(ev.participants || 0))} os.</span></span>
        <span class="tw-bus-count">${esc(String(ev.participants || 0))}</span></button>`;
    }).join('');
    list.querySelectorAll('[data-tw-bus]').forEach((b) => b.addEventListener('click', () => selectTw(b.getAttribute('data-tw-bus'))));
  }

  async function selectTw(id) {
    state.tw.selectedId = String(id);
    renderTwMap(); renderTwBuses();
    const panel = $('[data-tw-panel]'); if (panel) panel.innerHTML = '<div class="tw-empty">Liczę listę pakowania…</div>';
    try {
      const data = await api(`/tw/${encodeURIComponent(id)}/packing`);
      state.tw.packing = data; renderTwPanel(data); updateTwReturnBtn();
    } catch (err) { if (panel) panel.innerHTML = `<div class="tw-empty">${esc(err.message)}</div>`; }
  }

  function updateTwReturnBtn() {
    const btn = $('[data-tw-return-mode]'); if (!btn) return;
    const hasPacked = !!state.tw.packing && (state.tw.packing.items || []).some((i) => (Number(i.packedQty) || 0) > 0);
    btn.classList.toggle('hidden', !state.tw.selectedId || !hasPacked);
    btn.textContent = state.tw.returnMode ? 'Zakończ powrót' : 'Powrót busa';
    btn.classList.toggle('btn-primary', !!state.tw.returnMode);
    btn.classList.toggle('btn-ghost', !state.tw.returnMode);
  }

  function twStockBadge(it) {
    if (!it.itemCode) return '';
    const n = it.stockOnHand == null ? '—' : it.stockOnHand;
    return `<span class="tw-stock-badge" title="Stan magazynu: ${esc(String(n))}">📦 ${esc(String(n))}</span>`;
  }
  function twPackRow(it) {
    const packed = (Number(it.packedQty) || 0) > 0;
    return `<li class="tw-check${packed ? ' is-packed' : ''}">
      <button class="tw-check-box" type="button" data-pack-toggle="${esc(it._id)}" data-packed="${packed ? '1' : '0'}" title="${packed ? 'Cofnij spakowanie' : 'Oznacz jako spakowane'}">${packed ? '✓' : ''}</button>
      <div class="tw-check-main"><div class="tw-check-name">${esc(it.name)}</div><div class="tw-check-sub">${esc(twRuleText(it))}${it.itemCode ? ' · z magazynu' : ''}</div></div>
      ${twStockBadge(it)}
      <div class="tw-check-qty"><strong>${esc(String(it.quantity))}</strong> ${esc(it.unit)}</div></li>`;
  }
  function twReturnRow(it) {
    const packed = Number(it.packedQty) || 0;
    if (packed <= 0) return `<li class="tw-check is-dim"><div class="tw-check-main"><div class="tw-check-name">${esc(it.name)}</div><div class="tw-check-sub">nie spakowano</div></div></li>`;
    const returned = Number(it.returnedQty) || 0; const consumed = Math.max(0, packed - returned);
    return `<li class="tw-check is-return">
      <div class="tw-check-main"><div class="tw-check-name">${esc(it.name)}</div><div class="tw-check-sub">spakowano ${esc(String(packed))} · zużyte ${esc(String(consumed))} ${esc(it.unit)}${it.itemCode ? ' · wraca na stan' : ''}</div></div>
      <label class="tw-return-field">wróciło <input type="number" min="0" max="${packed}" value="${returned}" data-return-input="${esc(it._id)}"></label></li>`;
  }
  function renderTwPanel(data) {
    const panel = $('[data-tw-panel]'); if (!panel) return;
    const tw = data.turboWeekend || {}; const items = data.items || [];
    const packedCount = items.filter((i) => (Number(i.packedQty) || 0) > 0).length;
    const head = `<div class="tw-panel-head">
      <div><div class="tw-panel-city">${esc(tw.city || '')} <span class="tw-muted">${esc(tw.eventType || 'Wyjazd')}</span></div>
      <div class="tw-panel-meta">${tw.bus ? esc(tw.bus) + ' · ' : ''}${tw.eventDate ? esc(tw.eventDate) + ' · ' : ''}${esc(String(data.participants || 0))} uczestników · spakowano ${packedCount}/${items.length}</div></div>
      <div class="tw-panel-people"><span class="tw-panel-people-num">${esc(String(data.participants || 0))}</span><span class="tw-muted">osób</span></div></div>`;
    if (!items.length) { panel.innerHTML = head + '<div class="tw-empty">Lista pakowania jest pusta.</div>'; return; }
    const rows = items.map((it) => state.tw.returnMode ? twReturnRow(it) : twPackRow(it)).join('');
    panel.innerHTML = head + (state.tw.returnMode ? '<div class="tw-return-hint">Wpisz, ile każdej rzeczy wróciło — reszta zostaje odjęta jako zużyta, a zwrot wraca na stan magazynu.</div>' : '') + `<ul class="tw-checklist">${rows}</ul>`;
    panel.querySelectorAll('[data-pack-toggle]').forEach((elx) => elx.addEventListener('click', () => togglePack(elx.getAttribute('data-pack-toggle'), elx.getAttribute('data-packed') === '1')));
    panel.querySelectorAll('[data-return-input]').forEach((inp) => {
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
      inp.addEventListener('change', () => saveReturn(inp.getAttribute('data-return-input'), inp.value));
    });
  }
  async function togglePack(itemId, isPacked) {
    if (!state.tw.selectedId) return;
    try { await api(`/tw/${encodeURIComponent(state.tw.selectedId)}/packing/${encodeURIComponent(itemId)}/${isPacked ? 'unpack' : 'pack'}`, { method: 'POST' }); await selectTw(state.tw.selectedId); }
    catch (err) { toast(err.message || 'Nie udało się.', true); }
  }
  async function saveReturn(itemId, value) {
    if (!state.tw.selectedId) return;
    try { await api(`/tw/${encodeURIComponent(state.tw.selectedId)}/packing/${encodeURIComponent(itemId)}/return`, { method: 'POST', body: JSON.stringify({ returnedQty: Number(value) || 0 }) }); await selectTw(state.tw.selectedId); }
    catch (err) { toast(err.message || 'Nie udało się.', true); }
  }

  // --- admin: listy wyjazdów i pozycji pakowania ---
  async function renderTwAdmin() {
    const wrap = $('[data-tw-admin]'); if (!wrap) return;
    if (state.tw.packingItems == null) { try { state.tw.packingItems = await api('/packing-items'); } catch (_) { state.tw.packingItems = []; } }
    const evRows = (state.tw.events || []).map((ev) => `<div class="tw-admin-row">
      <div class="tw-admin-row-main"><strong>${esc(ev.bus || 'Bus')} · ${esc(ev.city)}</strong><span class="tw-muted">${esc(ev.eventType || 'Wyjazd')}${ev.eventDate ? ' · ' + esc(ev.eventDate) : ''} · ${esc(String(ev.participants || 0))} os.</span></div>
      <div class="tw-admin-row-actions"><button class="btn btn-ghost btn-sm" data-tw-edit="${esc(ev._id)}">Edytuj</button><button class="btn btn-danger-ghost btn-sm" data-tw-del="${esc(ev._id)}">Usuń</button></div></div>`).join('') || '<div class="tw-empty">Brak wyjazdów.</div>';
    const pkRows = (state.tw.packingItems || []).map((it) => `<div class="tw-admin-row">
      <div class="tw-admin-row-main"><strong>${esc(it.name)}</strong><span class="tw-muted">${esc(twRuleText(it))}${it.itemCode ? ' · 📦 ' + esc(it.itemCode) : ''}</span></div>
      <div class="tw-admin-row-actions"><button class="btn btn-ghost btn-sm" data-twp-edit="${esc(it._id)}">Edytuj</button><button class="btn btn-danger-ghost btn-sm" data-twp-del="${esc(it._id)}">Usuń</button></div></div>`).join('') || '<div class="tw-empty">Brak pozycji.</div>';
    wrap.innerHTML = `
      <div class="mag-config-section"><div class="mag-config-head"><h3>Zarządzaj wyjazdami</h3><button class="btn btn-ghost btn-sm" data-tw-new>+ Nowy wyjazd</button></div><div class="tw-admin-list">${evRows}</div></div>
      <div class="mag-config-section"><div class="mag-config-head"><h3>Lista pakowania (szablon)</h3><button class="btn btn-ghost btn-sm" data-twp-new>+ Nowa pozycja</button></div><div class="tw-admin-list">${pkRows}</div></div>`;
  }
  function delTwEvent(id) {
    if (!confirm('Usunąć ten wyjazd?')) return;
    api('/admin/tw/' + encodeURIComponent(id), { method: 'DELETE' }).then(() => { toast('Usunięto wyjazd.'); if (String(state.tw.selectedId) === String(id)) { state.tw.selectedId = null; state.tw.packing = null; } renderWyjazdy(); }).catch((e) => toast(e.message || 'Nie udało się.', true));
  }
  function delTwPacking(id) {
    if (!confirm('Usunąć tę pozycję listy pakowania?')) return;
    api('/admin/packing-items/' + encodeURIComponent(id), { method: 'DELETE' }).then(() => { toast('Usunięto pozycję.'); state.tw.packingItems = null; renderTwAdmin(); if (state.tw.selectedId) selectTw(state.tw.selectedId); }).catch((e) => toast(e.message || 'Nie udało się.', true));
  }

  // -------------------------------------------------------------- Zarządzanie sprzętem (admin)
  const CONDITION_LABELS = { new: 'Nowy', very_good: 'Bardzo dobry', good: 'Dobry', ok: 'Zadowalający', poor: 'Wymaga uwagi', damaged: 'Uszkodzony', for_repair: 'Do naprawy' };
  const ITEM_STATUS = { available: 'Dostępny', loaned: 'Wypożyczony', inactive: 'Nieaktywny', unavailable: 'Niedostępny', discarded: 'Wyrzucony' };
  function condLabel(v) { return v ? (CONDITION_LABELS[v] || v) : '—'; }
  function itemStatusChip(s) {
    const cls = s === 'available' ? 'chip chip-new' : s === 'loaned' ? 'chip chip-blue' : (s === 'discarded' || s === 'unavailable') ? 'chip chip-red' : 'chip chip-grey';
    return `<span class="${cls}">${esc(ITEM_STATUS[s] || s || '—')}</span>`;
  }

  async function loadAdminItems() {
    const el = $('[data-admin-list]'); if (!el) return;
    el.innerHTML = '<div class="loading">Ładowanie…</div>';
    try {
      const [items, opts] = await Promise.all([
        api('/admin/items'),
        state.adminOpts ? Promise.resolve(state.adminOpts) : api('/admin/form-options')
      ]);
      state.adminItems = items; state.adminOpts = opts;
      const search = $('[data-admin-search]');
      if (search && !search._bound) { search._bound = true; search.addEventListener('input', () => { state.adminQuery = search.value; renderAdminItems(); }); }
      renderAdminItems();
    } catch (e) { el.innerHTML = emptyBlock('Nie udało się wczytać', e.message || ''); }
  }

  function renderAdminItems() {
    const el = $('[data-admin-list]'); if (!el) return;
    const q = ((state.adminQuery || '')).toLowerCase().trim();
    let items = state.adminItems || [];
    if (q) items = items.filter((it) => [it.name, it.itemCode, it.category, it.assignedToName, it.assignedToEmail, it.brand, it.model].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
    const sub = $('[data-admin-sub]'); if (sub) sub.textContent = `${(state.adminItems || []).length} pozycji · ${items.length} widocznych`;
    if (!items.length) { el.innerHTML = emptyBlock('Brak sprzętu', q ? 'Zmień zapytanie wyszukiwania.' : 'Dodaj pierwszą pozycję.'); return; }
    const acts = (id) => `<div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm" data-ai-edit="${esc(id)}">Edytuj</button>
      <button class="btn btn-ghost btn-sm" data-ai-transfer="${esc(id)}">Przenieś</button>
      <button class="btn btn-danger-ghost btn-sm" data-ai-discard="${esc(id)}">Wycofaj</button></div>`;
    el.innerHTML = tableHTML(
      [{ t: 'Kod' }, { t: 'Nazwa' }, { t: 'Kategoria' }, { t: 'Stan' }, { t: 'Status' }, { t: 'Ilość', num: true }, { t: 'Lokalizacja' }, { t: 'Przypisanie' }, { t: '', num: true }],
      items.map((it) => ({ cells: [
        { v: it.itemCode, cls: 'mono-cell' }, { v: it.name }, { v: it.category || '—', cls: 'mut' },
        { v: condLabel(it.conditionStatus), cls: 'mut' }, { html: itemStatusChip(it.operationalStatus) },
        { v: fmtInt(it.quantity || 0), cls: 'num' }, { v: it.currentLocation || '—', cls: 'mut' },
        { v: it.assignedToName || it.assignedToEmail || '—', cls: 'mut' }, { html: acts(it._id), cls: 'num' }
      ] }))
    );
  }

  function exportAdminCSV() {
    const items = state.adminItems || [];
    if (!items.length) { toast('Brak danych do eksportu.'); return; }
    const cols = ['itemCode', 'name', 'category', 'brand', 'model', 'serialNumber', 'quantity', 'conditionStatus', 'operationalStatus', 'currentLocation', 'assignedToEmail'];
    const escC = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = [cols.join(',')].concat(items.map((it) => cols.map((c) => escC(it[c])).join(','))).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'sprzet.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // Parser CSV: nagłówek → obiekty. Obsługuje cudzysłowy i separator , lub ;
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',' || c === ';') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; } }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    if (!rows.length) return [];
    const head = rows[0].map((h) => h.trim().replace(/^﻿/, ''));
    return rows.slice(1).filter((r) => r.some((c) => c.trim() !== '')).map((r) => {
      const o = {}; head.forEach((h, i) => (o[h] = (r[i] || '').trim())); return o;
    });
  }
  async function discardAdminItem(id) {
    const it = (state.adminItems || []).find((x) => String(x._id) === String(id));
    openSheet('adminDiscard', { _id: id, name: it ? it.name : '' });
  }

  // -------------------------------------------------------------- Statystyki (dashboard admina)
  function barChart(rows, colorFn) {
    const max = Math.max(1, ...rows.map((r) => r.count || 0));
    const bars = rows.map((r) => {
      const pct = Math.round(((r.count || 0) / max) * 100);
      const col = colorFn ? colorFn(r) : 'var(--blue)';
      return `<div class="bar-row"><span class="bar-lbl">${esc(r.label)}</span><span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${col};"></span></span><span class="bar-val">${fmtInt(r.count || 0)}</span></div>`;
    }).join('');
    return `<div class="bar-chart">${bars || '<div class="tw-empty">Brak danych</div>'}</div>`;
  }
  const STATUS_COLOR = { available: 'var(--green)', loaned: 'var(--blue)', unavailable: 'var(--orange)', inactive: 'var(--muted-2)', discarded: 'var(--red)' };

  async function loadStats() {
    const el = $('[data-stats-body]'); if (!el) return;
    el.innerHTML = '<div class="loading">Ładowanie…</div>';
    try {
      const s = await api('/admin/stats');
      const warn = s.warranty && s.warranty.expired > 0;
      const kpis = `<div class="stat-row">
        <div class="stat"><div class="k">Sprzęt łącznie</div><div class="v">${fmtInt(s.itemsTotal)}</div></div>
        <div class="stat"><div class="k">Aktywne wypożyczenia</div><div class="v" style="color:var(--blue);">${fmtInt(s.activeLoans)}</div></div>
        <div class="stat"><div class="k">Oczekujące wnioski</div><div class="v" style="color:var(--orange);">${fmtInt(s.pendingRequests && s.pendingRequests.total)}</div></div>
        <div class="stat"><div class="k">Gwarancje ≤30 dni</div><div class="v" style="color:${warn ? 'var(--red)' : 'var(--ink)'};">${fmtInt(s.warranty && s.warranty.total)}</div>${warn ? `<div class="s" style="color:var(--red);">${fmtInt(s.warranty.expired)} po terminie</div>` : ''}</div>
      </div>`;
      const statusRows = Object.entries(s.itemsByStatus || {}).map(([k, v]) => ({ label: ITEM_STATUS[k] || k, count: v, key: k }));
      const condRows = (s.itemsByCondition || []).map((r) => ({ label: condLabel(r.condition), count: r.count }));
      const catRows = (s.itemsByCategory || []).map((r) => ({ label: r.category, count: r.count }));
      const charts = `<div class="grid-2" style="margin-top:16px;">
        <div class="card"><h3>Sprzęt wg statusu</h3>${barChart(statusRows, (r) => STATUS_COLOR[r.key] || 'var(--blue)')}</div>
        <div class="card"><h3>Sprzęt wg stanu technicznego</h3>${barChart(condRows)}</div>
      </div>
      <div class="card" style="margin-top:16px;"><h3>Sprzęt wg kategorii</h3>${barChart(catRows, () => 'var(--purple)')}</div>`;
      const wItems = (s.warranty && s.warranty.items) || [];
      const warrantyTable = `<div class="card" style="margin-top:16px;"><h3>Gwarancje kończące się w 30 dni</h3>${
        wItems.length ? tableHTML(
          [{ t: 'Nazwa' }, { t: 'Kategoria' }, { t: 'Gwarancja do' }, { t: 'Status', num: true }],
          wItems.map((w) => ({ cells: [
            { v: w.name }, { v: w.category || '—', cls: 'mut' }, { v: w.warrantyUntil, cls: 'mut' },
            { html: `<span class="chip ${w.expired ? 'chip-red' : w.daysLeft <= 7 ? 'chip-orange' : 'chip-grey'}">${w.expired ? 'Po terminie' : w.daysLeft === 0 ? 'dziś' : 'za ' + w.daysLeft + ' dni'}</span>`, cls: 'num' }
          ] }))
        ) : '<div class="tw-empty">Brak gwarancji kończących się w 30 dni.</div>'
      }</div>`;
      el.innerHTML = `<div class="anim-fadeup">${kpis}${charts}${warrantyTable}</div>`;
    } catch (e) { el.innerHTML = emptyBlock('Nie udało się wczytać statystyk', e.message || ''); }
  }

  // -------------------------------------------------------------- global events

  // -------------------------------------------------------------- global events
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-view],[data-sheet],[data-detail],[data-request],[data-transfer],[data-report],[data-return],[data-req-act],[data-req-cancel],[data-cmt-send],[data-notif-resolve],[data-rej-tab],[data-rej-csv],[data-user-new],[data-user-del],[data-close-drawer],[data-close-sheet],[data-soon],#sheetSubmit,[data-stop],[data-mag-tab],[data-mag-optab],[data-mag-report],[data-mag-op],[data-mag-csv],[data-mag-new-op],[data-mag-config-add],[data-op-addline],[data-op-delline],[data-op-save],[data-op-validate],[data-op-cancel],[data-op-reverse],[data-sup-edit],[data-sup-del],[data-loc-edit],[data-loc-del],[data-lic-new],[data-lic-detail],[data-lic-edit],[data-lic-del],[data-onb-new],[data-onb-toggle],[data-onb-edit],[data-onb-del],[data-theme-opt],[data-pref-toggle],[data-tw-new],[data-tw-edit],[data-tw-del],[data-twp-new],[data-twp-edit],[data-twp-del],[data-tw-return-mode],[data-ai-new],[data-ai-edit],[data-ai-transfer],[data-ai-discard],[data-ai-import],[data-ai-export],[data-rr-new],[data-rr-edit],[data-rr-del],[data-rr-replenish],[data-prod-new],[data-prod-edit],[data-prod-import],[data-batch-add],[data-batch-del],[data-prod-save],[data-health-recompute],[data-op-pdf],[data-dst-edit],[data-dst-del]');
    if (!t) return;

    if (t.hasAttribute('data-rr-new')) { openSheet('reorderRule', {}); return; }
    if (t.hasAttribute('data-rr-edit')) { const r = (state.mag.reorder || []).find((x) => x.id === t.getAttribute('data-rr-edit')); openSheet('reorderRule', r || {}); return; }
    if (t.hasAttribute('data-rr-del')) { delReorderRule(t.getAttribute('data-rr-del')); return; }
    if (t.hasAttribute('data-rr-replenish')) { replenishRule(t.getAttribute('data-rr-replenish')); return; }

    if (t.hasAttribute('data-ai-new')) { openSheet('adminItem', {}); return; }
    if (t.hasAttribute('data-ai-edit')) { const it = (state.adminItems || []).find((x) => String(x._id) === t.getAttribute('data-ai-edit')); openSheet('adminItem', it || {}); return; }
    if (t.hasAttribute('data-ai-transfer')) { const it = (state.adminItems || []).find((x) => String(x._id) === t.getAttribute('data-ai-transfer')); openSheet('adminTransfer', { _id: t.getAttribute('data-ai-transfer'), name: it ? it.name : '' }); return; }
    if (t.hasAttribute('data-ai-discard')) { discardAdminItem(t.getAttribute('data-ai-discard')); return; }
    if (t.hasAttribute('data-ai-import')) { openSheet('adminImport', {}); return; }
    if (t.hasAttribute('data-ai-export')) { exportAdminCSV(); return; }

    if (t.hasAttribute('data-theme-opt')) { setTheme(t.getAttribute('data-theme-opt')); return; }
    if (t.hasAttribute('data-pref-toggle')) { togglePref(t.getAttribute('data-pref-toggle')); return; }

    if (t.hasAttribute('data-tw-new')) { openSheet('twEvent', {}); return; }
    if (t.hasAttribute('data-tw-edit')) { const ev = (state.tw && state.tw.events || []).find((x) => String(x._id) === t.getAttribute('data-tw-edit')); openSheet('twEvent', ev || {}); return; }
    if (t.hasAttribute('data-tw-del')) { delTwEvent(t.getAttribute('data-tw-del')); return; }
    if (t.hasAttribute('data-twp-new')) { openSheet('twPacking', {}); return; }
    if (t.hasAttribute('data-twp-edit')) { const it = (state.tw && state.tw.packingItems || []).find((x) => String(x._id) === t.getAttribute('data-twp-edit')); openSheet('twPacking', it || {}); return; }
    if (t.hasAttribute('data-twp-del')) { delTwPacking(t.getAttribute('data-twp-del')); return; }
    if (t.hasAttribute('data-tw-return-mode')) { if (!state.tw.selectedId || !state.tw.packing) return; state.tw.returnMode = !state.tw.returnMode; renderTwPanel(state.tw.packing); updateTwReturnBtn(); return; }

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
    if (t.hasAttribute('data-mag-config-add')) { const k = t.getAttribute('data-mag-config-add'); openSheet(k === 'dostawca' ? 'supplier' : k === 'destynacja' ? 'destination' : 'location', {}); return; }
    if (t.hasAttribute('data-dst-edit')) { const d = (state.mag.destinations || []).find((x) => x.id === t.getAttribute('data-dst-edit')); openSheet('destination', d || {}); return; }
    if (t.hasAttribute('data-dst-del')) { delDestination(t.getAttribute('data-dst-del')); return; }
    if (t.hasAttribute('data-prod-new')) { openSheet('newProduct', {}); return; }
    if (t.hasAttribute('data-prod-import')) { openSheet('prodImport', {}); return; }
    if (t.hasAttribute('data-prod-edit')) { openProductEditor(t.getAttribute('data-prod-edit')); return; }
    if (t.hasAttribute('data-prod-save')) { saveProduct(); return; }
    if (t.hasAttribute('data-batch-add')) { readBatchesFromDOM(); prodEdit.batches.push({ qty: 0, unitPrice: 0, note: '' }); renderBatchRows(); return; }
    if (t.hasAttribute('data-batch-del')) { readBatchesFromDOM(); prodEdit.batches.splice(Number(t.getAttribute('data-batch-del')), 1); renderBatchRows(); return; }
    if (t.hasAttribute('data-health-recompute')) { recomputeHealth(); return; }
    if (t.hasAttribute('data-op-pdf')) { openOpPdf(t.getAttribute('data-op-pdf')); return; }
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
    if (t.dataset.return) { openSheet('returnItem', { itemCode: t.dataset.return, name: t.dataset.name }); return; }
    if (t.hasAttribute('data-req-act')) {
      const card = t.closest('[data-req-card]'); const noteEl = card && $('[data-decision-note]', card);
      requestAction(t.getAttribute('data-req-id'), t.getAttribute('data-req-act'), noteEl ? noteEl.value : ''); return;
    }
    if (t.hasAttribute('data-req-cancel')) { cancelOwnRequest(t.getAttribute('data-req-cancel')); return; }
    if (t.hasAttribute('data-cmt-send')) { const d = t.closest('details.cmt'); sendComment(t.getAttribute('data-cmt-send'), d); return; }
    if (t.hasAttribute('data-notif-resolve')) { resolveNotif(t.getAttribute('data-notif-resolve')); return; }
    if (t.hasAttribute('data-rej-tab')) { setRejTab(t.getAttribute('data-rej-tab')); return; }
    if (t.hasAttribute('data-rej-csv')) { exportRejCSV(); return; }
    if (t.hasAttribute('data-user-new')) { openSheet('newUser', {}); return; }
    if (t.hasAttribute('data-user-del')) { delUser(t.getAttribute('data-user-del')); return; }
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
