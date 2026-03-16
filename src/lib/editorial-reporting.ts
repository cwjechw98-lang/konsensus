import type { Database } from "@/types/database";

export type EditorialReleaseReport =
  Database["public"]["Tables"]["release_announcements"]["Row"];

export async function fetchEditorialDeliveryReports(limit = 8): Promise<{
  queued: EditorialReleaseReport[];
  recent: EditorialReleaseReport[];
  summary: {
    queuedCount: number;
    deliveredBotCount: number;
    suppressedBotCount: number;
    channelSentCount: number;
  };
}> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const [queuedRes, recentRes] = await Promise.all([
    admin
      .from("release_announcements")
      .select("*")
      .not("scheduled_publish_at", "is", null)
      .is("scheduled_published_at", null)
      .gte("scheduled_publish_at", nowIso)
      .order("scheduled_publish_at", { ascending: true })
      .limit(limit)
      .returns<EditorialReleaseReport[]>(),
    admin
      .from("release_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<EditorialReleaseReport[]>(),
  ]);

  return {
    queued: queuedRes.data ?? [],
    recent: recentRes.data ?? [],
    summary: {
      queuedCount: (queuedRes.data ?? []).length,
      deliveredBotCount: (recentRes.data ?? []).reduce(
        (acc, item) => acc + (item.bot_delivered_count ?? 0),
        0
      ),
      suppressedBotCount: (recentRes.data ?? []).reduce(
        (acc, item) => acc + (item.bot_suppressed_count ?? 0),
        0
      ),
      channelSentCount: (recentRes.data ?? []).filter((item) => item.sent_to_channel_at).length,
    },
  };
}
