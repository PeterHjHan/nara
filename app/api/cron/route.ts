import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { searchSessions, settings, bidItems } from '@/lib/schema';
import { fetchAllBidNotices } from '@/lib/nara-api';
import { and, eq, gte, sql } from 'drizzle-orm';
import { sendTelegramMessage, sendTelegramSplit } from '@/lib/telegram';
import { getDateRange } from '@/lib/cron-dates';
import type { BizType } from '@/lib/nara-api';

const APP_URL = 'https://nara-chi.vercel.app';
const BIZ_TYPES: BizType[] = ['cnstwk', 'servc', 'thng', 'frgcpt'];
const BIZ_LABEL: Record<BizType, string> = { cnstwk: '공사', servc: '용역', thng: '물품', frgcpt: '외자' };
const BIZ_ICON: Record<BizType, string>  = { cnstwk: '🏗️', servc: '🛠️', thng: '📦', frgcpt: '🌐' };
const HAS_SHOW_PAGE = new Set<BizType>(['servc']);

// ── Telegram helpers ──────────────────────────────────────────────────────────

function itemUrl(bizType: BizType, item: Record<string, string>): string {
  const no  = item.bidNtceNo;
  const ord = item.bidNtceOrd ?? '000';
  if (no && HAS_SHOW_PAGE.has(bizType)) return `${APP_URL}/go/${bizType}/${no}-${ord}`;
  return `${APP_URL}/history`;
}

function formatKRW(val: string): string {
  const n = Number(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n);
}

// ── Main handler ──────────────────────────────────────────────────────────────

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
  const chatId   = process.env.TELEGRAM_CHAT_ID   || configMap['telegram_chat_id'];
  if (!botToken || !chatId) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 400 });
  }

  // Load keyword lists from settings (empty = no filter = include all)
  const parseKeywords = (raw: string | undefined) =>
    (raw ?? '').split('\n').map(k => k.trim()).filter(Boolean);
  const dminsttKeywords = parseKeywords(configMap['keyword_dminstt']);
  const bidntceKeywords = parseKeywords(configMap['keyword_bidntce']);
  const hasKeywords = dminsttKeywords.length > 0 || bidntceKeywords.length > 0;

  function matchesKeywords(item: Record<string, string>): boolean {
    if (!hasKeywords) return true;
    const inst = (item.dminsttNm ?? '') + ' ' + (item.ntceInsttNm ?? '');
    const name = item.bidNtceNm ?? '';
    return (
      dminsttKeywords.some(k => inst.includes(k)) ||
      bidntceKeywords.some(k => name.includes(k))
    );
  }

  function isSmlbizRestricted(item: Record<string, string>): boolean {
    // 중소기업/소기업 restriction fields
    return (
      item.smlbizPrityPuchaseTrgtYn === 'Y' ||
      item.smlbizCompetPrdctYn === 'Y' ||
      (item.indstrytyLmtCn ?? '').includes('중소') ||
      (item.bidPrtcptLmtYn === 'Y' && (item.indstrytyLmtCn ?? '').includes('소기업'))
    );
  }

  const { inqryBgnDt, inqryEndDt, isMorning, todayStr } = getDateRange(new Date());
  const runLabel = isMorning ? '오전' : '오후';
  const dateLabel = `${todayStr.slice(0,4)}-${todayStr.slice(4,6)}-${todayStr.slice(6,8)}`;

  // For afternoon run: collect bidNtceNo values already saved today → skip duplicates
  let existingTodayNos = new Set<string>();
  if (!isMorning) {
    const rows = await db
      .select({ bidNtceNo: bidItems.bidNtceNo })
      .from(bidItems)
      .where(gte(bidItems.createdAt, todayStr));
    existingTodayNos = new Set(rows.map(r => r.bidNtceNo));
  }

  const summary: { bizType: BizType; items: Record<string, string>[]; total: number }[] = [];

  for (const bizType of BIZ_TYPES) {
    try {
      const result = await fetchAllBidNotices({
        bizType,
        inqryDiv: '1',
        inqryBgnDt,
        inqryEndDt,
      });

      // Filter out afternoon duplicates, then apply keyword filter
      const deduped = isMorning
        ? result.items
        : result.items.filter(item => !existingTodayNos.has(item.bidNtceNo));
      const newItems = deduped.filter(matchesKeywords);

      await db.insert(searchSessions).values({
        apiType: `bid_${bizType}`,
        searchParams: JSON.stringify({ bizType, inqryDiv: '1', inqryBgnDt, inqryEndDt }),
        resultCount: newItems.length,
        results: JSON.stringify(newItems),
      });

      for (const item of newItems) {
        const no  = item.bidNtceNo;
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

      summary.push({ bizType, items: newItems, total: newItems.length });
    } catch (err) {
      console.error(`Cron fetch failed for ${bizType}:`, err);
      summary.push({ bizType, items: [], total: 0 });
    }
  }

  // Build Telegram message
  const header = `📋 <b>나라장터 ${runLabel} 요약</b> (${dateLabel})\n<i>${inqryBgnDt.slice(0,4)}-${inqryBgnDt.slice(4,6)}-${inqryBgnDt.slice(6,8)} ${inqryBgnDt.slice(8,10)}:${inqryBgnDt.slice(10,12)} → ${inqryEndDt.slice(8,10)}:${inqryEndDt.slice(10,12)}</i>\n━━━━━━━━━━━━━━\n\n`;
  const itemBlocks: string[] = [];

  for (const { bizType, items, total } of summary) {
    itemBlocks.push(`${BIZ_ICON[bizType]} <b>${BIZ_LABEL[bizType]}</b> · ${total}건\n━━━━━━━━━━━━━━━━\n`);

    if (items.length === 0) {
      itemBlocks.push(`결과 없음\n\n`);
      continue;
    }

    items
      .sort((a, b) => Number(b.presmptPrce || b.asignBdgtAmt || 0) - Number(a.presmptPrce || a.asignBdgtAmt || 0))
      .forEach((item, i) => {
        const name        = item.bidNtceNm ?? '(이름 없음)';
        const institution = item.ntceInsttNm ?? item.dminsttNm ?? '';
        const amount      = item.presmptPrce || item.asignBdgtAmt || '';
        const deadline    = item.bidClseDt ?? '';
        const url         = itemUrl(bizType, item);
        const restricted  = isSmlbizRestricted(item);

        let block = `\n<b>${i + 1}.</b> <a href="${url}">${name}</a>\n`;
        if (restricted)  block += `   ⚠️ <b>[판정 보류/제외]</b> 중소기업 참여제한\n`;
        if (institution) block += `   🏢 ${institution}\n`;
        if (amount)      block += `   💰 ${formatKRW(amount)}\n`;
        if (deadline)    block += `   📅 마감: ${deadline.slice(0, 16)}\n`;

        itemBlocks.push(block);
      });

    itemBlocks.push(`\n`);
  }

  const footer = `\n━━━━━━━━━━━━━━\n<a href="${APP_URL}/history">전체 목록 보기</a>`;

  await sendTelegramSplit(header, itemBlocks, footer, botToken, chatId);

  return NextResponse.json({
    sent: true,
    run: runLabel,
    range: `${inqryBgnDt} → ${inqryEndDt}`,
    byType: Object.fromEntries(summary.map(s => [s.bizType, s.total])),
  });
}
