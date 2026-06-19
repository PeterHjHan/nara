import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { searchSessions, settings } from '@/lib/schema';
import { desc, gte } from 'drizzle-orm';
import { sendTelegramMessage } from '@/lib/telegram';

// Called by Vercel Cron or manually
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
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

  // Get today's searches
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = await db
    .select()
    .from(searchSessions)
    .where(gte(searchSessions.searchedAt, today))
    .orderBy(desc(searchSessions.searchedAt));

  if (todaySessions.length === 0) {
    const msg = `📋 <b>나라장터 일일 요약</b> (${today})\n\n오늘은 검색 기록이 없습니다.`;
    await sendTelegramMessage(msg, botToken, chatId);
    return NextResponse.json({ sent: true, sessions: 0 });
  }

  const apiTypeLabel: Record<string, string> = {
    bid_cnstwk: '입찰공고 (공사)',
    bid_servc:  '입찰공고 (용역)',
    bid_thng:   '입찰공고 (물품)',
    bid_frgcpt: '입찰공고 (외자)',
  };

  const apiTypeIcon: Record<string, string> = {
    bid_cnstwk: '🏗️',
    bid_servc:  '🛠️',
    bid_thng:   '📦',
    bid_frgcpt: '🌐',
  };

  let message = `📋 <b>나라장터 일일 요약</b> (${today})\n`;
  message += `━━━━━━━━━━━━━━\n\n`;

  for (const session of todaySessions) {
    const results: Record<string, string>[] = JSON.parse(session.results);
    const label = apiTypeLabel[session.apiType] ?? session.apiType;
    const icon = apiTypeIcon[session.apiType] ?? '🔍';

    message += `${icon} <b>${label}</b> · ${session.resultCount}건\n`;
    message += `━━━━━━━━━━━━━━━━\n`;

    if (results.length === 0) {
      message += `결과 없음\n\n`;
      continue;
    }

    results.slice(0, 5).forEach((item, i) => {
      const name = item.bidNtceNm ?? item.cntrctNm ?? '(이름 없음)';
      const institution = item.ntceInsttNm ?? item.cntrctInsttNm ?? item.dmndInsttNm ?? '';
      const amount = item.presmptPrce ?? item.cntrctAmt ?? item.scsbidAmt ?? '';
      const deadline = item.bidClseDate ?? item.cntrctCnclsDate ?? item.opengDate ?? '';
      const url = item.bidNtceUrl ??
        (item.bidNtceNo ? `https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=${item.bidNtceNo}&bidPbancOrd=${item.bidNtceOrd ?? '000'}` : '');

      message += `\n<b>${i + 1}.</b> `;
      message += url ? `<a href="${url}">${name}</a>` : `${name}`;
      message += `\n`;
      if (institution) message += `   🏢 ${institution}\n`;
      if (amount) message += `   💰 ${formatKRW(amount)}\n`;
      if (deadline) message += `   📅 마감: ${deadline}\n`;
    });

    if (results.length > 5) {
      message += `\n   <i>...외 ${results.length - 5}건 더</i>\n`;
    }

    message += `\n`;
  }

  await sendTelegramMessage(message, botToken, chatId);
  return NextResponse.json({ sent: true, sessions: todaySessions.length });
}

function formatKRW(val: string): string {
  const n = Number(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n);
}

function formatParams(apiType: string, params: Record<string, string>): string {
  if (apiType === 'bid') {
    return `${params.bidNtceBgnDt?.slice(0, 8)} ~ ${params.bidNtceEndDt?.slice(0, 8)}`;
  } else if (apiType === 'successful_bid') {
    const types: Record<string, string> = { '1': '물품', '2': '외자', '3': '공사', '5': '용역' };
    return `${types[params.bsnsDivCd] ?? params.bsnsDivCd}, ${params.opengBgnDt?.slice(0, 8)} ~ ${params.opengEndDt?.slice(0, 8)}`;
  } else {
    return `${params.cntrctCnclsBgnDate} ~ ${params.cntrctCnclsEndDate}`;
  }
}
