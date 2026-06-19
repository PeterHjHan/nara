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
    const msg = `📋 <b>나라장터 일일 요약</b>\n\n오늘(${today})은 검색 기록이 없습니다.`;
    await sendTelegramMessage(msg, botToken, chatId);
    return NextResponse.json({ sent: true, sessions: 0 });
  }

  const apiTypeLabel: Record<string, string> = {
    bid: '입찰공고',
    successful_bid: '낙찰정보',
    contract: '계약정보',
  };

  let message = `📋 <b>나라장터 일일 요약</b> (${today})\n\n`;
  message += `총 ${todaySessions.length}건의 검색이 있었습니다.\n\n`;

  for (const session of todaySessions.slice(0, 10)) {
    const params = JSON.parse(session.searchParams);
    const results = JSON.parse(session.results);
    const label = apiTypeLabel[session.apiType] ?? session.apiType;
    const time = session.searchedAt.split('T')[1]?.slice(0, 5) ?? '';

    message += `🔍 <b>[${label}]</b> ${time}\n`;
    message += `   검색조건: ${formatParams(session.apiType, params)}\n`;
    message += `   결과: ${session.resultCount}건`;

    if (results.length > 0) {
      const first = results[0];
      const name = first.bidNtceNm ?? first.cntrctNm ?? first.bidNtceNo ?? '(이름 없음)';
      message += `\n   첫 번째: ${name}`;
    }
    message += '\n\n';
  }

  if (todaySessions.length > 10) {
    message += `...외 ${todaySessions.length - 10}건 더`;
  }

  await sendTelegramMessage(message, botToken, chatId);
  return NextResponse.json({ sent: true, sessions: todaySessions.length });
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
