import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

/**
 * Validates Telegram Mini App initData.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateInitData(initData: string): Record<string, string> | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash !== hash) return null;

  const authDate = Number(params.get("auth_date") || "0");
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) return null;

  return Object.fromEntries(entries);
}

function getTelegramEmail(chatId: number): string {
  return `tg-${chatId}@telegram.konsensus.app`;
}

function getTelegramDisplayName(user: {
  username?: string;
  first_name?: string;
  last_name?: string;
  id: number;
}): string {
  if (user.username) return `@${user.username}`;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  return `Telegram ${user.id}`;
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & {
    schema: (schema: string) => {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            limit: (count: number) => {
              maybeSingle: <T>() => Promise<{ data: T | null }>;
            };
          };
        };
      };
    };
  };

  const { data } = await admin
    .schema("auth")
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

/**
 * POST /api/telegram/auth
 * Body: { initData: string }
 *
 * Validates Telegram initData → finds linked Supabase user →
 * generates a magic link (OTP) that the client auto-verifies.
 */
export async function POST(req: Request) {
  try {
    const { initData } = await req.json();
    if (!initData) {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 });
    }

    const validated = validateInitData(initData);
    if (!validated) {
      return NextResponse.json({ error: "Invalid initData signature" }, { status: 401 });
    }

    const userJson = validated.user;
    if (!userJson) {
      return NextResponse.json({ error: "No user in initData" }, { status: 400 });
    }

    let tgUser: { id: number; username?: string; first_name?: string; last_name?: string };
    try {
      tgUser = JSON.parse(userJson);
    } catch {
      return NextResponse.json({ error: "Invalid user JSON" }, { status: 400 });
    }

    const chatId = tgUser.id;
    const admin = createAdminClient();

    const telegramEmail = getTelegramEmail(chatId);
    const telegramDisplayName = getTelegramDisplayName(tgUser);

    // Find linked profile first
    const { data: profile } = await admin
      .from("profiles")
      .select("id, display_name")
      .eq("telegram_chat_id", chatId)
      .maybeSingle<{ id: string; display_name: string | null }>();

    let userId = profile?.id ?? null;

    if (!userId) {
      userId = await findAuthUserIdByEmail(telegramEmail);
    }

    if (!userId) {
      const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
        email: telegramEmail,
        email_confirm: true,
        user_metadata: {
          display_name: telegramDisplayName,
          auth_provider: "telegram",
          telegram_id: chatId,
          telegram_username: tgUser.username ?? null,
        },
      });

      if (createError || !createdUser.user?.id) {
        return NextResponse.json({
          error: createError?.message ?? "Failed to create Telegram user",
        }, { status: 500 });
      }

      userId = createdUser.user.id;
    }

    // Link or refresh profile metadata for Telegram users
    await admin
      .from("profiles")
      .upsert({
        id: userId,
        telegram_chat_id: chatId,
        display_name: profile?.display_name ?? telegramDisplayName,
      } as never, { onConflict: "id" });

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    if (!authUser?.user?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 500 });
    }

    // Generate magic link — returns hashed_token that client can use with verifyOtp
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.user.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ error: linkError?.message ?? "Failed to generate link" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      hashed_token: linkData.properties.hashed_token,
      email: authUser.user.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
