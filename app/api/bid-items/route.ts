import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { bidItems } from '@/lib/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const bizType = searchParams.get('bizType');
  const limit = parseInt(searchParams.get('limit') ?? '200');

  let query = db.select().from(bidItems).orderBy(desc(bidItems.createdAt)).$dynamic();
  if (bizType) query = query.where(eq(bidItems.bizType, bizType));
  const rows = await query.limit(limit);

  return NextResponse.json(rows.map(r => ({
    id: r.id,
    bizType: r.bizType,
    bidNtceNo: r.bidNtceNo,
    bidNtceOrd: r.bidNtceOrd,
    createdAt: r.createdAt,
    ...JSON.parse(r.rawData),
  })));
}
