const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://konsensus-six.vercel.app";

async function sendTelegramMessage(
  chatId: number,
  text: string,
  url?: string
): Promise<number | null> {
  if (!BOT_TOKEN) return null;

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

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data?.result?.message_id ?? null;
  } catch {
    return null;
  }
}

// Delete a message by ID (for chat cleanup)
export async function deleteTelegramMessage(chatId: number, messageId: number): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  } catch { /* ignore — message may already be deleted */ }
}

export async function notifyChallengeAccepted(
  chatId: number,
  acceptorName: string,
  topic: string,
  challengeId: string
): Promise<number | null> {
  return sendTelegramMessage(
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
): Promise<number | null> {
  return sendTelegramMessage(
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
): Promise<number | null> {
  return sendTelegramMessage(
    chatId,
    `🥊 <b>${senderName}</b> подал аргумент в раунде ${round}\n\nСпор: <i>${disputeTitle}</i>`,
    `${APP_URL}/dispute/${disputeId}`
  );
}

export async function notifyMediationReady(
  chatId: number,
  disputeTitle: string,
  disputeId: string
): Promise<number | null> {
  return sendTelegramMessage(
    chatId,
    `🤖 Медиация готова!\n\nСпор: <i>${disputeTitle}</i>\nВсе раунды завершены — ИИ-медиатор предлагает решение.`,
    `${APP_URL}/dispute/${disputeId}/mediation`
  );
}

// NEW: Notify when opponent joins a dispute
export async function notifyOpponentJoined(
  chatId: number,
  opponentName: string,
  disputeTitle: string,
  disputeId: string
): Promise<number | null> {
  return sendTelegramMessage(
    chatId,
    `🎯 <b>${opponentName}</b> присоединился к спору!\n\nСпор: <i>${disputeTitle}</i>\nВаш ход — подайте аргумент.`,
    `${APP_URL}/dispute/${disputeId}`
  );
}

// NEW: Notify when dispute is fully resolved (consensus reached)
export async function notifyDisputeResolved(
  chatId: number,
  disputeTitle: string,
  disputeId: string
): Promise<number | null> {
  return sendTelegramMessage(
    chatId,
    `✅ Спор завершён!\n\nСпор: <i>${disputeTitle}</i>\nМедиация окончена — посмотрите итоги.`,
    `${APP_URL}/dispute/${disputeId}/mediation`
  );
}

// Random AI joke/wisdom in bot (called occasionally)
const BOT_JOKES = [
  "💡 Знаете ли вы, что 73% конфликтов решаются, когда обе стороны просто дослушивают друг друга?",
  "🤖 Совет дня: перед ответом сделайте вдох. Ваш аргумент станет на 40% убедительнее.",
  "🧠 Факт: люди чаще соглашаются с теми, кто признаёт часть их правоты.",
  "⚡ Спорщик-профи отличается от новичка не силой аргументов, а умением слушать.",
  "🎯 Лайфхак: начните аргумент словами «Я понимаю твою позицию, и при этом...» — эффект +200%.",
  "🌊 Помните: цель спора — не победа, а истина. Побеждают оба, когда находят общее.",
  "🔥 Горячий факт: самые длинные споры обычно про самые простые вещи.",
  "🎪 ИИ-медиатор обработал уже сотни аргументов. Ваш следующий может стать легендарным!",
  "🧘 Мудрость: если вы не можете объяснить позицию оппонента — вы ещё не поняли спор.",
  "🏆 Самое ценное достижение — не «Победитель», а «Дипломат». Подумайте над этим.",
];

export function getRandomBotJoke(): string {
  return BOT_JOKES[Math.floor(Math.random() * BOT_JOKES.length)];
}

// Broadcast message to all linked Telegram users
export async function broadcastToAll(text: string): Promise<number> {
  if (!BOT_TOKEN) return 0;

  // Import admin client dynamically to avoid circular deps
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: users } = await admin
    .from("profiles")
    .select("telegram_chat_id")
    .not("telegram_chat_id", "is", null)
    .returns<{ telegram_chat_id: number }[]>();

  let sent = 0;
  for (const u of users ?? []) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: u.telegram_chat_id,
          text,
          parse_mode: "HTML",
        }),
      });
      sent++;
    } catch { /* skip failed */ }
  }
  return sent;
}

// Notify about a new challenge on the arena (for digest/broadcast)
export async function notifyNewChallenge(
  chatId: number,
  authorName: string,
  topic: string,
  category: string | null
): Promise<number | null> {
  const categoryEmoji: Record<string, string> = {
    politics: "🏛",
    technology: "💻",
    philosophy: "🧠",
    lifestyle: "🏠",
    science: "🔬",
    culture: "🎭",
    economics: "💰",
    relationships: "💬",
    other: "📌",
  };
  const emoji = categoryEmoji[category ?? "other"] ?? "📌";
  return sendTelegramMessage(
    chatId,
    `${emoji} Новый вызов на арене!\n\n<b>${topic}</b>\nот ${authorName}`,
    `${APP_URL}/arena`
  );
}
