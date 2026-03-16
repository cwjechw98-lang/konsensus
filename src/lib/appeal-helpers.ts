import type { Database } from "@/types/database";
import type { PublicReputationBadge } from "@/lib/reputation";

export type AppealItemType = Database["public"]["Tables"]["appeals"]["Row"]["item_type"];

export type AppealSummary = {
  id: string;
  itemType: AppealItemType;
  itemKey: string;
  itemLabel: string;
  appealText: string;
  status: Database["public"]["Tables"]["appeals"]["Row"]["status"];
  reviewResult: Database["public"]["Tables"]["appeals"]["Row"]["review_result"];
  reviewConfidence: number | null;
  reviewNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export function buildLatestAppealMap(appeals: AppealSummary[]) {
  const map = new Map<string, AppealSummary>();
  for (const appeal of appeals) {
    const key = `${appeal.itemType}:${appeal.itemKey}`;
    if (!map.has(key)) {
      map.set(key, appeal);
    }
  }
  return map;
}

export function getLatestAppealForItem(
  appeals: AppealSummary[] | Map<string, AppealSummary>,
  itemType: AppealItemType,
  itemKey: string
) {
  const key = `${itemType}:${itemKey}`;
  if (appeals instanceof Map) return appeals.get(key) ?? null;
  return buildLatestAppealMap(appeals).get(key) ?? null;
}

export function isAppealHidden(appeal: AppealSummary | null | undefined) {
  return Boolean(appeal && appeal.status === "resolved" && appeal.reviewResult === "hidden");
}

export function getAppealStatusText(appeal: AppealSummary | null | undefined) {
  if (!appeal) return null;
  if (appeal.status === "reviewing") return "Апелляция на пересмотре";
  if (appeal.reviewResult === "hidden") return "Вывод скрыт после апелляции";
  return "Апелляция рассмотрена, вывод оставлен";
}

export function sortBadgesWithAppeals(
  badges: PublicReputationBadge[],
  appeals: Map<string, AppealSummary>
) {
  return [...badges].sort((left, right) => {
    const leftAppeal = getLatestAppealForItem(appeals, "reputation_badge", left.key);
    const rightAppeal = getLatestAppealForItem(appeals, "reputation_badge", right.key);
    const leftWeight = isAppealHidden(leftAppeal) ? 1 : 0;
    const rightWeight = isAppealHidden(rightAppeal) ? 1 : 0;
    if (leftWeight !== rightWeight) return leftWeight - rightWeight;
    return right.score - left.score;
  });
}
