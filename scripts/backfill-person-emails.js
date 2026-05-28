import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { collections } from '../src/schema.js';
import { resolvePersonEmail } from '../src/person-email-map.js';

dotenv.config();

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db(process.env.DB_NAME);

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