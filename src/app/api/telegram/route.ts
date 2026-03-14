import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://konsensus.app";

// Persistent bottom keyboard — shown to all linked users
const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "⚔️ Вызовы" }, { text: "📋 Споры" }],
    [{ text: "👤 Профиль" }],
  ],
  resize_keyboard: true,
  persistent: true,
};

type InlineKeyboard = { text: string; url: string }[][];

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

// Sends with persistent menu + optional inline button
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
      await sendMessage(
        chatId,
        `✅ Этот Telegram уже привязан к аккаунту <b>${me.display_name ?? "участник"}</b>!`,
        { keyboard: MAIN_KEYBOARD }
      );
      return NextResponse.json({ ok: true });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id, display_name")
      .eq("telegram_link_token", tokenMatch)
      .single<{ id: string; display_name: string | null }>();

    if (!profile) {
      await sendMessage(
        chatId,
        "❌ Код не найден или уже использован. Получите новый в профиле.",
        { inline: [[{ text: "Открыть профиль →", url: `${APP_URL}/profile` }]] }
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

  // ── /start without token ──────────────────────────────────────────────────
  if (text === "/start") {
    if (me) {
      await sendMessage(
        chatId,
        `👋 Привет, <b>${me.display_name ?? "участник"}</b>! Ты уже привязан к Konsensus.\n\nИспользуй кнопки меню ниже 👇`,
        { keyboard: MAIN_KEYBOARD }
      );
    } else {
      await sendMessage(
        chatId,
        "👋 Привет! Я бот Konsensus.\n\nЧтобы получать уведомления:\n1. Откройте профиль на сайте\n2. Нажмите «Подключить Telegram»\n3. Я открою автоматически — или вставьте код сюда",
        { inline: [[{ text: "Открыть профиль →", url: `${APP_URL}/profile` }]] }
      );
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
      await sendMessage(chatId, "🏟 На арене пока нет открытых вызовов.", {
        keyboard: MAIN_KEYBOARD,
        inline: [[{ text: "Открыть арену →", url: `${APP_URL}/arena` }]],
      });
      return NextResponse.json({ ok: true });
    }

    const lines = challenges
      .map((c, i) => `${i + 1}. <b>${c.topic}</b>\nот ${c.profiles?.display_name ?? "Участник"} · <i>${c.position_hint}</i>`)
      .join("\n\n");

    await sendMessage(chatId, `⚔️ <b>Открытые вызовы:</b>\n\n${lines}`, {
      keyboard: MAIN_KEYBOARD,
      inline: [[{ text: "Открыть арену →", url: `${APP_URL}/arena` }]],
    });
    return NextResponse.json({ ok: true });
  }

  // ── 📋 Споры / /disputes ─────────────────────────────────────────────────
  if (text === "/disputes" || text === "📋 Споры") {
    if (!me) {
      await sendMessage(chatId, "⚠️ Сначала привяжите Telegram-аккаунт через профиль на сайте.", {
        inline: [[{ text: "Открыть профиль →", url: `${APP_URL}/profile` }]],
      });
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
      await sendMessage(chatId, "⚠️ Сначала привяжите Telegram-аккаунт через профиль на сайте.", {
        inline: [[{ text: "Открыть профиль →", url: `${APP_URL}/profile` }]],
      });
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
    await sendMessage(chatId, "Используй кнопки меню ниже 👇", { keyboard: MAIN_KEYBOARD });
  } else {
    await sendMessage(chatId, "Привяжите Telegram-аккаунт через профиль на сайте.", {
      inline: [[{ text: "Открыть профиль →", url: `${APP_URL}/profile` }]],
    });
  }

  return NextResponse.json({ ok: true });
}

interface TelegramUpdate {
  message?: { text?: string; chat: { id: number } };
}
