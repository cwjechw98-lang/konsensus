import { NextRequest, NextResponse } from "next/server";
import { runScheduledReleaseAnnouncements } from "@/lib/telegram";
import { getCronSecret } from "@/lib/site-config";

function isAuthorized(req: NextRequest) {
  const cronSecret = getCronSecret();
  const authHeader = req.headers.get("authorization");
  const broadcastSecret = req.headers.get("x-broadcast-secret");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  if (broadcastSecret && broadcastSecret === process.env.TELEGRAM_WEBHOOK_SECRET) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runScheduledReleaseAnnouncements();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

export const POST = GET;
