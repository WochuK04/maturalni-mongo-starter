import { MongoClient } from 'mongodb';

let client;
let db;

export async function connectToDatabase() {
  if (!db) {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Brak MONGO_URI / MONGODB_URI w zmiennych środowiskowych');
    }
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(process.env.MONGO_DB_NAME || process.env.DB_NAME || 'equipment_db');
  }
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not connected yet');
  }
  return db;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}