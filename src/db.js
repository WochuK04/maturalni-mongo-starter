import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'maturalni_equipment';

const client = new MongoClient(uri);

export async function getDb() {
  await client.connect();
  return client.db(dbName);
}

export async function closeDb() {
  await client.close();
}