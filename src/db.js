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

// Współdzielony klient Mongo — używany m.in. przez session store (connect-mongo),
// żeby NIE otwierał własnej puli połączeń (istotne na serverless: mniej połączeń
// do Atlasa, brak wyścigu przy cold-startach). Zwraca połączonego klienta lub
// rzuca, jeśli connectToDatabase() jeszcze nie zakończył.
export function getMongoClient() {
  if (!client) {
    throw new Error('Mongo client not connected yet');
  }
  return client;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}