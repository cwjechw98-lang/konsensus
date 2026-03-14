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

    let tgUser: { id: number };
    try {
      tgUser = JSON.parse(userJson);
    } catch {
      return NextResponse.json({ error: "Invalid user JSON" }, { status: 400 });
    }

    const chatId = tgUser.id;
    const admin = createAdminClient();

    // Find linked profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("telegram_chat_id", chatId)
      .single<{ id: string }>();

    if (!profile) {
      return NextResponse.json({
        error: "not_linked",
        message: "Telegram не привязан к аккаунту. Привяжите через профиль на сайте.",
      }, { status: 403 });
    }

    // Get user email
    const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
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
