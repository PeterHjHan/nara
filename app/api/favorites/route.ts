import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { favorites } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  await initDb();
  const rows = await db.select().from(favorites).orderBy(favorites.createdAt);
  return NextResponse.json(rows.map(r => ({ ...r, itemData: JSON.parse(r.itemData) })));
}

export async function POST(req: NextRequest) {
  await initDb();
  const { apiType, itemId, itemData } = await req.json();

  // Toggle: if exists, delete; else insert
  const existing = await db.select().from(favorites)
    .where(and(eq(favorites.apiType, apiType), eq(favorites.itemId, itemId)));

  if (existing.length > 0) {
    await db.delete(favorites)
      .where(and(eq(favorites.apiType, apiType), eq(favorites.itemId, itemId)));
    return NextResponse.json({ favorited: false });
  } else {
    await db.insert(favorites).values({ apiType, itemId, itemData: JSON.stringify(itemData) });
    return NextResponse.json({ favorited: true });
  }
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const { apiType, itemId } = await req.json();
  await db.delete(favorites)
    .where(and(eq(favorites.apiType, apiType), eq(favorites.itemId, itemId)));
  return NextResponse.json({ success: true });
}
