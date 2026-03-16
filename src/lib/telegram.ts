import type { Json } from "@/types/database";
import { getAppBaseUrl, getTelegramReleaseChannelId, getTelegramReleaseChannelUrl } from "@/lib/site-config";
import { formatReleaseCaption, formatReleaseTeaser, getReleaseImageUrl, normalizeReleasePayload, type ReleasePayload, type ReleaseTarget } from "@/lib/releases";
import { isScheduledReleaseDue, isScheduledReleaseFulfilled } from "@/lib/telegram-schedule";
import {
  isTelegramMembershipActive,
  normalizeTelegramMembershipStatus,
  shouldSuppressBotReleaseTeaser,
  type TelegramMembershipStatus,
} from "@/lib/telegram-editorial";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = getAppBaseUrl();
const MAX_MANAGED_MESSAGES = 5;
const TELEGRAM_RELEASE_CHANNEL_ID = getTelegramReleaseChannelId();
const TELEGRAM_RELEASE_CHANNEL_URL = getTelegramReleaseChannelUrl();

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

async function getTelegramChatMember(
  channelId: string,
  telegramUserId: string
): Promise<TelegramMembershipStatus> {
  const data = await telegramApi<{
    ok?: boolean;
    result?: { status?: string };
  }>("getChatMember", {
    chat_id: channelId,
    user_id: telegramUserId,
  });

  return normalizeTelegramMembershipStatus(data?.result?.status ?? null);
}

async function upsertTelegramChannelMembership(input: {
  channelId: string;
  telegramUserId: string;
  profileId: string | null;
  membershipStatus: TelegramMembershipStatus;
  checkedVia: "api" | "webhook";
}) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin.from("telegram_channel_memberships").upsert({
    channel_id: input.channelId,
    telegram_user_id: input.telegramUserId,
    profile_id: input.profileId,
    membership_status: input.membershipStatus,
    is_member: isTelegramMembershipActive(input.membershipStatus),
    checked_via: input.checkedVia,
    last_checked_at: now,
    updated_at: now,
  } as never, {
    onConflict: "channel_id,telegram_user_id",
  });
}

export async function syncTelegramChannelMembershipFromWebhook(input: {
  channelId: string;
  telegramUserId: string;
  membershipStatus: string | null | undefined;
}) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const normalizedStatus = normalizeTelegramMembershipStatus(input.membershipStatus);

  const telegramChatId = Number(input.telegramUserId);
  const profileId = Number.isFinite(telegramChatId)
    ? (
        await admin
          .from("profiles")
          .select("id")
          .eq("telegram_chat_id", telegramChatId)
          .maybeSingle<{ id: string }>()
      ).data?.id ?? null
    : null;

  await upsertTelegramChannelMembership({
    channelId: input.channelId,
    telegramUserId: input.telegramUserId,
    profileId,
    membershipStatus: normalizedStatus,
    checkedVia: "webhook",
  });
}

async function shouldSuppressEditorialBotTeaser(input: {
  profileId: string;
  telegramChatId: number;
}) {
  if (!TELEGRAM_RELEASE_CHANNEL_ID) return false;

  const membershipStatus = await getTelegramChatMember(
    TELEGRAM_RELEASE_CHANNEL_ID,
    String(input.telegramChatId)
  );

  await upsertTelegramChannelMembership({
    channelId: TELEGRAM_RELEASE_CHANNEL_ID,
    telegramUserId: String(input.telegramChatId),
    profileId: input.profileId,
    membershipStatus,
    checkedVia: "api",
  });

  return shouldSuppressBotReleaseTeaser(membershipStatus);
}

async function sendTelegramMessage(
  chatId: number | string,
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

async function sendTelegramPhoto(
  chatId: number | string,
  photo: string,
  caption: string,
  url?: string
): Promise<number | null> {
  if (!BOT_TOKEN) return null;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: "HTML",
  };

  const inlineKeyboard = buildInlineKeyboard(url);
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }

  const data = await telegramApi<{ result?: { message_id?: number } }>("sendPhoto", body);
  return data?.result?.message_id ?? null;
}

// Delete a message by ID (for chat cleanup)
export async function deleteTelegramMessage(chatId: number, messageId: number): Promise<void> {
  if (!BOT_TOKEN) return;
  await telegramApi("deleteMessage", { chat_id: chatId, message_id: messageId });
}

async function editTelegramMessage(
  chatId: number | string,
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

export async function clearTelegramNotificationByKeys(opts: {
  chatId: number;
  dedupeKeys: string[];
}): Promise<void> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { chatId, dedupeKeys } = opts;

  if (dedupeKeys.length === 0) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("telegram_bot_messages, telegram_message_index")
    .eq("telegram_chat_id", chatId)
    .single<{
      telegram_bot_messages: number[] | null;
      telegram_message_index: Json | null;
    }>();

  const messageIndex = normalizeMessageIndex(profile?.telegram_message_index);

  for (const dedupeKey of dedupeKeys) {
    const messageId = messageIndex[dedupeKey];
    if (messageId) {
      await deleteTelegramMessage(chatId, messageId);
      delete messageIndex[dedupeKey];
    }
  }

  const indexedIds = Array.from(new Set(Object.values(messageIndex)));
  await syncManagedMessages(chatId, indexedIds, messageIndex);
}

function disputeLiveKey(disputeId: string) {
  return `dispute_live:${disputeId}`;
}

export async function clearTelegramDisputeNotifications(
  chatId: number,
  disputeId: string
): Promise<void> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("telegram_message_index")
    .eq("telegram_chat_id", chatId)
    .single<{ telegram_message_index: Json | null }>();

  const messageIndex = normalizeMessageIndex(profile?.telegram_message_index);
  const disputeKeys = Object.keys(messageIndex).filter((key) => key.includes(disputeId));

  if (disputeKeys.length === 0) return;
  await clearTelegramNotificationByKeys({ chatId, dedupeKeys: disputeKeys });
}

async function upsertDisputeLiveNotification(opts: {
  chatId: number;
  disputeId: string;
  text: string;
  url?: string;
}): Promise<number | null> {
  return upsertTelegramNotification({
    chatId: opts.chatId,
    dedupeKey: disputeLiveKey(opts.disputeId),
    text: opts.text,
    url: opts.url,
  });
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

type ReleaseAnnouncementRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  features: string[];
  hero_image_url: string | null;
  notes: string | null;
  source_commits: string[] | null;
  sent_to_bot_at: string | null;
  sent_to_channel_at: string | null;
  bot_recipient_count: number;
  bot_delivered_count: number;
  bot_suppressed_count: number;
  channel_message_id: number | null;
  last_delivery_attempt_at: string | null;
  scheduled_publish_at: string | null;
  scheduled_target: ReleaseTarget | null;
  scheduled_published_at: string | null;
  last_schedule_attempt_at: string | null;
  last_schedule_error: string | null;
  created_at: string;
  updated_at: string;
};

export async function scheduleReleaseAnnouncement(input: {
  payload: ReleasePayload;
  target: ReleaseTarget;
  scheduleAt: string;
}): Promise<{
  slug: string;
  scheduledAt: string;
  target: ReleaseTarget;
}> {
  const normalized = normalizeReleasePayload(input.payload);
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const heroImageUrl = getReleaseImageUrl(normalized.slug);

  await admin.from("release_announcements").upsert({
    slug: normalized.slug,
    title: normalized.title,
    summary: normalized.summary,
    features: normalized.features,
    hero_image_url: heroImageUrl,
    notes: normalized.notes ?? null,
    source_commits: normalized.source_commits ?? [],
    scheduled_publish_at: input.scheduleAt,
    scheduled_target: input.target,
    scheduled_published_at: null,
    last_schedule_attempt_at: null,
    last_schedule_error: null,
    updated_at: now,
  } as never, { onConflict: "slug" });

  return {
    slug: normalized.slug,
    scheduledAt: input.scheduleAt,
    target: input.target,
  };
}

async function sendReleaseCard(
  chatId: number | string,
  release: ReleaseAnnouncementRow,
  mode: "full" | "teaser"
): Promise<number | null> {
  const normalizedRelease = {
    slug: release.slug,
    title: release.title,
    summary: release.summary,
    features: release.features,
    notes: release.notes ?? undefined,
    source_commits: release.source_commits ?? undefined,
  };

  if (mode === "teaser") {
    return sendTelegramMessage(
      chatId,
      formatReleaseTeaser(normalizedRelease),
      TELEGRAM_RELEASE_CHANNEL_URL || `${APP_URL}/feed`
    );
  }

  const imageUrl = release.hero_image_url || getReleaseImageUrl(release.slug);
  const caption = formatReleaseCaption(normalizedRelease);

  const photoMessageId = await sendTelegramPhoto(chatId, imageUrl, caption, `${APP_URL}/feed`);
  if (photoMessageId) return photoMessageId;

  return sendTelegramMessage(chatId, caption, `${APP_URL}/feed`);
}

export async function publishReleaseAnnouncement(
  payload: ReleasePayload,
  target: ReleaseTarget = "both"
): Promise<{
  slug: string;
  sentToBot: boolean;
  sentToChannel: boolean;
  skippedBot: boolean;
  skippedChannel: boolean;
  suppressedBotCount: number;
  botRecipientCount: number;
  botDeliveredCount: number;
  channelMessageId: number | null;
}> {
  const normalized = normalizeReleasePayload(payload);
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const heroImageUrl = getReleaseImageUrl(normalized.slug);

  await admin.from("release_announcements").upsert({
    slug: normalized.slug,
    title: normalized.title,
    summary: normalized.summary,
    features: normalized.features,
    hero_image_url: heroImageUrl,
    notes: normalized.notes ?? null,
    source_commits: normalized.source_commits ?? [],
    last_delivery_attempt_at: now,
    updated_at: now,
  } as never, { onConflict: "slug" });

  const { data: release } = await admin
    .from("release_announcements")
    .select("*")
    .eq("slug", normalized.slug)
    .single<ReleaseAnnouncementRow>();

  if (!release) {
    throw new Error("Release announcement was not persisted");
  }

  let sentToBot = false;
  let sentToChannel = false;
  const skippedBot = Boolean(release.sent_to_bot_at);
  const skippedChannel = Boolean(release.sent_to_channel_at);
  let suppressedBotCount = 0;
  let botRecipientCount = release.bot_recipient_count ?? 0;
  let botDeliveredCount = release.bot_delivered_count ?? 0;
  let channelMessageId = release.channel_message_id ?? null;

  if (target !== "channel" && !release.sent_to_bot_at) {
    const { data: users } = await admin
      .from("profiles")
      .select("id, telegram_chat_id")
      .not("telegram_chat_id", "is", null)
      .returns<{ id: string; telegram_chat_id: number }[]>();

    botRecipientCount = (users ?? []).length;
    let delivered = 0;
    for (const user of users ?? []) {
      if (await shouldSuppressEditorialBotTeaser({
        profileId: user.id,
        telegramChatId: user.telegram_chat_id,
      })) {
        suppressedBotCount += 1;
        continue;
      }

      const messageId = await sendReleaseCard(user.telegram_chat_id, release, "teaser");
      if (messageId) delivered++;
    }

    if (delivered > 0 || suppressedBotCount > 0 || (users ?? []).length === 0) {
      sentToBot = true;
      botDeliveredCount = delivered;
      await admin
        .from("release_announcements")
        .update({
          sent_to_bot_at: now,
          bot_recipient_count: botRecipientCount,
          bot_delivered_count: botDeliveredCount,
          bot_suppressed_count: suppressedBotCount,
          last_delivery_attempt_at: now,
          updated_at: now,
        } as never)
        .eq("slug", normalized.slug);
    }
  }

  if (target !== "bot" && TELEGRAM_RELEASE_CHANNEL_ID && !release.sent_to_channel_at) {
    const sentChannelMessageId = await sendReleaseCard(
      TELEGRAM_RELEASE_CHANNEL_ID,
      release,
      "full"
    );
    if (sentChannelMessageId) {
      sentToChannel = true;
      channelMessageId = sentChannelMessageId;
      await admin
        .from("release_announcements")
        .update({
          sent_to_channel_at: now,
          channel_message_id: sentChannelMessageId,
          last_delivery_attempt_at: now,
          updated_at: now,
        } as never)
        .eq("slug", normalized.slug);
    }
  }

  return {
    slug: normalized.slug,
    sentToBot,
    sentToChannel,
    skippedBot,
    skippedChannel,
    suppressedBotCount,
    botRecipientCount,
    botDeliveredCount,
    channelMessageId,
  };
}

export async function runScheduledReleaseAnnouncements(input?: {
  now?: Date;
  limit?: number;
}): Promise<{
  processed: number;
  published: number;
  failed: number;
  items: Array<{
    slug: string;
    target: ReleaseTarget;
    published: boolean;
    error?: string;
  }>;
}> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const now = input?.now ?? new Date();
  const nowIso = now.toISOString();
  const limit = input?.limit ?? 20;

  const { data: scheduled } = await admin
    .from("release_announcements")
    .select("*")
    .not("scheduled_publish_at", "is", null)
    .is("scheduled_published_at", null)
    .order("scheduled_publish_at", { ascending: true })
    .limit(limit)
    .returns<ReleaseAnnouncementRow[]>();

  const dueItems = (scheduled ?? []).filter((release) => isScheduledReleaseDue(release, now));
  const items: Array<{
    slug: string;
    target: ReleaseTarget;
    published: boolean;
    error?: string;
  }> = [];

  let published = 0;
  let failed = 0;

  for (const release of dueItems) {
    const target = release.scheduled_target ?? "both";

    await admin
      .from("release_announcements")
      .update({
        last_schedule_attempt_at: nowIso,
        updated_at: nowIso,
      } as never)
      .eq("slug", release.slug);

    try {
      const result = await publishReleaseAnnouncement({
        slug: release.slug,
        title: release.title,
        summary: release.summary,
        features: release.features,
        notes: release.notes ?? undefined,
        source_commits: release.source_commits ?? undefined,
      }, target);

      const fulfilled = isScheduledReleaseFulfilled(target, result);

      await admin
        .from("release_announcements")
        .update({
          scheduled_published_at: fulfilled ? nowIso : null,
          last_schedule_error: fulfilled ? null : "Scheduled publish did not complete all delivery paths",
          updated_at: nowIso,
        } as never)
        .eq("slug", release.slug);

      if (fulfilled) {
        published += 1;
      } else {
        failed += 1;
      }

      items.push({
        slug: release.slug,
        target,
        published: fulfilled,
        error: fulfilled ? undefined : "Scheduled publish did not complete all delivery paths",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scheduled publish error";
      failed += 1;

      await admin
        .from("release_announcements")
        .update({
          last_schedule_error: message,
          updated_at: nowIso,
        } as never)
        .eq("slug", release.slug);

      items.push({
        slug: release.slug,
        target,
        published: false,
        error: message,
      });
    }
  }

  return {
    processed: dueItems.length,
    published,
    failed,
    items,
  };
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
  return upsertDisputeLiveNotification({
    chatId,
    disputeId,
    text: `🥊 <b>${senderName}</b> подал новый аргумент\n\nТема: <i>${disputeTitle}</i>\nТекущий раунд: ${round}`,
    url: `${APP_URL}/dispute/${disputeId}`,
  });
}

export async function notifyMediationReady(
  chatId: number,
  disputeTitle: string,
  disputeId: string
): Promise<number | null> {
  return upsertDisputeLiveNotification({
    chatId,
    disputeId,
    text: `🤖 Медиация готова\n\nТема: <i>${disputeTitle}</i>\nВсе раунды завершены — можно открыть итоговый анализ.`,
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
  return upsertDisputeLiveNotification({
    chatId,
    disputeId,
    text: `🎯 <b>${opponentName}</b> присоединился к спору\n\nТема: <i>${disputeTitle}</i>\nВаш ход — подайте первый аргумент.`,
    url: `${APP_URL}/dispute/${disputeId}`,
  });
}

export async function notifyDirectChallengeReceived(
  chatId: number,
  senderName: string,
  disputeTitle: string,
  disputeDescription: string,
  disputeId: string
): Promise<number | null> {
  const description = disputeDescription.trim();
  const trimmedDescription =
    description.length > 220 ? `${description.slice(0, 217)}...` : description;

  return upsertDisputeLiveNotification({
    chatId,
    disputeId,
    text: `📨 <b>${senderName}</b> приглашает вас в спор\n\nТема: <i>${disputeTitle}</i>${trimmedDescription ? `\nСуть: ${trimmedDescription}` : ""}\nСпор уже доступен — можно сразу открыть и ответить.`,
    url: `${APP_URL}/dispute/${disputeId}`,
  });
}

// NEW: Notify when dispute is fully resolved (consensus reached)
export async function notifyDisputeResolved(
  chatId: number,
  disputeTitle: string,
  disputeId: string
): Promise<number | null> {
  return upsertDisputeLiveNotification({
    chatId,
    disputeId,
    text: `✅ Спор завершён\n\nТема: <i>${disputeTitle}</i>\nИтоговая медиация уже доступна.`,
    url: `${APP_URL}/dispute/${disputeId}/mediation`,
  });
}

export async function notifyDisputeClosed(
  chatId: number,
  disputeTitle: string,
  disputeId: string
): Promise<number | null> {
  return upsertDisputeLiveNotification({
    chatId,
    disputeId,
    text: `🗂 Спор закрыт\n\nТема: <i>${disputeTitle}</i>\nДиалог перемещён в завершённое состояние.`,
    url: `${APP_URL}/dispute/${disputeId}`,
  });
}

export async function notifyDisputeReminder(
  chatId: number,
  senderName: string,
  disputeTitle: string,
  disputeId: string
): Promise<number | null> {
  return upsertDisputeLiveNotification({
    chatId,
    disputeId,
    text: `🔔 <b>${senderName}</b> напомнил о споре\n\nТема: <i>${disputeTitle}</i>\nОжидается ваш ответ — спор снова ждёт движения.`,
    url: `${APP_URL}/dispute/${disputeId}`,
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

export async function notifyBattleWatcherUpdate(
  chatId: number,
  challengeId: string,
  topic: string,
  event: "round_complete" | "reply" | "closed",
  round?: number
): Promise<number | null> {
  const labelMap = {
    round_complete: round ? `⚔️ Раунд ${round} завершён` : "⚔️ Раунд завершён",
    reply: round ? `💬 Появился ответ в раунде ${round}` : "💬 В battle появился ответ",
    closed: "🏁 Battle завершён",
  };

  return upsertTelegramNotification({
    chatId,
    dedupeKey: `battle_watch:${challengeId}:${event}:${round ?? 0}`,
    text: `${labelMap[event]}\n\nТема: <i>${topic}</i>`,
    url: `${APP_URL}/arena/${challengeId}`,
  });
}
