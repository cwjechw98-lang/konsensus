import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://konsensus.app";

const WEBAPP_URL = `${APP_URL}/tg`;

// Persistent bottom keyboard — shown to linked users
const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "⚔️ Вызовы" }, { text: "📋 Споры" }],
    [{ text: "👤 Профиль" }, { text: "🔓 Отвязать" }],
    [{ text: "🌐 Открыть приложение", web_app: { url: WEBAPP_URL } }],
  ],
  resize_keyboard: true,
  persistent: true,
};

// Keyboard for unlinked users
const UNLINKED_KEYBOARD = {
  keyboard: [
    [{ text: "⚔️ Вызовы" }],
    [{ text: "🔗 Привязать аккаунт" }],
    [{ text: "🌐 Открыть приложение", web_app: { url: WEBAPP_URL } }],
  ],
  resize_keyboard: true,
  persistent: true,
};

type InlineButton = { text: string; url?: string; callback_data?: string; web_app?: { url: string } };
type InlineKeyboard = InlineButton[][];

async function sendMessage(
  chatId: number,
  text: string,
  opts?: { inline?: InlineKeyboard; keyboard?: object }
) {
  if (!BOT_TOKEN) return;
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: "HTML" };
  if (opts?.inline) {
    body.reply_markup = { inline_keyboard: opts.inline };
  } else if (opts?.keyboard) {
    body.reply_markup = opts.keyboard;
  }
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function editMessage(chatId: number, messageId: number, text: string, inline?: InlineKeyboard) {
  if (!BOT_TOKEN) return;
  const body: Record<string, unknown> = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" };
  if (inline) body.reply_markup = { inline_keyboard: inline };
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function answerCallback(callbackId: string, text?: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

// Sends with persistent menu + optional inline button (for linked users)
async function reply(
  chatId: number,
  text: string,
  inlineUrl?: { label: string; url: string }
) {
  const inline: InlineKeyboard | undefined = inlineUrl
    ? [[{ text: inlineUrl.label, url: inlineUrl.url }]]
    : undefined;
  await sendMessage(chatId, text, { keyboard: MAIN_KEYBOARD, ...(inline ? { inline } : {}) });
}

// Sends with unlinked keyboard + optional inline button
async function replyUnlinked(
  chatId: number,
  text: string,
  inlineUrl?: { label: string; url: string }
) {
  const inline: InlineKeyboard | undefined = inlineUrl
    ? [[{ text: inlineUrl.label, url: inlineUrl.url }]]
    : undefined;
  await sendMessage(chatId, text, { keyboard: UNLINKED_KEYBOARD, ...(inline ? { inline } : {}) });
}

export async function POST(req: NextRequest) {
  if (WEBHOOK_SECRET) {
    const secret = req.headers.get("x-telegram-bot-api-secret-token");
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // ── Handle callback queries (inline button presses) ──────────────────────
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat.id;
    const messageId = cb.message?.message_id;
    const data = cb.data;

    if (!chatId || !messageId) {
      await answerCallback(cb.id);
      return NextResponse.json({ ok: true });
    }

    const admin = createAdminClient();

    if (data === "unlink_confirm") {
      const { data: me } = await admin
        .from("profiles")
        .select("id, display_name")
        .eq("telegram_chat_id", chatId)
        .single<{ id: string; display_name: string | null }>();

      if (!me) {
        await answerCallback(cb.id, "Аккаунт уже отвязан");
        await editMessage(chatId, messageId, "ℹ️ Аккаунт уже отвязан.");
        return NextResponse.json({ ok: true });
      }

      await admin
        .from("profiles")
        .update({ telegram_chat_id: null, telegram_link_token: null } as never)
        .eq("id", me.id);

      await answerCallback(cb.id, "Отвязано ✓");
      await editMessage(
        chatId,
        messageId,
        `🔓 Аккаунт <b>${me.display_name ?? "участник"}</b> отвязан.\n\nВы больше не будете получать уведомления.`
      );
      // Send follow-up with unlinked keyboard
      await replyUnlinked(
        chatId,
        "Чтобы привязать снова — нажмите «Подключить Telegram» в профиле на сайте.",
        { label: "Открыть профиль →", url: `${APP_URL}/profile` }
      );
      return NextResponse.json({ ok: true });
    }

    if (data === "unlink_cancel") {
      await answerCallback(cb.id, "Отменено");
      await editMessage(chatId, messageId, "✅ Отвязка отменена. Всё остаётся как было.");
      return NextResponse.json({ ok: true });
    }

    await answerCallback(cb.id);
    return NextResponse.json({ ok: true });
  }

  // ── Handle text messages ─────────────────────────────────────────────────
  const message = update.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text.trim();
  const admin = createAdminClient();

  // ── Resolve linked profile once ──────────────────────────────────────────
  const { data: me } = await admin
    .from("profiles")
    .select("id, display_name, bio, debate_stance")
    .eq("telegram_chat_id", chatId)
    .single<{ id: string; display_name: string | null; bio: string | null; debate_stance: string | null }>();

  // ── Token matching: /start K-xxx  OR  bare K-xxx ─────────────────────────
  const tokenMatch =
    text.match(/^\/start (K-[0-9a-f]{8})$/i)?.[1] ??
    text.match(/^(K-[0-9a-f]{8})$/i)?.[1];

  if (tokenMatch) {
    if (me) {
      await reply(
        chatId,
        `✅ Этот Telegram уже привязан к аккаунту <b>${me.display_name ?? "участник"}</b>!\n\nЧтобы перепривязать — сначала нажмите «🔓 Отвязать».`
      );
      return NextResponse.json({ ok: true });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id, display_name")
      .eq("telegram_link_token", tokenMatch)
      .single<{ id: string; display_name: string | null }>();

    if (!profile) {
      await replyUnlinked(
        chatId,
        "❌ Код не найден или уже использован.\n\nНажмите «Подключить Telegram» в профиле на сайте, чтобы получить новый код.",
        { label: "Открыть профиль →", url: `${APP_URL}/profile` }
      );
      return NextResponse.json({ ok: true });
    }

    await admin
      .from("profiles")
      .update({ telegram_chat_id: chatId, telegram_link_token: null } as never)
      .eq("id", profile.id);

    await sendMessage(
      chatId,
      `✅ Аккаунт привязан, <b>${profile.display_name ?? "участник"}</b>!\n\nТеперь вы будете получать уведомления о спорах и вызовах.\n\nИспользуйте кнопки меню ниже 👇`,
      { keyboard: MAIN_KEYBOARD }
    );
    return NextResponse.json({ ok: true });
  }

  // ── 🔓 Отвязать / /unlink — ask for confirmation ─────────────────────────
  if (text === "/unlink" || text === "🔓 Отвязать") {
    if (!me) {
      await replyUnlinked(chatId, "ℹ️ Аккаунт не привязан. Нечего отвязывать.");
      return NextResponse.json({ ok: true });
    }

    await sendMessage(
      chatId,
      `⚠️ Вы уверены, что хотите отвязать Telegram от аккаунта <b>${me.display_name ?? "участник"}</b>?\n\nВы перестанете получать уведомления о спорах и вызовах.`,
      {
        inline: [
          [
            { text: "✅ Да, отвязать", callback_data: "unlink_confirm" },
            { text: "❌ Нет, отмена", callback_data: "unlink_cancel" },
          ],
        ],
      }
    );
    return NextResponse.json({ ok: true });
  }

  // ── 🔗 Привязать аккаунт ──────────────────────────────────────────────────
  if (text === "🔗 Привязать аккаунт") {
    if (me) {
      await reply(chatId, `✅ Вы уже привязаны как <b>${me.display_name ?? "участник"}</b>!`);
      return NextResponse.json({ ok: true });
    }
    await replyUnlinked(
      chatId,
      "🔗 Чтобы привязать аккаунт:\n\n1. Откройте профиль на сайте\n2. Нажмите «Подключить Telegram»\n3. Код отправится автоматически — или вставьте его сюда",
      { label: "Открыть профиль →", url: `${APP_URL}/profile` }
    );
    return NextResponse.json({ ok: true });
  }

  // ── /start without token ──────────────────────────────────────────────────
  if (text === "/start") {
    if (me) {
      await reply(
        chatId,
        `👋 Привет, <b>${me.display_name ?? "участник"}</b>! Ты уже привязан к Konsensus.\n\nИспользуй кнопки меню ниже 👇`
      );
    } else {
      await replyUnlinked(
        chatId,
        "👋 Привет! Я бот Konsensus.\n\nЧтобы получать уведомления:\n1. Откройте профиль на сайте\n2. Нажмите «Подключить Telegram»\n3. Я открою автоматически — или вставьте код сюда",
        { label: "Открыть профиль →", url: `${APP_URL}/profile` }
      );
    }
    return NextResponse.json({ ok: true });
  }

  // ── /help ─────────────────────────────────────────────────────────────────
  if (text === "/help") {
    const helpText = me
      ? `ℹ️ <b>Команды бота:</b>\n\n⚔️ Вызовы — открытые вызовы на арене\n📋 Споры — ваши активные споры\n👤 Профиль — ваш профиль и XP\n🔓 Отвязать — отвязать Telegram от аккаунта\n🌐 Открыть приложение — Konsensus прямо в Telegram\n\nТакже: /challenges /disputes /profile /unlink /help`
      : `ℹ️ <b>Команды бота:</b>\n\n⚔️ Вызовы — открытые вызовы на арене\n🔗 Привязать аккаунт — подключить уведомления\n🌐 Открыть приложение — Konsensus прямо в Telegram\n\nТакже: /challenges /start /help`;

    if (me) {
      await reply(chatId, helpText);
    } else {
      await replyUnlinked(chatId, helpText);
    }
    return NextResponse.json({ ok: true });
  }

  // ── ⚔️ Вызовы / /challenges ───────────────────────────────────────────────
  if (text === "/challenges" || text === "⚔️ Вызовы") {
    const { data: challenges } = await admin
      .from("challenges")
      .select("id, topic, position_hint, profiles(display_name)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<{ id: string; topic: string; position_hint: string; profiles: { display_name: string | null } | null }[]>();

    if (!challenges || challenges.length === 0) {
      const msg = "🏟 На арене пока нет открытых вызовов.";
      if (me) {
        await reply(chatId, msg, { label: "Открыть арену →", url: `${APP_URL}/arena` });
      } else {
        await replyUnlinked(chatId, msg, { label: "Открыть арену →", url: `${APP_URL}/arena` });
      }
      return NextResponse.json({ ok: true });
    }

    const lines = challenges
      .map((c, i) => `${i + 1}. <b>${c.topic}</b>\nот ${c.profiles?.display_name ?? "Участник"} · <i>${c.position_hint}</i>`)
      .join("\n\n");

    const msg = `⚔️ <b>Открытые вызовы:</b>\n\n${lines}`;
    if (me) {
      await reply(chatId, msg, { label: "Открыть арену →", url: `${APP_URL}/arena` });
    } else {
      await replyUnlinked(chatId, msg, { label: "Открыть арену →", url: `${APP_URL}/arena` });
    }
    return NextResponse.json({ ok: true });
  }

  // ── 📋 Споры / /disputes ─────────────────────────────────────────────────
  if (text === "/disputes" || text === "📋 Споры") {
    if (!me) {
      await replyUnlinked(
        chatId,
        "⚠️ Сначала привяжите Telegram-аккаунт через профиль на сайте.",
        { label: "Открыть профиль →", url: `${APP_URL}/profile` }
      );
      return NextResponse.json({ ok: true });
    }

    const { data: disputes } = await admin
      .from("disputes")
      .select("id, title, status")
      .or(`creator_id.eq.${me.id},opponent_id.eq.${me.id}`)
      .in("status", ["open", "in_progress", "mediation"])
      .order("updated_at", { ascending: false })
      .limit(5)
      .returns<{ id: string; title: string; status: string }[]>();

    if (!disputes || disputes.length === 0) {
      await reply(chatId, "📋 У вас нет активных споров.", { label: "Создать спор →", url: `${APP_URL}/dispute/new` });
      return NextResponse.json({ ok: true });
    }

    const statusLabel: Record<string, string> = { open: "открыт", in_progress: "в процессе", mediation: "медиация" };
    const lines = disputes.map((d, i) => `${i + 1}. <b>${d.title}</b> — ${statusLabel[d.status] ?? d.status}`).join("\n");

    await reply(chatId, `📋 <b>Ваши активные споры:</b>\n\n${lines}`, { label: "Дашборд →", url: `${APP_URL}/dashboard` });
    return NextResponse.json({ ok: true });
  }

  // ── 👤 Профиль / /profile ────────────────────────────────────────────────
  if (text === "/profile" || text === "👤 Профиль") {
    if (!me) {
      await replyUnlinked(
        chatId,
        "⚠️ Сначала привяжите Telegram-аккаунт через профиль на сайте.",
        { label: "Открыть профиль →", url: `${APP_URL}/profile` }
      );
      return NextResponse.json({ ok: true });
    }

    const { data: points } = await admin
      .from("user_points")
      .select("total")
      .eq("user_id", me.id)
      .single<{ total: number }>();

    const { count: disputeCount } = await admin
      .from("disputes")
      .select("*", { count: "exact", head: true })
      .or(`creator_id.eq.${me.id},opponent_id.eq.${me.id}`);

    const xp = points?.total ?? 0;
    const bio = me.bio ? `\n📝 ${me.bio}` : "";
    const stance = me.debate_stance ? `\n💬 <i>${me.debate_stance}</i>` : "";

    await reply(
      chatId,
      `👤 <b>${me.display_name ?? "Участник"}</b>\n⚡ ${xp} XP · 🗣 ${disputeCount ?? 0} споров${bio}${stance}`,
      { label: "Открыть профиль →", url: `${APP_URL}/profile` }
    );
    return NextResponse.json({ ok: true });
  }

  // ── Default ───────────────────────────────────────────────────────────────
  if (me) {
    await reply(chatId, "Используй кнопки меню ниже 👇 или /help для списка команд.");
  } else {
    await replyUnlinked(
      chatId,
      "Привяжите Telegram-аккаунт через профиль на сайте или нажмите /help.",
      { label: "Открыть профиль →", url: `${APP_URL}/profile` }
    );
  }

  return NextResponse.json({ ok: true });
}

interface TelegramUpdate {
  message?: { text?: string; chat: { id: number } };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
}
