const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://konsensus-six.vercel.app";

async function sendTelegramMessage(
  chatId: number,
  text: string,
  url?: string
): Promise<void> {
  if (!BOT_TOKEN) return;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };

  if (url) {
    body.reply_markup = {
      inline_keyboard: [[{ text: "Открыть →", url }]],
    };
  }

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function notifyChallengeAccepted(
  chatId: number,
  acceptorName: string,
  topic: string,
  challengeId: string
): Promise<void> {
  await sendTelegramMessage(
    chatId,
    `⚔️ <b>${acceptorName}</b> принял ваш вызов!\n\nТема: <i>${topic}</i>`,
    `${APP_URL}/arena/${challengeId}`
  );
}

export async function notifyChallengeMessage(
  chatId: number,
  senderName: string,
  topic: string,
  challengeId: string
): Promise<void> {
  await sendTelegramMessage(
    chatId,
    `💬 <b>${senderName}</b> написал на арене\n\nТема: <i>${topic}</i>`,
    `${APP_URL}/arena/${challengeId}`
  );
}

export async function notifyArgumentReceived(
  chatId: number,
  senderName: string,
  disputeTitle: string,
  round: number,
  disputeId: string
): Promise<void> {
  await sendTelegramMessage(
    chatId,
    `🥊 <b>${senderName}</b> подал аргумент в раунде ${round}\n\nСпор: <i>${disputeTitle}</i>`,
    `${APP_URL}/dispute/${disputeId}`
  );
}

export async function notifyMediationReady(
  chatId: number,
  disputeTitle: string,
  disputeId: string
): Promise<void> {
  await sendTelegramMessage(
    chatId,
    `🤖 Медиация готова!\n\nСпор: <i>${disputeTitle}</i>\nВсе раунды завершены — ИИ-медиатор предлагает решение.`,
    `${APP_URL}/dispute/${disputeId}/mediation`
  );
}
