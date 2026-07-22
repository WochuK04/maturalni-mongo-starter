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
    users: null          // /users cache for transfer target
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
    ['login', 'launcher', 'sprzet', 'settings'].forEach((s) => {
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
    const p = $('[data-pulpit-greeting]');
    if (p) p.textContent = 'Dzień dobry, ' + first + ' 👋';
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
    if (view === 'skrzynka') return loadInbox();
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
          <div style="font-size:13px;font-weight:600;color:#1F2225;margin-bottom:8px;">Tagi</div>
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
        invalidate(['inbox']); toast('Wniosek o zakup wysłany.');
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
        invalidate(['inbox']); toast('Wniosek o wypożyczenie wysłany.');
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
        invalidate(['mine', 'available']); toast('Sprzęt przeniesiony.'); if (state.view === 'mojsprzet') loadMine();
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
        toast('Zgłoszenie wysłane.');
      }
    }
  };

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
    box.innerHTML = `
      <div class="sheet-top"><div class="sheet-eyebrow">${esc(def.eyebrow)}</div>
        <button class="x-btn" data-close-sheet><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>
      <h3>${esc(def.title)}</h3>
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
      to_order: 'Do zamówienia', ordered: 'Zamówiony', cancelled: 'Anulowany', completed: 'Zakończony'
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

  // -------------------------------------------------------------- global events
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-view],[data-sheet],[data-detail],[data-request],[data-transfer],[data-report],[data-return],[data-approve],[data-reject],[data-close-drawer],[data-close-sheet],[data-soon],#sheetSubmit,[data-stop]');
    if (!t) return;

    if (t.hasAttribute('data-stop')) { e.stopPropagation(); return; }
    if (t.id === 'sheetSubmit') { e.preventDefault(); submitSheet(); return; }
    if (t.hasAttribute('data-close-drawer')) { closeDrawer(); return; }
    if (t.hasAttribute('data-close-sheet')) { closeSheet(); return; }
    if (t.hasAttribute('data-soon')) { toast(t.getAttribute('data-soon')); return; }

    if (t.dataset.go) {
      const g = t.dataset.go;
      if (g === 'sprzet') { showScreen('sprzet'); setView('pulpit'); }
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
        showScreen('launcher');
        refreshCounts();
      } else {
        showScreen('login');
      }
    } catch (e) {
      if (e.message !== 'unauth') showScreen('login');
    }
  }
  boot();
})();
