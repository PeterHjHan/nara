import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { searchSessions, settings } from '@/lib/schema';
import { fetchBidNotices, fetchSuccessfulBids, fetchContracts } from '@/lib/nara-api';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  await initDb();

  // Allow API key to be stored in DB (settings page) or in env
  if (!process.env.NARA_SERVICE_KEY) {
    const row = await db.select().from(settings).where(eq(settings.key, 'nara_service_key'));
    if (row[0]?.value) process.env.NARA_SERVICE_KEY = row[0].value;
  }

  const body = await req.json();
  const { apiType, params } = body;

  try {
    let result;
    if (apiType === 'bid') {
      result = await fetchBidNotices(params);
    } else if (apiType === 'successful_bid') {
      result = await fetchSuccessfulBids(params);
    } else if (apiType === 'contract') {
      result = await fetchContracts(params);
    } else {
      return NextResponse.json({ error: 'Invalid apiType' }, { status: 400 });
    }

    // Save search session to DB
    await db.insert(searchSessions).values({
      apiType,
      searchParams: JSON.stringify(params),
      resultCount: result.totalCount,
      results: JSON.stringify(result.items),
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
