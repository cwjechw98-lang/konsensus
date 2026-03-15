import { NextRequest, NextResponse } from "next/server";
import { broadcastToAll, publishReleaseAnnouncement } from "@/lib/telegram";
import type { ReleaseTarget } from "@/lib/releases";

/**
 * POST /api/telegram/broadcast
 * Send a message to all linked Telegram users.
 * Protected by TELEGRAM_WEBHOOK_SECRET (same secret as bot webhook).
 *
 * Body:
 *  - { message: string }
 *  - { release: { title, summary, features, slug?, notes?, source_commits? }, target?: "bot" | "channel" | "both" }
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-broadcast-secret");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (body?.release) {
      const result = await publishReleaseAnnouncement(
        body.release,
        (body.target as ReleaseTarget | undefined) ?? "both"
      );
      return NextResponse.json({ ok: true, release: result });
    }

    const { message } = body;
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message or structured release required" },
        { status: 400 }
      );
    }

    const sent = await broadcastToAll(message);
    return NextResponse.json({ ok: true, sent });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
