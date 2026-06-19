import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

export const db = drizzle(client, { schema });

export async function initDb() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS search_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_type TEXT NOT NULL,
      search_params TEXT NOT NULL,
      result_count INTEGER NOT NULL DEFAULT 0,
      results TEXT NOT NULL DEFAULT '[]',
      searched_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(api_type, item_id)
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}
