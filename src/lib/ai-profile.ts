"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type AIProfile = {
  argumentation_style: string;
  compromise_tendency: number;
  ai_hint_reaction: string;
  typical_planes: string[];
  consensus_rate: number;
  avg_response_time: number;
  impulsivity: number;
  empathy_score: number;
  ai_summary: string | null;
  hints_accepted: number;
  hints_ignored: number;
  hints_total: number;
};

const STYLE_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  emotional: { label: "Эмоциональный", icon: "🔥", desc: "Вы аргументируете через чувства и личный опыт" },
  logical:   { label: "Логический",    icon: "🧠", desc: "Вы опираетесь на факты, структуру и доказательства" },
  mixed:     { label: "Смешанный",     icon: "⚡", desc: "Вы гибко сочетаете логику и эмоции" },
};

const REACTION_LABELS: Record<string, { label: string; icon: string }> = {
  accepts: { label: "Принимает подсказки", icon: "👂" },
  ignores: { label: "Игнорирует подсказки", icon: "🙈" },
  argues:  { label: "Спорит с ИИ", icon: "💬" },
};

export async function getStyleInfo(style: string) {
  return STYLE_LABELS[style] ?? STYLE_LABELS.mixed;
}

export async function getReactionInfo(reaction: string) {
  return REACTION_LABELS[reaction] ?? REACTION_LABELS.accepts;
}

/**
 * Fetch or create AI profile for a user.
 */
export async function fetchAIProfile(userId: string): Promise<AIProfile> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("user_ai_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (data) return data as AIProfile;

  // Create default profile
  await admin.from("user_ai_profiles").insert({ user_id: userId } as never);

  return {
    argumentation_style: "mixed",
    compromise_tendency: 50,
    ai_hint_reaction: "accepts",
    typical_planes: [],
    consensus_rate: 0,
    avg_response_time: 0,
    impulsivity: 50,
    empathy_score: 50,
    ai_summary: null,
    hints_accepted: 0,
    hints_ignored: 0,
    hints_total: 0,
  };
}

/**
 * Update AI profile after a dispute is resolved.
 * Called from actions.ts when mediation completes.
 */
export async function updateAIProfileAfterDispute(
  userId: string,
  disputeData: {
    plane?: string;
    reachedConsensus: boolean;
    responseTimeSec?: number;
  }
): Promise<void> {
  const admin = createAdminClient();
  const profile = await fetchAIProfile(userId);

  // Update typical planes
  const planes = [...(profile.typical_planes ?? [])];
  if (disputeData.plane && !planes.includes(disputeData.plane)) {
    planes.push(disputeData.plane);
  }

  // Recalculate consensus rate
  const { count: totalDisputes } = await admin
    .from("disputes")
    .select("*", { count: "exact", head: true })
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .eq("status", "resolved");

  const { count: allDisputes } = await admin
    .from("disputes")
    .select("*", { count: "exact", head: true })
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .in("status", ["resolved", "closed"]);

  const consensusRate = allDisputes ? Math.round(((totalDisputes ?? 0) / allDisputes) * 100) : 0;

  // Update response time (running average)
  let avgTime = profile.avg_response_time;
  if (disputeData.responseTimeSec) {
    avgTime = avgTime === 0
      ? disputeData.responseTimeSec
      : Math.round((avgTime + disputeData.responseTimeSec) / 2);
  }

  // Impulsivity based on response time
  let impulsivity = profile.impulsivity;
  if (avgTime > 0) {
    impulsivity = avgTime < 120 ? Math.min(100, impulsivity + 5) : Math.max(0, impulsivity - 5);
  }

  await admin
    .from("user_ai_profiles")
    .upsert({
      user_id: userId,
      typical_planes: planes,
      consensus_rate: consensusRate,
      avg_response_time: avgTime,
      impulsivity,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "user_id" });
}

/**
 * Fetch counterparts for a user (people they've debated with).
 */
export async function fetchCounterparts(userId: string) {
  const admin = createAdminClient();

  const { data } = await admin
    .from("user_counterparts")
    .select("counterpart_id, dispute_count, consensus_count, last_dispute_at")
    .eq("user_id", userId)
    .order("last_dispute_at", { ascending: false })
    .returns<{
      counterpart_id: string;
      dispute_count: number;
      consensus_count: number;
      last_dispute_at: string;
    }[]>();

  if (!data || data.length === 0) return [];

  // Fetch counterpart profiles
  const ids = data.map((d) => d.counterpart_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", ids)
    .returns<{ id: string; display_name: string | null }[]>();

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name]));

  return data.map((d) => ({
    ...d,
    display_name: profileMap[d.counterpart_id] ?? "Участник",
  }));
}

/**
 * Update counterparts after a dispute.
 */
export async function updateCounterparts(
  userId: string,
  counterpartId: string,
  reachedConsensus: boolean
): Promise<void> {
  const admin = createAdminClient();

  // Upsert for both directions
  for (const [a, b] of [[userId, counterpartId], [counterpartId, userId]]) {
    const { data: existing } = await admin
      .from("user_counterparts")
      .select("dispute_count, consensus_count")
      .eq("user_id", a)
      .eq("counterpart_id", b)
      .single<{ dispute_count: number; consensus_count: number }>();

    if (existing) {
      await admin
        .from("user_counterparts")
        .update({
          dispute_count: existing.dispute_count + 1,
          consensus_count: existing.consensus_count + (reachedConsensus ? 1 : 0),
          last_dispute_at: new Date().toISOString(),
        } as never)
        .eq("user_id", a)
        .eq("counterpart_id", b);
    } else {
      await admin.from("user_counterparts").insert({
        user_id: a,
        counterpart_id: b,
        dispute_count: 1,
        consensus_count: reachedConsensus ? 1 : 0,
        last_dispute_at: new Date().toISOString(),
      } as never);
    }
  }
}
