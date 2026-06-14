import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const searchSessions = sqliteTable('search_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  apiType: text('api_type').notNull(), // 'bid' | 'successful_bid' | 'contract'
  searchParams: text('search_params').notNull(), // JSON
  resultCount: integer('result_count').notNull().default(0),
  results: text('results').notNull().default('[]'), // JSON array
  searchedAt: text('searched_at').notNull().default(sql`(datetime('now'))`),
});

export const favorites = sqliteTable('favorites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  apiType: text('api_type').notNull(),
  itemId: text('item_id').notNull(),
  itemData: text('item_data').notNull(), // JSON
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
