import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { ObjectId } from 'mongodb';

import { getDb, connectToDatabase } from './db.js';
import { collections, ensureIndexes } from './schema.js';
import { setupPassport, requireAuth, requireAdmin, requireManager } from './auth.js';
import { MANAGER_MAP } from './manager-map.js';

const app = express();
const port = Number(process.env.PORT || 3000);

// Akceptujemy oba warianty nazw (jak skrypty import/backfill), bo lokalny .env
// używa MONGODB_URI / DB_NAME, a środowisko produkcyjne MONGO_URI / MONGO_DB_NAME.
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || process.env.DB_NAME || 'equipment_db';

// najpierw łączymy się z bazą, potem konfigurujemy Passport
await connectToDatabase();
setupPassport();

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('ENV CHECK', {
  hasMongoUri: Boolean(MONGO_URI),
  hasSessionSecret: Boolean(process.env.SESSION_SECRET),
  mongoDbName: MONGO_DB_NAME,
  nodeEnv: process.env.NODE_ENV
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      dbName: MONGO_DB_NAME,
      collectionName: 'sessions'
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
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

// Słownik stanów technicznych dla list rozwijanych w panelu admina.
const ITEM_CONDITIONS = [
  { value: 'new', label: 'Nowy' },
  { value: 'very_good', label: 'Bardzo dobry' },
  { value: 'good', label: 'Dobry' },
  { value: 'ok', label: 'Zadowalający' },
  { value: 'poor', label: 'Wymaga uwagi' },
  { value: 'damaged', label: 'Uszkodzony' },
  { value: 'for_repair', label: 'Do naprawy' }
];

const FALLBACK_LOCATIONS = ['Magazyn', 'Studio', 'Biuro', 'U pracownika', 'Serwis'];

// Statusy wniosku, które wciąż są "w obiegu" (nie zapadła ostateczna decyzja).
// 'pending' to status zaszłości sprzed wprowadzenia dwuetapowej akceptacji.
const ACTIVE_REQUEST_STATUSES = ['pending_manager', 'pending_admin', 'pending'];

// Wyznacza kierownika-akceptującego dla wnioskodawcy (routing dwuetapowy).
// Zwraca email aktywnego kierownika/admina albo null (wtedy wniosek idzie wprost
// do administracji). Wspólne dla wniosków o wypożyczenie i o zakup.
async function resolveApproverEmail(db, requesterEmail) {
  const requester = await db.collection(collections.users).findOne({ email: requesterEmail });
  let approverEmail = requester?.managerEmail || null;

  if (approverEmail) {
    const approver = await db.collection(collections.users).findOne({
      email: approverEmail,
      isActive: { $ne: false }
    });

    if (!approver || !['manager', 'admin'].includes(approver.role)) {
      approverEmail = null;
    }
  }

  return approverEmail;
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

// Sprzęt, który użytkownik faktycznie ma u siebie — źródłem prawdy jest
// dokument sprzętu (assignedToEmail), nie kolekcja loans. Dzięki temu widać też
// sprzęt przypisany z importu Excela, dla którego nie powstał rekord wypożyczenia.
app.get('/my/items', requireAuth, async (req, res) => {
  const db = await getDb();

  const items = await db.collection(collections.items)
    .find(
      {
        assignedToEmail: req.user.email,
        isActive: { $ne: false }
      },
      {
        projection: {
          itemCode: 1,
          name: 1,
          category: 1,
          currentLocation: 1,
          conditionStatus: 1,
          assignedToName: 1,
          assignedToEmail: 1
        }
      }
    )
    .sort({ category: 1, name: 1, itemCode: 1 })
    .toArray();

  res.json(items);
});

// Zwrot sprzętu po itemCode (działa też bez rekordu wypożyczenia).
app.post('/items/:itemCode/return', requireAuth, async (req, res) => {
  const db = await getDb();
  const { returnLocation = 'Magazyn', returnNote = '' } = req.body;
  const itemCode = normalizeItemCode(req.params.itemCode);

  const item = await db.collection(collections.items).findOne({
    itemCode,
    isActive: { $ne: false }
  });

  if (!item) {
    return res.status(404).json({ message: 'Nie znaleziono sprzętu' });
  }

  const isOwner = item.assignedToEmail === req.user.email;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Nie możesz oddać cudzego sprzętu' });
  }

  if (!item.assignedToEmail && item.operationalStatus === 'available') {
    return res.status(400).json({ message: 'Ten sprzęt nie jest u nikogo wypożyczony' });
  }

  const now = new Date();
  const loc = String(returnLocation || 'Magazyn').trim() || 'Magazyn';

  await db.collection(collections.items).updateOne(
    { _id: item._id },
    {
      $set: {
        operationalStatus: 'available',
        currentLocation: loc,
        assignedToEmail: null,
        assignedToName: null,
        updatedAt: now
      }
    }
  );

  // Zamknij aktywne wypożyczenie, jeśli takie istnieje (dla zwykłego obiegu).
  await db.collection(collections.loans).updateMany(
    { itemCode, status: 'active' },
    {
      $set: {
        status: 'returned',
        returnedAt: now,
        returnLocation: loc,
        returnNote: String(returnNote || '').trim(),
        closedByEmail: req.user.email
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_returned',
    entityType: 'item',
    entityId: itemCode,
    payload: { itemCode, returnLocation: loc },
    createdAt: now
  });

  res.json({ message: 'Returned' });
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
    status: { $in: ACTIVE_REQUEST_STATUSES }
  });

  if (existingPendingRequest) {
    return res.status(409).json({
      message: 'Masz już oczekujący wniosek dla tego sprzętu'
    });
  }

  // Dwuetapowy obieg: jeśli wnioskodawca ma przypisanego (aktywnego) kierownika,
  // wniosek trafia najpierw do niego (pending_manager), inaczej wprost do admina.
  const approverEmail = await resolveApproverEmail(db, req.user.email);

  const loanRequest = {
    kind: 'loan',
    itemCode: item.itemCode,
    itemName: item.name,
    requesterEmail: req.user.email,
    requesterName: req.user.fullName || req.user.email,
    purpose: String(purpose || '').trim(),
    targetUseLocation: String(targetUseLocation || '').trim(),
    requestedReturnDate: requestedReturnDate || null,
    note: String(note || '').trim(),
    approverEmail,
    status: approverEmail ? 'pending_manager' : 'pending_admin',
    requestedAt: new Date(),
    managerApprovedAt: null,
    managerApprovedByEmail: null,
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

// Wniosek o ZAKUP sprzętu spoza magazynu/bazy (np. promocja w sklepie).
// Korzysta z tego samego dwuetapowego obiegu akceptacji (kierownik -> admin).
app.post('/purchase-requests', requireAuth, async (req, res) => {
  const db = await getDb();

  const {
    itemName,
    category = '',
    quantity = 1,
    shopUrl,
    estimatedPrice = '',
    justification = '',
    note = ''
  } = req.body;

  const name = String(itemName || '').trim();
  const url = String(shopUrl || '').trim();
  const reason = String(justification || '').trim();

  if (!name) {
    return res.status(400).json({ message: 'Nazwa sprzętu jest wymagana' });
  }

  if (!/^https?:\/\/.+/i.test(url)) {
    return res.status(400).json({ message: 'Podaj prawidłowy link do sklepu (http/https)' });
  }

  if (!reason) {
    return res.status(400).json({ message: 'Uzasadnienie jest wymagane' });
  }

  const approverEmail = await resolveApproverEmail(db, req.user.email);

  const purchaseRequest = {
    kind: 'purchase',
    itemName: name,
    category: String(category || '').trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    shopUrl: url,
    estimatedPrice: String(estimatedPrice || '').trim(),
    justification: reason,
    note: String(note || '').trim(),
    requesterEmail: req.user.email,
    requesterName: req.user.fullName || req.user.email,
    approverEmail,
    status: approverEmail ? 'pending_manager' : 'pending_admin',
    requestedAt: new Date(),
    managerApprovedAt: null,
    managerApprovedByEmail: null,
    approvedAt: null,
    approvedByEmail: null,
    rejectedAt: null,
    rejectedByEmail: null,
    decisionNote: null
  };

  const result = await db.collection(collections.loanRequests).insertOne(purchaseRequest);

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'purchase_request_created',
    entityType: 'purchase_request',
    entityId: String(result.insertedId),
    payload: { itemName: name, shopUrl: url, quantity: purchaseRequest.quantity },
    createdAt: new Date()
  });

  res.status(201).json({
    message: 'Wniosek o zakup został utworzony',
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

  if (!ACTIVE_REQUEST_STATUSES.includes(requestDoc.status)) {
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

// ===== Etap 1 obiegu: akceptacja kierownika działu =====

app.get('/manager/loan-requests', requireAuth, requireManager, async (req, res) => {
  const db = await getDb();
  const { status } = req.query;

  const query = { approverEmail: req.user.email };
  query.status = status ? String(status).trim() : 'pending_manager';

  const requests = await db.collection(collections.loanRequests)
    .find(query)
    .sort({ requestedAt: -1 })
    .toArray();

  res.json(requests);
});

function isRequestApprover(requestDoc, user) {
  return user?.role === 'admin' || requestDoc.approverEmail === user?.email;
}

app.post('/manager/loan-requests/:id/approve', requireAuth, requireManager, async (req, res) => {
  const db = await getDb();
  const { decisionNote = '' } = req.body;

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (!isRequestApprover(requestDoc, req.user)) {
    return res.status(403).json({ message: 'Ten wniosek nie jest przypisany do Ciebie' });
  }

  if (requestDoc.status !== 'pending_manager') {
    return res.status(400).json({ message: 'Wniosek nie oczekuje na decyzję kierownika' });
  }

  // Akceptacja kierownika nie wydaje sprzętu – przekazuje wniosek do administracji.
  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'pending_admin',
        managerApprovedAt: new Date(),
        managerApprovedByEmail: req.user.email,
        decisionNote: String(decisionNote || '').trim()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_manager_approved',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode,
      requesterEmail: requestDoc.requesterEmail
    },
    createdAt: new Date()
  });

  res.json({ message: 'Wniosek przekazany do administracji' });
});

app.post('/manager/loan-requests/:id/reject', requireAuth, requireManager, async (req, res) => {
  const db = await getDb();
  const { decisionNote = '' } = req.body;

  const requestDoc = await db.collection(collections.loanRequests).findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!requestDoc) {
    return res.status(404).json({ message: 'Wniosek nie istnieje' });
  }

  if (!isRequestApprover(requestDoc, req.user)) {
    return res.status(403).json({ message: 'Ten wniosek nie jest przypisany do Ciebie' });
  }

  if (requestDoc.status !== 'pending_manager') {
    return res.status(400).json({ message: 'Wniosek nie oczekuje na decyzję kierownika' });
  }

  await db.collection(collections.loanRequests).updateOne(
    { _id: requestDoc._id },
    {
      $set: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedByEmail: req.user.email,
        managerApprovedByEmail: req.user.email,
        decisionNote: String(decisionNote || '').trim()
      }
    }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'loan_request_manager_rejected',
    entityType: 'loan_request',
    entityId: String(requestDoc._id),
    payload: {
      itemCode: requestDoc.itemCode,
      requesterEmail: requestDoc.requesterEmail
    },
    createdAt: new Date()
  });

  res.json({ message: 'Wniosek odrzucony przez kierownika' });
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

// Dane do list rozwijanych w formularzu dodawania sprzętu.
app.get('/admin/form-options', requireAuth, requireAdmin, async (_req, res) => {
  const db = await getDb();

  const [locationDocs, categories, users] = await Promise.all([
    db.collection(collections.locations)
      .find({ isActive: { $ne: false } })
      .sort({ name: 1 })
      .toArray(),
    db.collection(collections.items).distinct('category', { category: { $nin: [null, ''] } }),
    db.collection(collections.users)
      .find({ isActive: { $ne: false } }, { projection: { email: 1, fullName: 1 } })
      .sort({ fullName: 1 })
      .toArray()
  ]);

  const locationNames = locationDocs.map(loc => loc.name).filter(Boolean);

  res.json({
    locations: [...new Set([...locationNames, ...FALLBACK_LOCATIONS])],
    categories: categories.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'pl')),
    conditions: ITEM_CONDITIONS,
    users: users.map(u => ({ email: u.email, fullName: u.fullName || u.email }))
  });
});

// ===== Zarządzanie użytkownikami (tylko admin) =====

app.get('/admin/users', requireAuth, requireAdmin, async (_req, res) => {
  const db = await getDb();

  const users = await db.collection(collections.users)
    .find({}, { projection: { email: 1, fullName: 1, role: 1, managerEmail: 1, isActive: 1 } })
    .sort({ fullName: 1 })
    .toArray();

  res.json(users);
});

app.patch('/admin/users/:email', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const email = String(req.params.email || '').trim().toLowerCase();
  const { role, managerEmail } = req.body;

  const user = await db.collection(collections.users).findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
  }

  const update = { updatedAt: new Date() };

  if (role !== undefined) {
    if (!['user', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Nieprawidłowa rola' });
    }
    if (email === req.user.email && role !== 'admin') {
      return res.status(400).json({ message: 'Nie możesz odebrać sobie uprawnień administratora' });
    }
    update.role = role;
  }

  if (managerEmail !== undefined) {
    const normalized = String(managerEmail || '').trim().toLowerCase();

    if (!normalized) {
      update.managerEmail = null;
    } else if (normalized === email) {
      return res.status(400).json({ message: 'Użytkownik nie może być swoim własnym kierownikiem' });
    } else {
      const manager = await db.collection(collections.users).findOne({ email: normalized });
      if (!manager) {
        return res.status(400).json({ message: 'Wskazany kierownik nie istnieje' });
      }
      if (!['manager', 'admin'].includes(manager.role)) {
        return res.status(400).json({ message: 'Wskazana osoba nie ma roli kierownika' });
      }
      update.managerEmail = normalized;
    }
  }

  await db.collection(collections.users).updateOne({ email }, { $set: update });

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'user_updated',
    entityType: 'user',
    entityId: email,
    payload: update,
    createdAt: new Date()
  });

  const updated = await db.collection(collections.users).findOne(
    { email },
    { projection: { email: 1, fullName: 1, role: 1, managerEmail: 1, isActive: 1 } }
  );

  res.json({ message: 'Zaktualizowano użytkownika', user: updated });
});

app.delete('/admin/users/:email', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDb();
  const email = String(req.params.email || '').trim().toLowerCase();

  if (email === req.user.email) {
    return res.status(400).json({ message: 'Nie możesz usunąć własnego konta' });
  }

  const user = await db.collection(collections.users).findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
  }

  await db.collection(collections.users).deleteOne({ email });

  // Wyzeruj routing wniosków wskazujący na usuniętego użytkownika.
  await db.collection(collections.users).updateMany(
    { managerEmail: email },
    { $set: { managerEmail: null } }
  );

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'user_deleted',
    entityType: 'user',
    entityId: email,
    payload: { email, fullName: user.fullName || null, role: user.role || null },
    createdAt: new Date()
  });

  res.json({ message: 'Usunięto użytkownika' });
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
    isStudioLocked = false,
    assignedToEmail = ''
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

  const now = new Date();
  const sourceLocation = String(currentLocation || 'Magazyn').trim() || 'Magazyn';

  // Opcjonalne przypisanie sprzętu do użytkownika już przy dodawaniu.
  const normalizedAssignee = String(assignedToEmail || '').trim().toLowerCase();
  let assignedUser = null;

  if (normalizedAssignee) {
    assignedUser = await db.collection(collections.users).findOne({ email: normalizedAssignee });

    if (!assignedUser) {
      return res.status(400).json({ message: 'Wybrany użytkownik nie istnieje' });
    }
  }

  const doc = {
    itemCode: normalizedItemCode,
    category: String(category).trim(),
    name: String(name).trim(),
    details: String(details || '').trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    currentLocation: assignedUser ? 'U pracownika' : sourceLocation,
    conditionStatus: String(conditionStatus || 'ok').trim(),
    operationalStatus: assignedUser ? 'loaned' : 'available',
    assignedToName: assignedUser ? (assignedUser.fullName || assignedUser.email) : null,
    assignedToEmail: assignedUser ? assignedUser.email : null,
    notes: String(notes || '').trim(),
    imageUrl: String(imageUrl || '').trim(),
    thumbnailUrl: String(thumbnailUrl || '').trim(),
    brand: String(brand || '').trim(),
    model: String(model || '').trim(),
    qrCodeValue: String(qrCodeValue || '').trim(),
    tags: normalizeTags(tags),
    isStudioLocked: parseBoolean(isStudioLocked),
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  const result = await db.collection(collections.items).insertOne(doc);

  await db.collection(collections.auditLogs).insertOne({
    actorEmail: req.user.email,
    actionType: 'item_created',
    entityType: 'item',
    entityId: String(result.insertedId),
    payload: doc,
    createdAt: now
  });

  // Sprzęt dodany od razu „na stanie pracownika” = utworzenie wypożyczenia.
  if (assignedUser) {
    const loan = {
      itemId: result.insertedId,
      itemCode: normalizedItemCode,
      userEmail: assignedUser.email,
      userDisplayName: assignedUser.fullName || assignedUser.email,
      quantity: 1,
      fromLocation: sourceLocation,
      targetUseLocation: 'U pracownika',
      status: 'active',
      borrowedAt: now,
      dueAt: null,
      returnedAt: null,
      borrowNote: 'Przypisano przy dodawaniu sprzętu',
      returnNote: null,
      createdByEmail: req.user.email,
      closedByEmail: null
    };

    const loanResult = await db.collection(collections.loans).insertOne(loan);

    await db.collection(collections.auditLogs).insertOne({
      actorEmail: req.user.email,
      actionType: 'loan_created',
      entityType: 'loan',
      entityId: String(loanResult.insertedId),
      payload: { itemCode: normalizedItemCode, userEmail: assignedUser.email },
      createdAt: now
    });
  }

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

  if (!['pending_admin', 'pending'].includes(requestDoc.status)) {
    return res.status(400).json({
      message: requestDoc.status === 'pending_manager'
        ? 'Wniosek czeka jeszcze na akceptację kierownika'
        : 'Wniosek nie oczekuje już na decyzję'
    });
  }

  // Wniosek o zakup: akceptacja to tylko decyzja (zatwierdzenie zakupu),
  // nie tworzymy wypożyczenia ani nie szukamy sprzętu w bazie.
  if (requestDoc.kind === 'purchase') {
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

    await db.collection(collections.auditLogs).insertOne({
      actorEmail: req.user.email,
      actionType: 'purchase_request_approved',
      entityType: 'purchase_request',
      entityId: String(requestDoc._id),
      payload: { itemName: requestDoc.itemName, shopUrl: requestDoc.shopUrl },
      createdAt: new Date()
    });

    return res.json({ message: 'Wniosek o zakup zaakceptowany' });
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

  if (!ACTIVE_REQUEST_STATUSES.includes(requestDoc.status)) {
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

let bootPromise = null;

function ensureBoot() {
  if (!bootPromise) {
    bootPromise = (async () => {
      const db = await getDb();
      await ensureIndexes(db);

      // Migracja zaszłości: wnioski sprzed dwuetapowej akceptacji ('pending')
      // traktujemy jak gotowe do realizacji przez administrację.
      await db.collection(collections.loanRequests).updateMany(
        { status: 'pending' },
        { $set: { status: 'pending_admin', approverEmail: null } }
      );

      // Seed routingu wniosków z mapy startowej dla użytkowników bez pola
      // managerEmail. Warunek $exists:false czyni to jednorazowym per użytkownik –
      // późniejsze zmiany admina (także ustawienie na null) nie są nadpisywane.
      for (const [subordinate, managerEmail] of Object.entries(MANAGER_MAP)) {
        await db.collection(collections.users).updateOne(
          { email: subordinate, managerEmail: { $exists: false } },
          { $set: { managerEmail } }
        );
      }
    })();
  }
  return bootPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureBoot();
    next();
  } catch (err) {
    next(err);
  }
});

export default app;