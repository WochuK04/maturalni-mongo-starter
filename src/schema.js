export const collections = {
  users: 'users',
  items: 'items',
  loans: 'loans',
  loanRequests: 'loanRequests',
  auditLogs: 'auditLogs',
  locations: 'locations',
  comments: 'comments',
  notifications: 'notifications'
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
    { key: { name: 1 }, unique: true, name: 'uniq_location_name' }
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
}