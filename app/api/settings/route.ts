import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  await initDb();
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  await initDb();
  const updates: Record<string, string> = await req.json();

  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.select().from(settings).where(eq(settings.key, key));
    if (existing.length > 0) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  return NextResponse.json({ success: true });
}
