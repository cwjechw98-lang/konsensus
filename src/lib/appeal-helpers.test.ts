import { describe, expect, it } from "vitest";

import {
  buildLatestAppealMap,
  getAppealEffectiveResult,
  getAppealStatusText,
  getLatestAppealForItem,
  isAppealHidden,
  needsAppealManualReview,
  sortBadgesWithAppeals,
  type AppealSummary,
} from "@/lib/appeal-helpers";
import type { PublicReputationBadge } from "@/lib/reputation";

function createAppeal(
  overrides: Partial<AppealSummary> = {}
): AppealSummary {
  return {
    id: "appeal-1",
    userId: "user-1",
    userDisplayName: "Антон",
    itemType: "reputation_badge",
    itemKey: "diplomat",
    itemLabel: "Дипломат",
    appealText: "Прошу пересмотреть вывод",
    status: "resolved",
    reviewResult: "kept",
    reviewConfidence: 0.82,
    reviewNotes: "ok",
    manualOverrideResult: null,
    manualOverrideNotes: null,
    manualOverriddenAt: null,
    manualOverriddenBy: null,
    createdAt: "2026-03-16T10:00:00.000Z",
    resolvedAt: "2026-03-16T10:05:00.000Z",
    ...overrides,
  };
}

function createBadge(
  overrides: Partial<PublicReputationBadge> = {}
): PublicReputationBadge {
  return {
    key: "diplomat",
    label: "Дипломат",
    description: "desc",
    tone: "emerald",
    score: 70,
    ...overrides,
  };
}

describe("appeal helpers", () => {
  it("keeps only latest appeal per item key", () => {
    const appeals = buildLatestAppealMap([
      createAppeal({ id: "new", createdAt: "2026-03-16T12:00:00.000Z" }),
      createAppeal({ id: "old", createdAt: "2026-03-16T11:00:00.000Z" }),
    ]);

    expect(appeals.get("reputation_badge:diplomat")?.id).toBe("new");
  });

  it("finds latest appeal from map", () => {
    const appeal = createAppeal();
    const appeals = new Map([["reputation_badge:diplomat", appeal]]);

    expect(getLatestAppealForItem(appeals, "reputation_badge", "diplomat")).toBe(
      appeal
    );
  });

  it("marks hidden appeal correctly", () => {
    expect(
      isAppealHidden(
        createAppeal({
          reviewResult: "hidden",
        })
      )
    ).toBe(true);
  });

  it("returns reviewing status text", () => {
    expect(
      getAppealStatusText(
        createAppeal({
          status: "reviewing",
          reviewResult: null,
          resolvedAt: null,
        })
      )
    ).toBe("Апелляция на пересмотре");
  });

  it("prefers manual override result over auto review", () => {
    expect(
      getAppealEffectiveResult(
        createAppeal({
          reviewResult: "hidden",
          manualOverrideResult: "kept",
        })
      )
    ).toBe("kept");
  });

  it("flags low-confidence auto review for manual moderation", () => {
    expect(
      needsAppealManualReview(
        createAppeal({
          reviewConfidence: 61,
        })
      )
    ).toBe(true);
  });

  it("returns manual status text after override", () => {
    expect(
      getAppealStatusText(
        createAppeal({
          reviewResult: "hidden",
          manualOverrideResult: "kept",
        })
      )
    ).toBe("Ручной разбор оставил вывод");
  });

  it("moves hidden badges behind visible ones", () => {
    const badges = [
      createBadge({ key: "diplomat", score: 95 }),
      createBadge({ key: "listener", label: "Слышащий", tone: "purple", score: 60 }),
    ];

    const appeals = buildLatestAppealMap([
      createAppeal({
        itemKey: "diplomat",
        reviewResult: "hidden",
      }),
    ]);

    expect(sortBadgesWithAppeals(badges, appeals).map((badge) => badge.key)).toEqual([
      "listener",
      "diplomat",
    ]);
  });
});
