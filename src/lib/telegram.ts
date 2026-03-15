import type { Json } from "@/types/database";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://konsensus-six.vercel.app";
const MAX_MANAGED_MESSAGES = 5;

type InlineKeyboardButton = { text: string; url: string };
type InlineKeyboard = InlineKeyboardButton[][];
type TelegramMessageIndex = Record<string, number>;

function buildInlineKeyboard(url?: string): InlineKeyboard | undefined {
  if (!url) return undefined;
  return [[{ text: "Открыть →", url }]];
}

function normalizeMessageIndex(value: unknown): TelegramMessageIndex {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number")
  );
}

async function telegramApi<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
  if (!BOT_TOKEN) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data as T;
  } catch {
    return null;
  }
}

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

  const inlineKeyboard = buildInlineKeyboard(url);
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }

  const data = await telegramApi<{ result?: { message_id?: number } }>("sendMessage", body);
  return data?.result?.message_id ?? null;
}

// Delete a message by ID (for chat cleanup)
export async function deleteTelegramMessage(chatId: number, messageId: number): Promise<void> {
  if (!BOT_TOKEN) return;
  await telegramApi("deleteMessage", { chat_id: chatId, message_id: messageId });
}

async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
  url?: string
): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  };

  const inlineKeyboard = buildInlineKeyboard(url);
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }

  const data = await telegramApi<{ ok?: boolean }>("editMessageText", body);
  return data?.ok === true;
}

async function syncManagedMessages(
  chatId: number,
  messageIds: number[],
  messageIndex: TelegramMessageIndex
): Promise<void> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const uniqueIds = Array.from(new Set(messageIds));
  const toDelete = uniqueIds.slice(0, Math.max(0, uniqueIds.length - MAX_MANAGED_MESSAGES));
  const toKeep = uniqueIds.slice(Math.max(0, uniqueIds.length - MAX_MANAGED_MESSAGES));

  for (const messageId of toDelete) {
    await deleteTelegramMessage(chatId, messageId);
  }

  const allowedIds = new Set(toKeep);
  const prunedIndex = Object.fromEntries(
    Object.entries(messageIndex).filter((entry) => allowedIds.has(entry[1]))
  );

  await admin
    .from("profiles")
    .update({
      telegram_bot_messages: toKeep,
      telegram_message_index: prunedIndex,
    } as never)
    .eq("telegram_chat_id", chatId);
}

export async function upsertTelegramNotification(opts: {
  chatId: number;
  text: string;
  url?: string;
  dedupeKey: string;
}): Promise<number | null> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { chatId, text, url, dedupeKey } = opts;

  const { data: profile } = await admin
    .from("profiles")
    .select("telegram_bot_messages, telegram_message_index")
    .eq("telegram_chat_id", chatId)
    .single<{
      telegram_bot_messages: number[] | null;
      telegram_message_index: Json | null;
    }>();

  const messageIds = [...(profile?.telegram_bot_messages ?? [])];
  const messageIndex = normalizeMessageIndex(profile?.telegram_message_index);
  const existingMessageId = messageIndex[dedupeKey];

  if (existingMessageId) {
    const edited = await editTelegramMessage(chatId, existingMessageId, text, url);
    if (edited) {
      await syncManagedMessages(
        chatId,
        [...messageIds.filter((id) => id !== existingMessageId), existingMessageId],
        { ...messageIndex, [dedupeKey]: existingMessageId }
      );
      return existingMessageId;
    }

    await deleteTelegramMessage(chatId, existingMessageId);
  }

  const newMessageId = await sendTelegramMessage(chatId, text, url);
  if (!newMessageId) return null;

  await syncManagedMessages(
    chatId,
    [...messageIds.filter((id) => id !== existingMessageId), newMessageId],
    { ...messageIndex, [dedupeKey]: newMessageId }
  );

  return newMessageId;
}

export async function notifyChallengeAccepted(
  chatId: number,
  acceptorName: string,
  topic: string,
  challengeId: string
): Promise<number | null> {
  return upsertTelegramNotification({
    chatId,
    dedupeKey: `challenge_accepted:${challengeId}`,
    text: `⚔️ <b>${acceptorName}</b> принял ваш вызов!\n\nТема: <i>${topic}</i>`,
    url: `${APP_URL}/arena/${challengeId}`,
  });
}

export async function notifyChallengeMessage(
  chatId: number,
  senderName: string,
  topic: string,
  challengeId: string
): Promise<number | null> {
  return upsertTelegramNotification({
    chatId,
    dedupeKey: `challenge_message:${challengeId}:${senderName}`,
    text: `💬 <b>${senderName}</b> написал на арене\n\nТема: <i>${topic}</i>`,
    url: `${APP_URL}/arena/${challengeId}`,
  });
}

export async function notifyArgumentReceived(
  chatId: number,
  senderName: string,
  disputeTitle: string,
  round: number,
  disputeId: string
): Promise<number | null> {
  return upsertTelegramNotification({
    chatId,
    dedupeKey: `argument_received:${disputeId}:${round}:${senderName}`,
    text: `🥊 <b>${senderName}</b> подал аргумент в раунде ${round}\n\nСпор: <i>${disputeTitle}</i>`,
    url: `${APP_URL}/dispute/${disputeId}`,
  });
}

export async function notifyMediationReady(
  chatId: number,
  disputeTitle: string,
  disputeId: string
): Promise<number | null> {
  return upsertTelegramNotification({
    chatId,
    dedupeKey: `mediation_ready:${disputeId}`,
    text: `🤖 Медиация готова!\n\nСпор: <i>${disputeTitle}</i>\nВсе раунды завершены — ИИ-медиатор предлагает решение.`,
    url: `${APP_URL}/dispute/${disputeId}/mediation`,
  });
}

// NEW: Notify when opponent joins a dispute
export async function notifyOpponentJoined(
  chatId: number,
  opponentName: string,
  disputeTitle: string,
  disputeId: string
): Promise<number | null> {
  return upsertTelegramNotification({
    chatId,
    dedupeKey: `opponent_joined:${disputeId}`,
    text: `🎯 <b>${opponentName}</b> присоединился к спору!\n\nСпор: <i>${disputeTitle}</i>\nВаш ход — подайте аргумент.`,
    url: `${APP_URL}/dispute/${disputeId}`,
  });
}

// NEW: Notify when dispute is fully resolved (consensus reached)
export async function notifyDisputeResolved(
  chatId: number,
  disputeTitle: string,
  disputeId: string
): Promise<number | null> {
  return upsertTelegramNotification({
    chatId,
    dedupeKey: `dispute_resolved:${disputeId}`,
    text: `✅ Спор завершён!\n\nСпор: <i>${disputeTitle}</i>\nМедиация окончена — посмотрите итоги.`,
    url: `${APP_URL}/dispute/${disputeId}/mediation`,
  });
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
