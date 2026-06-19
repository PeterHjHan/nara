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

export const bidItems = sqliteTable('bid_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bizType: text('biz_type').notNull(), // 'cnstwk' | 'servc' | 'thng' | 'frgcpt'
  bidNtceNo: text('bid_ntce_no').notNull(),
  bidNtceOrd: text('bid_ntce_ord').notNull().default('000'),
  rawData: text('raw_data').notNull(), // full JSON from API
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
