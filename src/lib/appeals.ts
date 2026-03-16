"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAIProfile } from "@/lib/ai-profile";
import { fetchPublicReputationBadges } from "@/lib/reputation";
import {
  needsAppealManualReview,
  type AppealItemType,
  type AppealSummary,
} from "@/lib/appeal-helpers";
import type { Database } from "@/types/database";

export type AppealRow = Database["public"]["Tables"]["appeals"]["Row"];

export type AppealableItemSnapshot = {
  itemType: AppealItemType;
  itemKey: string;
  itemLabel: string;
  sourceSnapshot: Database["public"]["Tables"]["appeals"]["Row"]["source_snapshot"];
};

function toAppealSummary(row: AppealRow): AppealSummary {
  return {
    id: row.id,
    userId: row.user_id,
    itemType: row.item_type,
    itemKey: row.item_key,
    itemLabel: row.item_label,
    appealText: row.appeal_text,
    status: row.status,
    reviewResult: row.review_result,
    reviewConfidence: row.review_confidence,
    reviewNotes: row.review_notes,
    manualOverrideResult: row.manual_override_result,
    manualOverrideNotes: row.manual_override_notes,
    manualOverriddenAt: row.manual_overridden_at,
    manualOverriddenBy: row.manual_overridden_by,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export async function fetchUserAppeals(userId: string): Promise<AppealSummary[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("appeals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<AppealRow[]>();

  return (data ?? []).map(toAppealSummary);
}

export async function fetchAppealModerationQueue(): Promise<AppealSummary[]> {
  const admin = createAdminClient();
  const { data: appeals } = await admin
    .from("appeals")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<AppealRow[]>();

  const userIds = Array.from(new Set((appeals ?? []).map((row) => row.user_id)));
  const { data: profiles } = userIds.length
    ? await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds)
        .returns<Array<{ id: string; display_name: string | null }>>()
    : { data: [] as Array<{ id: string; display_name: string | null }> };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));

  return (appeals ?? [])
    .map((row) => ({
      ...toAppealSummary(row),
      userDisplayName: profileMap.get(row.user_id) ?? null,
    }))
    .filter((appeal) => needsAppealManualReview(appeal));
}

export async function buildAppealableItemSnapshot(
  userId: string,
  itemType: AppealItemType,
  itemKey: string
): Promise<AppealableItemSnapshot | null> {
  if (itemType === "ai_summary") {
    const profile = await fetchAIProfile(userId).catch(() => null);
    if (!profile?.ai_summary?.trim()) return null;

    return {
      itemType,
      itemKey: "current",
      itemLabel: "AI-резюме профиля",
      sourceSnapshot: {
        ai_summary: profile.ai_summary,
        argumentation_style: profile.argumentation_style,
        compromise_tendency: profile.compromise_tendency,
        empathy_score: profile.empathy_score,
        impulsivity: profile.impulsivity,
        consensus_rate: profile.consensus_rate,
      },
    };
  }

  if (itemType === "reputation_badge") {
    const badges = await fetchPublicReputationBadges(userId, { includeHidden: true }).catch(() => []);
    const badge = badges.find((entry) => entry.key === itemKey);
    if (!badge) return null;

    return {
      itemType,
      itemKey: badge.key,
      itemLabel: badge.label,
      sourceSnapshot: {
        key: badge.key,
        label: badge.label,
        description: badge.description,
        tone: badge.tone,
        score: badge.score,
      },
    };
  }

  return null;
}
