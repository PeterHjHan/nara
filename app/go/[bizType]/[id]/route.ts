import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { bidItems, favorites } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

const SHOW_PAGE: Record<string, string> = {
  servc: '/bid/servc',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bizType: string; id: string }> },
) {
  const { bizType, id } = await params;
  await initDb();

  // Parse id: last segment after final '-' is the ord
  const dashIdx = id.lastIndexOf('-');
  const no = dashIdx > 0 ? id.slice(0, dashIdx) : id;
  const ord = dashIdx > 0 ? id.slice(dashIdx + 1) : '000';

  const showPath = SHOW_PAGE[bizType];
  const destination = showPath ? `${showPath}/${id}` : `/history`;

  // Fetch item from bid_items to get full data for the favorite record
  const rows = await db
    .select()
    .from(bidItems)
    .where(and(eq(bidItems.bizType, bizType), eq(bidItems.bidNtceNo, no), eq(bidItems.bidNtceOrd, ord)))
    .limit(1);

  if (rows.length > 0) {
    const apiType = `bid_${bizType}`;
    const itemId = `${no}-${ord}`;
    const itemData = rows[0].rawData; // already JSON string

    // Insert favorite if not already present (never toggle — always favorite from this path)
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.apiType, apiType), eq(favorites.itemId, itemId)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(favorites).values({ apiType, itemId, itemData });
    }
  }

  return NextResponse.redirect(new URL(destination, _req.url));
}
