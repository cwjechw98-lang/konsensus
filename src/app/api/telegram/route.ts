import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://konsensus.app";

async function sendMessage(chatId: number, text: string, inlineKeyboard?: { text: string; url: string }[][]) {
  if (!BOT_TOKEN) return;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function POST(req: NextRequest) {
  // Verify secret token
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

  // /start command
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    const token = parts[1]?.trim();

    if (!token) {
      await sendMessage(
        chatId,
        "👋 Привет! Я бот Konsensus.\n\nЧтобы получать уведомления, привяжите аккаунт:\n1. Откройте профиль на сайте\n2. Нажмите «Получить код»\n3. Напишите мне: <code>/start K-XXXXXXXX</code>",
        [[{ text: "Открыть профиль →", url: `${APP_URL}/profile` }]]
      );
      return NextResponse.json({ ok: true });
    }

    // Look up profile by token
    const { data: profile } = await admin
      .from("profiles")
      .select("id, display_name")
      .eq("telegram_link_token", token)
      .single<{ id: string; display_name: string | null }>();

    if (!profile) {
      await sendMessage(chatId, "❌ Код не найден или уже использован. Получите новый в профиле.");
      return NextResponse.json({ ok: true });
    }

    // Save chat_id and clear token
    await admin
      .from("profiles")
      .update({ telegram_chat_id: chatId, telegram_link_token: null } as never)
      .eq("id", profile.id);

    await sendMessage(
      chatId,
      `✅ Аккаунт привязан, ${profile.display_name ?? "участник"}!\n\nТеперь вы будете получать уведомления о спорах и вызовах.`
    );
    return NextResponse.json({ ok: true });
  }

  // /challenges command
  if (text === "/challenges") {
    const { data: challenges } = await admin
      .from("challenges")
      .select("id, topic, position_hint, profiles(display_name)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<{ id: string; topic: string; position_hint: string; profiles: { display_name: string | null } | null }[]>();

    if (!challenges || challenges.length === 0) {
      await sendMessage(chatId, "🏟 На арене пока нет открытых вызовов.");
      return NextResponse.json({ ok: true });
    }

    const lines = challenges.map((c, i) =>
      `${i + 1}. <b>${c.topic}</b>\n   от ${c.profiles?.display_name ?? "Участник"} · <i>${c.position_hint}</i>`
    ).join("\n\n");

    await sendMessage(
      chatId,
      `⚔️ <b>Открытые вызовы на арене:</b>\n\n${lines}`,
      [[{ text: "Открыть арену →", url: `${APP_URL}/arena` }]]
    );
    return NextResponse.json({ ok: true });
  }

  // /disputes command — requires linked account
  if (text === "/disputes") {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("telegram_chat_id", chatId)
      .single<{ id: string }>();

    if (!profile) {
      await sendMessage(chatId, "⚠️ Привяжите аккаунт командой /start K-XXXXXXXX");
      return NextResponse.json({ ok: true });
    }

    const { data: disputes } = await admin
      .from("disputes")
      .select("id, title, status")
      .or(`creator_id.eq.${profile.id},opponent_id.eq.${profile.id}`)
      .in("status", ["open", "in_progress", "mediation"])
      .order("updated_at", { ascending: false })
      .limit(5)
      .returns<{ id: string; title: string; status: string }[]>();

    if (!disputes || disputes.length === 0) {
      await sendMessage(chatId, "📋 У вас нет активных споров.");
      return NextResponse.json({ ok: true });
    }

    const statusLabel: Record<string, string> = {
      open: "открыт",
      in_progress: "в процессе",
      mediation: "медиация",
    };

    const lines = disputes.map((d, i) =>
      `${i + 1}. <b>${d.title}</b> — ${statusLabel[d.status] ?? d.status}`
    ).join("\n");

    await sendMessage(
      chatId,
      `📋 <b>Ваши активные споры:</b>\n\n${lines}`,
      [[{ text: "Открыть дашборд →", url: `${APP_URL}/dashboard` }]]
    );
    return NextResponse.json({ ok: true });
  }

  // /profile command — requires linked account
  if (text === "/profile") {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, display_name, bio, debate_stance")
      .eq("telegram_chat_id", chatId)
      .single<{ id: string; display_name: string | null; bio: string | null; debate_stance: string | null }>();

    if (!profile) {
      await sendMessage(chatId, "⚠️ Привяжите аккаунт командой /start K-XXXXXXXX");
      return NextResponse.json({ ok: true });
    }

    const { data: points } = await admin
      .from("user_points")
      .select("total")
      .eq("user_id", profile.id)
      .single<{ total: number }>();

    const { count: disputeCount } = await admin
      .from("disputes")
      .select("*", { count: "exact", head: true })
      .or(`creator_id.eq.${profile.id},opponent_id.eq.${profile.id}`);

    const xp = points?.total ?? 0;
    const name = profile.display_name ?? "Участник";
    const bio = profile.bio ? `\n📝 ${profile.bio}` : "";
    const stance = profile.debate_stance ? `\n💬 Кредо: <i>${profile.debate_stance}</i>` : "";

    await sendMessage(
      chatId,
      `👤 <b>${name}</b>\n⚡ ${xp} XP · 🗣 ${disputeCount ?? 0} споров${bio}${stance}`,
      [[{ text: "Открыть профиль →", url: `${APP_URL}/profile` }]]
    );
    return NextResponse.json({ ok: true });
  }

  // Default — help
  await sendMessage(
    chatId,
    "🤖 <b>Konsensus Bot</b>\n\nКоманды:\n/start K-XXXXXXXX — привязать аккаунт\n/challenges — открытые вызовы на арене\n/disputes — ваши активные споры\n/profile — ваш профиль"
  );

  return NextResponse.json({ ok: true });
}

// Types
interface TelegramUpdate {
  message?: {
    text?: string;
    chat: { id: number };
  };
}
