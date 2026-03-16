import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAIProfile } from "@/lib/ai-profile";
import { fetchRPGStats, type RPGStats } from "@/lib/rpg";

export type PublicReputationBadge = {
  key: string;
  label: string;
  description: string;
  tone: "emerald" | "cyan" | "amber" | "purple";
  score: number;
};

type BadgeDraft = Omit<PublicReputationBadge, "score"> & { score: number };

const BADGE_STYLES: Record<
  PublicReputationBadge["tone"],
  { text: string; border: string; bg: string }
> = {
  emerald: {
    text: "text-emerald-200",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
  },
  cyan: {
    text: "text-cyan-200",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/10",
  },
  amber: {
    text: "text-amber-200",
    border: "border-amber-500/20",
    bg: "bg-amber-500/10",
  },
  purple: {
    text: "text-purple-200",
    border: "border-purple-500/20",
    bg: "bg-purple-500/10",
  },
};

export function getBadgeToneClasses(tone: PublicReputationBadge["tone"]) {
  return BADGE_STYLES[tone];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function fetchPublicReputationBadges(
  userId: string,
  options?: {
    rpgStats?: RPGStats;
    includeHidden?: boolean;
  }
): Promise<PublicReputationBadge[]> {
  const admin = createAdminClient();
  const [profile, stats, argsRes, evidenceRes] = await Promise.all([
    fetchAIProfile(userId).catch(() => null),
    options?.rpgStats ? Promise.resolve(options.rpgStats) : fetchRPGStats(userId, admin),
    admin
      .from("arguments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
    admin
      .from("arguments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .not("evidence", "is", null),
  ]);

  if (!profile) return [];

  const totalArgs = argsRes.count ?? 0;
  const evidenceArgs = evidenceRes.count ?? 0;
  const evidenceRatio = totalArgs > 0 ? evidenceArgs / totalArgs : 0;
  const hintAcceptanceRatio =
    profile.hints_total > 0 ? profile.hints_accepted / profile.hints_total : 0;

  const drafts: BadgeDraft[] = [];

  if (profile.compromise_tendency >= 62 && profile.consensus_rate >= 35) {
    drafts.push({
      key: "diplomat",
      label: "Дипломат",
      description: "Чаще двигает спор к договорённости, чем к эскалации.",
      tone: "emerald",
      score: clampScore(
        profile.compromise_tendency * 0.55 + profile.consensus_rate * 0.45
      ),
    });
  }

  if (
    profile.argumentation_style === "logical" ||
    (profile.argumentation_style === "mixed" && evidenceRatio >= 0.35)
  ) {
    drafts.push({
      key: "rational",
      label: "Рациональный",
      description: "Держится за структуру аргумента и ясную логику хода.",
      tone: "cyan",
      score: clampScore(60 + evidenceRatio * 30 + (profile.argumentation_style === "logical" ? 10 : 0)),
    });
  }

  if (profile.empathy_score >= 65 && hintAcceptanceRatio >= 0.35) {
    drafts.push({
      key: "listener",
      label: "Слышащий",
      description: "Лучше других удерживает контакт и улавливает логику второй стороны.",
      tone: "purple",
      score: clampScore(profile.empathy_score * 0.7 + hintAcceptanceRatio * 30),
    });
  }

  if (stats.persistence >= 60 || stats.activity >= 55) {
    drafts.push({
      key: "persistent",
      label: "Настойчивый",
      description: "Не выпадает из разговора и доводит спор до следующего хода.",
      tone: "amber",
      score: clampScore(stats.persistence * 0.6 + stats.activity * 0.4),
    });
  }

  if (evidenceRatio >= 0.32 && totalArgs >= 3) {
    drafts.push({
      key: "fact_careful",
      label: "Аккуратен с фактами",
      description: "Часто подкрепляет позицию ссылками, доказательствами или материалами.",
      tone: "cyan",
      score: clampScore(55 + evidenceRatio * 45),
    });
  }

  const sorted = drafts.sort((left, right) => right.score - left.score).slice(0, 3);
  if (options?.includeHidden) {
    return sorted;
  }

  const { data: appeals } = await admin
    .from("appeals")
    .select("item_key, review_result, manual_override_result, status, created_at")
    .eq("user_id", userId)
    .eq("item_type", "reputation_badge")
    .order("created_at", { ascending: false })
    .returns<Array<{
      item_key: string;
      review_result: "kept" | "hidden" | null;
      manual_override_result: "kept" | "hidden" | null;
      status: "reviewing" | "resolved";
      created_at: string;
    }>>();

  const hiddenBadgeKeys = new Set<string>();
  for (const appeal of appeals ?? []) {
    if (hiddenBadgeKeys.has(appeal.item_key)) continue;
    const effectiveResult = appeal.manual_override_result ?? appeal.review_result;
    if (appeal.status === "resolved" && effectiveResult === "hidden") {
      hiddenBadgeKeys.add(appeal.item_key);
    }
  }

  return sorted.filter((badge) => !hiddenBadgeKeys.has(badge.key));
}
