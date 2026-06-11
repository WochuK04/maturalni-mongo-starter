import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { collections } from '../src/schema.js';
import { resolvePersonEmail } from '../src/person-email-map.js';

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.mongodb_uri;

const DB_NAME =
  process.env.MONGO_DB_NAME ||
  process.env.DB_NAME ||
  'equipment_db';

if (!MONGO_URI) {
  console.error('Brak MONGO_URI / MONGODB_URI / mongodb_uri w .env');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  const db = client.db(DB_NAME);

  const items = await db.collection(collections.items).find({
    assignedToName: { $exists: true, $ne: null }
  }).toArray();

  let updatedItems = 0;
  let updatedLoans = 0;
  const unresolved = [];

  for (const item of items) {
    const personName = item.assignedToName?.trim();
    if (!personName) continue;

    const email = resolvePersonEmail(personName);

    if (!email) {
      unresolved.push({
        itemCode: item.itemCode,
        assignedToName: item.assignedToName
      });
      continue;
    }

    const itemResult = await db.collection(collections.items).updateOne(
      { _id: item._id },
      {
        $set: {
          assignedToEmail: email,
          updatedAt: new Date()
        }
      }
    );

    if (itemResult.modifiedCount) updatedItems++;

    const loanResult = await db.collection(collections.loans).updateMany(
      {
        itemCode: item.itemCode,
        status: 'active'
      },
      {
        $set: {
          userEmail: email,
          userDisplayName: item.assignedToName
        }
      }
    );

    updatedLoans += loanResult.modifiedCount;
  }

  console.log(JSON.stringify({
    scannedItems: items.length,
    updatedItems,
    updatedLoans,
    unresolved
  }, null, 2));

  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});