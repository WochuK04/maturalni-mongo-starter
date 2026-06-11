const authBox = document.getElementById('authBox');
const availableList = document.getElementById('availableList');
const myLoansList = document.getElementById('myLoansList');
const myRequestsList = document.getElementById('myRequestsList');
const adminContent = document.getElementById('adminContent');
const stats = document.getElementById('stats');

const adminSection = document.getElementById('adminSection');
const auditFilterForm = document.getElementById('auditFilterForm');

const availableTpl = document.getElementById('availableItemTemplate');
const loanTpl = document.getElementById('loanItemTemplate');
const requestTpl = document.getElementById('requestItemTemplate');
const adminRequestTpl = document.getElementById('adminRequestTemplate');

const adminQuickActions = document.getElementById('adminQuickActions');
const toggleWorkspaceBtn = document.getElementById('toggleWorkspaceBtn');

const managerViewTab = document.getElementById('managerViewTab');
const managerRequestsList = document.getElementById('managerRequestsList');
const actionBadge = document.getElementById('actionBadge');

const loginGate = document.getElementById('loginGate');
const appLayout = document.getElementById('appLayout');

const usersViewTab = document.getElementById('usersViewTab');
const usersContent = document.getElementById('usersContent');

const openAddItemBtn = document.getElementById('openAddItemBtn');
const addItemModal = document.getElementById('addItemModal');
const addItemForm = document.getElementById('addItemForm');
const closeAddItemBtn = document.getElementById('closeAddItemBtn');
const cancelAddItemBtn = document.getElementById('cancelAddItemBtn');
const addItemCategory = document.getElementById('addItemCategory');
const addItemCategoryCustomField = document.getElementById('addItemCategoryCustomField');
const addItemCategoryCustom = document.getElementById('addItemCategoryCustom');
const addItemLocation = document.getElementById('addItemLocation');
const addItemCondition = document.getElementById('addItemCondition');
const addItemAssignee = document.getElementById('addItemAssignee');
const addItemAssignHint = document.getElementById('addItemAssignHint');

const purchaseModal = document.getElementById('purchaseModal');
const purchaseForm = document.getElementById('purchaseForm');
const closePurchaseBtn = document.getElementById('closePurchaseBtn');
const cancelPurchaseBtn = document.getElementById('cancelPurchaseBtn');

const requestFormCard = document.getElementById('requestFormCard');
const requestLayout = document.getElementById('requestLayout');
const loanRequestForm = document.getElementById('loanRequestForm');
const cancelRequestFormBtn = document.getElementById('cancelRequestFormBtn');
const requestItemCode = document.getElementById('requestItemCode');
const requestItemName = document.getElementById('requestItemName');
const purposeInput = document.getElementById('purpose');
const targetUseLocationInput = document.getElementById('targetUseLocation');
const requestedReturnDateInput = document.getElementById('requestedReturnDate');
const requestNoteInput = document.getElementById('requestNote');

const availableSearchInput = document.getElementById('availableSearchInput');

const itemDetailsModal = document.getElementById('itemDetailsModal');
const modalItemImage = document.getElementById('modalItemImage');
const modalItemStatus = document.getElementById('modalItemStatus');
const modalItemCategory = document.getElementById('modalItemCategory');
const modalItemTitle = document.getElementById('modalItemTitle');
const modalItemSubtitle = document.getElementById('modalItemSubtitle');
const modalItemCode = document.getElementById('modalItemCode');
const modalItemBrandModel = document.getElementById('modalItemBrandModel');
const modalItemLocation = document.getElementById('modalItemLocation');
const modalItemCondition = document.getElementById('modalItemCondition');
const modalItemQr = document.getElementById('modalItemQr');
const modalItemAssigned = document.getElementById('modalItemAssigned');
const modalItemDetails = document.getElementById('modalItemDetails');
const modalItemTags = document.getElementById('modalItemTags');
const modalActiveLoan = document.getElementById('modalActiveLoan');
const modalRequestBtn = document.getElementById('modalRequestBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const closeItemDetailsModalBtn = document.getElementById('closeItemDetailsModalBtn');

const viewSwitcher = document.getElementById('viewSwitcher');
const adminViewTab = document.getElementById('adminViewTab');
const viewTabs = Array.from(document.querySelectorAll('.view-tab'));
const viewPanels = Array.from(document.querySelectorAll('.view-panel'));

function createPlaceholderImage(item = {}) {
  const category = String(item.category || 'Sprzęt').trim();
  const label = String(item.itemCode || item.name || category).trim();

  const paletteMap = {
    Kamera: ['#dbeafe', '#93c5fd', '#1d4ed8'],
    Aparat: ['#ede9fe', '#c4b5fd', '#6d28d9'],
    Audio: ['#dcfce7', '#86efac', '#15803d'],
    Mikrofon: ['#fce7f3', '#f9a8d4', '#be185d'],
    Laptop: ['#e0f2fe', '#7dd3fc', '#0369a1'],
    Komputer: ['#e0f2fe', '#7dd3fc', '#0369a1'],
    Monitor: ['#fef3c7', '#fcd34d', '#b45309'],
    Światło: ['#fff7ed', '#fdba74', '#c2410c'],
    Oswietlenie: ['#fff7ed', '#fdba74', '#c2410c'],
    Statyw: ['#e5e7eb', '#9ca3af', '#374151']
  };

  const [bg1, bg2, fg] = paletteMap[category] || ['#e2e8f0', '#cbd5e1', '#334155'];

  const safeCategory = category
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  const safeLabel = label
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 750" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${bg1}" />
          <stop offset="100%" stop-color="${bg2}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="750" fill="url(#g)" />
      <circle cx="1020" cy="140" r="120" fill="${fg}" opacity="0.10" />
      <circle cx="180" cy="620" r="180" fill="${fg}" opacity="0.12" />
      <rect x="120" y="120" width="220" height="32" rx="16" fill="${fg}" opacity="0.16" />
      <text x="120" y="340" font-size="64" font-family="Inter, Arial, sans-serif" font-weight="700" fill="${fg}">
        ${safeCategory}
      </text>
      <text x="120" y="410" font-size="30" font-family="Inter, Arial, sans-serif" fill="${fg}" opacity="0.85">
        ${safeLabel}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

let currentUser = null;
let workspaceMode = 'user';
let activeView = 'available';
let availableItemsState = [];
let availableSearchTerm = '';
let activeModalItem = null;

function showToast(message) {
  const old = document.querySelector('.toast');
  if (old) old.remove();

  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  });

  let data = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.message || data?.error || 'Błąd żądania';
    throw new Error(message);
  }

  return data;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Animacja ładowania na klikniętym przycisku na czas operacji. Minimalny czas
// trwania sprawia, że spinner jest widoczny nawet przy błyskawicznym odświeżeniu.
async function withButtonLoading(btn, task, minMs = 450) {
  if (!btn) return task();

  btn.classList.add('is-loading');
  btn.disabled = true;
  const startedAt = Date.now();

  try {
    const result = await task();
    const elapsed = Date.now() - startedAt;
    if (elapsed < minMs) await delay(minMs - elapsed);
    return result;
  } finally {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
}

// Lokalizacje do listy rozwijanej przy zwrocie (pobierane raz i cache'owane).
let locationsCache = null;

async function ensureLocations() {
  if (locationsCache) return locationsCache;
  try {
    const locs = await api('/locations');
    if (Array.isArray(locs) && locs.length) locationsCache = locs;
  } catch {
    // zostaje fallback poniżej
  }
  return locationsCache || ['Magazyn', 'Studio', 'Biuro', 'Serwis'];
}

function renderEmpty(container, text) {
  container.innerHTML = `<div class="empty">${text}</div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pl-PL');
}

function getItemImage(item) {
  const imageUrl = String(item?.imageUrl || '').trim();
  const thumbnailUrl = String(item?.thumbnailUrl || '').trim();
  if (imageUrl) return imageUrl;
  if (thumbnailUrl) return thumbnailUrl;
  return createPlaceholderImage(item);
}

function getStatusLabel(status) {
  switch (status) {
    case 'available': return 'Dostępny';
    case 'loaned': return 'Wypożyczony';
    case 'inactive': return 'Nieaktywny';
    case 'unavailable': return 'Niedostępny';
    case 'discarded': return 'Wyrzucony';
    default: return status || '-';
  }
}

function getRequestStatusLabel(status) {
  switch (status) {
    case 'pending': return 'Oczekuje';
    case 'pending_manager': return 'U kierownika';
    case 'pending_admin': return 'U administracji';
    case 'to_order': return 'Do zamówienia';
    case 'ordered': return 'Zamówiony';
    case 'fulfilled': return 'Dodano do magazynu';
    case 'approved': return 'Zaakceptowany';
    case 'rejected': return 'Odrzucony';
    case 'cancelled': return 'Anulowany';
    default: return status || '-';
  }
}

const ACTIVE_REQUEST_STATUSES = ['pending_manager', 'pending_admin', 'pending'];

function isCancelableStatus(status) {
  return ACTIVE_REQUEST_STATUSES.includes(status);
}

function makeShopLink(url) {
  const a = document.createElement('a');
  const safe = /^https?:\/\//i.test(String(url || '')) ? url : '#';
  a.href = safe;
  a.textContent = '🔗 link do sklepu';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'shop-link';
  return a;
}

// Wypełnia tytuł i meta węzła wniosku — obsługuje wypożyczenia i zakupy.
function fillRequestNode(node, req, { withRequester } = {}) {
  const titleEl = node.querySelector('.item-title');
  const metaEl = node.querySelector('.item-meta');
  const who = req.requesterName || req.requesterEmail;

  if (req.kind === 'purchase') {
    titleEl.textContent = `🛒 ${req.itemName || 'Nowy sprzęt'} ×${req.quantity || 1}`;
    const base = withRequester
      ? `${who} · ${req.requesterEmail} · zakup`
      : `Zakup · status: ${getRequestStatusLabel(req.status)}`;
    metaEl.textContent = `${base}${req.estimatedPrice ? ` · ~${req.estimatedPrice}` : ''} · uzasadnienie: ${req.justification || '-'} · `;
    metaEl.appendChild(makeShopLink(req.shopUrl));
  } else {
    titleEl.textContent = `${req.itemName} (${req.itemCode})`;
    const base = withRequester
      ? `${who} · ${req.requesterEmail}`
      : `Status: ${getRequestStatusLabel(req.status)}`;
    metaEl.textContent = `${base} · cel: ${req.purpose || '-'} · miejsce: ${req.targetUseLocation || '-'} · zwrot: ${req.requestedReturnDate || '-'}`;
  }
}

// Pokazuje notatkę z decyzji na karcie wniosku — dzięki temu wiadomo, dokąd
// trafia: widzi ją wnioskodawca (w „Moje wnioski") i kolejny decydent.
function appendDecisionNote(node, req) {
  const note = String(req.decisionNote || '').trim();
  if (!note) return;

  const container = node.querySelector('.item-title')?.parentElement;
  if (!container) return;

  const label = req.status === 'pending_admin' ? 'Notatka kierownika' : 'Notatka do decyzji';
  const p = document.createElement('p');
  p.className = 'item-note';
  p.textContent = `📝 ${label}: ${note}`;
  container.appendChild(p);
}

function renderTags(container, tags = []) {
  container.innerHTML = '';
  if (!Array.isArray(tags) || !tags.length) {
    container.innerHTML = '<span class="muted">Brak tagów</span>';
    return;
  }

  tags.forEach(tag => {
    const el = document.createElement('span');
    el.className = 'tag';
    el.textContent = tag;
    container.appendChild(el);
  });
}

function renderAuthBox() {
  if (!currentUser) {
    authBox.innerHTML = `
      <p class="muted">Nie jesteś zalogowany.</p>
      <a class="btn btn-primary" href="/auth/google" style="text-decoration:none;text-align:center;">
        Zaloguj firmowym Google
      </a>
    `;
    return;
  }

  authBox.innerHTML = `
    <label>Zalogowany jako</label>
    <div><strong>${escapeHtml(currentUser.fullName)}</strong></div>
    <div class="muted">${escapeHtml(currentUser.email)}</div>
    <div class="muted">Rola: ${escapeHtml(currentUser.role)}</div>
    <a class="btn btn-secondary" href="/auth/logout" style="text-decoration:none;text-align:center;">
      Wyloguj
    </a>
  `;
}

function renderStats(data) {
  const cards = [
    { label: 'Użytkownik', value: currentUser?.fullName || currentUser?.email || '-' },
    { label: 'Dostępny sprzęt', value: data.availableCount },
    { label: 'Moje wnioski', value: data.myRequestsCount },
    { label: 'Moje wypożyczenia', value: data.myLoansCount }
  ];

  stats.innerHTML = cards.map(card => `
    <article class="card stat-card">
      <h3>${escapeHtml(card.label)}</h3>
      <div class="stat-value">${escapeHtml(card.value)}</div>
    </article>
  `).join('');
}

function showAuditFilters() {
  if (auditFilterForm) auditFilterForm.hidden = false;
}

function hideAuditFilters() {
  if (auditFilterForm) auditFilterForm.hidden = true;
}

function openRequestForm(item) {
  requestItemCode.value = item.itemCode || '';
  requestItemName.value = `${item.name || ''} (${item.itemCode || ''})`;
  purposeInput.value = '';
  targetUseLocationInput.value = 'Dom';
  requestedReturnDateInput.value = '';
  requestNoteInput.value = '';
  requestFormCard.hidden = false;
  if (requestLayout) requestLayout.classList.add('form-open');
  setActiveView('requests');
  requestFormCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeRequestForm() {
  if (loanRequestForm) loanRequestForm.reset();
  requestItemCode.value = '';
  requestItemName.value = '';
  requestFormCard.hidden = true;
  if (requestLayout) requestLayout.classList.remove('form-open');
}

function setActiveView(view) {
  activeView = view;

  viewTabs.forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  viewPanels.forEach((panel) => {
    const active = panel.dataset.panel === view;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
}

async function handleViewChange(view) {
  setActiveView(view);

  if (view === 'available') {
    await loadAvailableItems();
  }

  if (view === 'requests') {
    await loadMyRequests();
  }

  if (view === 'returns') {
    await loadMyLoans();
  }

  if (view === 'approvals' && (currentUser?.role === 'manager' || currentUser?.role === 'admin')) {
    await loadActionItems();
  }

  if (view === 'users' && currentUser?.role === 'admin') {
    await loadUsers();
  }

  if (view === 'admin' && currentUser?.role === 'admin') {
    await loadAdminItems();
  }
}

function setWorkspaceMode(mode) {
  workspaceMode = mode;
  const isAdminMode = mode === 'admin';

  if (toggleWorkspaceBtn) {
    toggleWorkspaceBtn.setAttribute('aria-pressed', String(!isAdminMode));
    toggleWorkspaceBtn.textContent = isAdminMode
      ? 'Pokaż panel użytkownika'
      : 'Pokaż panel admina';
  }

  if (adminViewTab) {
    adminViewTab.hidden = currentUser?.role !== 'admin';
  }

  if (usersViewTab) {
    usersViewTab.hidden = currentUser?.role !== 'admin';
  }

  if (isAdminMode) {
    setActiveView('admin');
  } else if (activeView === 'admin') {
    setActiveView('available');
  }

  if (!isAdminMode) {
    hideAuditFilters();
  }
}

function applyRoleVisibility(user) {
  if (!viewSwitcher) return;

  if (!user) {
    viewSwitcher.hidden = true;
    if (adminQuickActions) adminQuickActions.hidden = true;
    if (adminViewTab) adminViewTab.hidden = true;
    if (managerViewTab) managerViewTab.hidden = true;
    if (usersViewTab) usersViewTab.hidden = true;
    if (adminSection) adminSection.hidden = true;
    if (requestFormCard) requestFormCard.hidden = true;
    return;
  }

  viewSwitcher.hidden = false;

  // Zakładka „Wymagane działania" jest wspólna dla kierowników i adminów
  // (jedni decydują na etapie kierownika, drudzy realizują wydania).
  const isManager = user.role === 'manager';
  const isAdmin = user.role === 'admin';
  if (managerViewTab) managerViewTab.hidden = !(isManager || isAdmin);

  if (user.role === 'admin') {
    if (adminQuickActions) adminQuickActions.hidden = false;
    if (adminViewTab) adminViewTab.hidden = false;
    if (usersViewTab) usersViewTab.hidden = false;
    if (adminSection) adminSection.hidden = false;
    setWorkspaceMode('admin');
  } else {
    if (adminQuickActions) adminQuickActions.hidden = true;
    if (adminViewTab) adminViewTab.hidden = true;
    if (usersViewTab) usersViewTab.hidden = true;
    if (adminSection) adminSection.hidden = true;
    setWorkspaceMode('user');
  }
}

// ===== Brama logowania (UI ukryte do czasu zalogowania) =====

function showApp() {
  if (loginGate) loginGate.hidden = true;
  if (appLayout) appLayout.hidden = false;
}

function showLoginGate() {
  if (loginGate) loginGate.hidden = false;
  if (appLayout) appLayout.hidden = true;
}

// ===== Badge „Wymagane działania" =====

function setActionBadge(count) {
  if (!actionBadge) return;

  const role = currentUser?.role;
  if (role !== 'manager' && role !== 'admin') {
    actionBadge.hidden = true;
    return;
  }

  actionBadge.textContent = String(count);
  actionBadge.hidden = count <= 0;
}

async function refreshActionBadge() {
  if (!actionBadge) return;

  const role = currentUser?.role;
  if (role !== 'manager' && role !== 'admin') {
    setActionBadge(0);
    return;
  }

  try {
    const items = await api('/my/action-items');
    setActionBadge(Array.isArray(items) ? items.length : 0);
  } catch {
    // W razie błędu zostawiamy ostatnią znaną wartość badge'a.
  }
}

let actionBadgeTimer = null;

// Lekki polling, żeby kierownik/admin zobaczył nowe wnioski bez odświeżania strony.
function startActionBadgePolling() {
  if (actionBadgeTimer) return;
  const role = currentUser?.role;
  if (role !== 'manager' && role !== 'admin') return;
  actionBadgeTimer = setInterval(refreshActionBadge, 30000);
}

function getAvailableSearchSource(item) {
  return [
    item.itemCode,
    item.name,
    item.category,
    item.details,
    item.currentLocation,
    item.conditionStatus,
    item.brand,
    item.model,
    ...(Array.isArray(item.tags) ? item.tags : [])
  ].filter(Boolean).join(' ').toLowerCase();
}

function getFilteredAvailableItems() {
  if (!availableSearchTerm) return availableItemsState;
  return availableItemsState.filter(item =>
    getAvailableSearchSource(item).includes(availableSearchTerm)
  );
}

function renderAvailableItems(items) {
  if (!items.length) {
    renderEmpty(availableList, 'Brak sprzętu pasującego do wyszukiwania.');
    return;
  }

  availableList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const node = availableTpl.content.cloneNode(true);
    const card = node.querySelector('.equipment-card');
    const image = node.querySelector('.equipment-image');
    const category = node.querySelector('.equipment-category');
    const title = node.querySelector('.equipment-title');
    const status = node.querySelector('.equipment-status');
    const code = node.querySelector('.equipment-code');
    const description = node.querySelector('.equipment-description');
    const tags = node.querySelector('.equipment-tags');
    const location = node.querySelector('.equipment-location');
    const condition = node.querySelector('.equipment-condition');
    const detailsBtn = node.querySelector('.details-btn');
    const requestBtn = node.querySelector('.request-btn');

    card.dataset.itemCode = item.itemCode || '';
    detailsBtn.dataset.itemCode = item.itemCode || '';
    requestBtn.dataset.itemCode = item.itemCode || '';

    image.src = getItemImage(item);
    image.alt = item.name ? `Zdjęcie: ${item.name}` : 'Zdjęcie sprzętu';
    image.addEventListener('error', () => {
      image.src = createPlaceholderImage(item);
    }, { once: true });

    category.textContent = item.category || 'Sprzęt';
    title.textContent = item.name || item.itemCode || 'Bez nazwy';
    status.textContent = getStatusLabel(item.operationalStatus);
    status.classList.add('badge-status');
    status.dataset.status = item.operationalStatus || '';

    code.textContent = `${item.itemCode || '-'}${item.brand ? ` · ${item.brand}` : ''}${item.model ? ` ${item.model}` : ''}`;
    description.textContent = item.details || 'Brak krótkiego opisu sprzętu.';
    location.textContent = item.currentLocation || 'Brak lokalizacji';
    condition.textContent = `stan: ${item.conditionStatus || '-'}`;

    renderTags(tags, item.tags);
    fragment.appendChild(node);
  });

  availableList.appendChild(fragment);
}

function refreshAvailableListView() {
  renderAvailableItems(getFilteredAvailableItems());
}

async function loadAvailableItems() {
  const items = await api('/items/available');

  availableItemsState = (Array.isArray(items) ? items : []).filter(item => {
    const assignedEmail = String(item.assignedToEmail || '').trim();
    const assignedName = String(item.assignedToName || '').trim();
    return !assignedEmail && !assignedName;
  });

  refreshAvailableListView();
}

async function openItemDetails(itemCode) {
  if (!itemCode || !itemDetailsModal) return;

  modalItemTitle.textContent = 'Ładowanie...';
  modalItemSubtitle.textContent = '';
  modalItemDetails.textContent = 'Pobieranie szczegółów sprzętu...';
  modalItemTags.innerHTML = '';
  modalActiveLoan.textContent = 'Ładowanie...';
  modalRequestBtn.disabled = true;

  if (!itemDetailsModal.open) itemDetailsModal.showModal();

  try {
    const item = await api(`/items/${encodeURIComponent(itemCode)}`);
    activeModalItem = item;

    modalItemImage.src = getItemImage(item);
    modalItemImage.alt = item.name ? `Zdjęcie: ${item.name}` : 'Zdjęcie sprzętu';
    modalItemImage.onerror = () => {
      modalItemImage.src = createPlaceholderImage(item);
      modalItemImage.onerror = null;
    };

    modalItemStatus.textContent = getStatusLabel(item.operationalStatus);
    modalItemStatus.dataset.status = item.operationalStatus || '';
    modalItemCategory.textContent = item.category || 'Sprzęt';
    modalItemTitle.textContent = item.name || item.itemCode || 'Bez nazwy';
    modalItemSubtitle.textContent =
      [item.brand, item.model].filter(Boolean).join(' · ') || 'Brak dodatkowych danych producenta';

    modalItemCode.textContent = item.itemCode || '-';
    modalItemBrandModel.textContent = [item.brand, item.model].filter(Boolean).join(' / ') || '-';
    modalItemLocation.textContent = item.currentLocation || '-';
    modalItemCondition.textContent = item.conditionStatus || '-';
    modalItemQr.textContent = item.qrCodeValue || '-';
    modalItemAssigned.textContent =
      item.assignedToName || item.assignedToEmail
        ? `${item.assignedToName || ''}${item.assignedToName && item.assignedToEmail ? ' · ' : ''}${item.assignedToEmail || ''}`
        : 'Brak';
    modalItemDetails.textContent = item.details || 'Brak opisu.';

    renderTags(modalItemTags, item.tags);

    if (item.activeLoan) {
      modalActiveLoan.textContent =
        `Aktywne od ${formatDate(item.activeLoan.borrowedAt)} · użytkownik: ${item.activeLoan.userEmail || '-'} · miejsce użycia: ${item.activeLoan.targetUseLocation || '-'}`;
    } else {
      modalActiveLoan.textContent = 'Brak aktywnego wypożyczenia.';
    }

    modalRequestBtn.disabled = item.operationalStatus !== 'available';
  } catch (err) {
    activeModalItem = null;
    modalItemTitle.textContent = 'Nie udało się pobrać szczegółów';
    modalItemSubtitle.textContent = '';
    modalItemDetails.textContent = err.message || 'Wystąpił błąd.';
    modalItemTags.innerHTML = '<span class="muted">Brak danych</span>';
    modalActiveLoan.textContent = 'Brak danych.';
    modalRequestBtn.disabled = true;
    showToast(err.message);
  }
}

function closeItemDetails() {
  if (itemDetailsModal?.open) itemDetailsModal.close();
  activeModalItem = null;
}

async function loadSession() {
  try {
    const session = await api('/me');
    currentUser = session.user;
    showApp();
    renderAuthBox();
    applyRoleVisibility(currentUser);

    if (currentUser.role === 'admin') {
      await refreshStats();
      await loadAdminItems();
    } else if (currentUser.role === 'manager') {
      await refreshAll();
      await handleViewChange('approvals');
    } else {
      await refreshAll();
      await handleViewChange('available');
    }

    await refreshActionBadge();
    startActionBadgePolling();
  } catch {
    currentUser = null;
    showLoginGate();
    renderAuthBox();
    setActionBadge(0);
    stats.innerHTML = '';
    if (viewSwitcher) viewSwitcher.hidden = true;
    if (adminSection) adminSection.hidden = true;
    if (adminQuickActions) adminQuickActions.hidden = true;
    if (requestFormCard) requestFormCard.hidden = true;
  }
}

async function loadMyRequests() {
  const requests = await api('/my/loan-requests');

  if (!requests.length) {
    return renderEmpty(myRequestsList, 'Nie masz jeszcze żadnych wniosków.');
  }

  myRequestsList.innerHTML = '';

  requests.forEach(req => {
    const node = requestTpl.content.cloneNode(true);
    fillRequestNode(node, req, { withRequester: false });
    appendDecisionNote(node, req);

    const badge = node.querySelector('.request-status');
    badge.textContent = getRequestStatusLabel(req.status);
    badge.dataset.status = req.status || '';

    const cancelBtn = node.querySelector('.cancel-request-btn');
    if (!isCancelableStatus(req.status)) {
      cancelBtn.remove();
    } else {
      cancelBtn.addEventListener('click', async () => {
        try {
          await api(`/my/loan-requests/${req._id}/cancel`, { method: 'POST' });
          showToast(`Anulowano wniosek: ${req.itemCode}`);
          await refreshAll();
          await loadMyRequests();
        } catch (err) {
          showToast(err.message);
        }
      });
    }

    myRequestsList.appendChild(node);
  });
}

async function loadMyLoans() {
  const [items, locations] = await Promise.all([
    api('/my/items'),
    ensureLocations()
  ]);

  if (!items.length) {
    return renderEmpty(myLoansList, 'Nie masz nic do oddania.');
  }

  myLoansList.innerHTML = '';

  items.forEach(item => {
    const node = loanTpl.content.cloneNode(true);
    node.querySelector('.item-title').textContent =
      `${item.name || item.itemCode} (${item.itemCode})`;
    node.querySelector('.item-meta').textContent =
      `${item.category || 'Sprzęt'} · lokalizacja: ${item.currentLocation || '-'} · stan: ${item.conditionStatus || '-'}`;

    const form = node.querySelector('.return-form');
    const locationSelect = node.querySelector('.return-location');
    const noteInput = node.querySelector('.return-note');

    locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc;
      opt.textContent = loc;
      locationSelect.appendChild(opt);
    });
    if (locations.includes('Magazyn')) locationSelect.value = 'Magazyn';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        await api(`/items/${encodeURIComponent(item.itemCode)}/return`, {
          method: 'POST',
          body: JSON.stringify({
            returnLocation: locationSelect.value || 'Magazyn',
            returnNote: noteInput.value.trim()
          })
        });

        showToast(`Oddano: ${item.itemCode}`);
        await refreshAll();
        await loadMyLoans();
      } catch (err) {
        showToast(err.message);
      }
    });

    myLoansList.appendChild(node);
  });
}

function renderTable(rows, columns) {
  if (!rows.length) return '<div class="empty">Brak danych.</div>';

  const head = columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('');
  const body = rows.map(row => `
    <tr>
      ${columns.map(col => `<td>${escapeHtml(row[col.key] ?? '')}</td>`).join('')}
    </tr>
  `).join('');

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

async function loadAdminItems() {
  if (currentUser?.role !== 'admin') return;
  hideAuditFilters();

  const items = await api('/admin/items');

  if (!items.length) {
    adminContent.innerHTML = '<div class="empty">Brak sprzętu w magazynie.</div>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Kod</th>
        <th>Kategoria</th>
        <th>Nazwa</th>
        <th>Status</th>
        <th>Lokalizacja</th>
        <th>Stan tech.</th>
        <th>Przypisany do</th>
        <th>Akcje</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');

  items.forEach(item => {
    const tr = document.createElement('tr');

    [
      item.itemCode || '-',
      item.category || '-',
      item.name || '-',
      getStatusLabel(item.operationalStatus),
      item.currentLocation || '-',
      item.conditionStatus || '-',
      item.assignedToEmail || '—'
    ].forEach(text => {
      const td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    });

    const actionsTd = document.createElement('td');
    const discardBtn = document.createElement('button');
    discardBtn.type = 'button';
    discardBtn.className = 'btn btn-danger';
    discardBtn.textContent = 'Wyrzuć';
    discardBtn.addEventListener('click', async () => {
      const reason = prompt(
        `Wycofać „${item.name || item.itemCode}” (${item.itemCode}) z magazynu?\n` +
        'Podaj powód — zostanie zapisany w historii (np. zepsute, zgubione):',
        'zepsute'
      );
      if (reason === null) return; // anulowano

      try {
        await api(`/admin/items/${item._id}/discard`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() || 'Wycofano' })
        });
        showToast(`Wycofano sprzęt: ${item.itemCode}`);
        await loadAdminItems();
        await refreshStats();
      } catch (err) {
        showToast(err.message);
      }
    });
    actionsTd.appendChild(discardBtn);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  adminContent.innerHTML = '';
  adminContent.appendChild(table);
}

async function loadAdminLoans(status = 'active') {
  if (currentUser?.role !== 'admin') return;
  hideAuditFilters();

  const loans = await api(`/admin/loans?status=${encodeURIComponent(status)}`);
  const rows = (Array.isArray(loans) ? loans : []).map(loan => ({
    ...loan,
    borrowedAtLabel: formatDate(loan.borrowedAt),
    returnedAtLabel: formatDate(loan.returnedAt)
  }));

  if (!rows.length) {
    adminContent.innerHTML = `<div class="empty">${status === 'returned' ? 'Brak zwrotów.' : 'Brak aktywnych wypożyczeń.'}</div>`;
    return;
  }

  const columns = status === 'returned'
    ? [
        { key: 'itemCode', label: 'Kod sprzętu' },
        { key: 'userEmail', label: 'Użytkownik' },
        { key: 'borrowedAtLabel', label: 'Wypożyczono' },
        { key: 'returnedAtLabel', label: 'Zwrócono' },
        { key: 'returnLocation', label: 'Zwrot do' },
        { key: 'returnNote', label: 'Notatka zwrotu' }
      ]
    : [
        { key: 'itemCode', label: 'Kod sprzętu' },
        { key: 'userEmail', label: 'Użytkownik' },
        { key: 'fromLocation', label: 'Skąd' },
        { key: 'targetUseLocation', label: 'Gdzie używane' },
        { key: 'borrowedAtLabel', label: 'Wypożyczono' }
      ];

  adminContent.innerHTML = renderTable(rows, columns);
}

async function loadAdminRequests() {
  if (currentUser?.role !== 'admin') return;
  hideAuditFilters();

  const all = await api('/admin/loan-requests');
  const requests = (Array.isArray(all) ? all : []).filter(req => isCancelableStatus(req.status));

  if (!requests.length) {
    adminContent.innerHTML = '<div class="empty">Brak wniosków w obiegu.</div>';
    return;
  }

  adminContent.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'list';

  requests.forEach(req => {
    const node = adminRequestTpl.content.cloneNode(true);
    fillRequestNode(node, req, { withRequester: true });
    appendDecisionNote(node, req);

    // Etap 1 (czeka na kierownika) – administracja jeszcze nie realizuje wydania.
    if (req.status === 'pending_manager') {
      node.querySelector('.admin-request-form')?.remove();
      const waiting = document.createElement('p');
      waiting.className = 'item-meta muted';
      waiting.textContent = `Czeka na akceptację kierownika: ${req.approverEmail || '-'}`;
      node.querySelector('.item-row')?.appendChild(waiting);
      wrap.appendChild(node);
      return;
    }

    const noteInput = node.querySelector('.decision-note');
    const approveBtn = node.querySelector('.approve-btn');
    const rejectBtn = node.querySelector('.reject-btn');

    approveBtn.textContent = req.kind === 'purchase' ? 'Zatwierdź zakup' : 'Wydaj sprzęt';

    approveBtn.addEventListener('click', async () => {
      try {
        await api(`/admin/loan-requests/${req._id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ decisionNote: noteInput.value || '' })
        });

        showToast(req.kind === 'purchase'
          ? 'Zatwierdzono zakup — do zamówienia'
          : `Wydano sprzęt: ${req.itemCode}`);
        await refreshStats();
        await loadAdminRequests();
        await refreshActionBadge();
      } catch (err) {
        showToast(err.message);
      }
    });

    rejectBtn.addEventListener('click', async () => {
      try {
        await api(`/admin/loan-requests/${req._id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ decisionNote: noteInput.value || '' })
        });

        showToast(`Odrzucono wniosek: ${req.itemCode}`);
        await refreshStats();
        await loadAdminRequests();
        await refreshActionBadge();
      } catch (err) {
        showToast(err.message);
      }
    });

    wrap.appendChild(node);
  });

  adminContent.appendChild(wrap);
}

// Konfiguracja przycisku akcji w „Wymagane działania" zależnie od etapu i typu
// wniosku. Zwraca etykietę, endpoint akceptacji oraz (opcjonalnie) odrzucenia.
function getActionConfig(req) {
  const id = req._id;

  if (req.status === 'pending_manager') {
    return {
      approveLabel: 'Przekaż do administracji',
      approveUrl: `/manager/loan-requests/${id}/approve`,
      rejectUrl: `/manager/loan-requests/${id}/reject`,
      successMsg: 'Przekazano do administracji'
    };
  }

  if (req.kind === 'purchase') {
    if (req.status === 'to_order') {
      return {
        approveLabel: 'Oznacz jako zamówiony',
        approveUrl: `/admin/purchase-requests/${id}/order`,
        rejectUrl: null,
        successMsg: 'Oznaczono jako zamówiony'
      };
    }
    if (req.status === 'ordered') {
      return {
        approveLabel: 'Dodaj do magazynu',
        approveUrl: `/admin/purchase-requests/${id}/stock`,
        rejectUrl: null,
        successMsg: 'Dodano do magazynu i przypisano wnioskodawcy'
      };
    }
    // pending_admin / pending — pierwsza decyzja administracji o zakupie.
    return {
      approveLabel: 'Zatwierdź zakup',
      approveUrl: `/admin/loan-requests/${id}/approve`,
      rejectUrl: `/admin/loan-requests/${id}/reject`,
      successMsg: 'Zatwierdzono — do zamówienia'
    };
  }

  // Wypożyczenie na etapie administracji.
  return {
    approveLabel: 'Wydaj sprzęt',
    approveUrl: `/admin/loan-requests/${id}/approve`,
    rejectUrl: `/admin/loan-requests/${id}/reject`,
    successMsg: 'Wydano sprzęt'
  };
}

// Zunifikowana lista „Wymagane działania". Każdy wniosek dostaje przyciski
// zależne od etapu i typu (wypożyczenie / zakup). Endpointy pilnują uprawnień.
async function loadActionItems() {
  const role = currentUser?.role;
  if (role !== 'manager' && role !== 'admin') return;

  const requests = await api('/my/action-items');
  setActionBadge(Array.isArray(requests) ? requests.length : 0);

  if (!requests.length) {
    return renderEmpty(managerRequestsList, 'Brak wniosków wymagających Twojej decyzji.');
  }

  managerRequestsList.innerHTML = '';

  requests.forEach(req => {
    const node = adminRequestTpl.content.cloneNode(true);
    fillRequestNode(node, req, { withRequester: true });
    appendDecisionNote(node, req);

    const noteInput = node.querySelector('.decision-note');
    const approveBtn = node.querySelector('.approve-btn');
    const rejectBtn = node.querySelector('.reject-btn');

    const cfg = getActionConfig(req);
    approveBtn.textContent = cfg.approveLabel;

    approveBtn.addEventListener('click', async () => {
      try {
        await api(cfg.approveUrl, {
          method: 'POST',
          body: JSON.stringify({ decisionNote: noteInput.value || '' })
        });

        showToast(cfg.successMsg);
        await loadActionItems();
        await refreshStats();
      } catch (err) {
        showToast(err.message);
      }
    });

    if (cfg.rejectUrl) {
      rejectBtn.addEventListener('click', async () => {
        try {
          await api(cfg.rejectUrl, {
            method: 'POST',
            body: JSON.stringify({ decisionNote: noteInput.value || '' })
          });

          showToast('Wniosek odrzucony');
          await loadActionItems();
          await refreshStats();
        } catch (err) {
          showToast(err.message);
        }
      });
    } else {
      rejectBtn.remove();
    }

    managerRequestsList.appendChild(node);
  });
}

function getRoleLabel(role) {
  switch (role) {
    case 'admin': return 'Administrator';
    case 'manager': return 'Kierownik';
    default: return 'Użytkownik';
  }
}

async function patchUser(email, body) {
  return api(`/admin/users/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

async function loadUsers() {
  if (currentUser?.role !== 'admin') return;
  hideAuditFilters();

  const users = await api('/admin/users');

  if (!users.length) {
    usersContent.innerHTML = '<div class="empty">Brak użytkowników.</div>';
    return;
  }

  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Użytkownik</th>
        <th>E-mail</th>
        <th>Rola</th>
        <th>Wnioski trafiają do</th>
        <th>Akcje</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');

  users.forEach(user => {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = user.fullName || '—';

    const emailTd = document.createElement('td');
    emailTd.textContent = user.email;

    // Rola
    const roleTd = document.createElement('td');
    const roleSelect = document.createElement('select');
    [['user', 'Użytkownik'], ['manager', 'Kierownik'], ['admin', 'Administrator']].forEach(([value, label]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if ((user.role || 'user') === value) opt.selected = true;
      roleSelect.appendChild(opt);
    });
    roleSelect.addEventListener('change', async () => {
      try {
        await patchUser(user.email, { role: roleSelect.value });
        showToast(`Zmieniono rolę: ${user.email}`);
        await loadUsers(); // zmiana ról wpływa na listę dostępnych kierowników
      } catch (err) {
        showToast(err.message);
        roleSelect.value = user.role || 'user';
      }
    });
    roleTd.appendChild(roleSelect);

    // Kierownik, do którego trafiają wnioski tego użytkownika
    const mgrTd = document.createElement('td');
    const mgrSelect = document.createElement('select');
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '— bezpośrednio do administracji —';
    mgrSelect.appendChild(noneOpt);

    managers
      .filter(m => m.email !== user.email)
      .forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.email;
        opt.textContent = `${m.fullName || m.email} (${getRoleLabel(m.role)})`;
        if ((user.managerEmail || '') === m.email) opt.selected = true;
        mgrSelect.appendChild(opt);
      });

    mgrSelect.addEventListener('change', async () => {
      try {
        await patchUser(user.email, { managerEmail: mgrSelect.value });
        showToast(`Zaktualizowano routing wniosków: ${user.email}`);
      } catch (err) {
        showToast(err.message);
        mgrSelect.value = user.managerEmail || '';
      }
    });
    mgrTd.appendChild(mgrSelect);

    // Akcje — usuwanie użytkownika (nie można usunąć samego siebie)
    const actionsTd = document.createElement('td');
    if (user.email === currentUser?.email) {
      actionsTd.innerHTML = '<span class="muted">—</span>';
    } else {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = 'Usuń';
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Usunąć użytkownika ${user.email}? Tej operacji nie można cofnąć.`)) return;
        try {
          await api(`/admin/users/${encodeURIComponent(user.email)}`, { method: 'DELETE' });
          showToast(`Usunięto: ${user.email}`);
          await loadUsers();
        } catch (err) {
          showToast(err.message);
        }
      });
      actionsTd.appendChild(delBtn);
    }

    tr.append(nameTd, emailTd, roleTd, mgrTd, actionsTd);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  usersContent.innerHTML = '';
  usersContent.appendChild(table);
}

// Słownik akcji po polsku — historia ma być zrozumiała dla laika.
const AUDIT_ACTION_LABELS = {
  loan_request_created: 'Złożył wniosek o wypożyczenie',
  purchase_request_created: 'Złożył wniosek o zakup',
  loan_request_cancelled: 'Anulował swój wniosek',
  loan_request_manager_approved: 'Zaakceptował wniosek (jako kierownik)',
  loan_request_manager_rejected: 'Odrzucił wniosek (jako kierownik)',
  loan_request_approved: 'Zatwierdził wniosek i wydał sprzęt',
  loan_request_rejected: 'Odrzucił wniosek',
  purchase_request_approved: 'Zatwierdził zakup (do zamówienia)',
  purchase_request_ordered: 'Oznaczył zakup jako zamówiony',
  purchase_request_stocked: 'Dodał zakup do magazynu i przypisał wnioskodawcy',
  loan_created: 'Utworzył wypożyczenie',
  loan_returned: 'Przyjął zwrot sprzętu',
  item_created: 'Dodał sprzęt',
  item_updated: 'Zaktualizował sprzęt',
  item_deactivated: 'Wycofał sprzęt',
  item_discarded: 'Wyrzucił sprzęt z magazynu',
  user_updated: 'Zmienił ustawienia użytkownika',
  user_deleted: 'Usunął użytkownika'
};

// Czego dotyczyła akcja — sprzęt, zakup lub inny użytkownik.
function getAuditSubject(log) {
  const p = log.payload || {};
  if (p.itemName && p.itemCode) return `${p.itemName} (${p.itemCode})`;
  if (p.itemCode) return p.itemCode;
  if (p.itemName) return p.itemName;
  if (p.email) return p.email;
  if (p.requesterEmail) return p.requesterEmail;
  if (log.entityType === 'user' && log.entityId) return log.entityId;
  return '';
}

function describeAudit(log) {
  const label = AUDIT_ACTION_LABELS[log.actionType] || log.actionType || 'Wykonał akcję';
  const subject = getAuditSubject(log);
  const reason = log.payload?.reason ? ` (${log.payload.reason})` : '';
  return subject ? `${label} — ${subject}${reason}` : `${label}${reason}`;
}

// Mapa e-mail -> imię i nazwisko, żeby w historii pokazać człowieka, nie adres.
async function getAuditUserNames() {
  try {
    const users = await api('/admin/users');
    const map = {};
    (Array.isArray(users) ? users : []).forEach(u => {
      if (u.email) map[u.email] = u.fullName || u.email;
    });
    return map;
  } catch {
    return {};
  }
}

async function loadAuditLogs(filters = {}) {
  if (currentUser?.role !== 'admin') return;

  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value).trim());
    }
  });

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const [logs, userNames] = await Promise.all([
    api(`/admin/audit-logs${suffix}`),
    getAuditUserNames()
  ]);

  if (!logs.length) {
    adminContent.innerHTML = '<div class="empty">Brak historii dla podanych filtrów.</div>';
    return;
  }

  adminContent.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Kiedy</th>
          <th>Użytkownik</th>
          <th>Co zrobił</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map(log => `
          <tr>
            <td>${log.createdAt ? new Date(log.createdAt).toLocaleString('pl-PL') : '-'}</td>
            <td>${escapeHtml(userNames[log.actorEmail] || log.actorEmail || '—')}</td>
            <td>${escapeHtml(describeAudit(log))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function refreshStats() {
  const [available, myItems, myRequests] = await Promise.all([
    api('/items/available'),
    api('/my/items'),
    api('/my/loan-requests')
  ]);

  renderStats({
    availableCount: available.length,
    myLoansCount: myItems.length,
    myRequestsCount: myRequests.length
  });
}

async function refreshAll() {
  const tasks = [refreshStats()];

  if (currentUser?.role === 'admin') {
    if (workspaceMode === 'admin') {
      tasks.push(loadAdminItems());
    } else {
      tasks.push(loadAvailableItems(), loadMyRequests(), loadMyLoans());
    }
  } else {
    tasks.push(loadAvailableItems(), loadMyRequests(), loadMyLoans());
  }

  await Promise.all(tasks);
}

viewTabs.forEach((tab) => {
  tab.addEventListener('click', async (e) => {
    const button = e.currentTarget;
    const view = button.dataset.view;

    if (view === 'admin' && currentUser?.role !== 'admin') return;
    if (view === 'users' && currentUser?.role !== 'admin') return;
    if (view === 'approvals' && !['manager', 'admin'].includes(currentUser?.role)) return;

    if (view === 'admin' || view === 'users') {
      workspaceMode = 'admin';
    } else {
      workspaceMode = 'user';
    }

    try {
      await handleViewChange(view);
    } catch (err) {
      showToast(err.message);
    }
  });
});

document.addEventListener('click', async (e) => {
  const target = e.target;

  if (target.id === 'loadAvailableBtn') {
    await withButtonLoading(target, () => handleViewChange('available')).catch(err => showToast(err.message));
  }

  if (target.id === 'loadMyRequestsBtn') {
    await withButtonLoading(target, () => handleViewChange('requests')).catch(err => showToast(err.message));
  }

  if (target.id === 'loadMyLoansBtn') {
    await withButtonLoading(target, () => handleViewChange('returns')).catch(err => showToast(err.message));
  }

  if (target.id === 'loadManagerRequestsBtn') {
    await withButtonLoading(target, () => handleViewChange('approvals')).catch(err => showToast(err.message));
  }

  if (target.id === 'loadUsersBtn') {
    await withButtonLoading(target, () => handleViewChange('users')).catch(err => showToast(err.message));
  }

  if (target.closest('.open-purchase-btn')) {
    openPurchaseModal();
  }

  if (target.id === 'loadAdminItemsBtn') {
    workspaceMode = 'admin';
    setActiveView('admin');
    await withButtonLoading(target, () => loadAdminItems()).catch(err => showToast(err.message));
  }

  if (target.id === 'loadAdminLoansBtn') {
    workspaceMode = 'admin';
    setActiveView('admin');
    await withButtonLoading(target, () => loadAdminLoans('active')).catch(err => showToast(err.message));
  }

  if (target.id === 'loadAdminReturnsBtn') {
    workspaceMode = 'admin';
    setActiveView('admin');
    await withButtonLoading(target, () => loadAdminLoans('returned')).catch(err => showToast(err.message));
  }

  if (target.id === 'loadAdminRequestsBtn') {
    workspaceMode = 'admin';
    setActiveView('admin');
    await withButtonLoading(target, () => loadAdminRequests()).catch(err => showToast(err.message));
  }

  if (target.id === 'loadAuditLogsBtn') {
    workspaceMode = 'admin';
    setActiveView('admin');
    showAuditFilters();
    await withButtonLoading(target, () => loadAuditLogs({ limit: 100 })).catch(err => showToast(err.message));
  }

  const detailsBtn = target.closest('.details-btn');
  if (detailsBtn) {
    const itemCode = detailsBtn.dataset.itemCode;
    await openItemDetails(itemCode);
  }

  const requestBtn = target.closest('.request-btn');
  if (requestBtn && !requestBtn.closest('#itemDetailsModal')) {
    const itemCode = requestBtn.dataset.itemCode;
    const item = availableItemsState.find(entry => entry.itemCode === itemCode);

    if (item) {
      openRequestForm(item);
      showToast(`Przygotowano wniosek: ${item.itemCode}`);
    }
  }
});

if (toggleWorkspaceBtn) {
  toggleWorkspaceBtn.addEventListener('click', async () => {
    const nextMode = workspaceMode === 'admin' ? 'user' : 'admin';
    setWorkspaceMode(nextMode);

    try {
      if (nextMode === 'admin') {
        await handleViewChange('admin');
      } else {
        await handleViewChange('available');
      }
    } catch (err) {
      showToast(err.message);
    }
  });
}

if (availableSearchInput) {
  let timer = null;

  availableSearchInput.addEventListener('input', (e) => {
    const nextValue = normalizeText(e.target.value);

    clearTimeout(timer);
    timer = setTimeout(() => {
      availableSearchTerm = nextValue;
      refreshAvailableListView();
    }, 120);
  });
}

if (loanRequestForm) {
  loanRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      itemCode: requestItemCode.value,
      purpose: purposeInput.value,
      targetUseLocation: targetUseLocationInput.value || 'Dom',
      requestedReturnDate: requestedReturnDateInput.value || null,
      note: requestNoteInput.value || ''
    };

    try {
      await api('/loan-requests', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showToast(`Wysłano wniosek: ${payload.itemCode}`);
      closeRequestForm();
      closeItemDetails();
      await refreshAll();
      await loadMyRequests();
      setActiveView('requests');
    } catch (err) {
      showToast(err.message);
    }
  });
}

if (cancelRequestFormBtn) {
  cancelRequestFormBtn.addEventListener('click', () => {
    closeRequestForm();
  });
}

// ===== Modal dodawania sprzętu (listy rozwijane) =====

let formOptionsState = null;

function fillSelect(select, options, { includeEmpty } = {}) {
  if (!select) return;
  select.innerHTML = '';

  if (includeEmpty) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = includeEmpty;
    select.appendChild(opt);
  }

  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });
}

async function ensureFormOptions() {
  if (formOptionsState) return formOptionsState;

  const data = await api('/admin/form-options');
  formOptionsState = data;

  const categoryOptions = (data.categories || []).map(c => ({ value: c, label: c }));
  categoryOptions.push({ value: '__custom__', label: '+ Nowa kategoria...' });
  fillSelect(addItemCategory, categoryOptions);

  fillSelect(addItemLocation, (data.locations || []).map(l => ({ value: l, label: l })));
  fillSelect(addItemCondition, (data.conditions || []).map(c => ({ value: c.value, label: c.label })));
  fillSelect(
    addItemAssignee,
    (data.users || []).map(u => ({ value: u.email, label: `${u.fullName} (${u.email})` })),
    { includeEmpty: '— nieprzypisany —' }
  );

  return formOptionsState;
}

function syncCategoryCustom() {
  if (!addItemCategory || !addItemCategoryCustomField) return;
  const isCustom = addItemCategory.value === '__custom__';
  addItemCategoryCustomField.hidden = !isCustom;
  if (addItemCategoryCustom) addItemCategoryCustom.required = isCustom;
}

function syncAssignHint() {
  if (!addItemAssignee || !addItemAssignHint) return;
  addItemAssignHint.hidden = !addItemAssignee.value;
}

async function openAddItemModal() {
  if (!addItemModal) return;

  try {
    await ensureFormOptions();
  } catch (err) {
    showToast(err.message);
    return;
  }

  if (addItemForm) addItemForm.reset();
  syncCategoryCustom();
  syncAssignHint();

  if (!addItemModal.open) addItemModal.showModal();
}

function closeAddItemModal() {
  if (addItemModal?.open) addItemModal.close();
}

if (openAddItemBtn) openAddItemBtn.addEventListener('click', openAddItemModal);
if (closeAddItemBtn) closeAddItemBtn.addEventListener('click', closeAddItemModal);
if (cancelAddItemBtn) cancelAddItemBtn.addEventListener('click', closeAddItemModal);
if (addItemCategory) addItemCategory.addEventListener('change', syncCategoryCustom);
if (addItemAssignee) addItemAssignee.addEventListener('change', syncAssignHint);

if (addItemForm) {
  addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(addItemForm);
    const payload = Object.fromEntries(formData.entries());

    if (payload.category === '__custom__') {
      payload.category = (addItemCategoryCustom?.value || '').trim();
    }

    if (!payload.category) {
      showToast('Podaj kategorię sprzętu');
      return;
    }

    try {
      await api('/admin/items', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showToast(payload.assignedToEmail ? 'Dodano sprzęt i utworzono wypożyczenie' : 'Dodano sprzęt');
      formOptionsState = null; // odśwież listy (np. nowa kategoria) przy kolejnym otwarciu
      closeAddItemModal();
      await loadAdminItems();
      await refreshStats();
    } catch (err) {
      showToast(err.message);
    }
  });
}

// ===== Modal „Poproś o nowy sprzęt" (wniosek o zakup) =====

function openPurchaseModal() {
  if (!purchaseModal) return;
  if (purchaseForm) purchaseForm.reset();
  if (!purchaseModal.open) purchaseModal.showModal();
}

function closePurchaseModal() {
  if (purchaseModal?.open) purchaseModal.close();
}

if (closePurchaseBtn) closePurchaseBtn.addEventListener('click', closePurchaseModal);
if (cancelPurchaseBtn) cancelPurchaseBtn.addEventListener('click', closePurchaseModal);

if (purchaseForm) {
  purchaseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(purchaseForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      await api('/purchase-requests', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showToast('Wysłano wniosek o zakup');
      closePurchaseModal();
      await refreshAll();
      await loadMyRequests();
      setActiveView('requests');
    } catch (err) {
      showToast(err.message);
    }
  });
}

if (auditFilterForm) {
  auditFilterForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(auditFilterForm);
    const filters = Object.fromEntries(formData.entries());

    try {
      await loadAuditLogs(filters);
    } catch (err) {
      showToast(err.message);
    }
  });
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', () => {
    closeItemDetails();
  });
}

if (closeItemDetailsModalBtn) {
  closeItemDetailsModalBtn.addEventListener('click', () => {
    closeItemDetails();
  });
}

if (modalRequestBtn) {
  modalRequestBtn.addEventListener('click', () => {
    if (!activeModalItem) return;
    openRequestForm(activeModalItem);
    closeItemDetails();
    showToast(`Przygotowano wniosek: ${activeModalItem.itemCode}`);
  });
}

if (itemDetailsModal) {
  itemDetailsModal.addEventListener('click', (e) => {
    const rect = itemDetailsModal.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      closeItemDetails();
    }
  });

  itemDetailsModal.addEventListener('close', () => {
    activeModalItem = null;
  });
}

function setupViewSwitcher(defaultView = 'available') {
  if (!viewSwitcher) return;
  viewSwitcher.hidden = false;
  setActiveView(defaultView);
}

setupViewSwitcher('available');
loadSession().catch(err => showToast(err.message));