import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { searchSessions } from '@/lib/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const apiType = searchParams.get('apiType');

  let query = db.select().from(searchSessions).orderBy(desc(searchSessions.searchedAt)).$dynamic();
  if (apiType) query = query.where(eq(searchSessions.apiType, apiType));
  const rows = await query.limit(limitParam ? parseInt(limitParam) : 50);

  return NextResponse.json(rows.map(r => ({
    ...r,
    searchParams: JSON.parse(r.searchParams),
    results: JSON.parse(r.results),
  })));
}
