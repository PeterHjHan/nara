import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { bidItems } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  // id format: bidNtceNo or bidNtceNo-bidNtceOrd
  const [no, ord = '000'] = id.split('-');

  const rows = await db
    .select()
    .from(bidItems)
    .where(and(eq(bidItems.bizType, 'servc'), eq(bidItems.bidNtceNo, no), eq(bidItems.bidNtceOrd, ord)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ item: JSON.parse(rows[0].rawData) });
}
