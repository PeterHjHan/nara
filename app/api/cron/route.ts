import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { searchSessions, settings, bidItems } from '@/lib/schema';
import { fetchBidNotices } from '@/lib/nara-api';
import { sql } from 'drizzle-orm';
import { sendTelegramMessage, sendTelegramSplit } from '@/lib/telegram';
import type { BizType } from '@/lib/nara-api';

const APP_URL = 'https://nara-chi.vercel.app';

const BIZ_TYPES: BizType[] = ['cnstwk', 'servc', 'thng', 'frgcpt'];

const BIZ_LABEL: Record<BizType, string> = {
  cnstwk: '공사',
  servc:  '용역',
  thng:   '물품',
  frgcpt: '외자',
};

const BIZ_ICON: Record<BizType, string> = {
  cnstwk: '🏗️',
  servc:  '🛠️',
  thng:   '📦',
  frgcpt: '🌐',
};

// Biz types that have show pages
const HAS_SHOW_PAGE = new Set<BizType>(['servc']);

function itemUrl(bizType: BizType, item: Record<string, string>): string {
  const no = item.bidNtceNo;
  const ord = item.bidNtceOrd ?? '000';
  if (no && HAS_SHOW_PAGE.has(bizType)) return `${APP_URL}/go/${bizType}/${no}-${ord}`;
  return `${APP_URL}/history`;
}

function formatKRW(val: string): string {
  const n = Number(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initDb();

  const config = await db.select().from(settings);
  const configMap: Record<string, string> = {};
  for (const row of config) configMap[row.key] = row.value;

  const botToken = process.env.TELEGRAM_BOT_TOKEN || configMap['telegram_bot_token'];
  const chatId = process.env.TELEGRAM_CHAT_ID || configMap['telegram_chat_id'];

  if (!botToken || !chatId) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 400 });
  }

  // Today's date range in YYYYMMDDHHMM format (KST = UTC+9)
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = kst.toISOString().slice(0, 10).replace(/-/g, '');
  const inqryBgnDt = today + '0000';
  const inqryEndDt = today + '2359';
  const dateLabel = `${kst.toISOString().slice(0, 10)}`;

  const summary: { bizType: BizType; items: Record<string, string>[]; total: number }[] = [];

  // 1. Fetch from API + upsert into bid_items for each biz type
  for (const bizType of BIZ_TYPES) {
    try {
      const result = await fetchBidNotices({ bizType, inqryDiv: '1', inqryBgnDt, inqryEndDt, numOfRows: 100 });

      await db.insert(searchSessions).values({
        apiType: `bid_${bizType}`,
        searchParams: JSON.stringify({ bizType, inqryDiv: '1', inqryBgnDt, inqryEndDt }),
        resultCount: result.totalCount,
        results: JSON.stringify(result.items),
      });

      for (const item of result.items) {
        const no = item.bidNtceNo;
        const ord = item.bidNtceOrd ?? '000';
        if (!no) continue;
        await db.insert(bidItems).values({
          bizType,
          bidNtceNo: no,
          bidNtceOrd: ord,
          rawData: JSON.stringify(item),
        }).onConflictDoUpdate({
          target: [bidItems.bizType, bidItems.bidNtceNo, bidItems.bidNtceOrd],
          set: { rawData: sql`excluded.raw_data` },
        });
      }

      summary.push({ bizType, items: result.items, total: result.totalCount });
    } catch (err) {
      console.error(`Cron fetch failed for ${bizType}:`, err);
      summary.push({ bizType, items: [], total: 0 });
    }
  }

  // 2. Build Telegram message
  const header = `📋 <b>나라장터 일일 요약</b> (${dateLabel})\n━━━━━━━━━━━━━━\n\n`;
  const itemBlocks: string[] = [];

  for (const { bizType, items, total } of summary) {
    const icon = BIZ_ICON[bizType];
    const label = BIZ_LABEL[bizType];

    itemBlocks.push(`${icon} <b>${label}</b> · ${total}건\n━━━━━━━━━━━━━━━━\n`);

    if (items.length === 0) {
      itemBlocks.push(`결과 없음\n\n`);
      continue;
    }

    items
      .sort((a, b) => Number(b.presmptPrce || b.asignBdgtAmt || 0) - Number(a.presmptPrce || a.asignBdgtAmt || 0))
      .forEach((item, i) => {
        const name = item.bidNtceNm ?? '(이름 없음)';
        const institution = item.ntceInsttNm ?? item.dminsttNm ?? '';
        const amount = item.presmptPrce || item.asignBdgtAmt || '';
        const deadline = item.bidClseDt ?? '';
        const url = itemUrl(bizType, item);

        let block = `\n<b>${i + 1}.</b> <a href="${url}">${name}</a>\n`;
        if (institution) block += `   🏢 ${institution}\n`;
        if (amount) block += `   💰 ${formatKRW(amount)}\n`;
        if (deadline) block += `   📅 마감: ${deadline.slice(0, 16)}\n`;

        itemBlocks.push(block);
      });

    itemBlocks.push(`\n`);
  }

  const footer = `\n━━━━━━━━━━━━━━\n<a href="${APP_URL}/history">전체 목록 보기</a>`;

  await sendTelegramSplit(header, itemBlocks, footer, botToken, chatId);

  const totalItems = summary.reduce((s, r) => s + r.items.length, 0);
  return NextResponse.json({ sent: true, totalItems, byType: Object.fromEntries(summary.map(s => [s.bizType, s.total])) });
}
