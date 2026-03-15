import { NextRequest, NextResponse } from "next/server";
import { broadcastToAll } from "@/lib/telegram";

/**
 * POST /api/telegram/broadcast
 * Send a message to all linked Telegram users.
 * Protected by TELEGRAM_WEBHOOK_SECRET (same secret as bot webhook).
 *
 * Body: { message: string }
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-broadcast-secret");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const sent = await broadcastToAll(message);
    return NextResponse.json({ ok: true, sent });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
