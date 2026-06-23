export const collections = {
  users: 'users',
  items: 'items',
  loans: 'loans',
  loanRequests: 'loanRequests',
  auditLogs: 'auditLogs',
  locations: 'locations',
  comments: 'comments',
  notifications: 'notifications',

  // Magazyn „w stylu Odoo" (Faza 0 – fundament: stan = suma ruchów).
  warehouses: 'warehouses',
  stockMoves: 'stockMoves',
  quants: 'quants',
  stockOperations: 'stockOperations',
  lots: 'lots',
  inventoryAdjustments: 'inventoryAdjustments',
  reorderRules: 'reorderRules',
  counters: 'counters',
  suppliers: 'suppliers'
};

export const itemShape = {
  itemCode: 'K004',
  category: 'Kamera',
  name: 'Logitech C920',
  details: 'Webcam Full HD',
  quantity: 1,
  currentLocation: 'Magazyn',
  operationalStatus: 'available',
  conditionStatus: 'good',
  assignedToName: null,
  assignedToEmail: null,
  notes: '',

  imageUrl: '',
  thumbnailUrl: '',
  brand: '',
  model: '',
  qrCodeValue: '',
  tags: [],
  serialNumber: '',
  warrantyUntil: '',
  detailedLocation: '',
  isStudioLocked: false,

  // Partie cenowe (produkty Magazynu): zakup tej samej pozycji w transzach po
  // różnych cenach. Gdy niepuste, łączna `quantity` = suma `qty` partii.
  priceBatches: [], // [{ qty, unitPrice, note, addedAt }]

  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

export async function ensureIndexes(db) {
  await db.collection(collections.users).createIndexes([
    { key: { email: 1 }, unique: true, name: 'uniq_user_email' }
  ]);

  await db.collection(collections.items).createIndexes([
    { key: { itemCode: 1 }, unique: true, name: 'uniq_item_code' },
    { key: { category: 1, name: 1 }, name: 'idx_item_category_name' },
    { key: { operationalStatus: 1, currentLocation: 1 }, name: 'idx_item_status_location' },
    { key: { isActive: 1, operationalStatus: 1 }, name: 'idx_item_active_status' }
  ]);

  await db.collection(collections.loans).createIndexes([
    { key: { userEmail: 1, status: 1 }, name: 'idx_loans_user_status' },
    { key: { itemCode: 1, status: 1 }, name: 'idx_loans_item_status' },
    { key: { borrowedAt: -1 }, name: 'idx_loans_borrowed_at' }
  ]);

  await db.collection(collections.loanRequests).createIndexes([
    { key: { requesterEmail: 1, status: 1 }, name: 'idx_lr_requester_status' },
    { key: { approverEmail: 1, status: 1 }, name: 'idx_lr_approver_status' },
    { key: { status: 1, requestedAt: -1 }, name: 'idx_lr_status_requested' }
  ]);

  await db.collection(collections.auditLogs).createIndexes([
    { key: { entityType: 1, entityId: 1, createdAt: -1 }, name: 'idx_audit_entity' },
    { key: { actorEmail: 1, createdAt: -1 }, name: 'idx_audit_actor' },
    { key: { createdAt: -1 }, name: 'idx_audit_created_at' }
  ]);

  await db.collection(collections.locations).createIndexes([
    { key: { name: 1 }, unique: true, name: 'uniq_location_name' },
    // Hierarchia „w stylu Odoo": kod ścieżki (WH/Stock/PolkaA), rodzic, przodkowie.
    { key: { code: 1 }, unique: true, sparse: true, name: 'uniq_location_code' },
    { key: { parentId: 1 }, name: 'idx_location_parent' },
    { key: { ancestors: 1 }, name: 'idx_location_ancestors' },
    { key: { kind: 1, isActive: 1 }, name: 'idx_location_kind_active' }
  ]);

  // Komentarze do wniosku (Pakiet C – wątek dyskusji wnioskodawca/decydent).
  await db.collection(collections.comments).createIndexes([
    { key: { requestId: 1, createdAt: 1 }, name: 'idx_comments_request' }
  ]);

  // Powiadomienia/zgłoszenia dla administracji (zgłoszenia pracowników o sprzęcie
  // + ślad o transferach). status: 'open' | 'resolved'.
  await db.collection(collections.notifications).createIndexes([
    { key: { status: 1, createdAt: -1 }, name: 'idx_notifications_status' }
  ]);

  // === Magazyn „w stylu Odoo" ===

  // Magazyny (grupują lokalizacje; zwykle jeden, ale model dopuszcza wiele).
  await db.collection(collections.warehouses).createIndexes([
    { key: { code: 1 }, unique: true, name: 'uniq_warehouse_code' }
  ]);

  // Rejestr ruchów (append-only) – źródło prawdy o stanie.
  await db.collection(collections.stockMoves).createIndexes([
    { key: { itemCode: 1, doneAt: -1 }, name: 'idx_moves_item_done' },
    { key: { toLocationId: 1, doneAt: -1 }, name: 'idx_moves_to_loc' },
    { key: { fromLocationId: 1, doneAt: -1 }, name: 'idx_moves_from_loc' },
    { key: { lot: 1 }, sparse: true, name: 'idx_moves_lot' },
    { key: { operationId: 1 }, sparse: true, name: 'idx_moves_operation' },
    { key: { kind: 1, doneAt: -1 }, name: 'idx_moves_kind' }
  ]);

  // Stan na lokalizację (materializowany z ruchów). Jeden dokument na (towar, lokalizacja, partia).
  await db.collection(collections.quants).createIndexes([
    { key: { itemCode: 1, locationId: 1, lot: 1 }, unique: true, name: 'uniq_quant_item_loc_lot' },
    { key: { locationId: 1 }, name: 'idx_quant_location' }
  ]);

  // Operacje magazynowe (przyjęcia/wydania/przesunięcia/inwentaryzacja) – Faza 2.
  await db.collection(collections.stockOperations).createIndexes([
    { key: { reference: 1 }, unique: true, name: 'uniq_operation_reference' },
    { key: { type: 1, state: 1, scheduledAt: -1 }, name: 'idx_operation_type_state' }
  ]);

  // Partie / numery seryjne – Faza 3.
  await db.collection(collections.lots).createIndexes([
    { key: { itemCode: 1, name: 1 }, unique: true, name: 'uniq_lot_item_name' }
  ]);

  // Inwentaryzacje (spis z natury) – Faza 3.
  await db.collection(collections.inventoryAdjustments).createIndexes([
    { key: { state: 1, createdAt: -1 }, name: 'idx_inv_adj_state' }
  ]);

  // Reguły uzupełniania zapasów (min-max / orderpoint) – „Zapotrzebowanie".
  // `scope` = 'category' | 'item'; `target` = nazwa kategorii albo itemCode.
  // Jedna reguła na cel (unikalność po scope+target).
  await db.collection(collections.reorderRules).createIndexes([
    { key: { scope: 1, target: 1 }, unique: true, name: 'uniq_reorder_scope_target' },
    { key: { isActive: 1 }, name: 'idx_reorder_active' }
  ]);
}