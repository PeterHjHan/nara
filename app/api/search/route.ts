import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { searchSessions, settings, bidItems } from '@/lib/schema';
import { fetchBidNotices } from '@/lib/nara-api';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  await initDb();

  if (!process.env.NARA_SERVICE_KEY) {
    const row = await db.select().from(settings).where(eq(settings.key, 'nara_service_key'));
    if (row[0]?.value) process.env.NARA_SERVICE_KEY = row[0].value;
  }

  const body = await req.json();
  const { params } = body;

  try {
    const result = await fetchBidNotices(params);

    await db.insert(searchSessions).values({
      apiType: `bid_${params.bizType}`,
      searchParams: JSON.stringify(params),
      resultCount: result.totalCount,
      results: JSON.stringify(result.items),
    });

    // Upsert each item into bid_items
    for (const item of result.items) {
      const no = item.bidNtceNo;
      const ord = item.bidNtceOrd ?? '000';
      if (!no) continue;
      await db.insert(bidItems).values({
        bizType: params.bizType,
        bidNtceNo: no,
        bidNtceOrd: ord,
        rawData: JSON.stringify(item),
      }).onConflictDoUpdate({
        target: [bidItems.bizType, bidItems.bidNtceNo, bidItems.bidNtceOrd],
        set: { rawData: sql`excluded.raw_data` },
      });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
