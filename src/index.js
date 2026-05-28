import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { ObjectId } from 'mongodb';

import { getDb } from './db.js';
import { collections, ensureIndexes } from './schema.js';
import { setupPassport, requireAuth, requireAdmin } from './auth.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

setupPassport();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static('public'));

function normalizeItemCode(value) {
  return String(value || '').trim().toUpperCase();
}

function parseBoolean(value) {
  return (
    value === true ||
    value === 'true' ||
    value === '1' ||
    value === 1
  );
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(tag => String(tag).trim()).filter(Boolean);
  }

  return String(tags || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function isBlockedFromLoan(item) {
  const location = String(item?.currentLocation || '').trim().toLowerCase();
  const isStudioLocation = location === 'studio';
  const isStudioLocked = item?.isStudioLocked === true;

  return isStudioLocation || isStudioLocked;
}

app.get('/', (_req, res) => {
  res.sendFile(new URL('../public/index.html', import.meta.url).pathname);
});

app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login-failed.html'
  }),
  (_req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
});

app.get('/me', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: {
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role
    }
  });
});

app.get('/items/available', requireAuth, async (_req, res) => {
  const db = await getDb();

  const items = await db.collection(collections.items)
    .find(
      {
        isActive: { $ne: false },
        operationalStatus: 'available',
        isStudioLocked: { $ne: true },
        currentLocation: { $ne: 'Studio' },
        $and: [
          {
            $or: [
              { assignedToEmail: null },
              { assignedToEmail: { $exists: false } },
              { assignedToEmail: '' }
            ]
          },
          {
            $or: [
              { assignedToName: null },
              { assignedToName: { $exists: false } },
              { assignedToName: '' }
            ]
          }
        ]
      },
      {
        projection: {
          itemCode: 1,
          category: 1,
          name: 1,
          details: 1,
          quantity: 1,
          currentLocation: 1,
          conditionStatus: 1,
          imageUrl: 1,
          thumbnailUrl: 1,
          brand: 1,
          model: 1,
          qrCodeValue: 1,
          tags: 1
        }
      }
    )
    .sort({
      category: 1,
      name: 1,
      itemCode: 1
    })
    .toArray();

  res.json(items);
});

app.get('/items/:itemCode', requireAuth, async (req, res) => {
  const db = await getDb();
  const normalizedItemCode = normalizeItemCode(req.params.itemCode);

  const item = await db.collection(collections.items).findOne(
    {
      itemCode: normalizedItemCode,
      isActive: { $ne: false }
    },
    {
      projection: {
        itemCode: 1,
        category: 1,
        name: 1,
        details: 1,
        quantity: 1,
        currentLocation: 1,
        conditionStatus: 1,
        operationalStatus: 1,
        imageUrl: 1,
        thumbnailUrl: 1,
        brand: 1,
        model: 1,
        qrCodeValue: 1,
        tags: 1,
        isStudioLocked: 1,
        assignedToEmail: 1,
        assignedToName: 1,
        notes: 1,
        createdAt: 1,
        updatedAt: 1
      }
    }
  );

  if (!item) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  const activeLoan = await db.collection(collections.loans).findOne(
    {
      itemCode: normalizedItemCode,
      status: 'active'
    },
    {
      sort: { borrowedAt: -1 }
    }
  );

  res.json({
    ...item,
    activeLoan: activeLoan || null
  });
});

app.get('/my/loans', requireAuth, async (req, res) => {
  const db = await getDb();

  const loans = await db.collection(collections.loans)
    .find({ userEmail: req.user.email, status: 'active' })
    .sort({ borrowedAt: -1 })
    .toArray();

  res.json(loans);
});

app.get('/my/loan-requests', requireAuth, async (req, res) => {
  const db = await getDb();

  const requests = await db.collection(collections.loanRequests)
    .find({ requesterEmail: req.user.email })
    .sort({ requestedAt: -1 })
    .toArray();

  res.json(requests);
});

app.post('/loan-requests', requireAuth, async (req, res) => {
  const db = await getDb();

  const {
    itemCode,
    purpose = '',
    targetUseLocation = 'Dom',
    requestedReturnDate = null,
    note = ''
  } = req.body;

  if (!itemCode) {
    return res.status(400).json({ message: 'itemCode jest wymagane' });
  }

  const normalizedItemCode = normalizeItemCode(itemCode);

  const item = await db.collection(collections.items).findOne({
    itemCode: normalizedItemCode,
    isActive: { $ne: false }
  });

  if (!item) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  if (isBlockedFromLoan(item)) {
    return res.status(400).json({
      message: 'Tego sprzętu nie można wypożyczyć'
    });
  }

  if (item.operationalStatus !== 'available') {
    return res.status(400).json({ message: 'Sprzęt nie jest dostępny' });
  }

  const existingPendingRequest = await db.collection(collections.loanRequests).findOne({
    itemCode: normalizedItemCode,
    requesterEmail: req.user.email,
    status: 'pending'
  });

  if (existingPendingRequest) {
    return res.status(409).json({
      message: 'Masz już oczekujący wniosek dla tego sprzętu'
    });
  }

  const loanRequest = {
    itemCode: item.itemCode,
    itemName: item.name,
    requesterEmail: req.user.email,
    requesterName: req.user.fullName || req.user.email,
    purpose: String(purpose || '').trim(),
    targetUseLocation: String(targetUseLocation || '').trim(),
    requestedReturnDate: requestedReturnDate || null,
    note: String(note || '').trim(),
    status: 'pending',
    requestedAt: new Date(),
    approvedAt: null,
    approvedByEmail: null,
    rejectedAt: null,
    rejectedByEmail: null,
    decisionNote: null
  };

  const result = await db.collection(collections.loanRequests).insertOne(loanRequest);

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_created',
    entityType: 'loan_request',
    entityId: String(result.insertedId),
    payload: {
      itemCode: item.itemCode,
      requesterEmail: req.user.email
    },
    createdAt: new Date()
  });

  res.status(201).json({
    message: 'Wniosek o wypożyczenie został utworzony',
    requestId: result.insertedId
  });
});

app.post('/my/loan-requests/:id/cancel', requireAuth, async (req, res) => {
  const db = await getDb();

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (requestDoc.requesterEmail !== req.user.email) {
    return res.status(403).json({ message: 'To nie jest Twój wniosek' });
  }

  if (requestDoc.status !== 'pending') {
    return res.status(400).json({ message: 'Można anulować tylko oczekujący wniosek' });
  }

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'cancelled',
        decisionNote: 'Anulowano przez użytkownika',
        rejectedAt: new Date(),
        rejectedByEmail: req.user.email
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_cancelled',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode,
      requesterEmail: req.user.email
    },
    createdAt: new Date()
  });

  res.json({ message: 'Wniosek anulowany' });
});

app.post('/loans/borrow', requireAuth, async (req, res) => {
  const db = await getDb();
  const { itemCode, targetUseLocation = 'Dom', borrowNote = '' } = req.body;
  const userEmail = req.user.email;
  const normalizedItemCode = normalizeItemCode(itemCode);

  const item = await db.collection(collections.items).findOne({
    itemCode: normalizedItemCode,
    isActive: { $ne: false }
  });

  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }

  if (isBlockedFromLoan(item)) {
    return res.status(400).json({
      message: 'Tego sprzętu nie można wypożyczyć'
    });
  }

  if (item.operationalStatus !== 'available') {
    return res.status(400).json({ message: 'Item is not available' });
  }

  const loan = {
  itemId: item._id,
  itemCode: normalizedItemCode,
  userEmail,
  quantity: 1,
  fromLocation: item.currentLocation,
  targetUseLocation: String(targetUseLocation || '').trim(),
  status: 'active',
  borrowedAt: new Date(),
  dueAt: null,
  returnedAt: null,
  borrowNote: String(borrowNote || '').trim(),
  returnNote: null,
  createdByEmail: req.user.email,
  closedByEmail: null
};

  const loanResult = await db.collection(collections.loans).insertOne(loan);

  await db.collection(collections.items).updateOne(
    { _id: item._id },
    {
      $set: {
        operationalStatus: 'loaned',
        currentLocation: 'U pracownika',
        assignedToEmail: userEmail,
        assignedToName: req.user.fullName || req.user.email,
        updatedAt: new Date()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_created',
    entityType: 'loan',
    entityId: String(loanResult.insertedId),
    payload: { itemCode: normalizedItemCode, userEmail },
    createdAt: new Date()
  });

  res.status(201).json({
    message: 'Borrowed',
    loanId: loanResult.insertedId
  });
});

app.post('/loans/return/:id', requireAuth, async (req, res) => {
  const db = await getDb();
  const { returnLocation = 'Magazyn', returnNote = '' } = req.body;

  const loan = await db.collection(collections.loans).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!loan) {
    return res.status(404).json({ message: 'Loan not found' });
  }

  const isOwner = loan.userEmail === req.user.email;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Nie możesz oddać cudzego sprzętu' });
  }

  if (loan.status !== 'active') {
    return res.status(400).json({ message: 'Loan is not active' });
  }

  await db.collection(collections.loans).updateOne(
    { _id: loan._id },
    {
      $set: {
        status: 'returned',
        returnedAt: new Date(),
        returnLocation: String(returnLocation || 'Magazyn').trim(),
        returnNote: String(returnNote || '').trim(),
        closedByEmail: req.user.email
      }
    }
  );

  const itemUpdateResult = await db.collection(collections.items).updateOne(
  { itemCode: String(loan.itemCode || '').trim().toUpperCase() },
  {
    $set: {
      operationalStatus: 'available',
      currentLocation: String(returnLocation || 'Magazyn').trim(),
      assignedToEmail: null,
      assignedToName: null,
      updatedAt: new Date()
    }
  }
);

console.log('RETURN ITEM UPDATE RESULT', {
  loanItemCode: loan.itemCode,
  matchedCount: itemUpdateResult.matchedCount,
  modifiedCount: itemUpdateResult.modifiedCount
});

if (itemUpdateResult.matchedCount === 0) {
  return res.status(500).json({
    message: `Nie znaleziono sprzętu do zwrotu dla itemCode ${loan.itemCode}`
  });
}

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_returned',
    entityType: 'loan',
    entityId: String(loan._id),
    payload: {
      itemCode: loan.itemCode,
      userEmail: loan.userEmail,
      returnLocation: String(returnLocation || 'Magazyn').trim()
    },
    createdAt: new Date()
  });

  res.json({ message: 'Returned' });
});

app.get('/admin/items', requireAuth, requireAdmin, async (_req, res) => {
  const db = await getDb();

  const items = await db.collection(collections.items)
    .find({})
    .sort({ category: 1, name: 1, itemCode: 1 })
    .toArray();

  res.json(items);
});

app.post('/admin/items', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  const {
    itemCode,
    category,
    name,
    details = '',
    quantity = 1,
    currentLocation = 'Magazyn',
    conditionStatus = 'ok',
    notes = '',
    imageUrl = '',
    thumbnailUrl = '',
    brand = '',
    model = '',
    qrCodeValue = '',
    tags = [],
    isStudioLocked = false
  } = req.body;

  if (!itemCode || !category || !name) {
    return res.status(400).json({ message: 'itemCode, category i name są wymagane' });
  }

  const normalizedItemCode = normalizeItemCode(itemCode);

  const existing = await db.collection(collections.items).findOne({
    itemCode: normalizedItemCode
  });

  if (existing) {
    return res.status(409).json({ message: 'Taki itemCode już istnieje' });
  }

  const doc = {
    itemCode: normalizedItemCode,
    category: String(category).trim(),
    name: String(name).trim(),
    details: String(details || '').trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    currentLocation: String(currentLocation || 'Magazyn').trim(),
    conditionStatus: String(conditionStatus || 'ok').trim(),
    operationalStatus: 'available',
    assignedToName: null,
    assignedToEmail: null,
    notes: String(notes || '').trim(),
    imageUrl: String(imageUrl || '').trim(),
    thumbnailUrl: String(thumbnailUrl || '').trim(),
    brand: String(brand || '').trim(),
    model: String(model || '').trim(),
    qrCodeValue: String(qrCodeValue || '').trim(),
    tags: normalizeTags(tags),
    isStudioLocked: parseBoolean(isStudioLocked),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection(collections.items).insertOne(doc);

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'item_created',
    entityType: 'item',
    entityId: String(result.insertedId),
    payload: doc,
    createdAt: new Date()
  });

  res.status(201).json({
    message: 'Item created',
    id: result.insertedId,
    item: doc
  });
});

app.patch('/admin/items/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  const {
    itemCode,
    category,
    name,
    details,
    quantity,
    currentLocation,
    conditionStatus,
    operationalStatus,
    notes,
    imageUrl,
    thumbnailUrl,
    brand,
    model,
    qrCodeValue,
    tags,
    isStudioLocked,
    isActive
  } = req.body;

  const itemId = new ObjectId(req.params.id);
  const update = {
    updatedAt: new Date()
  };

  if (itemCode !== undefined) update.itemCode = normalizeItemCode(itemCode);
  if (category !== undefined) update.category = String(category).trim();
  if (name !== undefined) update.name = String(name).trim();
  if (details !== undefined) update.details = String(details || '').trim();
  if (quantity !== undefined) update.quantity = Math.max(1, Number(quantity) || 1);
  if (currentLocation !== undefined) update.currentLocation = String(currentLocation).trim();
  if (conditionStatus !== undefined) update.conditionStatus = String(conditionStatus).trim();
  if (operationalStatus !== undefined) update.operationalStatus = String(operationalStatus).trim();
  if (notes !== undefined) update.notes = String(notes || '').trim();
  if (imageUrl !== undefined) update.imageUrl = String(imageUrl || '').trim();
  if (thumbnailUrl !== undefined) update.thumbnailUrl = String(thumbnailUrl || '').trim();
  if (brand !== undefined) update.brand = String(brand || '').trim();
  if (model !== undefined) update.model = String(model || '').trim();
  if (qrCodeValue !== undefined) update.qrCodeValue = String(qrCodeValue || '').trim();
  if (tags !== undefined) update.tags = normalizeTags(tags);
  if (isStudioLocked !== undefined) update.isStudioLocked = parseBoolean(isStudioLocked);
  if (isActive !== undefined) update.isActive = parseBoolean(isActive);

  if (update.itemCode) {
    const duplicate = await db.collection(collections.items).findOne({
      _id: { $ne: itemId },
      itemCode: update.itemCode
    });

    if (duplicate) {
      return res.status(409).json({ message: 'Taki itemCode już istnieje' });
    }
  }

  const existingItem = await db.collection(collections.items).findOne({ _id: itemId });

  if (!existingItem) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  await db.collection(collections.items).updateOne(
    { _id: itemId },
    { $set: update }
  );

  const updatedItem = await db.collection(collections.items).findOne({ _id: itemId });

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'item_updated',
    entityType: 'item',
    entityId: String(itemId),
    payload: update,
    createdAt: new Date()
  });

  res.json({
    message: 'Item updated',
    item: updatedItem
  });
});

app.delete('/admin/items/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  const item = await db.collection(collections.items).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }

  await db.collection(collections.items).updateOne(
    { _id: item._id },
    {
      $set: {
        isActive: false,
        operationalStatus: 'inactive',
        updatedAt: new Date()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'item_deactivated',
    entityType: 'item',
    entityId: String(item._id),
    payload: { itemCode: item.itemCode },
    createdAt: new Date()
  });

  res.json({ message: 'Item deactivated' });
});

app.get('/admin/loans', requireAuth, requireAdmin, async (_req, res) => {
  const db = await getDb();

  const loans = await db.collection(collections.loans)
    .find({})
    .sort({ borrowedAt: -1 })
    .toArray();

  res.json(loans);
});

app.get('/admin/loan-requests', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { status } = req.query;

  const query = {};
  if (status) query.status = String(status).trim();

  const requests = await db.collection(collections.loanRequests)
    .find(query)
    .sort({ requestedAt: -1 })
    .toArray();

  res.json(requests);
});

app.post('/admin/loan-requests/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { decisionNote = '' } = req.body;

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (requestDoc.status !== 'pending') {
    return res.status(400).json({ message: 'Wniosek nie oczekuje już na decyzję' });
  }

  const item = await db.collection(collections.items).findOne({
    itemCode: requestDoc.itemCode,
    isActive: { $ne: false }
  });

  if (!item) {
    return res.status(404).json({ message: 'Sprzęt nie istnieje' });
  }

  if (isBlockedFromLoan(item)) {
    return res.status(400).json({ message: 'Tego sprzętu nie można wypożyczyć' });
  }

  if (item.operationalStatus !== 'available') {
    return res.status(400).json({ message: 'Sprzęt nie jest już dostępny' });
  }

  const loan = {
  itemId: item._id,
  itemCode: requestDoc.itemCode,
  userEmail: requestDoc.requesterEmail,
  quantity: 1,
  fromLocation: item.currentLocation,
  targetUseLocation: requestDoc.targetUseLocation || 'Dom',
  status: 'active',
  borrowedAt: new Date(),
  dueAt: requestDoc.requestedReturnDate ? new Date(requestDoc.requestedReturnDate) : null,
  returnedAt: null,
  borrowNote: requestDoc.note || requestDoc.purpose || '',
  returnNote: null,
  createdByEmail: req.user.email,
  closedByEmail: null
};

  const loanResult = await db.collection(collections.loans).insertOne(loan);

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'approved',
        approvedAt: new Date(),
        approvedByEmail: req.user.email,
        decisionNote: String(decisionNote || '').trim()
      }
    }
  );

  await db.collection(collections.items).updateOne(
    { _id: item._id },
    {
      $set: {
        operationalStatus: 'loaned',
        currentLocation: 'U pracownika',
        assignedToEmail: requestDoc.requesterEmail,
        assignedToName: requestDoc.requesterName || null,
        updatedAt: new Date()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_approved',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode,
      requesterEmail: requestDoc.requesterEmail,
      loanId: String(loanResult.insertedId)
    },
    createdAt: new Date()
  });

  res.json({
    message: 'Wniosek zaakceptowany',
    loanId: loanResult.insertedId
  });
});

app.post('/admin/loan-requests/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { decisionNote = '' } = req.body;

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (requestDoc.status !== 'pending') {
    return res.status(400).json({ message: 'Wniosek nie oczekuje już na decyzję' });
  }

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedByEmail: req.user.email,
        decisionNote: String(decisionNote || '').trim()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_rejected',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode,
      requesterEmail: requestDoc.requesterEmail
    },
    createdAt: new Date()
  });

  res.json({ message: 'Wniosek odrzucony' });
});

app.get('/admin/audit-logs', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();

  const {
    actorEmail,
    entityType,
    actionType,
    itemCode,
    limit = '100'
  } = req.query;

  const query = {};

  if (actorEmail) {
    query.actorEmail = actorEmail.trim().toLowerCase();
  }

  if (entityType) {
    query.entityType = entityType.trim();
  }

  if (actionType) {
    query.actionType = actionType.trim();
  }

  if (itemCode) {
    query['payload.itemCode'] = {
      $regex: new RegExp(itemCode.trim(), 'i')
    };
  }

  const safeLimit = Math.min(Number(limit) || 100, 500);

  const logs = await db.collection(collections.auditLogs)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .toArray();

  res.json(logs);
});

async function start() {
  const db = await getDb();
  await ensureIndexes(db);

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});