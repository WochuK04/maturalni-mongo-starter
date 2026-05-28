import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

export async function connectToDatabase() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.MONGO_DB_NAME || 'equipment_db');
  }
  return db;
}

export default client;