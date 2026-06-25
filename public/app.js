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
const addUserBtn = document.getElementById('addUserBtn');
const addUserForm = document.getElementById('addUserForm');
const newUserManager = document.getElementById('newUserManager');
const cancelAddUserBtn = document.getElementById('cancelAddUserBtn');

const teamViewTab = document.getElementById('teamViewTab');
const teamContent = document.getElementById('teamContent');

const reportsContent = document.getElementById('reportsContent');

// Skrzynka: pod-zakładki „Prośby" / „Zgłoszenia" w jednym widoku.
const inboxTitle = document.getElementById('inboxTitle');
const requestsSubview = document.getElementById('requestsSubview');
const reportsSubview = document.getElementById('reportsSubview');
const reportsSubtab = document.getElementById('reportsSubtab');
const requestsCount = document.getElementById('requestsCount');
const reportsCount = document.getElementById('reportsCount');

const openAddItemBtn = document.getElementById('openAddItemBtn');
const addItemModal = document.getElementById('addItemModal');
const addItemForm = document.getElementById('addItemForm');
const addItemModalTitle = document.getElementById('addItemModalTitle');
const addItemSubmitBtn = document.getElementById('addItemSubmitBtn');
const closeAddItemBtn = document.getElementById('closeAddItemBtn');
const cancelAddItemBtn = document.getElementById('cancelAddItemBtn');
const addItemCategory = document.getElementById('addItemCategory');
const addItemCategoryCustomField = document.getElementById('addItemCategoryCustomField');
const addItemCategoryCustom = document.getElementById('addItemCategoryCustom');
const addItemLocation = document.getElementById('addItemLocation');
const addItemCondition = document.getElementById('addItemCondition');
const addItemAssigneeField = document.getElementById('addItemAssigneeField');
const addItemAssignee = document.getElementById('addItemAssignee');
const addItemStatusField = document.getElementById('addItemStatusField');
const addItemStatus = document.getElementById('addItemStatus');
const addItemAssignHint = document.getElementById('addItemAssignHint');

const discardItemModal = document.getElementById('discardItemModal');
const discardItemForm = document.getElementById('discardItemForm');
const discardItemTarget = document.getElementById('discardItemTarget');
const discardOtherField = document.getElementById('discardOtherField');
const discardOtherInput = document.getElementById('discardOtherInput');
const closeDiscardBtn = document.getElementById('closeDiscardBtn');
const cancelDiscardBtn = document.getElementById('cancelDiscardBtn');

const transferItemModal = document.getElementById('transferItemModal');
const transferItemForm = document.getElementById('transferItemForm');
const transferItemTarget = document.getElementById('transferItemTarget');
const transferAssignee = document.getElementById('transferAssignee');
const transferNote = document.getElementById('transferNote');
const transferEyebrow = document.getElementById('transferEyebrow');
const closeTransferBtn = document.getElementById('closeTransferBtn');
const cancelTransferBtn = document.getElementById('cancelTransferBtn');

const reportIssueModal = document.getElementById('reportIssueModal');
const reportIssueForm = document.getElementById('reportIssueForm');
const reportIssueTarget = document.getElementById('reportIssueTarget');
const reportIssueType = document.getElementById('reportIssueType');
const reportIssueMessage = document.getElementById('reportIssueMessage');
const closeReportIssueBtn = document.getElementById('closeReportIssueBtn');
const cancelReportIssueBtn = document.getElementById('cancelReportIssueBtn');

const purchaseModal = document.getElementById('purchaseModal');
const purchaseForm = document.getElementById('purchaseForm');
const closePurchaseBtn = document.getElementById('closePurchaseBtn');
const cancelPurchaseBtn = document.getElementById('cancelPurchaseBtn');

const importItemsModal = document.getElementById('importItemsModal');
const importCsvFile = document.getElementById('importCsvFile');
const importPreview = document.getElementById('importPreview');
const importResult = document.getElementById('importResult');
const importSubmitBtn = document.getElementById('importSubmitBtn');
const closeImportBtn = document.getElementById('closeImportBtn');
const cancelImportBtn = document.getElementById('cancelImportBtn');
const downloadCsvTemplateBtn = document.getElementById('downloadCsvTemplate');

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
const modalItemBrandModel = document.getElementById('modalItemBrandModel');
const modalItemLocation = document.getElementById('modalItemLocation');
const modalItemCondition = document.getElementById('modalItemCondition');
const modalItemSerial = document.getElementById('modalItemSerial');
const modalItemAssigned = document.getElementById('modalItemAssigned');
const modalItemDetails = document.getElementById('modalItemDetails');
const modalItemTags = document.getElementById('modalItemTags');
const modalActiveLoan = document.getElementById('modalActiveLoan');
const modalHistoryBlock = document.getElementById('modalHistoryBlock');
const modalItemHistory = document.getElementById('modalItemHistory');
const modalRequestBtn = document.getElementById('modalRequestBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const closeItemDetailsModalBtn = document.getElementById('closeItemDetailsModalBtn');

const viewSwitcher = document.getElementById('viewSwitcher');
const adminViewTab = document.getElementById('adminViewTab');
const viewTabs = Array.from(document.querySelectorAll('.view-tab'));
const viewPanels = Array.from(document.querySelectorAll('.view-panel'));

// Magazyn „w stylu Odoo" (Faza 2 – układ: Przegląd/Operacje/Produkty/Raportowanie/Konfiguracja).
const warehouseViewTab = document.getElementById('warehouseViewTab');
const warehouseSummary = document.getElementById('warehouseSummary');
const whOverviewView = document.getElementById('whOverviewView');
const whOverviewContent = document.getElementById('whOverviewContent');
const whOperationsView = document.getElementById('whOperationsView');
const whOpTypeNav = document.getElementById('whOpTypeNav');
const whNewOperationBtn = document.getElementById('whNewOperationBtn');
const whOperationsContent = document.getElementById('whOperationsContent');
const whProductsView = document.getElementById('whProductsView');
const whProductsSearch = document.getElementById('whProductsSearch');
const whProductsContent = document.getElementById('whProductsContent');
const whProductsExport = document.getElementById('whProductsExport');
// Okno produktu Magazynu (edycja + partie cenowe).
const warehouseProductModal = document.getElementById('warehouseProductModal');
const warehouseProductForm = document.getElementById('warehouseProductForm');
const whProductTitle = document.getElementById('whProductTitle');
const whProductCode = document.getElementById('whProductCode');
const whProductCodeInput = document.getElementById('whProductCodeInput');
const whProductName = document.getElementById('whProductName');
const whProductCategory = document.getElementById('whProductCategory');
const whProductBrand = document.getElementById('whProductBrand');
const whProductModel = document.getElementById('whProductModel');
const whProductNotes = document.getElementById('whProductNotes');
const whBatchesList = document.getElementById('whBatchesList');
const whBatchesTotal = document.getElementById('whBatchesTotal');
const whProductHistoryContent = document.getElementById('whProductHistoryContent');
const whAddBatchBtn = document.getElementById('whAddBatchBtn');
const whProductSaveBtn = document.getElementById('whProductSaveBtn');
const whProductCancelBtn = document.getElementById('whProductCancelBtn');
const closeWhProductBtn = document.getElementById('closeWhProductBtn');
whAddBatchBtn?.addEventListener('click', () => { addBatchRow(); recomputeBatchTotals(); });
whProductSaveBtn?.addEventListener('click', saveWarehouseProduct);
whProductCancelBtn?.addEventListener('click', closeWarehouseProductModal);
closeWhProductBtn?.addEventListener('click', closeWarehouseProductModal);
warehouseProductForm?.addEventListener('submit', (e) => { e.preventDefault(); saveWarehouseProduct(); });
const whReportingView = document.getElementById('whReportingView');
const whReportStock = document.getElementById('whReportStock');
const whReportValuation = document.getElementById('whReportValuation');
const whReportMoves = document.getElementById('whReportMoves');
const whReportPeriod = document.getElementById('whReportPeriod');
const whConfigView = document.getElementById('whConfigView');
// Raportowanie / Konfiguracja — kontenery reużyte z Fazy 1.
const warehouseStockContent = document.getElementById('warehouseStockContent');
const warehouseLocationsContent = document.getElementById('warehouseLocationsContent');
const warehouseMovesContent = document.getElementById('warehouseMovesContent');
const warehouseSearchInput = document.getElementById('warehouseSearchInput');
const warehouseLocationFilter = document.getElementById('warehouseLocationFilter');
const whStockExport = document.getElementById('whStockExport');
const whMovesExport = document.getElementById('whMovesExport');
const whValuationSearch = document.getElementById('whValuationSearch');
const whValuationExport = document.getElementById('whValuationExport');
const whValuationSummary = document.getElementById('whValuationSummary');
const whValuationContent = document.getElementById('whValuationContent');
const whPeriodFrom = document.getElementById('whPeriodFrom');
const whPeriodTo = document.getElementById('whPeriodTo');
const whPeriodKind = document.getElementById('whPeriodKind');
const whPeriodExport = document.getElementById('whPeriodExport');
const whPeriodSummary = document.getElementById('whPeriodSummary');
const whPeriodContent = document.getElementById('whPeriodContent');
// Modal operacji.
const operationModal = document.getElementById('operationModal');
const operationModalType = document.getElementById('operationModalType');
const operationModalTitle = document.getElementById('operationModalTitle');
const operationFromField = document.getElementById('operationFromField');
const operationToField = document.getElementById('operationToField');
const operationFrom = document.getElementById('operationFrom');
const operationTo = document.getElementById('operationTo');
const operationContact = document.getElementById('operationContact');
const operationContactField = document.getElementById('operationContactField');
const operationSupplierField = document.getElementById('operationSupplierField');
const operationSupplier = document.getElementById('operationSupplier');
const operationNewSupplierBtn = document.getElementById('operationNewSupplierBtn');
const operationDestinationField = document.getElementById('operationDestinationField');
const operationDestination = document.getElementById('operationDestination');
const operationNewDestinationBtn = document.getElementById('operationNewDestinationBtn');
const operationScheduled = document.getElementById('operationScheduled');
const operationSource = document.getElementById('operationSource');
const operationNote = document.getElementById('operationNote');
const operationLinesHead = document.getElementById('operationLinesHead');
const operationLines = document.getElementById('operationLines');
const operationStockPanel = document.getElementById('operationStockPanel');
const operationAddLineBtn = document.getElementById('operationAddLineBtn');
const operationStateHint = document.getElementById('operationStateHint');
const operationSaveBtn = document.getElementById('operationSaveBtn');
const operationValidateBtn = document.getElementById('operationValidateBtn');
const operationReverseBtn = document.getElementById('operationReverseBtn');
const operationCancelOpBtn = document.getElementById('operationCancelOpBtn');
const operationCloseBtn2 = document.getElementById('operationCloseBtn2');
const closeOperationBtn = document.getElementById('closeOperationBtn');
// Modal reguły min-max (Zapotrzebowanie).
const reorderRuleModal = document.getElementById('reorderRuleModal');
const reorderRuleTitle = document.getElementById('reorderRuleTitle');
const reorderScope = document.getElementById('reorderScope');
const reorderScopeField = document.getElementById('reorderScopeField');
const reorderCategoryField = document.getElementById('reorderCategoryField');
const reorderCategory = document.getElementById('reorderCategory');
const reorderCategoryList = document.getElementById('reorderCategoryList');
const reorderItemField = document.getElementById('reorderItemField');
const reorderItem = document.getElementById('reorderItem');
const reorderMin = document.getElementById('reorderMin');
const reorderMax = document.getElementById('reorderMax');
const reorderActiveField = document.getElementById('reorderActiveField');
const reorderActive = document.getElementById('reorderActive');
const reorderNote = document.getElementById('reorderNote');
const reorderSaveBtn = document.getElementById('reorderSaveBtn');
const reorderDeleteBtn = document.getElementById('reorderDeleteBtn');
const reorderCancelBtn = document.getElementById('reorderCancelBtn');
const closeReorderRuleBtn = document.getElementById('closeReorderRuleBtn');
// Modal „Nowy produkt" (z poziomu przyjęcia).
const newProductModal = document.getElementById('newProductModal');
const newProductForm = document.getElementById('newProductForm');
const newProductName = document.getElementById('newProductName');
const newProductCategory = document.getElementById('newProductCategory');
const newProductSaveBtn = document.getElementById('newProductSaveBtn');
const newProductCancelBtn = document.getElementById('newProductCancelBtn');
const closeNewProductBtn = document.getElementById('closeNewProductBtn');
// Modal dostawcy + lista w Konfiguracji.
const supplierModal = document.getElementById('supplierModal');
const supplierForm = document.getElementById('supplierForm');
const supplierModalTitle = document.getElementById('supplierModalTitle');
const supplierName = document.getElementById('supplierName');
const supplierContact = document.getElementById('supplierContact');
const supplierNotes = document.getElementById('supplierNotes');
const supplierSaveBtn = document.getElementById('supplierSaveBtn');
const supplierDeleteBtn = document.getElementById('supplierDeleteBtn');
const supplierCancelBtn = document.getElementById('supplierCancelBtn');
const closeSupplierBtn = document.getElementById('closeSupplierBtn');
const warehouseSuppliersContent = document.getElementById('warehouseSuppliersContent');
const whAddSupplierBtn = document.getElementById('whAddSupplierBtn');
// Modal miejsca dostawy + lista w Konfiguracji.
const destinationModal = document.getElementById('destinationModal');
const destinationForm = document.getElementById('destinationForm');
const destinationModalTitle = document.getElementById('destinationModalTitle');
const destinationName = document.getElementById('destinationName');
const destinationContact = document.getElementById('destinationContact');
const destinationNotes = document.getElementById('destinationNotes');
const destinationSaveBtn = document.getElementById('destinationSaveBtn');
const destinationDeleteBtn = document.getElementById('destinationDeleteBtn');
const destinationCancelBtn = document.getElementById('destinationCancelBtn');
const closeDestinationBtn = document.getElementById('closeDestinationBtn');
const warehouseDestinationsContent = document.getElementById('warehouseDestinationsContent');
const whAddDestinationBtn = document.getElementById('whAddDestinationBtn');

const locationModal = document.getElementById('locationModal');
const locationForm = document.getElementById('locationForm');
const locationModalTitle = document.getElementById('locationModalTitle');
const locationName = document.getElementById('locationName');
const locationKind = document.getElementById('locationKind');
const locationParent = document.getElementById('locationParent');
const locationParentField = document.getElementById('locationParentField');
const locationHint = document.getElementById('locationHint');
const locationSaveBtn = document.getElementById('locationSaveBtn');
const locationDeleteBtn = document.getElementById('locationDeleteBtn');
const locationCancelBtn = document.getElementById('locationCancelBtn');
const closeLocationBtn = document.getElementById('closeLocationBtn');
const whAddLocationBtn = document.getElementById('whAddLocationBtn');

function createPlaceholderImage(item = {}) {
  const category = String(item.category || 'Sprzęt').trim();
  const label = String(item.name || category).trim();

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
let availableViewMode = localStorage.getItem('availableViewMode') === 'list' ? 'list' : 'gallery';
let activeModalItem = null;

// Magazyn: stan nawigacji + cache danych.
const WAREHOUSE_ROLES = ['viewer', 'manager', 'admin'];
let warehouseMenu = 'overview';
let warehouseReportView = 'stock';
let warehouseOpType = 'receipt';
let warehouseLocationsCache = null;
let warehouseFormData = null;
let warehouseProductsState = [];
// Wiersze aktualnie widoczne (po filtrze) — używane przez eksport CSV Magazynu.
let warehouseProductsFiltered = [];
let warehouseStockFiltered = [];
let warehouseMovesState = [];
// Wycena stanu: pełna odpowiedź z /warehouse/valuation + płaska lista produktów
// (po filtrze) używana do renderu i eksportu CSV.
let warehouseValuationState = null;
let warehouseValuationFiltered = [];
// Raport ruchów w okresie: pełna odpowiedź (podsumowanie + wiersze) do renderu/eksportu.
let warehouseMovesReportState = null;
let currentOperation = null;
let currentReorderRule = null;

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

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// --- CSV: eksport i import (Pakiet B) ---

// Pole CSV w cudzysłowach, gdy zawiera przecinek/cudzysłów/nową linię.
function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach(row => lines.push(row.map(csvEscape).join(',')));
  return lines.join('\r\n');
}

// Pobranie pliku CSV po stronie przeglądarki. BOM UTF-8, by Excel poprawnie
// odczytał polskie znaki.
function downloadCsv(filename, csvText) {
  const blob = new Blob(['﻿', csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvDateStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Parser CSV obsługujący cudzysłowy, przecinki i znaki nowej linii w polach.
function parseCsv(text) {
  const clean = String(text || '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];

    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }

  if (field.length || row.length) { row.push(field); rows.push(row); }

  return rows.filter(cells => cells.some(cell => String(cell).trim() !== ''));
}

// Nazwy kolumn (po polsku i po angielsku) → pola sprzętu. Klucze bez znaków
// diakrytycznych, bo nagłówki normalizujemy przez normalizeHeader().
const CSV_HEADER_ALIASES = {
  'kod': 'itemCode', 'kod sprzetu': 'itemCode', 'itemcode': 'itemCode',
  'nazwa': 'name', 'name': 'name',
  'kategoria': 'category', 'category': 'category',
  'ilosc': 'quantity', 'liczba': 'quantity', 'quantity': 'quantity',
  'lokalizacja': 'currentLocation', 'currentlocation': 'currentLocation', 'location': 'currentLocation',
  'stan': 'conditionStatus', 'stan techniczny': 'conditionStatus', 'conditionstatus': 'conditionStatus', 'condition': 'conditionStatus',
  'marka': 'brand', 'brand': 'brand',
  'model': 'model',
  'numer seryjny': 'serialNumber', 'serialnumber': 'serialNumber', 'serial': 'serialNumber',
  'gwarancja': 'warrantyUntil', 'gwarancja do': 'warrantyUntil', 'warrantyuntil': 'warrantyUntil', 'warranty': 'warrantyUntil',
  'lokalizacja szczegolowa': 'detailedLocation', 'detailedlocation': 'detailedLocation',
  'tagi': 'tags', 'tags': 'tags',
  'kod qr': 'qrCodeValue', 'qr': 'qrCodeValue', 'qrcodevalue': 'qrCodeValue',
  'uwagi': 'notes', 'notes': 'notes',
  'szczegoly': 'details', 'details': 'details', 'opis': 'details'
};

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replaceAll('ł', 'l'); // ł nie rozkłada się w NFD, więc zamieniamy ręcznie
}

// Z surowych wierszy CSV (pierwszy = nagłówek) buduje obiekty pól sprzętu.
function csvToItems(rows) {
  if (!rows.length) return { items: [], unknownHeaders: [] };

  const headerCells = rows[0];
  const fields = headerCells.map(cell => CSV_HEADER_ALIASES[normalizeHeader(cell)] || null);
  const unknownHeaders = headerCells.filter((_, i) => !fields[i]).map(h => String(h).trim()).filter(Boolean);

  const items = rows.slice(1).map(cells => {
    const obj = {};
    fields.forEach((field, i) => {
      if (field) obj[field] = String(cells[i] ?? '').trim();
    });
    return obj;
  });

  return { items, unknownHeaders };
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

// Stan techniczny: w bazie trzymamy wartość (np. 'very_good'), w UI pokazujemy
// polską etykietę. Mapa odpowiada ITEM_CONDITIONS z backendu (src/index.js).
const CONDITION_LABELS = {
  new: 'Nowy',
  very_good: 'Bardzo dobry',
  good: 'Dobry',
  ok: 'Zadowalający',
  poor: 'Wymaga uwagi',
  damaged: 'Uszkodzony',
  for_repair: 'Do naprawy'
};

function getConditionLabel(value) {
  if (!value) return '-';
  return CONDITION_LABELS[value] || value;
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
    titleEl.textContent = `${req.itemName || 'Sprzęt'}`;
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

// Renderuje listę komentarzy do wątku wniosku.
function renderComments(list, comments) {
  if (!Array.isArray(comments) || !comments.length) {
    list.innerHTML = '<p class="muted">Brak komentarzy. Napisz pierwszy.</p>';
    return;
  }

  list.innerHTML = '';
  comments.forEach(c => {
    const entry = document.createElement('div');
    entry.className = 'comment-entry';
    const when = c.createdAt ? new Date(c.createdAt).toLocaleString('pl-PL') : '';

    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    meta.innerHTML = `<strong>${escapeHtml(c.authorName || c.authorEmail || '—')}</strong> <span class="muted">${escapeHtml(when)}</span>`;

    const text = document.createElement('div');
    text.className = 'comment-text';
    text.textContent = c.text || '';

    entry.append(meta, text);
    list.appendChild(entry);
  });
}

// Dopina zwijany wątek komentarzy do karty wniosku. Komentarze ładują się
// leniwie (przy rozwinięciu). Uprawnienia pilnuje backend (Pakiet C).
// Wołać PRZED dołączeniem węzła do DOM (operuje na fragmencie szablonu).
function attachCommentsThread(node, req) {
  const container = node.querySelector('.item-title')?.parentElement;
  if (!container || !req?._id) return;

  const details = document.createElement('details');
  details.className = 'comments-block';

  const summary = document.createElement('summary');
  summary.textContent = '💬 Komentarze';
  details.appendChild(summary);

  const list = document.createElement('div');
  list.className = 'comments-list';
  list.innerHTML = '<p class="muted">Rozwiń, aby wczytać komentarze.</p>';
  details.appendChild(list);

  const form = document.createElement('form');
  form.className = 'comment-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'comment-input';
  input.placeholder = 'Napisz komentarz...';
  input.maxLength = 2000;
  const sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.className = 'btn btn-secondary';
  sendBtn.textContent = 'Wyślij';
  form.append(input, sendBtn);
  details.appendChild(form);

  let loaded = false;
  async function loadThread() {
    try {
      const comments = await api(`/loan-requests/${req._id}/comments`);
      renderComments(list, comments);
      loaded = true;
    } catch (err) {
      list.innerHTML = `<p class="muted">${escapeHtml(err.message)}</p>`;
    }
  }

  details.addEventListener('toggle', () => {
    if (details.open && !loaded) loadThread();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = (input.value || '').trim();
    if (!text) return;
    try {
      await api(`/loan-requests/${req._id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      input.value = '';
      await loadThread();
    } catch (err) {
      showToast(err.message);
    }
  });

  container.appendChild(details);
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
  if (!stats) return; // nagłówek ze statystykami usunięty z UI
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

// Wypełnia selecty filtra (typ encji / typ akcji) raz — opcje z map etykiet,
// posortowane po polskiej nazwie. Pierwsza opcja „Wszystkie…" zostaje.
function populateAuditFilterOptions() {
  const fill = (id, labels) => {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 1) return;
    const opts = Object.entries(labels)
      .sort((a, b) => a[1].localeCompare(b[1], 'pl'))
      .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`);
    sel.insertAdjacentHTML('beforeend', opts.join(''));
  };
  fill('auditEntityType', AUDIT_ENTITY_LABELS);
  fill('auditActionType', AUDIT_ACTION_LABELS);
}

function showAuditFilters() {
  if (auditFilterForm) auditFilterForm.hidden = false;
  populateAuditFilterOptions();
}

function hideAuditFilters() {
  if (auditFilterForm) auditFilterForm.hidden = true;
}

function openRequestForm(item) {
  requestItemCode.value = item.itemCode || '';
  requestItemName.value = `${item.name || ''}`;
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
    await openInbox();
  }

  if (view === 'team' && (currentUser?.role === 'manager' || currentUser?.role === 'admin')) {
    await loadTeam();
  }

  if (view === 'users' && currentUser?.role === 'admin') {
    await loadUsers();
  }

  if (view === 'admin' && currentUser?.role === 'admin') {
    await loadAdminItems();
  }

  if (view === 'warehouse' && WAREHOUSE_ROLES.includes(currentUser?.role)) {
    await openWarehouse();
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
    if (teamViewTab) teamViewTab.hidden = true;
    if (usersViewTab) usersViewTab.hidden = true;
    if (warehouseViewTab) warehouseViewTab.hidden = true;
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
  // „Mój zespół" — dla kierownika i admina (obaj mogą mieć podwładnych).
  if (teamViewTab) teamViewTab.hidden = !(isManager || isAdmin);
  // „Magazyn" — wgląd dla roli viewer oraz kierownika/admina (niezależnie od trybu admina).
  if (warehouseViewTab) warehouseViewTab.hidden = !WAREHOUSE_ROLES.includes(user.role);

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

// ===== Skrzynka: wspólny licznik (Prośby + Zgłoszenia) =====

// Ustawia licznik w menu (suma dla roli) oraz liczniki na pod-zakładkach.
function setInboxBadge(requests, reports) {
  const role = currentUser?.role;
  const isStaff = role === 'manager' || role === 'admin';
  const showReports = role === 'admin';
  const total = isStaff ? (requests + (showReports ? reports : 0)) : 0;

  if (actionBadge) {
    actionBadge.textContent = String(total);
    actionBadge.hidden = !isStaff || total <= 0;
  }
  if (requestsCount) {
    requestsCount.textContent = String(requests);
    requestsCount.hidden = requests <= 0;
  }
  if (reportsCount) {
    reportsCount.textContent = String(reports);
    reportsCount.hidden = reports <= 0;
  }
}

// Pobiera liczbę próśb (action-items) i — dla admina — otwartych zgłoszeń.
async function refreshInboxBadge() {
  const role = currentUser?.role;
  if (role !== 'manager' && role !== 'admin') {
    setInboxBadge(0, 0);
    return;
  }
  let requests = 0;
  let reports = 0;
  try {
    const items = await api('/my/action-items');
    requests = Array.isArray(items) ? items.length : 0;
  } catch { /* zostawiamy ostatnią znaną wartość */ }
  if (role === 'admin') {
    try {
      const data = await api('/admin/notifications/count');
      reports = Number(data?.open) || 0;
    } catch { /* j.w. */ }
  }
  setInboxBadge(requests, reports);
}

// ===== Skrzynka: przełączanie pod-widoków „Prośby" / „Zgłoszenia" =====

let inboxSubview = 'requests';

function setInboxSubview(subview) {
  inboxSubview = subview;
  document.querySelectorAll('#inboxSubtabs .subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subview === subview);
  });
  if (requestsSubview) requestsSubview.hidden = subview !== 'requests';
  if (reportsSubview) reportsSubview.hidden = subview !== 'reports';
  if (inboxTitle) {
    inboxTitle.textContent = subview === 'reports'
      ? 'Zgłoszenia o sprzęcie i transfery'
      : 'Wnioski wymagające Twojej decyzji';
  }
}

// Otwiera Skrzynkę na wskazanym pod-widoku i wczytuje jego dane.
async function openInbox(subview) {
  const isAdmin = currentUser?.role === 'admin';
  // „Zgłoszenia" widzi tylko admin; kierownik ma samą zakładkę „Prośby".
  if (reportsSubtab) reportsSubtab.hidden = !isAdmin;

  let target = subview || inboxSubview || 'requests';
  if (target === 'reports' && !isAdmin) target = 'requests';

  setInboxSubview(target);
  if (target === 'reports') {
    await loadReports();
  } else {
    await loadActionItems();
  }
}

let actionBadgeTimer = null;

// Lekki polling, żeby kierownik/admin zobaczył nowe prośby/zgłoszenia bez odświeżania strony.
function startActionBadgePolling() {
  if (actionBadgeTimer) return;
  const role = currentUser?.role;
  if (role !== 'manager' && role !== 'admin') return;
  actionBadgeTimer = setInterval(() => {
    refreshInboxBadge();
  }, 30000);
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
  // Tryb decyduje o klasie kontenera (siatka kart vs lista wierszy).
  availableList.className = availableViewMode === 'list' ? 'equipment-listing' : 'equipment-grid';

  if (!items.length) {
    renderEmpty(availableList, 'Brak sprzętu pasującego do wyszukiwania.');
    return;
  }

  if (availableViewMode === 'list') renderAvailableListView(items);
  else renderAvailableGallery(items);
}

// Widok 1: duża galeria kart (domyślny).
function renderAvailableGallery(items) {
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
    title.textContent = item.name || 'Bez nazwy';
    status.textContent = getStatusLabel(item.operationalStatus);
    status.classList.add('badge-status');
    status.dataset.status = item.operationalStatus || '';

    // Kod sprzętu ukryty — pokazujemy tylko markę/model (gdy są).
    const brandModel = [item.brand, item.model].filter(Boolean).join(' ');
    code.textContent = brandModel;
    code.hidden = !brandModel;
    description.textContent = item.details || 'Brak krótkiego opisu sprzętu.';
    location.textContent = item.currentLocation || 'Brak lokalizacji';
    condition.textContent = `stan: ${getConditionLabel(item.conditionStatus)}`;

    renderTags(tags, item.tags);
    fragment.appendChild(node);
  });

  availableList.appendChild(fragment);
}

// Widok 2: zwarta lista wierszy. Przyciski mają te same klasy/dataset, więc
// globalna delegacja kliknięć (Szczegóły / Złóż wniosek) działa bez zmian.
function renderAvailableListView(items) {
  availableList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const row = document.createElement('article');
    row.className = 'equipment-row';
    row.dataset.itemCode = item.itemCode || '';

    const thumb = document.createElement('img');
    thumb.className = 'equipment-row-thumb';
    thumb.loading = 'lazy';
    thumb.alt = item.name ? `Zdjęcie: ${item.name}` : 'Zdjęcie sprzętu';
    thumb.src = getItemImage(item);
    thumb.addEventListener('error', () => { thumb.src = createPlaceholderImage(item); }, { once: true });

    const main = document.createElement('div');
    main.className = 'equipment-row-main';
    const codeMeta = [item.category || 'Sprzęt', [item.brand, item.model].filter(Boolean).join(' ')]
      .filter(Boolean).join(' · ');
    main.innerHTML =
      `<div class="equipment-row-title">${escapeHtml(item.name || 'Bez nazwy')}</div>` +
      `<div class="equipment-row-meta muted">${escapeHtml(codeMeta)}</div>`;

    const loc = document.createElement('div');
    loc.className = 'equipment-row-loc muted';
    loc.textContent = item.currentLocation || 'Brak lokalizacji';

    const cond = document.createElement('div');
    cond.className = 'equipment-row-cond muted';
    cond.textContent = `stan: ${getConditionLabel(item.conditionStatus)}`;

    const status = document.createElement('span');
    status.className = 'badge badge-status';
    status.dataset.status = item.operationalStatus || '';
    status.textContent = getStatusLabel(item.operationalStatus);

    const actions = document.createElement('div');
    actions.className = 'equipment-row-actions';
    actions.innerHTML =
      `<button class="btn btn-secondary details-btn" type="button" data-item-code="${escapeHtml(item.itemCode || '')}">Szczegóły</button>` +
      `<button class="btn btn-primary request-btn" type="button" data-item-code="${escapeHtml(item.itemCode || '')}">Złóż wniosek</button>`;

    row.append(thumb, main, loc, cond, status, actions);
    fragment.appendChild(row);
  });

  availableList.appendChild(fragment);
}

function setAvailableViewMode(mode) {
  availableViewMode = mode === 'list' ? 'list' : 'gallery';
  localStorage.setItem('availableViewMode', availableViewMode);
  document.querySelectorAll('#availableViewToggle .view-toggle-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.availview === availableViewMode));
  refreshAvailableListView();
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

  // Wyczyść WSZYSTKIE pola, żeby podczas pobierania nie było widać danych
  // poprzednio otwartego sprzętu (efekt „zawieszonego" starego przedmiotu).
  modalItemImage.onerror = null;
  modalItemImage.src = createPlaceholderImage({});
  modalItemImage.alt = 'Ładowanie zdjęcia...';
  modalItemStatus.textContent = '…';
  modalItemStatus.dataset.status = '';
  modalItemCategory.textContent = '…';
  modalItemTitle.textContent = 'Ładowanie...';
  modalItemSubtitle.textContent = '';
  modalItemBrandModel.textContent = '—';
  modalItemLocation.textContent = '—';
  modalItemCondition.textContent = '—';
  modalItemSerial.textContent = '—';
  modalItemAssigned.textContent = '—';
  modalItemDetails.textContent = 'Pobieranie szczegółów sprzętu...';
  modalItemTags.innerHTML = '';
  modalActiveLoan.textContent = 'Ładowanie...';
  modalRequestBtn.disabled = true;
  if (modalHistoryBlock) {
    modalHistoryBlock.hidden = true;
    modalHistoryBlock.open = false; // historia domyślnie zwinięta
  }
  if (modalItemHistory) modalItemHistory.innerHTML = '';

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
    modalItemTitle.textContent = item.name || 'Bez nazwy';
    modalItemSubtitle.textContent =
      [item.brand, item.model].filter(Boolean).join(' · ') || 'Brak dodatkowych danych producenta';

    modalItemBrandModel.textContent = [item.brand, item.model].filter(Boolean).join(' / ') || '-';
    modalItemLocation.textContent = item.currentLocation || '-';
    modalItemCondition.textContent = getConditionLabel(item.conditionStatus);
    modalItemSerial.textContent = item.serialNumber || '-';
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

    if (currentUser?.role === 'admin') {
      await renderItemHistory(item);
    }
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

// Historia konkretnego sprzętu (tylko admin). Łączymy dwa zapytania:
// po entityId (zdarzenia samego sprzętu — także aktualizacje bez kodu w payloadzie)
// oraz po itemCode (wypożyczenia, zwroty, wnioski). Regex po itemCode łapie
// podciągi, więc dopasowanie kodu zawężamy dokładnie po stronie frontu.
async function renderItemHistory(item) {
  if (!modalHistoryBlock || !modalItemHistory) return;

  modalHistoryBlock.hidden = false;
  modalItemHistory.innerHTML = '<li class="muted">Ładowanie historii...</li>';

  const code = String(item.itemCode || '').toUpperCase();

  try {
    const [byEntity, byCode, userNames] = await Promise.all([
      item._id
        ? api(`/admin/audit-logs?entityType=item&entityId=${encodeURIComponent(item._id)}&limit=200`)
        : Promise.resolve([]),
      code
        ? api(`/admin/audit-logs?itemCode=${encodeURIComponent(code)}&limit=200`)
        : Promise.resolve([]),
      getAuditUserNames()
    ]);

    const seen = new Set();
    const logs = [];

    (Array.isArray(byEntity) ? byEntity : []).forEach(log => {
      const id = String(log._id);
      if (!seen.has(id)) { seen.add(id); logs.push(log); }
    });

    (Array.isArray(byCode) ? byCode : []).forEach(log => {
      const id = String(log._id);
      // Zawężenie: tylko dokładny kod (regex łapie np. CAM-1 w CAM-10).
      if (String(log.payload?.itemCode || '').toUpperCase() !== code) return;
      if (!seen.has(id)) { seen.add(id); logs.push(log); }
    });

    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!logs.length) {
      modalItemHistory.innerHTML = '<li class="muted">Brak zapisów w historii.</li>';
      return;
    }

    modalItemHistory.innerHTML = logs.map(log => `
      <li class="history-entry">
        <span class="history-when">${log.createdAt ? new Date(log.createdAt).toLocaleString('pl-PL') : '-'}</span>
        <span class="history-who">${escapeHtml(userNames[log.actorEmail] || log.actorEmail || '—')}</span>
        <span class="history-what">${escapeHtml(describeAudit(log))}</span>
      </li>
    `).join('');
  } catch (err) {
    modalItemHistory.innerHTML = `<li class="muted">Nie udało się pobrać historii: ${escapeHtml(err.message || 'błąd')}</li>`;
  }
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

    await refreshInboxBadge();
    startActionBadgePolling();
  } catch {
    currentUser = null;
    showLoginGate();
    renderAuthBox();
    setInboxBadge(0, 0);
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
    attachCommentsThread(node, req);

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
          showToast(`Anulowano wniosek: ${req.itemName || 'sprzęt'}`);
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
      `${item.name || 'Bez nazwy'}`;
    node.querySelector('.item-meta').textContent =
      `${item.category || 'Sprzęt'} · lokalizacja: ${item.currentLocation || '-'} · stan: ${getConditionLabel(item.conditionStatus)}`;

    const form = node.querySelector('.return-form');
    const locationSelect = node.querySelector('.return-location');
    const noteInput = node.querySelector('.return-note');
    const reportBtn = node.querySelector('.report-issue-btn');
    if (reportBtn) reportBtn.addEventListener('click', () => openReportIssueModal(item));

    const transferBtn = node.querySelector('.transfer-mine-btn');
    if (transferBtn) transferBtn.addEventListener('click', () => openTransferModal(item, 'user'));

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

        showToast(`Oddano: ${item.name || 'sprzęt'}`);
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

// Tabela admina z paskiem narzędzi i eksportem CSV bieżącej listy (B2).
function renderAdminTableView(rows, columns, exportBaseName) {
  const toolbar = document.createElement('div');
  toolbar.className = 'admin-list-toolbar';

  const count = document.createElement('span');
  count.className = 'admin-items-count muted';
  count.textContent = `Pozycje: ${rows.length}`;

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'btn btn-secondary';
  exportBtn.textContent = 'Eksportuj CSV';
  exportBtn.disabled = !rows.length;
  exportBtn.addEventListener('click', () => {
    const headers = columns.map(col => col.label);
    const data = rows.map(row => columns.map(col => row[col.key] ?? ''));
    downloadCsv(`${exportBaseName}-${csvDateStamp()}.csv`, buildCsv(headers, data));
    showToast(`Wyeksportowano ${rows.length} pozycji`);
  });

  toolbar.append(count, exportBtn);

  const tableWrap = document.createElement('div');
  tableWrap.innerHTML = renderTable(rows, columns);

  adminContent.innerHTML = '';
  adminContent.append(toolbar, tableWrap);
}

// Pełna lista sprzętu admina (pobrana raz, filtrowana po stronie frontu – B1/B2).
let adminItemsState = [];

// Kolumny eksportu CSV sprzętu (etykiety po polsku, wartości czytelne dla człowieka).
const ADMIN_ITEMS_EXPORT_COLUMNS = [
  { label: 'Kod', get: i => i.itemCode },
  { label: 'Nazwa', get: i => i.name },
  { label: 'Kategoria', get: i => i.category },
  { label: 'Status', get: i => getStatusLabel(i.operationalStatus) },
  { label: 'Lokalizacja', get: i => i.currentLocation },
  { label: 'Lokalizacja szczegolowa', get: i => i.detailedLocation },
  { label: 'Stan techniczny', get: i => getConditionLabel(i.conditionStatus) },
  { label: 'Marka', get: i => i.brand },
  { label: 'Model', get: i => i.model },
  { label: 'Numer seryjny', get: i => i.serialNumber },
  { label: 'Gwarancja do', get: i => i.warrantyUntil },
  { label: 'Ilosc', get: i => i.quantity },
  { label: 'Przypisany do', get: i => i.assignedToEmail },
  { label: 'Tagi', get: i => (Array.isArray(i.tags) ? i.tags.join(', ') : '') },
  { label: 'Kod QR', get: i => i.qrCodeValue },
  { label: 'Uwagi', get: i => i.notes },
  { label: 'Szczegoly', get: i => i.details }
];

function distinctSorted(items, key) {
  return [...new Set(items.map(i => i[key]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'pl'));
}

function getAdminItemSearchSource(item) {
  // Szukamy po nazwie i właścicielu (imię + e-mail) oraz po kodzie sprzętu.
  return [item.name, item.assignedToName, item.assignedToEmail, item.itemCode]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getFilteredAdminItems() {
  const term = normalizeText(document.getElementById('adminItemsSearch')?.value || '');
  const category = document.getElementById('adminItemsCategory')?.value || '';
  const status = document.getElementById('adminItemsStatus')?.value || '';
  const location = document.getElementById('adminItemsLocation')?.value || '';
  const condition = document.getElementById('adminItemsCondition')?.value || '';

  return adminItemsState.filter(item => {
    if (term && !getAdminItemSearchSource(item).includes(term)) return false;
    if (category && item.category !== category) return false;
    if (status && item.operationalStatus !== status) return false;
    if (location && item.currentLocation !== location) return false;
    if (condition && item.conditionStatus !== condition) return false;
    return true;
  });
}

function buildAdminItemRow(item) {
  const tr = document.createElement('tr');

  [
    item.category || '-',
    item.name || '-',
    getStatusLabel(item.operationalStatus),
    item.currentLocation || '-',
    getConditionLabel(item.conditionStatus),
    item.assignedToEmail || '—'
  ].forEach(text => {
    const td = document.createElement('td');
    td.textContent = text;
    tr.appendChild(td);
  });

  const actionsTd = document.createElement('td');
  actionsTd.className = 'table-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn btn-secondary';
  editBtn.textContent = 'Edytuj';
  editBtn.addEventListener('click', () => openEditItemModal(item));
  actionsTd.appendChild(editBtn);

  const transferBtn = document.createElement('button');
  transferBtn.type = 'button';
  transferBtn.className = 'btn btn-secondary';
  transferBtn.textContent = 'Przenieś';
  transferBtn.addEventListener('click', () => openTransferModal(item));
  actionsTd.appendChild(transferBtn);

  const discardBtn = document.createElement('button');
  discardBtn.type = 'button';
  discardBtn.className = 'btn btn-danger';
  discardBtn.textContent = 'Wyrzuć';
  discardBtn.addEventListener('click', () => openDiscardModal(item));
  actionsTd.appendChild(discardBtn);

  tr.appendChild(actionsTd);
  return tr;
}

function makeFilterSelect(id, allLabel, options) {
  const select = document.createElement('select');
  select.id = id;
  select.className = 'filter-select';

  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = allLabel;
  select.appendChild(optAll);

  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });

  return select;
}

function renderAdminItemsTable() {
  const wrap = document.getElementById('adminItemsTableWrap');
  if (!wrap) return;

  const filtered = getFilteredAdminItems();
  const countEl = document.getElementById('adminItemsCount');
  if (countEl) countEl.textContent = `Pozycje: ${filtered.length} z ${adminItemsState.length}`;

  if (!filtered.length) {
    wrap.innerHTML = '<div class="empty">Brak sprzętu dla wybranych filtrów.</div>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
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
  filtered.forEach(item => tbody.appendChild(buildAdminItemRow(item)));
  table.appendChild(tbody);

  wrap.innerHTML = '';
  wrap.appendChild(table);
}

function exportAdminItemsCsv() {
  const rows = getFilteredAdminItems();
  if (!rows.length) {
    showToast('Brak danych do eksportu');
    return;
  }

  const headers = ADMIN_ITEMS_EXPORT_COLUMNS.map(c => c.label);
  const data = rows.map(item => ADMIN_ITEMS_EXPORT_COLUMNS.map(c => c.get(item)));
  downloadCsv(`sprzet-${csvDateStamp()}.csv`, buildCsv(headers, data));
  showToast(`Wyeksportowano ${rows.length} pozycji`);
}

function buildAdminItemsToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'admin-items-toolbar';

  const search = document.createElement('input');
  search.id = 'adminItemsSearch';
  search.className = 'search-input';
  search.type = 'search';
  search.placeholder = 'Szukaj: nazwa, właściciel (imię / e-mail), kod...';

  const categorySelect = makeFilterSelect(
    'adminItemsCategory',
    'Wszystkie kategorie',
    distinctSorted(adminItemsState, 'category').map(v => ({ value: v, label: v }))
  );
  const statusSelect = makeFilterSelect(
    'adminItemsStatus',
    'Wszystkie statusy',
    distinctSorted(adminItemsState, 'operationalStatus').map(v => ({ value: v, label: getStatusLabel(v) }))
  );
  const locationSelect = makeFilterSelect(
    'adminItemsLocation',
    'Wszystkie lokalizacje',
    distinctSorted(adminItemsState, 'currentLocation').map(v => ({ value: v, label: v }))
  );
  const conditionSelect = makeFilterSelect(
    'adminItemsCondition',
    'Każdy stan techniczny',
    distinctSorted(adminItemsState, 'conditionStatus').map(v => ({ value: v, label: getConditionLabel(v) }))
  );

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'btn btn-secondary';
  exportBtn.textContent = 'Eksportuj CSV';
  exportBtn.addEventListener('click', exportAdminItemsCsv);

  let searchTimer = null;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderAdminItemsTable, 120);
  });
  [categorySelect, statusSelect, locationSelect, conditionSelect].forEach(sel => {
    sel.addEventListener('change', renderAdminItemsTable);
  });

  toolbar.append(search, categorySelect, statusSelect, locationSelect, conditionSelect, exportBtn);
  return toolbar;
}

async function loadAdminItems() {
  if (currentUser?.role !== 'admin') return;
  hideAuditFilters();

  const items = await api('/admin/items');
  adminItemsState = Array.isArray(items) ? items : [];

  adminContent.innerHTML = '';

  if (!adminItemsState.length) {
    adminContent.innerHTML = '<div class="empty">Brak sprzętu w magazynie.</div>';
    return;
  }

  adminContent.appendChild(buildAdminItemsToolbar());

  const count = document.createElement('p');
  count.id = 'adminItemsCount';
  count.className = 'admin-items-count muted';
  adminContent.appendChild(count);

  const wrap = document.createElement('div');
  wrap.id = 'adminItemsTableWrap';
  adminContent.appendChild(wrap);

  renderAdminItemsTable();
}

// --- Dashboard administracyjny (B3) ---

const DASHBOARD_STATUS_ORDER = ['available', 'loaned', 'unavailable', 'inactive'];
const STATUS_BAR_MODIFIER = {
  available: 'bar-fill-available',
  loaned: 'bar-fill-loaned',
  unavailable: 'bar-fill-unavailable',
  inactive: 'bar-fill-inactive'
};

function renderBarChart(entries) {
  if (!entries.length) return '<p class="muted">Brak danych.</p>';

  const max = Math.max(...entries.map(e => e.count), 1);
  const rows = entries.map(entry => {
    const pct = Math.max(2, Math.round((entry.count / max) * 100));
    const modifier = entry.modifier ? ` ${entry.modifier}` : '';
    return `
      <div class="bar-row">
        <span class="bar-label" title="${escapeHtml(entry.label)}">${escapeHtml(entry.label)}</span>
        <span class="bar-track"><span class="bar-fill${modifier}" style="width:${pct}%"></span></span>
        <span class="bar-value">${entry.count}</span>
      </div>
    `;
  }).join('');

  return `<div class="bar-chart">${rows}</div>`;
}

function buildStatusEntries(byStatus) {
  const extra = Object.keys(byStatus).filter(k => !DASHBOARD_STATUS_ORDER.includes(k));
  return [...DASHBOARD_STATUS_ORDER, ...extra]
    .filter(key => byStatus[key])
    .map(key => ({
      label: getStatusLabel(key),
      count: byStatus[key],
      modifier: STATUS_BAR_MODIFIER[key] || ''
    }));
}

async function loadDashboard() {
  if (currentUser?.role !== 'admin') return;
  hideAuditFilters();

  const stats = await api('/admin/stats');

  const statusEntries = buildStatusEntries(stats.itemsByStatus || {});
  const conditionEntries = (stats.itemsByCondition || []).map(c => ({
    label: c.condition ? getConditionLabel(c.condition) : 'Nieokreślony',
    count: c.count
  }));
  const categoryEntries = (stats.itemsByCategory || []).map(c => ({
    label: c.category,
    count: c.count
  }));

  const warranty = stats.warranty || { total: 0, expired: 0, soon: 0, items: [] };

  const cards = [
    { label: 'Sprzęt łącznie', value: stats.itemsTotal ?? 0, hint: 'aktywne pozycje w bazie' },
    { label: 'Aktywne wypożyczenia', value: stats.activeLoans ?? 0, hint: 'sprzęt obecnie u osób' },
    { label: 'Oczekujące wnioski', value: stats.pendingRequests?.total ?? 0, hint: 'czekają na decyzję' },
    {
      label: 'Gwarancje ≤ 30 dni',
      value: warranty.total ?? 0,
      hint: warranty.expired ? `w tym ${warranty.expired} po terminie` : 'kończące się wkrótce',
      modifier: warranty.total ? 'dash-card-warn' : ''
    }
  ];

  const cardsHtml = cards.map(card => `
    <article class="card dash-card ${card.modifier || ''}">
      <p class="dash-card-label">${escapeHtml(card.label)}</p>
      <p class="dash-card-value">${escapeHtml(card.value)}</p>
      <p class="dash-card-hint muted">${escapeHtml(card.hint)}</p>
    </article>
  `).join('');

  const warrantyHtml = warranty.items && warranty.items.length
    ? `<div class="admin-content"><table>
        <thead><tr><th>Nazwa</th><th>Kategoria</th><th>Gwarancja do</th><th>Status</th></tr></thead>
        <tbody>${warranty.items.map(item => `
          <tr>
            <td>${escapeHtml(item.name || '-')}</td>
            <td>${escapeHtml(item.category || '-')}</td>
            <td>${escapeHtml(formatDate(item.warrantyUntil))}</td>
            <td>${item.expired
              ? '<span class="badge badge-warranty-expired">Po terminie</span>'
              : `<span class="badge badge-warranty-soon">${item.daysLeft === 0 ? 'dziś' : (item.daysLeft === 1 ? 'za 1 dzień' : `za ${item.daysLeft} dni`)}</span>`}</td>
          </tr>
        `).join('')}</tbody>
      </table></div>`
    : '<p class="muted">Brak sprzętu z gwarancją kończącą się w ciągu 30 dni.</p>';

  adminContent.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-stats">${cardsHtml}</div>
      <div class="dashboard-sections">
        <section class="card dash-section">
          <h3>Sprzęt wg statusu</h3>
          ${renderBarChart(statusEntries)}
        </section>
        <section class="card dash-section">
          <h3>Sprzęt wg stanu technicznego</h3>
          ${renderBarChart(conditionEntries)}
        </section>
        <section class="card dash-section dash-section-wide">
          <h3>Sprzęt wg kategorii</h3>
          ${renderBarChart(categoryEntries)}
        </section>
        <section class="card dash-section dash-section-wide">
          <h3>Gwarancje kończące się w ciągu 30 dni</h3>
          ${warrantyHtml}
        </section>
      </div>
    </div>
  `;
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
        { key: 'itemName', label: 'Sprzęt' },
        { key: 'userEmail', label: 'Użytkownik' },
        { key: 'borrowedAtLabel', label: 'Wypożyczono' },
        { key: 'returnedAtLabel', label: 'Zwrócono' },
        { key: 'returnLocation', label: 'Zwrot do' },
        { key: 'returnNote', label: 'Notatka zwrotu' }
      ]
    : [
        { key: 'itemName', label: 'Sprzęt' },
        { key: 'userEmail', label: 'Użytkownik' },
        { key: 'fromLocation', label: 'Skąd' },
        { key: 'targetUseLocation', label: 'Gdzie używane' },
        { key: 'borrowedAtLabel', label: 'Wypożyczono' }
      ];

  renderAdminTableView(rows, columns, status === 'returned' ? 'zwroty' : 'wypozyczenia');
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
    attachCommentsThread(node, req);

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
          : `Wydano sprzęt: ${req.itemName || 'sprzęt'}`);
        await refreshStats();
        await loadAdminRequests();
        await refreshInboxBadge();
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

        showToast(`Odrzucono wniosek: ${req.itemName || 'sprzęt'}`);
        await refreshStats();
        await loadAdminRequests();
        await refreshInboxBadge();
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
        rejectUrl: `/admin/purchase-requests/${id}/cancel`,
        rejectLabel: 'Anuluj zakup',
        rejectMsg: 'Zakup anulowany',
        successMsg: 'Oznaczono jako zamówiony'
      };
    }
    if (req.status === 'ordered') {
      return {
        approveLabel: 'Dodaj do magazynu',
        approveUrl: `/admin/purchase-requests/${id}/stock`,
        rejectUrl: `/admin/purchase-requests/${id}/cancel`,
        rejectLabel: 'Anuluj zakup',
        rejectMsg: 'Zakup anulowany',
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
  refreshInboxBadge();

  if (!requests.length) {
    return renderEmpty(managerRequestsList, 'Brak wniosków wymagających Twojej decyzji.');
  }

  managerRequestsList.innerHTML = '';

  requests.forEach(req => {
    const node = adminRequestTpl.content.cloneNode(true);
    fillRequestNode(node, req, { withRequester: true });
    appendDecisionNote(node, req);
    attachCommentsThread(node, req);

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
      rejectBtn.textContent = cfg.rejectLabel || 'Odrzuć';
      rejectBtn.addEventListener('click', async () => {
        try {
          await api(cfg.rejectUrl, {
            method: 'POST',
            body: JSON.stringify({ decisionNote: noteInput.value || '' })
          });

          showToast(cfg.rejectMsg || 'Wniosek odrzucony');
          await loadActionItems();
          await refreshStats();
          await refreshInboxBadge();
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
    case 'viewer': return 'Podgląd (read-only)';
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

  // Lista kierowników do formularza „Dodaj użytkownika".
  if (newUserManager) {
    newUserManager.innerHTML = ['<option value="">— bez kierownika —</option>']
      .concat(managers.map(m =>
        `<option value="${escapeHtml(m.email)}">${escapeHtml(m.fullName || m.email)} (${escapeHtml(getRoleLabel(m.role))})</option>`))
      .join('');
  }

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
    if (user.pendingFirstLogin) {
      // Konto utworzone z góry — sprzęt już można przypisać, czeka na pierwsze logowanie.
      nameTd.innerHTML = `${escapeHtml(user.fullName || '—')} <span class="badge badge-muted">oczekuje na logowanie</span>`;
    } else {
      nameTd.textContent = user.fullName || '—';
    }

    const emailTd = document.createElement('td');
    emailTd.textContent = user.email;

    // Rola
    const roleTd = document.createElement('td');
    const roleSelect = document.createElement('select');
    [['user', 'Użytkownik'], ['viewer', 'Podgląd (read-only)'], ['manager', 'Kierownik'], ['admin', 'Administrator']].forEach(([value, label]) => {
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

// „Mój zespół" — lista podwładnych kierownika z przypisanym sprzętem i wnioskami
// w toku. Tylko podgląd (decyzje robi się w „Wymagane działania").
async function loadTeam() {
  const role = currentUser?.role;
  if (role !== 'manager' && role !== 'admin') return;
  if (!teamContent) return;

  const members = await api('/manager/team');

  if (!Array.isArray(members) || !members.length) {
    teamContent.innerHTML =
      '<div class="empty">Nikt nie ma Cię ustawionego jako kierownika. Przypisanie ustawia administrator w zakładce „Użytkownicy".</div>';
    return;
  }

  teamContent.innerHTML = '';

  members.forEach(member => {
    const card = document.createElement('article');
    card.className = 'team-card card-section';

    const head = document.createElement('div');
    head.className = 'team-card-head';
    head.innerHTML = `
      <div>
        <h3 class="team-name">${escapeHtml(member.fullName)}</h3>
        <p class="muted">${escapeHtml(member.email)} · ${escapeHtml(getRoleLabel(member.role))}</p>
      </div>
      <div class="team-counts">
        <span class="badge">Sprzęt: ${member.items.length}</span>
        <span class="badge">Wnioski w toku: ${member.activeRequests.length}</span>
      </div>
    `;
    card.appendChild(head);

    // Przypisany sprzęt
    const itemsBlock = document.createElement('div');
    itemsBlock.className = 'team-block';
    if (member.items.length) {
      const list = document.createElement('ul');
      list.className = 'team-list';
      member.items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${escapeHtml(item.name || 'Bez nazwy')}</strong>
          <span class="muted">${escapeHtml(getStatusLabel(item.operationalStatus))} · ${escapeHtml(item.currentLocation || '-')}</span>`;
        list.appendChild(li);
      });
      itemsBlock.innerHTML = '<h4>Przypisany sprzęt</h4>';
      itemsBlock.appendChild(list);
    } else {
      itemsBlock.innerHTML = '<h4>Przypisany sprzęt</h4><p class="muted">Brak przypisanego sprzętu.</p>';
    }
    card.appendChild(itemsBlock);

    // Wnioski w toku
    const reqBlock = document.createElement('div');
    reqBlock.className = 'team-block';
    if (member.activeRequests.length) {
      const list = document.createElement('ul');
      list.className = 'team-list';
      member.activeRequests.forEach(req => {
        const li = document.createElement('li');
        const label = req.kind === 'purchase'
          ? `🛒 ${req.itemName || 'Nowy sprzęt'}`
          : `${req.itemName || 'Sprzęt'}`;
        li.innerHTML = `<strong>${escapeHtml(label)}</strong>
          <span class="muted">· ${escapeHtml(getRequestStatusLabel(req.status))}</span>`;
        list.appendChild(li);
      });
      reqBlock.innerHTML = '<h4>Wnioski w toku</h4>';
      reqBlock.appendChild(list);
    } else {
      reqBlock.innerHTML = '<h4>Wnioski w toku</h4><p class="muted">Brak wniosków w toku.</p>';
    }
    card.appendChild(reqBlock);

    teamContent.appendChild(card);
  });
}

const ISSUE_TYPE_LABELS = { damage: 'Uszkodzenie', lost: 'Zgubienie', other: 'Inne' };

// „Zgłoszenia" — powiadomienia dla administracji: zgłoszenia pracowników o sprzęcie
// oraz ślad wykonanych transferów. Admin może oznaczyć jako załatwione.
async function loadReports() {
  if (currentUser?.role !== 'admin' || !reportsContent) return;
  hideAuditFilters();

  const notifications = await api('/admin/notifications');
  await refreshInboxBadge();

  if (!Array.isArray(notifications) || !notifications.length) {
    reportsContent.innerHTML = '<div class="empty">Brak zgłoszeń.</div>';
    return;
  }

  reportsContent.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'list';

  notifications.forEach(n => {
    const card = document.createElement('article');
    card.className = 'item-row report-card';
    if (n.status === 'resolved') card.classList.add('report-resolved');

    const main = document.createElement('div');

    const title = document.createElement('h3');
    title.className = 'item-title';
    if (n.kind === 'transfer') {
      title.textContent = `🔄 Transfer: ${n.itemName || 'Sprzęt'}`;
    } else {
      const typeLabel = ISSUE_TYPE_LABELS[n.issueType] || 'Zgłoszenie';
      title.textContent = `⚠️ ${typeLabel}: ${n.itemName || 'Sprzęt'}`;
    }
    main.appendChild(title);

    const meta = document.createElement('p');
    meta.className = 'item-meta';
    const when = n.createdAt ? new Date(n.createdAt).toLocaleString('pl-PL') : '';
    if (n.kind === 'transfer') {
      const from = n.fromName || n.fromEmail || 'magazynu';
      meta.textContent = `Z: ${from} → na: ${n.toName || n.toEmail || '-'} · wykonał: ${n.createdByName || n.createdByEmail} · ${when}`;
    } else {
      meta.textContent = `Zgłosił: ${n.createdByName || n.createdByEmail} · ${when}`;
    }
    main.appendChild(meta);

    if (n.message) {
      const msg = document.createElement('p');
      msg.className = 'item-note';
      msg.textContent = `📝 ${n.message}`;
      main.appendChild(msg);
    }

    if (n.status === 'resolved') {
      const done = document.createElement('p');
      done.className = 'item-meta muted';
      const rwhen = n.resolvedAt ? new Date(n.resolvedAt).toLocaleString('pl-PL') : '';
      done.textContent = `✅ Załatwione przez ${n.resolvedByEmail || '-'}${rwhen ? ` · ${rwhen}` : ''}`;
      main.appendChild(done);
    }

    card.appendChild(main);

    if (n.status !== 'resolved') {
      const actions = document.createElement('div');
      actions.className = 'actions-inline';
      const resolveBtn = document.createElement('button');
      resolveBtn.type = 'button';
      resolveBtn.className = 'btn btn-secondary';
      resolveBtn.textContent = 'Oznacz jako załatwione';
      resolveBtn.addEventListener('click', async () => {
        try {
          await api(`/admin/notifications/${n._id}/resolve`, { method: 'POST' });
          showToast('Oznaczono jako załatwione');
          await loadReports();
        } catch (err) {
          showToast(err.message);
        }
      });
      actions.appendChild(resolveBtn);
      card.appendChild(actions);
    }

    list.appendChild(card);
  });

  reportsContent.appendChild(list);
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
  purchase_request_cancelled: 'Anulował zakup w trakcie procedury',
  loan_request_auto_rejected: 'Odrzucił wniosek (sprzęt wycofany)',
  request_comment_added: 'Dodał komentarz do wniosku',
  loan_created: 'Utworzył wypożyczenie',
  loan_returned: 'Przyjął zwrot sprzętu',
  item_created: 'Dodał sprzęt',
  item_updated: 'Zaktualizował sprzęt',
  item_deactivated: 'Wycofał sprzęt',
  item_discarded: 'Wyrzucił sprzęt z magazynu',
  item_transferred: 'Przeniósł sprzęt na inną osobę',
  issue_reported: 'Zgłosił problem ze sprzętem',
  user_created: 'Dodał użytkownika',
  user_updated: 'Zmienił ustawienia użytkownika',
  user_deleted: 'Usunął użytkownika',
  warehouse_operation_done: 'Zatwierdził operację magazynową',
  warehouse_operation_reversed: 'Cofnął operację magazynową',
  reorder_rule_created: 'Dodał regułę zapotrzebowania (min-max)'
};

// Typy encji (do filtra historii). Trzymamy też etykiety dla czytelności.
const AUDIT_ENTITY_LABELS = {
  item: 'Sprzęt',
  loan: 'Wypożyczenie',
  loan_request: 'Wniosek o wypożyczenie',
  purchase_request: 'Wniosek o zakup',
  user: 'Użytkownik'
};

// Czego dotyczyła akcja — sprzęt, zakup lub inny użytkownik.
function getAuditSubject(log) {
  const p = log.payload || {};
  if (p.itemName) return p.itemName;
  if (p.itemCode) return p.itemCode;
  if (p.email) return p.email;
  if (p.requesterEmail) return p.requesterEmail;
  if (log.entityType === 'user' && log.entityId) return log.entityId;
  return '';
}

function describeAudit(log) {
  const label = AUDIT_ACTION_LABELS[log.actionType] || log.actionType || 'Wykonał akcję';
  const subject = getAuditSubject(log);
  const reason = log.payload?.reason ? ` (${log.payload.reason})` : '';

  // Transfer: pokaż wprost, na kogo przeniesiono (czytelny ślad w historii).
  if (log.actionType === 'item_transferred') {
    const to = log.payload?.toName || log.payload?.toEmail;
    const suffix = to ? ` (na: ${to})` : '';
    return subject ? `${label} — ${subject}${suffix}` : `${label}${suffix}`;
  }

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

  const rows = logs.map(log => ({
    when: log.createdAt ? new Date(log.createdAt).toLocaleString('pl-PL') : '-',
    user: userNames[log.actorEmail] || log.actorEmail || '—',
    action: describeAudit(log)
  }));

  const columns = [
    { key: 'when', label: 'Kiedy' },
    { key: 'user', label: 'Użytkownik' },
    { key: 'action', label: 'Co zrobił' }
  ];

  renderAdminTableView(rows, columns, 'historia');
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
    if (view === 'team' && !['manager', 'admin'].includes(currentUser?.role)) return;
    if (view === 'warehouse' && !WAREHOUSE_ROLES.includes(currentUser?.role)) return;

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

// Pod-zakładki Skrzynki: „Prośby" / „Zgłoszenia".
document.querySelectorAll('#inboxSubtabs .subtab').forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      await openInbox(btn.dataset.subview);
    } catch (err) {
      showToast(err.message);
    }
  });
});

// ===== Magazyn „w stylu Odoo" – moduł (Faza 2) =====

const WAREHOUSE_KIND_LABELS = {
  view: 'Grupa', internal: 'Magazyn', employee: 'U pracownika',
  inventory: 'Korekta', scrap: 'Złom', supplier: 'Dostawca', transit: 'Tranzyt'
};
const MOVE_KIND_LABELS = {
  opening: 'Stan otwarcia', internal: 'Przesunięcie', receipt: 'Przyjęcie',
  delivery: 'Wydanie', scrap: 'Złom', adjustment: 'Korekta', conversion: 'Konwersja'
};
const OP_STATE_LABELS = { draft: 'Wersja robocza', ready: 'Gotowe', done: 'Wykonano', cancelled: 'Anulowano' };
// Typy widoczne w UI (subzakładki + kafelki Przeglądu). „internal" celowo pominięte —
// zostaje w backendzie (OPERATION_TYPES), ale nie pokazujemy go w interfejsie.
const OP_TYPE_ORDER = ['receipt', 'delivery', 'scrap', 'adjustment', 'conversion'];
const OP_TYPE_NAV_LABELS = {
  receipt: 'Przyjęcia', delivery: 'Dostawy', internal: 'Wewnętrzne',
  scrap: 'Odpad', adjustment: 'Inwentarz fizyczny', conversion: 'Konwersje'
};
// Ikona + kolor akcentu kafelka Przeglądu (per typ operacji).
const OP_TYPE_META = {
  receipt: { icon: '📥', accent: '#2563eb' },
  delivery: { icon: '📤', accent: '#7c3aed' },
  internal: { icon: '🔄', accent: '#0891b2' },
  scrap: { icon: '🗑️', accent: '#dc2626' },
  adjustment: { icon: '📋', accent: '#059669' },
  conversion: { icon: '♻️', accent: '#0d9488' },
  replenishment: { icon: '🛒', accent: '#d97706' }
};

let warehouseStockState = [];

async function fetchWarehouseLocations(force = false) {
  if (warehouseLocationsCache && !force) return warehouseLocationsCache;
  warehouseLocationsCache = await api('/warehouse/locations');
  return warehouseLocationsCache;
}

async function fetchWarehouseFormData(force = false) {
  if (warehouseFormData && !force) return warehouseFormData;
  warehouseFormData = await api('/warehouse/form-data');
  return warehouseFormData;
}

function isPhysicalLocation(loc) {
  return loc.kind === 'internal' || loc.kind === 'employee';
}

function renderWarehouseSummary(locations) {
  if (!warehouseSummary) return;
  const physical = locations.filter(isPhysicalLocation);
  const onHand = physical.reduce((sum, l) => sum + (l.onHand || 0), 0);
  const lines = physical.reduce((sum, l) => sum + (l.lines || 0), 0);
  warehouseSummary.textContent =
    `${onHand} szt. na stanie · ${lines} pozycji · ${physical.length} lokalizacji fizycznych`;
}

function populateLocationFilter(locations) {
  if (!warehouseLocationFilter) return;
  const current = warehouseLocationFilter.value;
  const physical = locations.filter(isPhysicalLocation);
  warehouseLocationFilter.innerHTML =
    '<option value="">Wszystkie lokalizacje</option>' +
    physical.map(l =>
      `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)} (${l.onHand || 0})</option>`).join('');
  warehouseLocationFilter.value = current;
}

async function openWarehouse() {
  if (!WAREHOUSE_ROLES.includes(currentUser?.role)) return;
  const locations = await fetchWarehouseLocations(true);
  renderWarehouseSummary(locations);
  populateLocationFilter(locations);
  await switchWarehouseMenu(warehouseMenu);
}

// Górne menu modułu (Przegląd / Operacje / Produkty / Raportowanie / Konfiguracja).
async function switchWarehouseMenu(menu) {
  warehouseMenu = menu;
  document.querySelectorAll('#warehouseMenu .subtab').forEach(b =>
    b.classList.toggle('active', b.dataset.whmenu === menu));
  if (whOverviewView) whOverviewView.hidden = menu !== 'overview';
  if (whOperationsView) whOperationsView.hidden = menu !== 'operations';
  if (whProductsView) whProductsView.hidden = menu !== 'products';
  if (whReportingView) whReportingView.hidden = menu !== 'reporting';
  if (whConfigView) whConfigView.hidden = menu !== 'config';

  if (menu === 'overview') await loadWarehouseOverview();
  else if (menu === 'operations') await openOperations(warehouseOpType);
  else if (menu === 'products') await loadWarehouseProducts();
  else if (menu === 'reporting') await switchReportView(warehouseReportView);
  else if (menu === 'config') await renderWarehouseConfig();
}

// --- Przegląd (dashboard kafelków) ---
async function loadWarehouseOverview() {
  const data = await api('/warehouse/overview');
  renderOverview(data.types || [], data.replenishment || null);
}

function renderOverview(types, replenishment) {
  const groups = {};
  // Pokazujemy tylko typy widoczne w UI (OP_TYPE_ORDER) — np. „internal" pomijamy.
  for (const t of types) {
    if (!OP_TYPE_ORDER.includes(t.type)) continue;
    (groups[t.group] = groups[t.group] || []).push(t);
  }
  const groupOrder = ['Przekazy', 'Korekty', 'Przetworzenie'];

  const card = ({ type, title, icon, accent, num, numLabel, sub, subLabel }) => `
    <button class="wh-card" type="button" data-whgo="${escapeHtml(type)}" style="--accent:${accent}">
      <div class="wh-card-head">
        <span class="wh-card-icon">${icon}</span>
        <span class="wh-card-title">${escapeHtml(title)}</span>
      </div>
      <div class="wh-card-metrics">
        <div class="wh-metric">
          <span class="wh-metric-num${num > 0 ? ' is-active' : ''}">${num}</span>
          <span class="wh-metric-label">${escapeHtml(numLabel)}</span>
        </div>
        <div class="wh-metric">
          <span class="wh-metric-num wh-metric-done">${sub}</span>
          <span class="wh-metric-label">${escapeHtml(subLabel)}</span>
        </div>
      </div>
    </button>`;

  let html = Object.keys(groups)
    .sort((a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b))
    .map(group => {
      const cards = groups[group]
        .sort((a, b) => OP_TYPE_ORDER.indexOf(a.type) - OP_TYPE_ORDER.indexOf(b.type))
        .map(t => {
          const meta = OP_TYPE_META[t.type] || { icon: '📦', accent: 'var(--primary)' };
          return card({
            type: t.type, title: OP_TYPE_NAV_LABELS[t.type] || t.label,
            icon: meta.icon, accent: meta.accent,
            num: (t.draft || 0) + (t.ready || 0), numLabel: 'do zrobienia',
            sub: t.done || 0, subLabel: 'wykonano'
          });
        }).join('');
      return `<div class="wh-group"><p class="eyebrow">${escapeHtml(group)}</p><div class="wh-cards">${cards}</div></div>`;
    }).join('');

  // Grupa „Zapotrzebowanie": kafelek z liczbą pozycji poniżej minimum.
  if (replenishment) {
    const meta = OP_TYPE_META.replenishment;
    html += `
      <div class="wh-group"><p class="eyebrow">Zapotrzebowanie</p><div class="wh-cards">${card({
        type: 'replenishment', title: 'Zapotrzebowanie', icon: meta.icon, accent: meta.accent,
        num: replenishment.below || 0, numLabel: 'do uzupełnienia',
        sub: replenishment.rules || 0, subLabel: 'reguł min-max'
      })}</div></div>`;

    // Lista braków: co konkretnie jest poniżej minimum (klik → widok reguł).
    const shortages = replenishment.items || [];
    if (shortages.length) {
      const rows = shortages.map(it => `
        <tr class="wh-shortage-row" data-whgo="replenishment">
          <td>${escapeHtml(it.label)}</td>
          <td class="num">${escapeHtml(it.onHand)}</td>
          <td class="num">${escapeHtml(it.minQty)}</td>
          <td class="num"><strong>${escapeHtml(it.toOrder)}</strong></td>
        </tr>`).join('');
      html += `
        <div class="wh-group">
          <p class="eyebrow">Braki — poniżej minimum</p>
          <div class="admin-content">
            <table class="wh-shortage-table">
              <thead><tr>
                <th>Pozycja / kategoria</th>
                <th class="num">Na stanie</th><th class="num">Minimum</th><th class="num">Do zamówienia</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;
    } else if (replenishment.rules) {
      // Reguły są, ale nic nie spadło poniżej minimum — pozytywny stan.
      html += `
        <div class="wh-group">
          <p class="eyebrow">Braki — poniżej minimum</p>
          <p class="muted wh-shortage-ok">Wszystko powyżej minimum.</p>
        </div>`;
    }
  }

  if (!html) { renderEmpty(whOverviewContent, 'Brak danych.'); return; }
  whOverviewContent.innerHTML = html;
}

// --- Operacje (dokumenty) ---
// „Zapotrzebowanie" to ostatnia zakładka Operacji — nie jest dokumentem (stockOperation),
// tylko widokiem reguł min-max, dlatego renderujemy ją osobno za listą typów.
function renderOpTypeNav() {
  const opTabs = OP_TYPE_ORDER.map(type =>
    `<button class="subtab${type === warehouseOpType ? ' active' : ''}" data-whoptype="${escapeHtml(type)}" type="button">${escapeHtml(OP_TYPE_NAV_LABELS[type])}</button>`);
  const replTab =
    `<button class="subtab${warehouseOpType === 'replenishment' ? ' active' : ''}" data-whoptype="replenishment" type="button">Zapotrzebowanie</button>`;
  whOpTypeNav.innerHTML = opTabs.join('') + replTab;
}

async function openOperations(type) {
  warehouseOpType = type;
  renderOpTypeNav();
  const isRepl = type === 'replenishment';
  if (whNewOperationBtn) {
    whNewOperationBtn.hidden = currentUser?.role !== 'admin';
    whNewOperationBtn.textContent = isRepl ? '+ Reguła min-max' : '+ Nowa operacja';
  }
  if (isRepl) await loadReplenishment();
  else await loadOperationsList(type);
}

async function loadOperationsList(type) {
  const ops = await api(`/warehouse/operations?type=${encodeURIComponent(type)}`);
  renderOperationsList(ops);
}

function renderOperationsList(ops) {
  if (!ops.length) { renderEmpty(whOperationsContent, 'Brak operacji tego typu.'); return; }
  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>Odnośnik</th><th>Z</th><th>Do</th><th>Kontakt</th><th>Zaplanowana data</th><th>Dokument źródłowy</th><th>Status</th>
    </tr></thead>`;
  const tbody = document.createElement('tbody');
  ops.forEach(op => {
    const tr = document.createElement('tr');
    tr.className = 'wh-op-row';
    tr.innerHTML = `
      <td>${escapeHtml(op.reference)}</td>
      <td>${escapeHtml(op.fromName || '—')}</td>
      <td>${escapeHtml(op.toName || '—')}</td>
      <td>${escapeHtml(op.contact || op.supplierName || '—')}</td>
      <td>${op.scheduledAt ? escapeHtml(formatDate(op.scheduledAt)) : '—'}</td>
      <td>${escapeHtml(op.sourceDocument || '—')}</td>
      <td><span class="badge${op.state === 'done' ? ' badge-status' : ''}">${escapeHtml(OP_STATE_LABELS[op.state] || op.state)}</span></td>`;
    tr.addEventListener('click', () => openOperationModal(op.type, op.id).catch(err => showToast(err.message)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  whOperationsContent.innerHTML = '';
  whOperationsContent.appendChild(table);
}

// --- Zapotrzebowanie (reguły min-max) ---
let replenishmentRows = [];

async function loadReplenishment() {
  replenishmentRows = await api('/warehouse/reorder-rules');
  renderReplenishment(replenishmentRows);
}

function renderReplenishment(rows) {
  const isAdmin = currentUser?.role === 'admin';
  if (!rows.length) {
    renderEmpty(whOperationsContent, isAdmin
      ? 'Brak reguł min-max. Dodaj pierwszą regułę, aby śledzić zapotrzebowanie.'
      : 'Brak reguł min-max.');
    return;
  }
  const sorted = [...rows].sort((a, b) => (b.below - a.below) || a.label.localeCompare(b.label));
  const belowCount = rows.filter(r => r.below).length;

  const wrap = document.createElement('div');
  const summary = document.createElement('p');
  summary.className = belowCount ? 'wh-repl-summary' : 'wh-repl-summary muted';
  summary.textContent = belowCount
    ? `${belowCount} ${belowCount === 1 ? 'pozycja wymaga' : 'pozycji wymaga'} uzupełnienia · ${rows.length} reguł`
    : `Wszystko powyżej minimum · ${rows.length} reguł`;
  wrap.appendChild(summary);

  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>Poziom</th><th>Pozycja</th><th>Na stanie</th><th>Min</th><th>Max</th><th>Do zamówienia</th><th>Status</th>${isAdmin ? '<th></th>' : ''}
    </tr></thead>`;
  const tbody = document.createElement('tbody');
  tbody.innerHTML = sorted.map(r => {
    const scopeLabel = r.scope === 'item' ? 'Sprzęt' : 'Kategoria';
    let status;
    if (!r.isActive) status = '<span class="badge badge-muted">Wyłączona</span>';
    else if (r.below) status = '<span class="badge badge-warn">Do uzupełnienia</span>';
    else status = '<span class="badge badge-ok">OK</span>';
    const actions = isAdmin
      ? `<td class="wh-repl-actions">
          <button type="button" class="btn btn-secondary wh-mini" data-repl-edit="${escapeHtml(r.id)}">Edytuj</button>
          <button type="button" class="btn btn-danger wh-mini" data-repl-del="${escapeHtml(r.id)}">Usuń</button>
        </td>`
      : '';
    return `
      <tr class="${r.below ? 'wh-repl-below' : ''}">
        <td><span class="badge badge-scope">${escapeHtml(scopeLabel)}</span></td>
        <td>${escapeHtml(r.label)}${r.note ? `<br><span class="muted">${escapeHtml(r.note)}</span>` : ''}</td>
        <td>${escapeHtml(r.onHand)}</td>
        <td>${escapeHtml(r.minQty)}</td>
        <td>${escapeHtml(r.maxQty)}</td>
        <td>${r.toOrder ? `<strong>${escapeHtml(r.toOrder)}</strong>` : '—'}</td>
        <td>${status}</td>
        ${actions}
      </tr>`;
  }).join('');
  table.appendChild(tbody);
  wrap.appendChild(table);

  whOperationsContent.innerHTML = '';
  whOperationsContent.appendChild(wrap);
}

// Distinct kategorie z kartoteki — do podpowiedzi w polu reguły.
function reorderCategoryNames() {
  const cats = new Set();
  (warehouseFormData?.items || []).forEach(it => { if (it.category) cats.add(it.category); });
  return [...cats].sort((a, b) => a.localeCompare(b));
}

function updateReorderScopeFields() {
  const isItem = reorderScope.value === 'item';
  if (reorderCategoryField) reorderCategoryField.hidden = isItem;
  if (reorderItemField) reorderItemField.hidden = !isItem;
}

async function openReorderRuleModal(id = null, existing = null) {
  await fetchWarehouseFormData();
  reorderCategoryList.innerHTML = reorderCategoryNames()
    .map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
  reorderItem.innerHTML = itemOptions(existing?.scope === 'item' ? existing.target : null);

  currentReorderRule = id ? { id } : null;
  const editing = !!existing;

  reorderRuleTitle.textContent = editing ? 'Edytuj regułę min-max' : 'Nowa reguła min-max';
  reorderScope.value = existing?.scope || 'category';
  reorderCategory.value = existing?.scope === 'category' ? existing.target : '';
  if (existing?.scope === 'item') reorderItem.value = existing.target;
  reorderMin.value = existing ? existing.minQty : 0;
  reorderMax.value = existing ? existing.maxQty : 1;
  reorderNote.value = existing?.note || '';
  reorderActive.checked = existing ? existing.isActive : true;

  // Cel reguły (poziom + pozycja) jest niezmienny po utworzeniu — przy edycji blokujemy.
  reorderScope.disabled = editing;
  reorderCategory.disabled = editing;
  reorderItem.disabled = editing;
  if (reorderActiveField) reorderActiveField.hidden = !editing;
  if (reorderDeleteBtn) reorderDeleteBtn.hidden = !editing;

  updateReorderScopeFields();
  if (!reorderRuleModal.open) reorderRuleModal.showModal();
}

function closeReorderRuleModal() {
  if (reorderRuleModal.open) reorderRuleModal.close();
  currentReorderRule = null;
}

async function saveReorderRule() {
  const editing = !!currentReorderRule?.id;
  const minQty = Math.max(0, Math.floor(Number(reorderMin.value) || 0));
  const maxQty = Math.max(1, Math.floor(Number(reorderMax.value) || 0));
  if (maxQty < minQty) throw new Error('Maksimum nie może być mniejsze niż minimum');
  const note = reorderNote.value.trim();

  if (editing) {
    await api(`/warehouse/reorder-rules/${encodeURIComponent(currentReorderRule.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ minQty, maxQty, note, isActive: reorderActive.checked })
    });
  } else {
    const scope = reorderScope.value;
    const target = scope === 'category' ? reorderCategory.value.trim() : reorderItem.value;
    if (!target) throw new Error(scope === 'category' ? 'Podaj kategorię' : 'Wybierz sprzęt');
    await api('/warehouse/reorder-rules', {
      method: 'POST',
      body: JSON.stringify({ scope, target, minQty, maxQty, note })
    });
  }
}

async function deleteReorderRule(id) {
  if (!confirm('Usunąć tę regułę min-max?')) return false;
  await api(`/warehouse/reorder-rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
  showToast('Usunięto regułę');
  await loadReplenishment();
  return true;
}

// --- Modal operacji ---
function locationOptions(selectedId, kinds) {
  const locs = (warehouseFormData?.locations || []).filter(l => !kinds || kinds.includes(l.kind));
  return locs.map(l =>
    `<option value="${escapeHtml(l.id)}"${l.id === selectedId ? ' selected' : ''}>${escapeHtml(l.name)} (${escapeHtml(l.code || '')})</option>`).join('');
}

function itemOptions(selectedCode, allowNew = false, onlyCategory = null, showStock = false) {
  const cat = onlyCategory ? String(onlyCategory).toLowerCase() : null;
  const items = (warehouseFormData?.items || [])
    .filter(it => !cat || String(it.category || '').trim().toLowerCase() === cat);
  const base = '<option value="">— wybierz produkt —</option>' + items.map(it => {
    // Dla konwersji/wydania pokazujemy dostępny stan na Magazynie w etykiecie.
    const label = showStock ? `${it.name || 'Bez nazwy'} (dostępne: ${Number(it.onHand) || 0})` : (it.name || 'Bez nazwy');
    return `<option value="${escapeHtml(it.itemCode)}"${it.itemCode === selectedCode ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
  return base + (allowNew ? '<option value="__new__">＋ Nowy produkt…</option>' : '');
}

// Dostępny stan na Magazynie (WH/Stock) dla produktu — z form-data.
function itemOnHand(itemCode) {
  const it = (warehouseFormData?.items || []).find(x => x.itemCode === itemCode);
  return it ? (Number(it.onHand) || 0) : 0;
}

function supplierOptions(selectedId) {
  const suppliers = warehouseFormData?.suppliers || [];
  return '<option value="">— bez dostawcy —</option>' + suppliers.map(s =>
    `<option value="${escapeHtml(s.id)}"${s.id === selectedId ? ' selected' : ''}>${escapeHtml(s.name || 'Bez nazwy')}</option>`).join('');
}

function destinationOptions(selectedId) {
  const destinations = warehouseFormData?.deliveryDestinations || [];
  return '<option value="">— wybierz miejsce —</option>' + destinations.map(d =>
    `<option value="${escapeHtml(d.id)}"${d.id === selectedId ? ' selected' : ''}>${escapeHtml(d.name || 'Bez nazwy')}</option>`).join('');
}

function resolveDefaultLocId(code) {
  const l = (warehouseFormData?.locations || []).find(x => x.code === code);
  return l ? l.id : '';
}

function addOperationLine(line = {}) {
  const isAdj = warehouseOpType === 'adjustment';
  const isReceipt = warehouseOpType === 'receipt';
  const isConversion = warehouseOpType === 'conversion';
  const row = document.createElement('div');
  row.className = 'op-line';
  if (isAdj) {
    row.innerHTML = `
      <select class="op-line-item">${itemOptions(line.itemCode)}</select>
      <select class="op-line-loc">${locationOptions(line.locationId || resolveDefaultLocId('WH/Stock'), ['internal', 'employee'])}</select>
      <input class="op-line-counted" type="number" min="0" value="${line.countedQty ?? 0}" />
      <button type="button" class="btn btn-secondary op-line-remove" aria-label="Usuń pozycję">×</button>`;
  } else if (isReceipt) {
    row.innerHTML = `
      <select class="op-line-item">${itemOptions(line.itemCode, true)}</select>
      <input class="op-line-qty" type="number" min="1" value="${line.quantity ?? 1}" />
      <input class="op-line-price" type="number" min="0" step="0.01" value="${line.unitPrice ?? ''}" placeholder="0,00" />
      <button type="button" class="btn btn-secondary op-line-remove" aria-label="Usuń pozycję">×</button>`;
  } else if (isConversion) {
    // Towar (źródło, tylko kat. „towar", z dostępnym stanem) → gadżet (cel, tylko
    // kat. „gadżet" + tworzenie). Ilość ograniczona dostępnym stanem towaru.
    const srcMax = line.itemCode ? itemOnHand(line.itemCode) : 0;
    row.innerHTML = `
      <select class="op-line-item">${itemOptions(line.itemCode, false, 'towar', true)}</select>
      <select class="op-line-target" style="flex:1">${itemOptions(line.targetItemCode, true, 'gadżet')}</select>
      <input class="op-line-qty" type="number" min="1"${srcMax ? ` max="${srcMax}"` : ''} value="${line.quantity ?? 1}" title="${srcMax ? `Dostępne na Magazynie: ${srcMax}` : 'Wybierz towar'}" />
      <button type="button" class="btn btn-secondary op-line-remove" aria-label="Usuń pozycję">×</button>`;
  } else {
    row.innerHTML = `
      <select class="op-line-item">${itemOptions(line.itemCode)}</select>
      <input class="op-line-qty" type="number" min="1" value="${line.quantity ?? 1}" />
      <button type="button" class="btn btn-secondary op-line-remove" aria-label="Usuń pozycję">×</button>`;
  }
  row.querySelector('.op-line-remove').addEventListener('click', () => { row.remove(); refreshOperationStockPanel(); });
  // „＋ Nowy produkt…" w pickerze (przyjęcie) → otwórz okno tworzenia i wskaż nowy.
  const sel = row.querySelector('.op-line-item');
  if (sel) sel.addEventListener('change', () => {
    if (sel.value === '__new__') { sel.value = ''; openNewProductModal(sel); return; }
    // Konwersja: po wyborze towaru ustaw limit ilości = dostępny stan na Magazynie.
    if (isConversion) {
      const qty = row.querySelector('.op-line-qty');
      const max = itemOnHand(sel.value);
      if (qty) {
        if (max > 0) { qty.max = max; if (Number(qty.value) > max) qty.value = max; }
        else qty.removeAttribute('max');
        qty.title = sel.value ? `Dostępne na Magazynie: ${max}` : 'Wybierz towar';
      }
    }
    refreshOperationStockPanel();
  });
  // Konwersja: „＋ utwórz gadżet z tego towaru" w pickerze celu — prefill nazwą towaru, kat. gadżet.
  const tgtSel = row.querySelector('.op-line-target');
  if (tgtSel) tgtSel.addEventListener('change', () => {
    if (tgtSel.value === '__new__') {
      tgtSel.value = '';
      const srcCode = row.querySelector('.op-line-item')?.value || '';
      const srcItem = (warehouseFormData?.items || []).find(it => it.itemCode === srcCode);
      openNewProductModal(tgtSel, { name: srcItem?.name || '', category: 'gadżet' });
      return;
    }
    refreshOperationStockPanel();
  });
  operationLines.appendChild(row);
  refreshOperationStockPanel();
}

function renderOperationLinesHead() {
  operationLinesHead.innerHTML =
    warehouseOpType === 'adjustment' ? '<span>Sprzęt</span><span>Lokalizacja</span><span>Policzono</span><span></span>'
    : warehouseOpType === 'receipt' ? '<span>Produkt</span><span>Ilość</span><span>Cena (zł)</span><span></span>'
    : warehouseOpType === 'conversion' ? '<span>Towar (źródło)</span><span style="flex:1">Gadżet (cel)</span><span>Ilość</span><span></span>'
    : '<span>Sprzęt</span><span>Ilość</span><span></span>';
}

async function openOperationModal(type, id = null) {
  await fetchWarehouseFormData();
  warehouseOpType = type;
  currentOperation = { id, type, state: id ? null : 'draft' };

  const cfg = warehouseFormData?.types?.[type] || {};
  const isAdj = type === 'adjustment';
  const isReceipt = type === 'receipt';
  const isConversion = type === 'conversion';
  const isDelivery = type === 'delivery';
  operationModalType.textContent = OP_TYPE_NAV_LABELS[type] || cfg.label || 'Operacja';
  renderOperationLinesHead();
  operationLines.innerHTML = '';

  // Przyjęcie: bez pól lokalizacji (cel zawsze Magazyn), zamiast „Kontakt" — „Dostawca".
  // Konwersja: bez lokalizacji/kontaktu/dostawcy (oba końce = Magazyn).
  // Dostawa: bez lokalizacji/kontaktu (źródło zawsze Magazyn, cel = „Miejsce dostawy").
  operationFromField.hidden = isAdj || isReceipt || isConversion || isDelivery;
  operationToField.hidden = isAdj || isReceipt || isConversion || isDelivery;
  operationContactField.hidden = isReceipt || isConversion || isDelivery;
  operationSupplierField.hidden = !isReceipt;
  operationDestinationField.hidden = !isDelivery;
  operationFrom.innerHTML = locationOptions(null);
  operationTo.innerHTML = locationOptions(null);
  if (isReceipt) operationSupplier.innerHTML = supplierOptions(null);
  if (isDelivery) operationDestination.innerHTML = destinationOptions(null);

  if (id) {
    const op = await api(`/warehouse/operations/${encodeURIComponent(id)}`);
    currentOperation.state = op.state;
    operationModalTitle.textContent = op.reference;
    if (!isAdj && !isReceipt && !isConversion && !isDelivery) {
      operationFrom.value = op.fromLocationId || '';
      operationTo.value = op.toLocationId || '';
    }
    if (isReceipt) operationSupplier.value = op.supplierId || '';
    if (isDelivery) operationDestination.value = op.destinationId || '';
    operationContact.value = op.contact || '';
    operationScheduled.value = op.scheduledAt ? String(op.scheduledAt).slice(0, 10) : '';
    operationSource.value = op.sourceDocument || '';
    operationNote.value = op.note || '';
    (op.lines || []).forEach(addOperationLine);
    if (!(op.lines || []).length) addOperationLine();
  } else {
    operationModalTitle.textContent = 'Nowa operacja';
    if (!isAdj && !isReceipt && !isConversion && !isDelivery) {
      operationFrom.value = resolveDefaultLocId(cfg.defaultFrom);
      operationTo.value = resolveDefaultLocId(cfg.defaultTo);
    }
    if (isReceipt) operationSupplier.value = '';
    if (isDelivery) operationDestination.value = '';
    operationContact.value = '';
    operationScheduled.value = '';
    operationSource.value = '';
    operationNote.value = '';
    addOperationLine();
  }

  const isAdmin = currentUser?.role === 'admin';
  const locked = currentOperation.state === 'done' || currentOperation.state === 'cancelled';
  const editable = isAdmin && !locked;

  [operationFrom, operationTo, operationContact, operationSupplier, operationDestination, operationScheduled, operationSource, operationNote]
    .forEach(el => { el.disabled = !editable; });
  if (operationNewSupplierBtn) operationNewSupplierBtn.hidden = !(editable && isReceipt);
  if (operationNewDestinationBtn) operationNewDestinationBtn.hidden = !(editable && isDelivery);
  operationAddLineBtn.hidden = !editable;
  operationLines.querySelectorAll('.op-line').forEach(row => {
    row.querySelectorAll('select, input').forEach(el => { el.disabled = !editable; });
    const rm = row.querySelector('.op-line-remove');
    if (rm) rm.style.display = editable ? '' : 'none';
  });
  operationSaveBtn.hidden = !editable;
  operationValidateBtn.hidden = !editable;
  operationCancelOpBtn.hidden = !(editable && id);
  // „Cofnij wykonanie": tylko dla wykonanej operacji (admin) — odwraca i wraca do roboczej.
  if (operationReverseBtn) operationReverseBtn.hidden = !(isAdmin && currentOperation.state === 'done');

  operationStateHint.hidden = !locked;
  if (currentOperation.state === 'done') operationStateHint.textContent = isAdmin
    ? 'Operacja wykonana — wygenerowała ruchy w rejestrze. Aby poprawić, użyj „Cofnij wykonanie".'
    : 'Operacja wykonana — wygenerowała ruchy w rejestrze.';
  if (currentOperation.state === 'cancelled') operationStateHint.textContent = 'Operacja anulowana.';

  if (!operationModal.open) operationModal.showModal();
}

function closeOperationModal() {
  if (operationModal.open) operationModal.close();
  currentOperation = null;
}

function collectOperationPayload() {
  const isAdj = warehouseOpType === 'adjustment';
  const isReceipt = warehouseOpType === 'receipt';
  const isConversion = warehouseOpType === 'conversion';
  const isDelivery = warehouseOpType === 'delivery';
  const lines = [];
  operationLines.querySelectorAll('.op-line').forEach(row => {
    const itemCode = row.querySelector('.op-line-item')?.value;
    if (!itemCode || itemCode === '__new__') return;
    if (isAdj) {
      lines.push({
        itemCode,
        locationId: row.querySelector('.op-line-loc')?.value || null,
        countedQty: Number(row.querySelector('.op-line-counted')?.value) || 0
      });
    } else if (isReceipt) {
      lines.push({
        itemCode,
        quantity: Number(row.querySelector('.op-line-qty')?.value) || 1,
        unitPrice: Number(row.querySelector('.op-line-price')?.value) || 0
      });
    } else if (isConversion) {
      const targetItemCode = row.querySelector('.op-line-target')?.value;
      if (!targetItemCode || targetItemCode === '__new__') return; // pomiń niepełną pozycję
      lines.push({ itemCode, targetItemCode, quantity: Number(row.querySelector('.op-line-qty')?.value) || 1 });
    } else {
      lines.push({ itemCode, quantity: Number(row.querySelector('.op-line-qty')?.value) || 1 });
    }
  });
  const payload = {
    type: warehouseOpType,
    scheduledAt: operationScheduled.value || null,
    sourceDocument: operationSource.value.trim(),
    note: operationNote.value.trim(),
    lines
  };
  if (isReceipt) {
    // Cel zawsze Magazyn (backend domyślnie Suppliers→WH/Stock); zamiast kontaktu — dostawca.
    payload.supplierId = operationSupplier.value || null;
  } else if (isAdj) {
    payload.contact = operationContact.value.trim();
    payload.toLocationId = lines[0]?.locationId || resolveDefaultLocId('WH/Stock');
  } else if (isConversion) {
    // Bez pól lokalizacji/kontaktu — backend rozdziela ruchy Magazyn↔VIRT/Conversion.
  } else if (isDelivery) {
    // Źródło zawsze Magazyn, cel zawsze wirtualne „Wydania" (backend wymusza);
    // tu przekazujemy tylko wybrane miejsce dostawy (odbiorcę).
    payload.destinationId = operationDestination.value || null;
  } else {
    payload.contact = operationContact.value.trim();
    payload.fromLocationId = operationFrom.value || null;
    payload.toLocationId = operationTo.value || null;
  }
  return payload;
}

// Klient-side blokada nadmiaru przy konwersji: ilość nie może przekroczyć dostępnego
// stanu towaru na Magazynie. Serwer i tak waliduje — to szybki feedback przed wysyłką.
function checkConversionStock() {
  if (warehouseOpType !== 'conversion') return;
  operationLines.querySelectorAll('.op-line').forEach(row => {
    const code = row.querySelector('.op-line-item')?.value;
    if (!code || code === '__new__') return;
    const qty = Number(row.querySelector('.op-line-qty')?.value) || 0;
    const avail = itemOnHand(code);
    if (qty > avail) {
      const name = (warehouseFormData?.items || []).find(it => it.itemCode === code)?.name || code;
      throw new Error(`Za mało na stanie: ${name} (dostępne ${avail}, żądane ${qty})`);
    }
  });
}

// Panel stanu: zbiera produkty wybrane w pozycjach i na sztywno pokazuje ich
// dostępny stan na Magazynie. Wołany przy zmianie wyboru / dodaniu / usunięciu pozycji.
function refreshOperationStockPanel() {
  if (!operationStockPanel) return;
  const seen = new Set();
  const rows = [];
  operationLines.querySelectorAll('.op-line').forEach(row => {
    ['.op-line-item', '.op-line-target'].forEach(sel => {
      const code = row.querySelector(sel)?.value;
      if (!code || code === '__new__' || seen.has(code)) return;
      seen.add(code);
      const it = (warehouseFormData?.items || []).find(x => x.itemCode === code);
      if (it) rows.push({ name: it.name || code, onHand: Number(it.onHand) || 0 });
    });
  });
  if (!rows.length) {
    operationStockPanel.innerHTML = '<p class="op-stock-empty">Wybierz produkt, aby zobaczyć dostępny stan na Magazynie.</p>';
  } else {
    operationStockPanel.innerHTML =
      '<p class="op-stock-title">Stan na Magazynie</p><ul>' +
      rows.map(r => `<li><span class="op-stock-name">${escapeHtml(r.name)}</span><span class="op-stock-qty">${r.onHand} szt.</span></li>`).join('') +
      '</ul>';
  }
  operationStockPanel.hidden = false;
}

async function saveOperation() {
  const payload = collectOperationPayload();
  if (!payload.lines.length) throw new Error('Dodaj przynajmniej jedną pozycję');
  if (currentOperation?.id) {
    await api(`/warehouse/operations/${encodeURIComponent(currentOperation.id)}`,
      { method: 'PATCH', body: JSON.stringify(payload) });
    return currentOperation.id;
  }
  const res = await api('/warehouse/operations', { method: 'POST', body: JSON.stringify(payload) });
  currentOperation.id = res.id;
  return res.id;
}

// --- „Nowy produkt" wprost z przyjęcia ---
let newProductTargetSelect = null;

function openNewProductModal(targetSelect, opts = {}) {
  if (currentUser?.role !== 'admin') { showToast('Tworzenie produktu wymaga uprawnień administratora.'); return; }
  newProductTargetSelect = targetSelect || null;
  if (newProductName) newProductName.value = opts.name || '';
  if (newProductCategory) newProductCategory.value = opts.category || 'Towar';
  if (newProductModal && !newProductModal.open) newProductModal.showModal();
}

function closeNewProductModal() {
  newProductTargetSelect = null;
  if (newProductModal?.open) newProductModal.close();
}

async function saveNewProduct() {
  const name = (newProductName?.value || '').trim();
  const category = newProductCategory?.value || 'Towar';
  if (!name) { showToast('Podaj nazwę produktu.'); return; }
  try {
    const res = await api('/warehouse/products', { method: 'POST', body: JSON.stringify({ name, category }) });
    // Dołóż do cache, by produkt pojawił się w kolejnych pickerach.
    (warehouseFormData?.items || []).push({ itemCode: res.itemCode, name: res.name, category: res.category });
    if (newProductTargetSelect) {
      const opt = document.createElement('option');
      opt.value = res.itemCode;
      opt.textContent = res.name;
      const newOpt = [...newProductTargetSelect.options].find(o => o.value === '__new__');
      newProductTargetSelect.insertBefore(opt, newOpt || null);
      newProductTargetSelect.value = res.itemCode;
    }
    showToast(`Utworzono produkt: ${res.name}`);
    closeNewProductModal();
    refreshOperationStockPanel();
  } catch (err) { showToast(err.message); }
}

// --- Dostawcy: kartoteka + okno edycji ---
let editingSupplierId = null;

function openSupplierModal(supplier = null) {
  if (currentUser?.role !== 'admin') { showToast('Zarządzanie dostawcami wymaga uprawnień administratora.'); return; }
  editingSupplierId = supplier?.id || null;
  if (supplierModalTitle) supplierModalTitle.textContent = supplier ? 'Edytuj dostawcę' : 'Nowy dostawca';
  if (supplierName) supplierName.value = supplier?.name || '';
  if (supplierContact) supplierContact.value = supplier?.contact || '';
  if (supplierNotes) supplierNotes.value = supplier?.notes || '';
  if (supplierDeleteBtn) supplierDeleteBtn.hidden = !supplier;
  if (supplierModal && !supplierModal.open) supplierModal.showModal();
}

function closeSupplierModal() {
  editingSupplierId = null;
  if (supplierModal?.open) supplierModal.close();
}

async function saveSupplier() {
  const name = (supplierName?.value || '').trim();
  if (!name) { showToast('Podaj nazwę dostawcy.'); return; }
  const body = JSON.stringify({
    name,
    contact: (supplierContact?.value || '').trim(),
    notes: (supplierNotes?.value || '').trim()
  });
  try {
    let created = null;
    if (editingSupplierId) {
      await api(`/warehouse/suppliers/${encodeURIComponent(editingSupplierId)}`, { method: 'PATCH', body });
    } else {
      created = await api('/warehouse/suppliers', { method: 'POST', body });
    }
    showToast('Zapisano dostawcę.');
    closeSupplierModal();
    warehouseFormData = null;
    await fetchWarehouseFormData();
    // Jeśli otwarte okno przyjęcia i to nowy dostawca — wskaż go od razu.
    if (created && operationSupplier && operationSupplierField && !operationSupplierField.hidden) {
      operationSupplier.innerHTML = supplierOptions(created.id);
    }
    if (whConfigView && !whConfigView.hidden) await renderWarehouseConfig();
  } catch (err) { showToast(err.message); }
}

async function deleteSupplier() {
  if (!editingSupplierId) return;
  if (!confirm('Usunąć dostawcę? Historyczne przyjęcia zachowają jego nazwę.')) return;
  try {
    await api(`/warehouse/suppliers/${encodeURIComponent(editingSupplierId)}`, { method: 'DELETE' });
    showToast('Usunięto dostawcę.');
    closeSupplierModal();
    warehouseFormData = null;
    await fetchWarehouseFormData();
    if (whConfigView && !whConfigView.hidden) await renderWarehouseConfig();
  } catch (err) { showToast(err.message); }
}

// --- Miejsca dostaw: kartoteka + okno edycji (analogicznie do dostawców) ---
let editingDestinationId = null;

function openDestinationModal(destination = null) {
  if (currentUser?.role !== 'admin') { showToast('Zarządzanie miejscami dostaw wymaga uprawnień administratora.'); return; }
  editingDestinationId = destination?.id || null;
  if (destinationModalTitle) destinationModalTitle.textContent = destination ? 'Edytuj miejsce dostawy' : 'Nowe miejsce dostawy';
  if (destinationName) destinationName.value = destination?.name || '';
  if (destinationContact) destinationContact.value = destination?.contact || '';
  if (destinationNotes) destinationNotes.value = destination?.notes || '';
  if (destinationDeleteBtn) destinationDeleteBtn.hidden = !destination;
  if (destinationModal && !destinationModal.open) destinationModal.showModal();
}

function closeDestinationModal() {
  editingDestinationId = null;
  if (destinationModal?.open) destinationModal.close();
}

async function saveDestination() {
  const name = (destinationName?.value || '').trim();
  if (!name) { showToast('Podaj nazwę miejsca dostawy.'); return; }
  const body = JSON.stringify({
    name,
    contact: (destinationContact?.value || '').trim(),
    notes: (destinationNotes?.value || '').trim()
  });
  try {
    let created = null;
    if (editingDestinationId) {
      await api(`/warehouse/delivery-destinations/${encodeURIComponent(editingDestinationId)}`, { method: 'PATCH', body });
    } else {
      created = await api('/warehouse/delivery-destinations', { method: 'POST', body });
    }
    showToast('Zapisano miejsce dostawy.');
    closeDestinationModal();
    warehouseFormData = null;
    await fetchWarehouseFormData();
    // Jeśli otwarte okno dostawy i to nowe miejsce — wskaż je od razu.
    if (created && operationDestination && operationDestinationField && !operationDestinationField.hidden) {
      operationDestination.innerHTML = destinationOptions(created.id);
    }
    if (whConfigView && !whConfigView.hidden) await renderWarehouseConfig();
  } catch (err) { showToast(err.message); }
}

async function deleteDestination() {
  if (!editingDestinationId) return;
  if (!confirm('Usunąć miejsce dostawy? Historyczne dostawy zachowają jego nazwę.')) return;
  try {
    await api(`/warehouse/delivery-destinations/${encodeURIComponent(editingDestinationId)}`, { method: 'DELETE' });
    showToast('Usunięto miejsce dostawy.');
    closeDestinationModal();
    warehouseFormData = null;
    await fetchWarehouseFormData();
    if (whConfigView && !whConfigView.hidden) await renderWarehouseConfig();
  } catch (err) { showToast(err.message); }
}

// --- Konfiguracja: dostawcy + miejsca dostaw + lokalizacje ---
async function renderWarehouseConfig() {
  const [locations, suppliers, destinations] = await Promise.all([
    fetchWarehouseLocations(),
    api('/warehouse/suppliers'),
    api('/warehouse/delivery-destinations')
  ]);
  renderWarehouseSuppliers(suppliers);
  renderWarehouseDestinations(destinations);
  renderWarehouseLocations(locations);
}

function renderWarehouseDestinations(destinations) {
  if (!warehouseDestinationsContent) return;
  if (!destinations.length) { renderEmpty(warehouseDestinationsContent, 'Brak miejsc dostaw. Dodaj pierwsze przyciskiem powyżej.'); return; }
  const isAdmin = currentUser?.role === 'admin';
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Nazwa</th><th>Kontakt</th><th>Notatka</th></tr></thead>';
  const tbody = document.createElement('tbody');
  destinations.forEach(d => {
    const tr = document.createElement('tr');
    if (isAdmin) { tr.className = 'wh-product-row'; tr.title = 'Kliknij, aby edytować miejsce dostawy'; }
    tr.innerHTML =
      `<td>${escapeHtml(d.name || '—')}</td>` +
      `<td>${escapeHtml(d.contact || '—')}</td>` +
      `<td class="muted">${escapeHtml(d.notes || '—')}</td>`;
    if (isAdmin) tr.addEventListener('click', () => openDestinationModal(d));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  warehouseDestinationsContent.innerHTML = '';
  warehouseDestinationsContent.appendChild(table);
}

function renderWarehouseSuppliers(suppliers) {
  if (!warehouseSuppliersContent) return;
  if (!suppliers.length) { renderEmpty(warehouseSuppliersContent, 'Brak dostawców. Dodaj pierwszego przyciskiem powyżej.'); return; }
  const isAdmin = currentUser?.role === 'admin';
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Nazwa</th><th>Kontakt</th><th>Notatka</th></tr></thead>';
  const tbody = document.createElement('tbody');
  suppliers.forEach(s => {
    const tr = document.createElement('tr');
    if (isAdmin) { tr.className = 'wh-product-row'; tr.title = 'Kliknij, aby edytować dostawcę'; }
    tr.innerHTML =
      `<td>${escapeHtml(s.name || '—')}</td>` +
      `<td>${escapeHtml(s.contact || '—')}</td>` +
      `<td class="muted">${escapeHtml(s.notes || '—')}</td>`;
    if (isAdmin) tr.addEventListener('click', () => openSupplierModal(s));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  warehouseSuppliersContent.innerHTML = '';
  warehouseSuppliersContent.appendChild(table);
}

async function refreshWarehouseHeader() {
  warehouseLocationsCache = null;
  const locations = await fetchWarehouseLocations(true);
  renderWarehouseSummary(locations);
  populateLocationFilter(locations);
}

// --- Produkty (kartoteka: produkt = pozycja z partiami cenowymi) ---
async function loadWarehouseProducts() {
  warehouseProductsState = await api('/warehouse/products');
  applyProductsFilter();
}

function applyProductsFilter() {
  const q = normalizeText(whProductsSearch?.value || '');
  let rows = warehouseProductsState;
  if (q) rows = rows.filter(r =>
    normalizeText(r.itemCode).includes(q) ||
    normalizeText(r.name).includes(q) ||
    normalizeText(r.category).includes(q));
  warehouseProductsFiltered = rows;
  if (whProductsExport) whProductsExport.disabled = !rows.length;
  if (!rows.length) { renderEmpty(whProductsContent, 'Brak produktów.'); return; }

  const isAdmin = currentUser?.role === 'admin';
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Kod</th><th>Nazwa</th><th>Kategoria</th><th>Ilość</th><th>Partie</th><th>Wartość</th></tr></thead>';
  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    if (isAdmin) { tr.className = 'wh-product-row'; tr.title = 'Kliknij, aby edytować produkt i partie'; }
    tr.innerHTML =
      `<td>${escapeHtml(r.itemCode || '—')}</td>` +
      `<td>${escapeHtml(r.name || '—')}</td>` +
      `<td>${escapeHtml(r.category || '—')}</td>` +
      `<td>${escapeHtml(r.quantity)}</td>` +
      `<td>${escapeHtml(r.batchCount || 0)}</td>` +
      `<td>${escapeHtml(formatPln(r.totalValue))}</td>`;
    if (isAdmin) tr.addEventListener('click', () => openWarehouseProductModal(r));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  whProductsContent.innerHTML = '';
  whProductsContent.appendChild(table);

  if (isAdmin) {
    const hint = document.createElement('p');
    hint.className = 'muted wh-products-hint';
    hint.textContent = 'Kliknij produkt, aby edytować dane i partie cenowe.';
    whProductsContent.appendChild(hint);
  }
}

// Formatowanie kwoty w PLN (dwie miejsca po przecinku).
function formatPln(value) {
  return `${(Number(value) || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}

// --- Eksport CSV widoków Magazynu (kod produktu wraca tutaj na życzenie) ---
// Eksportujemy to, co aktualnie widać (po filtrze). Wartość liczbowa z kropką
// dziesiętną, żeby była maszynowo czytelna; BOM/UTF-8 obsługuje downloadCsv.
function exportWarehouseProductsCsv() {
  const rows = warehouseProductsFiltered;
  if (!rows.length) { showToast('Brak produktów do eksportu.'); return; }
  const headers = ['Kod', 'Nazwa', 'Kategoria', 'Marka', 'Model', 'Ilosc', 'Partie', 'Wartosc (zl)', 'Notatka'];
  const data = rows.map(r => [
    r.itemCode || '', r.name || '', r.category || '', r.brand || '', r.model || '',
    r.quantity ?? 0, r.batchCount || 0, (Number(r.totalValue) || 0).toFixed(2), r.notes || ''
  ]);
  downloadCsv(`magazyn-produkty-${csvDateStamp()}.csv`, buildCsv(headers, data));
}

function exportWarehouseStockCsv() {
  const rows = warehouseStockFiltered;
  if (!rows.length) { showToast('Brak pozycji do eksportu.'); return; }
  const headers = ['Kod', 'Nazwa', 'Kategoria', 'Lokalizacja', 'Ilosc'];
  const data = rows.map(r => [
    r.itemCode || '', r.name || '', r.category || '', r.locationName || '', r.quantity ?? 0
  ]);
  downloadCsv(`magazyn-stan-${csvDateStamp()}.csv`, buildCsv(headers, data));
}

function exportWarehouseMovesCsv() {
  const rows = warehouseMovesState;
  if (!rows.length) { showToast('Brak ruchów do eksportu.'); return; }
  const headers = ['Data', 'Sprzet', 'Kod', 'Z', 'Do', 'Ilosc', 'Rodzaj', 'Osoba'];
  const data = rows.map(m => [
    formatDateTime(m.doneAt), m.itemName || '', m.itemCode || '', m.fromName || '', m.toName || '',
    m.quantity ?? 0, MOVE_KIND_LABELS[m.kind] || m.kind || '', m.actorEmail || ''
  ]);
  downloadCsv(`magazyn-ruchy-${csvDateStamp()}.csv`, buildCsv(headers, data));
}

// --- Okno produktu Magazynu: edycja danych + partie cenowe (Ask 2 + Ask 3) ---
let editingWarehouseProductId = null;

function addBatchRow(batch = {}) {
  if (!whBatchesList) return;
  const row = document.createElement('div');
  row.className = 'wh-batch-row';
  row.innerHTML =
    `<input class="wh-batch-qty" type="number" min="0" step="1" value="${batch.qty ?? ''}" placeholder="0" />` +
    `<input class="wh-batch-price" type="number" min="0" step="0.01" value="${batch.unitPrice ?? ''}" placeholder="0,00" />` +
    `<input class="wh-batch-note" type="text" value="${escapeHtml(batch.note || '')}" placeholder="np. dostawca / data" />` +
    `<button type="button" class="btn btn-danger wh-batch-remove" aria-label="Usuń partię">×</button>`;
  row.querySelector('.wh-batch-remove').addEventListener('click', () => { row.remove(); recomputeBatchTotals(); });
  row.querySelectorAll('input').forEach(i => i.addEventListener('input', recomputeBatchTotals));
  whBatchesList.appendChild(row);
}

function collectBatches() {
  return [...(whBatchesList?.querySelectorAll('.wh-batch-row') || [])].map(row => ({
    qty: Number(row.querySelector('.wh-batch-qty').value) || 0,
    unitPrice: Number(row.querySelector('.wh-batch-price').value) || 0,
    note: row.querySelector('.wh-batch-note').value.trim()
  })).filter(b => b.qty > 0 || b.unitPrice > 0 || b.note);
}

function recomputeBatchTotals() {
  if (!whBatchesTotal) return;
  const batches = collectBatches();
  const totalQty = batches.reduce((s, b) => s + b.qty, 0);
  const totalValue = batches.reduce((s, b) => s + b.qty * b.unitPrice, 0);
  whBatchesTotal.textContent = `Łącznie: ${totalQty} szt. · wartość ${formatPln(totalValue)}`;
}

function openWarehouseProductModal(product) {
  if (!warehouseProductModal || !product) return;
  if (currentUser?.role !== 'admin') {
    showToast('Edycja produktu wymaga uprawnień administratora.');
    return;
  }
  editingWarehouseProductId = product.id;
  if (whProductTitle) whProductTitle.textContent = product.name || 'Produkt';
  // Kod jest teraz edytowalnym polem w formularzu — caption pod tytułem zbędny.
  if (whProductCode) whProductCode.hidden = true;
  if (whProductCodeInput) whProductCodeInput.value = product.itemCode || '';
  if (whProductName) whProductName.value = product.name || '';
  setSelectValue(whProductCategory, product.category);
  if (whProductBrand) whProductBrand.value = product.brand || '';
  if (whProductModel) whProductModel.value = product.model || '';
  if (whProductNotes) whProductNotes.value = product.notes || '';
  if (whBatchesList) whBatchesList.innerHTML = '';
  const batches = Array.isArray(product.priceBatches) ? product.priceBatches : [];
  if (batches.length) batches.forEach(addBatchRow);
  else addBatchRow();
  recomputeBatchTotals();
  loadProductHistory(product.itemCode);
  if (!warehouseProductModal.open) warehouseProductModal.showModal();
}

// Historia ruchów produktu (rejestr stockMoves) — pokazywana w oknie produktu.
// Korzysta z istniejącego endpointu /warehouse/moves?itemCode=.
async function loadProductHistory(itemCode) {
  if (!whProductHistoryContent) return;
  if (!itemCode) { renderEmpty(whProductHistoryContent, 'Brak kodu — historia niedostępna.'); return; }
  whProductHistoryContent.innerHTML = '<p class="muted">Wczytywanie historii…</p>';
  try {
    const moves = await api(`/warehouse/moves?itemCode=${encodeURIComponent(itemCode)}&limit=200`);
    renderProductHistory(moves);
  } catch (err) {
    whProductHistoryContent.innerHTML = `<p class="muted">Nie udało się wczytać historii: ${escapeHtml(err.message)}</p>`;
  }
}

function renderProductHistory(moves) {
  if (!whProductHistoryContent) return;
  if (!Array.isArray(moves) || !moves.length) {
    renderEmpty(whProductHistoryContent, 'Brak ruchów dla tego produktu.');
    return;
  }
  const table = document.createElement('table');
  table.className = 'wh-history-table';
  table.innerHTML = `
    <thead><tr>
      <th>Data</th><th>Z</th><th>Do</th><th>Ilość</th><th>Rodzaj</th><th>Dokument</th><th>Osoba</th>
    </tr></thead>`;
  const tbody = document.createElement('tbody');
  tbody.innerHTML = moves.map(m => `
    <tr>
      <td>${escapeHtml(formatDateTime(m.doneAt))}</td>
      <td>${escapeHtml(m.fromName || '—')}</td>
      <td>${escapeHtml(m.toName || '—')}</td>
      <td>${escapeHtml(m.quantity)}</td>
      <td>${escapeHtml(MOVE_KIND_LABELS[m.kind] || m.kind || '—')}</td>
      <td class="muted">${escapeHtml(m.note || '—')}</td>
      <td class="muted">${escapeHtml(m.actorEmail || '—')}</td>
    </tr>`).join('');
  table.appendChild(tbody);
  whProductHistoryContent.innerHTML = '';
  whProductHistoryContent.appendChild(table);
}

function closeWarehouseProductModal() {
  editingWarehouseProductId = null;
  if (warehouseProductModal?.open) warehouseProductModal.close();
}

async function saveWarehouseProduct() {
  if (!editingWarehouseProductId) return;
  // Kod normalizujemy jak backend (wielkie litery, bez spacji wiodących). Zmiana
  // kaskaduje po wszystkich kolekcjach (cascadeItemCodeRename); duplikat → 409.
  const itemCode = (whProductCodeInput?.value || '').trim().toUpperCase();
  const payload = {
    itemCode,
    name: (whProductName?.value || '').trim(),
    category: whProductCategory?.value || '',
    brand: (whProductBrand?.value || '').trim(),
    model: (whProductModel?.value || '').trim(),
    notes: (whProductNotes?.value || '').trim(),
    priceBatches: collectBatches()
  };
  if (!payload.name) { showToast('Podaj nazwę produktu.'); return; }
  if (!payload.itemCode) { showToast('Podaj kod produktu.'); return; }
  try {
    await api(`/admin/items/${editingWarehouseProductId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    showToast(`Zapisano: ${payload.name}`);
    closeWarehouseProductModal();
    await loadWarehouseProducts();
  } catch (err) {
    showToast(err.message);
  }
}

// --- Raportowanie (Stan / Historia ruchów) ---
async function switchReportView(view) {
  warehouseReportView = view;
  document.querySelectorAll('#whReportNav .subtab').forEach(b =>
    b.classList.toggle('active', b.dataset.whreport === view));
  if (whReportStock) whReportStock.hidden = view !== 'stock';
  if (whReportValuation) whReportValuation.hidden = view !== 'valuation';
  if (whReportMoves) whReportMoves.hidden = view !== 'moves';
  if (whReportPeriod) whReportPeriod.hidden = view !== 'period';
  if (view === 'stock') await loadWarehouseStock();
  else if (view === 'valuation') await loadWarehouseValuation();
  else if (view === 'moves') await loadWarehouseMoves();
  else if (view === 'period') await loadWarehouseMovesReport();
}

async function loadWarehouseStock() {
  warehouseStockState = await api('/warehouse/stock');
  applyWarehouseStockFilter();
}

// Filtr po stronie klienta (jak lista dostępnego sprzętu) — snappy, bez round-tripów.
function applyWarehouseStockFilter() {
  const q = normalizeText(warehouseSearchInput?.value || '');
  const loc = warehouseLocationFilter?.value || '';
  let rows = warehouseStockState;
  if (loc) rows = rows.filter(r => r.locationId === loc);
  if (q) rows = rows.filter(r =>
    normalizeText(r.itemCode).includes(q) ||
    normalizeText(r.name).includes(q) ||
    normalizeText(r.category).includes(q));
  warehouseStockFiltered = rows;
  if (whStockExport) whStockExport.disabled = !rows.length;
  renderWarehouseStock(rows);
}

function renderWarehouseStock(rows) {
  if (!rows.length) { renderEmpty(warehouseStockContent, 'Brak pozycji na stanie.'); return; }
  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>Kod</th><th>Nazwa</th><th>Kategoria</th><th>Lokalizacja</th><th>Ilość</th>
    </tr></thead>`;
  const tbody = document.createElement('tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.itemCode || '—')}</td>
      <td>${escapeHtml(r.name || '—')}</td>
      <td>${escapeHtml(r.category || '—')}</td>
      <td>${escapeHtml(r.locationName || '—')}</td>
      <td>${escapeHtml(r.quantity)}</td>
    </tr>`).join('');
  table.appendChild(tbody);
  warehouseStockContent.innerHTML = '';
  warehouseStockContent.appendChild(table);
}

// --- Wycena stanu (Σ ilość × cena zakupu wg partii) ---
async function loadWarehouseValuation() {
  warehouseValuationState = await api('/warehouse/valuation');
  applyWarehouseValuationFilter();
}

// Filtr po stronie klienta (jak Stan) — zawęża widoczne produkty; sumy nagłówka
// przeliczamy z przefiltrowanych wierszy, żeby „co widać, to się sumuje".
function applyWarehouseValuationFilter() {
  const data = warehouseValuationState;
  if (!data) { warehouseValuationFiltered = []; return; }
  const q = normalizeText(whValuationSearch?.value || '');
  const rows = [];
  for (const cat of data.categories || []) {
    for (const p of cat.products || []) {
      if (q && !(
        normalizeText(p.itemCode).includes(q) ||
        normalizeText(p.name).includes(q) ||
        normalizeText(cat.category).includes(q)
      )) continue;
      rows.push({ ...p, category: cat.category });
    }
  }
  warehouseValuationFiltered = rows;
  if (whValuationExport) whValuationExport.disabled = !rows.length;
  renderWarehouseValuation(rows);
}

function renderWarehouseValuation(rows) {
  // Nagłówek z sumami liczonymi z aktualnie widocznych wierszy.
  const totalValue = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
  const totalQty = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const unpriced = rows.reduce((s, r) => s + (r.batchCount ? 0 : (Number(r.qty) || 0)), 0);
  if (whValuationSummary) {
    whValuationSummary.innerHTML = `
      <div class="wh-valuation-total">${escapeHtml(formatPln(totalValue))}</div>
      <div class="muted">${escapeHtml(rows.length)} pozycji · ${escapeHtml(totalQty)} szt.${
        unpriced > 0 ? ` · ${escapeHtml(unpriced)} szt. bez ceny (0 zł)` : ''
      }</div>`;
  }

  if (!rows.length) { renderEmpty(whValuationContent, 'Brak produktów do wyceny.'); return; }

  // Grupowanie po kategorii z wierszem-podsumowaniem; kolejność kategorii wg wartości.
  const byCat = new Map();
  for (const r of rows) {
    if (!byCat.has(r.category)) byCat.set(r.category, []);
    byCat.get(r.category).push(r);
  }
  const cats = [...byCat.entries()]
    .map(([category, products]) => ({
      category,
      products,
      value: products.reduce((s, p) => s + (Number(p.value) || 0), 0),
      qty: products.reduce((s, p) => s + (Number(p.qty) || 0), 0)
    }))
    .sort((a, b) => b.value - a.value || a.category.localeCompare(b.category, 'pl'));

  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>Kategoria</th><th>Kod</th><th>Nazwa</th>
      <th class="num">Ilość</th><th class="num">Śr. cena</th><th class="num">Wartość</th>
    </tr></thead>`;
  const tbody = document.createElement('tbody');
  let html = '';
  for (const c of cats) {
    for (const p of c.products) {
      html += `
        <tr>
          <td class="muted">${escapeHtml(c.category)}</td>
          <td>${escapeHtml(p.itemCode || '—')}</td>
          <td>${escapeHtml(p.name || '—')}</td>
          <td class="num">${escapeHtml(p.qty)}</td>
          <td class="num">${escapeHtml(formatPln(p.avgUnitPrice))}</td>
          <td class="num">${escapeHtml(formatPln(p.value))}</td>
        </tr>`;
    }
    html += `
      <tr class="wh-valuation-subtotal">
        <td colspan="3"><strong>Razem: ${escapeHtml(c.category)}</strong></td>
        <td class="num"><strong>${escapeHtml(c.qty)}</strong></td>
        <td></td>
        <td class="num"><strong>${escapeHtml(formatPln(c.value))}</strong></td>
      </tr>`;
  }
  tbody.innerHTML = html;
  table.appendChild(tbody);
  whValuationContent.innerHTML = '';
  whValuationContent.appendChild(table);
}

function exportWarehouseValuationCsv() {
  const rows = warehouseValuationFiltered;
  if (!rows.length) { showToast('Brak produktów do eksportu.'); return; }
  const headers = ['Kategoria', 'Kod', 'Nazwa', 'Ilosc', 'Srednia cena (zl)', 'Wartosc (zl)'];
  const data = rows.map(r => [
    r.category || '', r.itemCode || '', r.name || '',
    r.qty ?? 0, (Number(r.avgUnitPrice) || 0).toFixed(2), (Number(r.value) || 0).toFixed(2)
  ]);
  downloadCsv(`magazyn-wycena-${csvDateStamp()}.csv`, buildCsv(headers, data));
}

async function loadWarehouseMoves() {
  const moves = await api('/warehouse/moves?limit=200');
  warehouseMovesState = moves;
  if (whMovesExport) whMovesExport.disabled = !moves.length;
  renderWarehouseMoves(moves);
}

function renderWarehouseMoves(moves) {
  if (!moves.length) { renderEmpty(warehouseMovesContent, 'Brak ruchów magazynowych.'); return; }
  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>Data</th><th>Sprzęt</th><th>Kod</th><th>Z</th><th>Do</th><th>Ilość</th><th>Rodzaj</th><th>Osoba</th>
    </tr></thead>`;
  const tbody = document.createElement('tbody');
  tbody.innerHTML = moves.map(m => `
    <tr>
      <td>${escapeHtml(formatDateTime(m.doneAt))}</td>
      <td>${escapeHtml(m.itemName || '—')}</td>
      <td>${escapeHtml(m.itemCode || '—')}</td>
      <td>${escapeHtml(m.fromName || '—')}</td>
      <td>${escapeHtml(m.toName || '—')}</td>
      <td>${escapeHtml(m.quantity)}</td>
      <td>${escapeHtml(MOVE_KIND_LABELS[m.kind] || m.kind || '—')}</td>
      <td class="muted">${escapeHtml(m.actorEmail || '—')}</td>
    </tr>`).join('');
  table.appendChild(tbody);
  warehouseMovesContent.innerHTML = '';
  warehouseMovesContent.appendChild(table);
}

// --- Raport ruchów w okresie (filtr dat + rodzaj, podsumowanie wg rodzaju) ---
function toDateInputValue(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Ustawia kontrolki raz: domyślny zakres (ostatnie 30 dni) i listę rodzajów ruchu.
function ensureMovesReportControls() {
  if (whPeriodTo && !whPeriodTo.value) whPeriodTo.value = toDateInputValue(new Date());
  if (whPeriodFrom && !whPeriodFrom.value) {
    const d = new Date(); d.setDate(d.getDate() - 30);
    whPeriodFrom.value = toDateInputValue(d);
  }
  if (whPeriodKind && !whPeriodKind.options.length) {
    whPeriodKind.innerHTML = ['<option value="">Wszystkie rodzaje</option>']
      .concat(Object.entries(MOVE_KIND_LABELS).map(([k, label]) =>
        `<option value="${escapeHtml(k)}">${escapeHtml(label)}</option>`)).join('');
  }
}

async function loadWarehouseMovesReport() {
  ensureMovesReportControls();
  const params = new URLSearchParams();
  if (whPeriodFrom?.value) params.set('from', whPeriodFrom.value);
  if (whPeriodTo?.value) params.set('to', whPeriodTo.value);
  if (whPeriodKind?.value) params.set('kind', whPeriodKind.value);
  warehouseMovesReportState = await api(`/warehouse/moves-report?${params.toString()}`);
  if (whPeriodExport) whPeriodExport.disabled = !(warehouseMovesReportState?.rows || []).length;
  renderWarehouseMovesReport(warehouseMovesReportState);
}

function renderWarehouseMovesReport(data) {
  const byKind = data?.byKind || [];
  const rows = data?.rows || [];

  // Nagłówek: podsumowanie wg rodzaju ruchu + wiersz „Razem".
  if (whPeriodSummary) {
    if (!byKind.length) {
      whPeriodSummary.innerHTML = '';
    } else {
      const kindRows = byKind.map(k => `
        <tr>
          <td>${escapeHtml(MOVE_KIND_LABELS[k.kind] || k.kind)}</td>
          <td class="num">${escapeHtml(k.moves)}</td>
          <td class="num">${escapeHtml(k.totalQty)}</td>
          <td class="num">${escapeHtml(k.items)}</td>
        </tr>`).join('');
      whPeriodSummary.innerHTML = `
        <table class="wh-period-kinds">
          <thead><tr>
            <th>Rodzaj</th><th class="num">Ruchów</th><th class="num">Σ ilość</th><th class="num">Towarów</th>
          </tr></thead>
          <tbody>
            ${kindRows}
            <tr class="wh-valuation-subtotal">
              <td><strong>Razem</strong></td>
              <td class="num"><strong>${escapeHtml(data.totalMoves || 0)}</strong></td>
              <td class="num"><strong>${escapeHtml(data.totalQty || 0)}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>`;
    }
  }

  // Lista szczegółowa (te same kolumny co Historia ruchów).
  if (!rows.length) { renderEmpty(whPeriodContent, 'Brak ruchów w wybranym okresie.'); return; }
  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>Data</th><th>Sprzęt</th><th>Kod</th><th>Z</th><th>Do</th><th>Ilość</th><th>Rodzaj</th><th>Osoba</th>
    </tr></thead>`;
  const tbody = document.createElement('tbody');
  tbody.innerHTML = rows.map(m => `
    <tr>
      <td>${escapeHtml(formatDateTime(m.doneAt))}</td>
      <td>${escapeHtml(m.itemName || '—')}</td>
      <td>${escapeHtml(m.itemCode || '—')}</td>
      <td>${escapeHtml(m.fromName || '—')}</td>
      <td>${escapeHtml(m.toName || '—')}</td>
      <td>${escapeHtml(m.quantity)}</td>
      <td>${escapeHtml(MOVE_KIND_LABELS[m.kind] || m.kind || '—')}</td>
      <td class="muted">${escapeHtml(m.actorEmail || '—')}</td>
    </tr>`).join('');
  table.appendChild(tbody);
  whPeriodContent.innerHTML = '';
  if (data.truncated) {
    const hint = document.createElement('p');
    hint.className = 'muted wh-products-hint';
    hint.textContent = 'Pokazano 1000 najnowszych ruchów z okresu — podsumowanie obejmuje wszystkie.';
    whPeriodContent.appendChild(hint);
  }
  whPeriodContent.appendChild(table);
}

function exportWarehouseMovesReportCsv() {
  const rows = warehouseMovesReportState?.rows || [];
  if (!rows.length) { showToast('Brak ruchów do eksportu.'); return; }
  const headers = ['Data', 'Sprzet', 'Kod', 'Z', 'Do', 'Ilosc', 'Rodzaj', 'Osoba'];
  const data = rows.map(m => [
    formatDateTime(m.doneAt), m.itemName || '', m.itemCode || '', m.fromName || '', m.toName || '',
    m.quantity ?? 0, MOVE_KIND_LABELS[m.kind] || m.kind || '', m.actorEmail || ''
  ]);
  downloadCsv(`magazyn-ruchy-okres-${csvDateStamp()}.csv`, buildCsv(headers, data));
}

// --- Konfiguracja (lokalizacje) ---
function renderWarehouseLocations(locations) {
  const tree = locations.filter(l => ['view', 'internal', 'employee'].includes(l.kind));
  if (!tree.length) { renderEmpty(warehouseLocationsContent, 'Brak lokalizacji.'); return; }
  const isAdmin = currentUser?.role === 'admin';
  const byId = new Map(tree.map(l => [l.id, l]));
  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>Lokalizacja</th><th>Kod</th><th>Typ</th><th>Na stanie</th>
    </tr></thead>`;
  const tbody = document.createElement('tbody');
  tbody.innerHTML = tree.map(l => {
    const indent = '&nbsp;'.repeat((l.depth || 0) * 3);
    const isGroup = l.kind === 'view';
    const canEdit = isAdmin && l.editable;
    const nameCell = isGroup
      ? `${indent}<strong>${escapeHtml(l.name)}</strong>`
      : `${indent}${escapeHtml(l.name)}`;
    const rowAttrs = canEdit
      ? ` class="wh-product-row" data-locid="${escapeHtml(l.id)}" title="Kliknij, aby edytować lokalizację"`
      : '';
    return `
      <tr${rowAttrs}>
        <td>${nameCell}</td>
        <td class="muted">${escapeHtml(l.code || '—')}</td>
        <td>${escapeHtml(WAREHOUSE_KIND_LABELS[l.kind] || l.kind || '—')}</td>
        <td>${isGroup ? '<span class="muted">—</span>' : escapeHtml(l.onHand || 0)}</td>
      </tr>`;
  }).join('');
  if (isAdmin) {
    tbody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-locid]');
      if (tr && byId.has(tr.dataset.locid)) openLocationModal(byId.get(tr.dataset.locid));
    });
  }
  table.appendChild(tbody);
  warehouseLocationsContent.innerHTML = '';
  warehouseLocationsContent.appendChild(table);
  if (isAdmin) {
    const hint = document.createElement('p');
    hint.className = 'muted wh-products-hint';
    hint.textContent = 'Kliknij własną lokalizację, aby edytować. Standardowe i wirtualne są chronione.';
    warehouseLocationsContent.appendChild(hint);
  }
}

// --- Lokalizacje: okno tworzenia/edycji (własne fizyczne; standardowe chronione) ---
let editingLocationId = null;

// Lista rodziców: węzły grupujące (view) i Magazyn (internal) — „U pracownika" pomijamy.
function locationParentOptions(selectedId) {
  const nodes = (warehouseLocationsCache || []).filter(l => l.kind === 'view' || l.kind === 'internal');
  return nodes.map(l => {
    const prefix = '— '.repeat(l.depth || 0);
    const label = `${prefix}${l.name}${l.code ? ` (${l.code})` : ''}`;
    return `<option value="${escapeHtml(l.id)}"${l.id === selectedId ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
}

function openLocationModal(location = null) {
  if (currentUser?.role !== 'admin') { showToast('Zarządzanie lokalizacjami wymaga uprawnień administratora.'); return; }
  if (location && location.editable === false) { showToast('Ta lokalizacja jest systemowa — nie można jej edytować.'); return; }
  editingLocationId = location?.id || null;
  if (locationModalTitle) locationModalTitle.textContent = location ? 'Edytuj lokalizację' : 'Nowa lokalizacja';
  if (locationName) locationName.value = location?.name || '';
  if (locationKind) locationKind.value = location?.kind === 'employee' ? 'employee' : 'internal';
  // Rodzica wybieramy tylko przy tworzeniu; przy edycji zostaje bez zmian (pole ukryte).
  if (locationParent) locationParent.innerHTML = locationParentOptions(location?.parentId || null);
  if (locationParentField) locationParentField.hidden = !!location;
  if (locationDeleteBtn) locationDeleteBtn.hidden = !location;
  if (locationHint) {
    locationHint.hidden = !location;
    locationHint.textContent = location
      ? 'Zmiana nazwy zaktualizuje też nazwę lokalizacji przy powiązanym sprzęcie.'
      : '';
  }
  if (locationModal && !locationModal.open) locationModal.showModal();
}

function closeLocationModal() {
  editingLocationId = null;
  if (locationModal?.open) locationModal.close();
}

// Po zapisie/usunięciu: odśwież cache lokalizacji, nagłówek/filtr, dane formularzy
// operacji i (jeśli otwarta) Konfigurację.
async function refreshAfterLocationChange() {
  warehouseFormData = null;
  await refreshWarehouseHeader();
  if (whConfigView && !whConfigView.hidden) await renderWarehouseConfig();
}

async function saveLocation() {
  const name = (locationName?.value || '').trim();
  if (!name) { showToast('Podaj nazwę lokalizacji.'); return; }
  const kind = locationKind?.value === 'employee' ? 'employee' : 'internal';
  try {
    if (editingLocationId) {
      await api(`/warehouse/locations/${encodeURIComponent(editingLocationId)}`, {
        method: 'PATCH', body: JSON.stringify({ name, kind })
      });
    } else {
      await api('/warehouse/locations', {
        method: 'POST', body: JSON.stringify({ name, kind, parentId: locationParent?.value || null })
      });
    }
    showToast('Zapisano lokalizację.');
    closeLocationModal();
    await refreshAfterLocationChange();
  } catch (err) { showToast(err.message); }
}

async function deleteLocation() {
  if (!editingLocationId) return;
  if (!confirm('Usunąć lokalizację? Możliwe tylko, gdy nie ma stanu ani podlokalizacji.')) return;
  try {
    await api(`/warehouse/locations/${encodeURIComponent(editingLocationId)}`, { method: 'DELETE' });
    showToast('Usunięto lokalizację.');
    closeLocationModal();
    await refreshAfterLocationChange();
  } catch (err) { showToast(err.message); }
}

// --- Listenery modułu Magazyn ---
document.querySelectorAll('#warehouseMenu .subtab').forEach(btn => {
  btn.addEventListener('click', () => switchWarehouseMenu(btn.dataset.whmenu).catch(err => showToast(err.message)));
});
document.querySelectorAll('#whReportNav .subtab').forEach(btn => {
  btn.addEventListener('click', () => switchReportView(btn.dataset.whreport).catch(err => showToast(err.message)));
});
if (whOpTypeNav) {
  whOpTypeNav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-whoptype]');
    if (btn) openOperations(btn.dataset.whoptype).catch(err => showToast(err.message));
  });
}
if (whOverviewContent) {
  whOverviewContent.addEventListener('click', (e) => {
    const card = e.target.closest('[data-whgo]');
    if (!card) return;
    warehouseOpType = card.dataset.whgo;
    switchWarehouseMenu('operations').catch(err => showToast(err.message));
  });
}
if (whNewOperationBtn) {
  whNewOperationBtn.addEventListener('click', () => {
    if (warehouseOpType === 'replenishment') openReorderRuleModal(null).catch(err => showToast(err.message));
    else openOperationModal(warehouseOpType, null).catch(err => showToast(err.message));
  });
}
// Edycja/usuwanie reguł min-max w tabeli Zapotrzebowania (delegacja).
if (whOperationsContent) {
  whOperationsContent.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-repl-edit]');
    if (editBtn) {
      const row = replenishmentRows.find(r => r.id === editBtn.dataset.replEdit);
      if (row) openReorderRuleModal(row.id, row).catch(err => showToast(err.message));
      return;
    }
    const delBtn = e.target.closest('[data-repl-del]');
    if (delBtn) deleteReorderRule(delBtn.dataset.replDel).catch(err => showToast(err.message));
  });
}
if (reorderScope) reorderScope.addEventListener('change', updateReorderScopeFields);
if (reorderSaveBtn) {
  reorderSaveBtn.addEventListener('click', async () => {
    try {
      await saveReorderRule();
      showToast('Zapisano regułę');
      closeReorderRuleModal();
      await loadReplenishment();
    } catch (err) { showToast(err.message); }
  });
}
if (reorderDeleteBtn) {
  reorderDeleteBtn.addEventListener('click', async () => {
    if (!currentReorderRule?.id) return;
    try {
      if (await deleteReorderRule(currentReorderRule.id)) closeReorderRuleModal();
    } catch (err) { showToast(err.message); }
  });
}
[reorderCancelBtn, closeReorderRuleBtn].forEach(b => b && b.addEventListener('click', closeReorderRuleModal));
if (reorderRuleModal) {
  // Enter w polu nie ma wysyłać formularza (domyślny GET = przeładowanie).
  const reorderRuleForm = document.getElementById('reorderRuleForm');
  if (reorderRuleForm) reorderRuleForm.addEventListener('submit', (e) => { e.preventDefault(); reorderSaveBtn?.click(); });
}
if (whProductsSearch) whProductsSearch.addEventListener('input', applyProductsFilter);
if (warehouseSearchInput) warehouseSearchInput.addEventListener('input', applyWarehouseStockFilter);
if (warehouseLocationFilter) warehouseLocationFilter.addEventListener('change', applyWarehouseStockFilter);
if (whProductsExport) whProductsExport.addEventListener('click', exportWarehouseProductsCsv);
if (whStockExport) whStockExport.addEventListener('click', exportWarehouseStockCsv);
if (whMovesExport) whMovesExport.addEventListener('click', exportWarehouseMovesCsv);
if (whValuationSearch) whValuationSearch.addEventListener('input', applyWarehouseValuationFilter);
if (whValuationExport) whValuationExport.addEventListener('click', exportWarehouseValuationCsv);
if (whPeriodFrom) whPeriodFrom.addEventListener('change', () => loadWarehouseMovesReport().catch(err => showToast(err.message)));
if (whPeriodTo) whPeriodTo.addEventListener('change', () => loadWarehouseMovesReport().catch(err => showToast(err.message)));
if (whPeriodKind) whPeriodKind.addEventListener('change', () => loadWarehouseMovesReport().catch(err => showToast(err.message)));
if (whPeriodExport) whPeriodExport.addEventListener('click', exportWarehouseMovesReportCsv);

if (operationAddLineBtn) operationAddLineBtn.addEventListener('click', () => addOperationLine());
[operationCloseBtn2, closeOperationBtn].forEach(b => b && b.addEventListener('click', closeOperationModal));
if (operationSaveBtn) {
  operationSaveBtn.addEventListener('click', async () => {
    try { await saveOperation(); showToast('Zapisano wersję roboczą'); closeOperationModal(); await loadOperationsList(warehouseOpType); }
    catch (err) { showToast(err.message); }
  });
}
if (operationValidateBtn) {
  operationValidateBtn.addEventListener('click', async () => {
    try {
      checkConversionStock(); // szybki feedback nadmiaru przy konwersji (serwer i tak waliduje)
      const id = await saveOperation();
      const res = await api(`/warehouse/operations/${encodeURIComponent(id)}/validate`, { method: 'POST' });
      showToast(res.message || 'Wykonano');
      closeOperationModal();
      await loadOperationsList(warehouseOpType);
      await refreshWarehouseHeader();
    } catch (err) { showToast(err.message); }
  });
}
if (operationCancelOpBtn) {
  operationCancelOpBtn.addEventListener('click', async () => {
    if (!currentOperation?.id) return;
    try {
      await api(`/warehouse/operations/${encodeURIComponent(currentOperation.id)}/cancel`, { method: 'POST' });
      showToast('Anulowano operację');
      closeOperationModal();
      await loadOperationsList(warehouseOpType);
    } catch (err) { showToast(err.message); }
  });
}
if (operationReverseBtn) {
  operationReverseBtn.addEventListener('click', async () => {
    if (!currentOperation?.id) return;
    if (!confirm('Cofnąć wykonanie? Ruchy i partie cenowe tej operacji zostaną odwrócone, a operacja wróci do edycji.')) return;
    const { id, type } = currentOperation;
    try {
      const res = await api(`/warehouse/operations/${encodeURIComponent(id)}/reverse`, { method: 'POST' });
      showToast(res.message || 'Cofnięto wykonanie');
      await refreshWarehouseHeader();
      // Otwórz ponownie jako roboczą — gotową do edycji i ponownego zatwierdzenia.
      await openOperationModal(type, id);
    } catch (err) { showToast(err.message); }
  });
}

// „Nowy produkt" (z przyjęcia)
if (operationNewSupplierBtn) operationNewSupplierBtn.addEventListener('click', () => openSupplierModal());
if (operationNewDestinationBtn) operationNewDestinationBtn.addEventListener('click', () => openDestinationModal());
if (newProductSaveBtn) newProductSaveBtn.addEventListener('click', saveNewProduct);
if (newProductCancelBtn) newProductCancelBtn.addEventListener('click', closeNewProductModal);
if (closeNewProductBtn) closeNewProductBtn.addEventListener('click', closeNewProductModal);
if (newProductForm) newProductForm.addEventListener('submit', (e) => { e.preventDefault(); saveNewProduct(); });

// Dostawcy
if (whAddSupplierBtn) whAddSupplierBtn.addEventListener('click', () => openSupplierModal());
if (supplierSaveBtn) supplierSaveBtn.addEventListener('click', saveSupplier);
if (supplierDeleteBtn) supplierDeleteBtn.addEventListener('click', deleteSupplier);
if (supplierCancelBtn) supplierCancelBtn.addEventListener('click', closeSupplierModal);
if (closeSupplierBtn) closeSupplierBtn.addEventListener('click', closeSupplierModal);
if (supplierForm) supplierForm.addEventListener('submit', (e) => { e.preventDefault(); saveSupplier(); });

// Miejsca dostaw
if (whAddDestinationBtn) whAddDestinationBtn.addEventListener('click', () => openDestinationModal());
if (destinationSaveBtn) destinationSaveBtn.addEventListener('click', saveDestination);
if (destinationDeleteBtn) destinationDeleteBtn.addEventListener('click', deleteDestination);
if (destinationCancelBtn) destinationCancelBtn.addEventListener('click', closeDestinationModal);
if (closeDestinationBtn) closeDestinationBtn.addEventListener('click', closeDestinationModal);
if (destinationForm) destinationForm.addEventListener('submit', (e) => { e.preventDefault(); saveDestination(); });

// Lokalizacje
if (whAddLocationBtn) whAddLocationBtn.addEventListener('click', () => openLocationModal());
if (locationSaveBtn) locationSaveBtn.addEventListener('click', saveLocation);
if (locationDeleteBtn) locationDeleteBtn.addEventListener('click', deleteLocation);
if (locationCancelBtn) locationCancelBtn.addEventListener('click', closeLocationModal);
if (closeLocationBtn) closeLocationBtn.addEventListener('click', closeLocationModal);
if (locationForm) locationForm.addEventListener('submit', (e) => { e.preventDefault(); saveLocation(); });

// Motyw jasny/ciemny — atrybut data-theme na <html> (init bez mignięcia jest w <head>).
const themeToggleBtn = document.getElementById('themeToggleBtn');
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) { /* brak storage */ }
  if (themeToggleBtn) {
    themeToggleBtn.textContent = dark ? '☀️ Tryb jasny' : '🌙 Tryb ciemny';
    themeToggleBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }
}
if (themeToggleBtn) {
  // Zsynchronizuj etykietę z motywem ustawionym już w <head>.
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  themeToggleBtn.addEventListener('click', () =>
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
}

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

  if (target.id === 'loadInboxBtn') {
    // Odśwież aktywny pod-widok Skrzynki (Prośby albo Zgłoszenia).
    await withButtonLoading(target, () => openInbox(inboxSubview)).catch(err => showToast(err.message));
  }

  if (target.id === 'loadUsersBtn') {
    await withButtonLoading(target, () => handleViewChange('users')).catch(err => showToast(err.message));
  }

  if (target.id === 'loadTeamBtn') {
    await withButtonLoading(target, () => handleViewChange('team')).catch(err => showToast(err.message));
  }

  if (target.id === 'loadWarehouseBtn') {
    warehouseLocationsCache = null;
    await withButtonLoading(target, () => openWarehouse()).catch(err => showToast(err.message));
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

  if (target.id === 'loadDashboardBtn') {
    workspaceMode = 'admin';
    setActiveView('admin');
    await withButtonLoading(target, () => loadDashboard()).catch(err => showToast(err.message));
  }

  if (target.id === 'openImportBtn') {
    openImportModal();
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
      showToast(`Przygotowano wniosek: ${item.name || 'sprzęt'}`);
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

// Przełącznik widoku „Dostępny sprzęt": galeria / lista (zapamiętywany w localStorage).
const availableViewToggle = document.getElementById('availableViewToggle');
if (availableViewToggle) {
  // Odzwierciedl zapamiętany tryb na przyciskach przy starcie (bez re-renderu).
  availableViewToggle.querySelectorAll('.view-toggle-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.availview === availableViewMode));
  availableViewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-availview]');
    if (btn) setAvailableViewMode(btn.dataset.availview);
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

      showToast('Wysłano wniosek.');
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

// ===== Modal dodawania / edycji sprzętu (listy rozwijane) =====

let formOptionsState = null;
let editingItemId = null; // null = tryb dodawania, _id = tryb edycji

// Ustawia wartość selecta; gdy wartości nie ma na liście (np. niestandardowa
// lokalizacja istniejącego sprzętu), dorzuca ją jako opcję, by edycja jej nie gubiła.
function setSelectValue(select, value) {
  if (!select) return;
  const v = value == null ? '' : String(value);
  const exists = Array.from(select.options).some(opt => opt.value === v);
  if (!exists && v !== '') {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  }
  select.value = v;
}

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

// Przełącza modal między „Dodaj sprzęt" a „Edytuj sprzęt":
// w edycji ukrywamy przypisanie osoby (PATCH tego nie obsługuje) i pokazujemy
// pole statusu; w dodawaniu odwrotnie (status jest wyliczany na backendzie).
function setItemModalMode(mode) {
  const isEdit = mode === 'edit';
  if (addItemModalTitle) addItemModalTitle.textContent = isEdit ? 'Edytuj sprzęt' : 'Dodaj sprzęt';
  if (addItemSubmitBtn) addItemSubmitBtn.textContent = isEdit ? 'Zapisz zmiany' : 'Dodaj sprzęt';
  if (addItemAssigneeField) addItemAssigneeField.hidden = isEdit;
  if (addItemStatusField) addItemStatusField.hidden = !isEdit;
  // W edycji nie ma przypisania, więc podpowiedź o utworzeniu wypożyczenia nie dotyczy.
  if (isEdit && addItemAssignHint) addItemAssignHint.hidden = true;
}

async function openAddItemModal() {
  if (!addItemModal) return;

  try {
    await ensureFormOptions();
  } catch (err) {
    showToast(err.message);
    return;
  }

  editingItemId = null;
  if (addItemForm) addItemForm.reset();
  setItemModalMode('add');
  syncCategoryCustom();
  syncAssignHint();

  if (!addItemModal.open) addItemModal.showModal();
}

async function openEditItemModal(item) {
  if (!addItemModal || !item) return;

  try {
    await ensureFormOptions();
  } catch (err) {
    showToast(err.message);
    return;
  }

  editingItemId = item._id;
  if (addItemForm) addItemForm.reset();
  setItemModalMode('edit');

  const el = addItemForm?.elements;
  if (el) {
    if (el.itemCode) el.itemCode.value = item.itemCode || '';
    el.name.value = item.name || '';
    el.quantity.value = item.quantity || 1;
    if (el.brand) el.brand.value = item.brand || '';
    if (el.model) el.model.value = item.model || '';
    if (el.serialNumber) el.serialNumber.value = item.serialNumber || '';
    if (el.warrantyUntil) el.warrantyUntil.value = item.warrantyUntil || '';
    if (el.detailedLocation) el.detailedLocation.value = item.detailedLocation || '';
    if (el.qrCodeValue) el.qrCodeValue.value = item.qrCodeValue || '';
    if (el.tags) el.tags.value = Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '');
    if (el.imageUrl) el.imageUrl.value = item.imageUrl || '';
    if (el.thumbnailUrl) el.thumbnailUrl.value = item.thumbnailUrl || '';
    if (el.details) el.details.value = item.details || '';
    if (el.notes) el.notes.value = item.notes || '';
  }

  setSelectValue(addItemCategory, item.category);
  setSelectValue(addItemLocation, item.currentLocation);
  setSelectValue(addItemCondition, item.conditionStatus);
  setSelectValue(addItemStatus, item.operationalStatus);
  syncCategoryCustom();

  if (!addItemModal.open) addItemModal.showModal();
}

function closeAddItemModal() {
  if (addItemModal?.open) addItemModal.close();
  editingItemId = null;
}

// --- Import zbiorczy sprzętu z CSV (B4) ---

let importParsedItems = [];

function resetImportModal() {
  importParsedItems = [];
  if (importCsvFile) importCsvFile.value = '';
  if (importPreview) { importPreview.hidden = true; importPreview.innerHTML = ''; }
  if (importResult) { importResult.hidden = true; importResult.innerHTML = ''; }
  if (importSubmitBtn) importSubmitBtn.disabled = true;
}

function openImportModal() {
  if (!importItemsModal) return;
  resetImportModal();
  if (!importItemsModal.open) importItemsModal.showModal();
}

function closeImportModal() {
  if (importItemsModal?.open) importItemsModal.close();
}

function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(reader.result);
      const { items, unknownHeaders } = csvToItems(rows);
      buildImportPreview(items, unknownHeaders);
    } catch {
      showToast('Nie udało się odczytać pliku CSV');
    }
  };
  reader.onerror = () => showToast('Nie udało się odczytać pliku');
  reader.readAsText(file, 'utf-8');
}

// Walidacja po stronie frontu (te same reguły co backend): pola wymagane
// i duplikaty kodu w obrębie pliku. Duplikaty względem bazy wykryje backend.
function buildImportPreview(items, unknownHeaders) {
  if (importResult) { importResult.hidden = true; importResult.innerHTML = ''; }
  if (!importPreview) return;

  if (!items.length) {
    importPreview.hidden = false;
    importPreview.innerHTML = '<div class="empty">Plik nie zawiera danych do importu.</div>';
    importParsedItems = [];
    if (importSubmitBtn) importSubmitBtn.disabled = true;
    return;
  }

  const seen = new Set();
  const validated = items.map((item, index) => {
    const itemCode = String(item.itemCode || '').trim().toUpperCase();
    const name = String(item.name || '').trim();
    const category = String(item.category || '').trim();

    let issue = '';
    if (!itemCode || !name || !category) issue = 'Brak: kod / nazwa / kategoria';
    else if (seen.has(itemCode)) issue = 'Duplikat kodu w pliku';
    if (itemCode) seen.add(itemCode);

    return { fileRow: index + 2, item, itemCode, name, category, issue };
  });

  const okItems = validated.filter(v => !v.issue).map(v => v.item);
  const badCount = validated.length - okItems.length;
  importParsedItems = okItems;

  const previewRows = validated.slice(0, 30);
  const tableRows = previewRows.map(v => `
    <tr class="${v.issue ? 'import-row-bad' : ''}">
      <td>${v.fileRow}</td>
      <td>${escapeHtml(v.itemCode || '—')}</td>
      <td>${escapeHtml(v.name || '—')}</td>
      <td>${escapeHtml(v.category || '—')}</td>
      <td>${v.issue
        ? `<span class="import-issue">${escapeHtml(v.issue)}</span>`
        : '<span class="import-ok">OK</span>'}</td>
    </tr>
  `).join('');

  const unknownNote = unknownHeaders.length
    ? `<p class="muted">Pominięte kolumny (nierozpoznane): ${escapeHtml(unknownHeaders.join(', '))}</p>`
    : '';
  const moreNote = validated.length > previewRows.length
    ? `<span class="muted">(podgląd ${previewRows.length} z ${validated.length})</span>`
    : '';

  importPreview.hidden = false;
  importPreview.innerHTML = `
    <div class="import-summary">
      <span class="import-ok">Poprawne: ${okItems.length}</span>
      <span class="import-issue">Z błędami: ${badCount}</span>
      ${moreNote}
    </div>
    ${unknownNote}
    <div class="admin-content import-preview-table">
      <table>
        <thead><tr><th>Wiersz</th><th>Kod</th><th>Nazwa</th><th>Kategoria</th><th>Status</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;

  if (importSubmitBtn) importSubmitBtn.disabled = okItems.length === 0;
}

async function submitImport() {
  if (!importParsedItems.length) return;

  const result = await api('/admin/items/bulk', {
    method: 'POST',
    body: JSON.stringify({ items: importParsedItems })
  });

  const errorList = (result.errors || []).slice(0, 50).map(err =>
    `<li>Wiersz ${err.row}${err.itemCode ? ` (${escapeHtml(err.itemCode)})` : ''}: ${escapeHtml(err.message)}</li>`
  ).join('');

  if (importResult) {
    importResult.hidden = false;
    importResult.innerHTML = `
      <div class="import-summary">
        <span class="import-ok">Dodano: ${result.added}</span>
        <span class="import-issue">Pominięto: ${result.skipped}</span>
      </div>
      ${errorList ? `<ul class="import-errors">${errorList}</ul>` : ''}
    `;
  }

  // Czyścimy bufor, by ponowne kliknięcie nie zaimportowało drugi raz.
  importParsedItems = [];
  if (importSubmitBtn) importSubmitBtn.disabled = true;
  showToast(result.message);

  loadAdminItems().catch(() => {});
}

function downloadImportTemplate() {
  const headers = ['kod', 'nazwa', 'kategoria', 'ilosc', 'lokalizacja', 'stan', 'marka', 'model', 'numer seryjny', 'gwarancja', 'lokalizacja szczegolowa', 'tagi', 'uwagi'];
  const example = ['CAM-100', 'Sony A7 III', 'Aparat', '1', 'Magazyn', 'Dobry', 'Sony', 'A7 III', 'SN-12345', '2026-12-31', 'Regał B, półka 3', '4K, fullframe', 'Przykładowy wiersz'];
  downloadCsv('szablon-import-sprzetu.csv', buildCsv(headers, [example]));
}

if (closeImportBtn) closeImportBtn.addEventListener('click', closeImportModal);
if (cancelImportBtn) cancelImportBtn.addEventListener('click', closeImportModal);
if (importCsvFile) {
  importCsvFile.addEventListener('change', (e) => handleImportFile(e.target.files?.[0]));
}
if (importSubmitBtn) {
  importSubmitBtn.addEventListener('click', () => {
    withButtonLoading(importSubmitBtn, submitImport).catch(err => showToast(err.message));
  });
}
if (downloadCsvTemplateBtn) {
  downloadCsvTemplateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    downloadImportTemplate();
  });
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

    const isEdit = Boolean(editingItemId);

    // PATCH nie obsługuje przypisania osoby — przeniesienie to osobny temat.
    if (isEdit) delete payload.assignedToEmail;

    try {
      if (isEdit) {
        await api(`/admin/items/${editingItemId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        showToast('Zapisano zmiany sprzętu');
      } else {
        await api('/admin/items', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast(payload.assignedToEmail ? 'Dodano sprzęt i utworzono wypożyczenie' : 'Dodano sprzęt');
      }

      formOptionsState = null; // odśwież listy (np. nowa kategoria) przy kolejnym otwarciu
      closeAddItemModal();
      await loadAdminItems();
      await refreshStats();
    } catch (err) {
      showToast(err.message);
    }
  });
}

// ===== Modal wycofania sprzętu (gotowe powody) =====

let discardTargetItem = null;

function syncDiscardOther() {
  if (!discardItemForm || !discardOtherField) return;
  const selected = discardItemForm.elements['discardReason']?.value;
  const isOther = selected === '__other__';
  discardOtherField.hidden = !isOther;
  if (discardOtherInput) discardOtherInput.required = isOther;
}

function openDiscardModal(item) {
  if (!discardItemModal || !item) return;

  discardTargetItem = item;
  if (discardItemForm) discardItemForm.reset();
  if (discardItemTarget) {
    discardItemTarget.textContent =
      `Wycofujesz „${item.name || 'sprzęt'}". Sprzęt zniknie z list, ale zostanie w bazie jako ślad.`;
  }
  syncDiscardOther();

  if (!discardItemModal.open) discardItemModal.showModal();
}

function closeDiscardModal() {
  if (discardItemModal?.open) discardItemModal.close();
  discardTargetItem = null;
}

if (closeDiscardBtn) closeDiscardBtn.addEventListener('click', closeDiscardModal);
if (cancelDiscardBtn) cancelDiscardBtn.addEventListener('click', closeDiscardModal);
if (discardItemForm) {
  discardItemForm.addEventListener('change', (e) => {
    if (e.target?.name === 'discardReason') syncDiscardOther();
  });

  discardItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!discardTargetItem) return;

    const choice = discardItemForm.elements['discardReason']?.value || 'Zepsute';
    const reason = choice === '__other__'
      ? (discardOtherInput?.value || '').trim() || 'Inne'
      : choice;

    const item = discardTargetItem;

    try {
      await api(`/admin/items/${item._id}/discard`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      showToast(`Wycofano sprzęt: ${item.name || 'sprzęt'}`);
      closeDiscardModal();
      await loadAdminItems();
      await refreshStats();
    } catch (err) {
      showToast(err.message);
    }
  });
}

// ===== Modal „Przenieś sprzęt" (transfer między osobami, Pakiet C) =====

let transferTargetItem = null;
// 'admin' = transfer z panelu admina (klucz po _id), 'user' = wymiana pracownik→pracownik
// z zakładki „Mój sprzęt" (klucz po itemCode). Lista osób w obu z /users.
let transferMode = 'admin';

async function openTransferModal(item, mode = 'admin') {
  if (!transferItemModal || !item) return;

  let users;
  try {
    users = await api('/users');
  } catch (err) {
    showToast(err.message);
    return;
  }

  transferTargetItem = item;
  transferMode = mode;
  if (transferItemForm) transferItemForm.reset();
  if (transferEyebrow) transferEyebrow.textContent = mode === 'user' ? 'Mój sprzęt' : 'Panel admina';

  // Lista osób bez obecnego posiadacza (transfer ma zmienić właściciela).
  const excludeEmail = mode === 'user' ? (currentUser?.email || item.assignedToEmail) : item.assignedToEmail;
  const userOptions = (Array.isArray(users) ? users : [])
    .filter(u => u.email !== excludeEmail)
    .map(u => ({ value: u.email, label: `${u.fullName} (${u.email})` }));
  fillSelect(transferAssignee, userOptions, { includeEmpty: '— wybierz osobę —' });

  if (transferItemTarget) {
    if (mode === 'user') {
      transferItemTarget.textContent =
        `Przenosisz „${item.name || 'sprzęt'}" na innego pracownika. Sprzęt zostanie przypisany wybranej osobie, a administracja zobaczy to działanie.`;
    } else {
      const holder = item.assignedToEmail
        ? `Obecnie u: ${item.assignedToName || item.assignedToEmail}.`
        : 'Sprzęt nie jest obecnie przypisany.';
      transferItemTarget.textContent =
        `Przenosisz „${item.name || 'sprzęt'}". ${holder} Dotychczasowe wypożyczenie zostanie zamknięte, a sprzęt przypisany nowej osobie.`;
    }
  }

  if (!transferItemModal.open) transferItemModal.showModal();
}

function closeTransferModal() {
  if (transferItemModal?.open) transferItemModal.close();
  transferTargetItem = null;
}

if (closeTransferBtn) closeTransferBtn.addEventListener('click', closeTransferModal);
if (cancelTransferBtn) cancelTransferBtn.addEventListener('click', closeTransferModal);

if (transferItemForm) {
  transferItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!transferTargetItem) return;

    const toEmail = transferAssignee?.value || '';
    if (!toEmail) {
      showToast('Wybierz osobę, na którą przenosisz sprzęt');
      return;
    }

    const item = transferTargetItem;
    const note = transferNote?.value || '';

    try {
      if (transferMode === 'user') {
        await api(`/my/items/${encodeURIComponent(item.itemCode)}/transfer`, {
          method: 'POST',
          body: JSON.stringify({ toEmail, note })
        });
        showToast(`Przeniesiono sprzęt: ${item.name || 'sprzęt'}`);
        closeTransferModal();
        await loadMyLoans();
        await refreshAll();
      } else {
        await api(`/admin/items/${item._id}/transfer`, {
          method: 'POST',
          body: JSON.stringify({ toEmail, note })
        });
        showToast(`Przeniesiono sprzęt: ${item.name || 'sprzęt'}`);
        closeTransferModal();
        await loadAdminItems();
        await refreshStats();
        await refreshInboxBadge();
      }
    } catch (err) {
      showToast(err.message);
    }
  });
}

// ===== Modal „Zgłoś problem ze sprzętem" (Mój sprzęt → administracja) =====

let reportIssueItem = null;

function openReportIssueModal(item) {
  if (!reportIssueModal || !item) return;
  reportIssueItem = item;
  if (reportIssueForm) reportIssueForm.reset();
  if (reportIssueType) reportIssueType.value = 'damage';
  if (reportIssueTarget) {
    reportIssueTarget.textContent =
      `Zgłaszasz problem ze sprzętem „${item.name || 'sprzęt'}". Zgłoszenie trafi do administracji.`;
  }
  if (!reportIssueModal.open) reportIssueModal.showModal();
}

function closeReportIssueModal() {
  if (reportIssueModal?.open) reportIssueModal.close();
  reportIssueItem = null;
}

if (closeReportIssueBtn) closeReportIssueBtn.addEventListener('click', closeReportIssueModal);
if (cancelReportIssueBtn) cancelReportIssueBtn.addEventListener('click', closeReportIssueModal);

if (reportIssueForm) {
  reportIssueForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!reportIssueItem) return;

    const message = (reportIssueMessage?.value || '').trim();
    if (!message) {
      showToast('Opisz, co się dzieje ze sprzętem');
      return;
    }

    const item = reportIssueItem;
    try {
      await api(`/my/items/${encodeURIComponent(item.itemCode)}/report-issue`, {
        method: 'POST',
        body: JSON.stringify({ issueType: reportIssueType?.value || 'other', message })
      });
      showToast('Zgłoszenie wysłane do administracji');
      closeReportIssueModal();
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

// --- Dodawanie użytkownika „z góry" (panel Użytkownicy) ---
if (addUserBtn && addUserForm) {
  addUserBtn.addEventListener('click', () => {
    addUserForm.hidden = !addUserForm.hidden;
    if (!addUserForm.hidden) document.getElementById('newUserName')?.focus();
  });
}
if (cancelAddUserBtn && addUserForm) {
  cancelAddUserBtn.addEventListener('click', () => {
    addUserForm.hidden = true;
    addUserForm.reset();
  });
}
if (addUserForm) {
  addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(addUserForm).entries());
    try {
      const res = await api('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
      showToast(res.message || 'Dodano użytkownika');
      addUserForm.reset();
      addUserForm.hidden = true;
      await loadUsers();
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
    showToast(`Przygotowano wniosek: ${activeModalItem.name || 'sprzęt'}`);
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