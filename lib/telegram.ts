const TELEGRAM_LIMIT = 4096;

export async function sendTelegramMessage(text: string, botToken: string, chatId: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram error: ${err}`);
  }
  return res.json();
}

// Splits item blocks on clean boundaries and sends multiple messages if needed.
// header = the intro text (title + divider), itemBlocks = one formatted string per item.
export async function sendTelegramSplit(
  header: string,
  itemBlocks: string[],
  footer: string,
  botToken: string,
  chatId: string,
) {
  const messages: string[] = [];
  let current = header;

  for (const block of itemBlocks) {
    const candidate = current + block;
    const withFooter = candidate + footer;

    if (withFooter.length <= TELEGRAM_LIMIT) {
      current = candidate;
    } else {
      // Current message is full — close it and start a new one
      messages.push(current + footer);
      current = header + block;
    }
  }
  messages.push(current + footer);

  for (const msg of messages) {
    await sendTelegramMessage(msg, botToken, chatId);
  }
}
