import { describe, expect, it } from "vitest";

import {
  calculateTrustTier,
  differenceInDays,
  getLinkedIdentity,
  getTrustTierGateMessage,
  getTrustTierNextStep,
  hasMinimumTrustTier,
  type TrustTierState,
} from "@/lib/trust-tier";

function createSignals(
  overrides: Partial<TrustTierState["signals"]> = {}
): TrustTierState["signals"] {
  return {
    hasLinkedIdentity: false,
    hasTelegram: false,
    accountAgeDays: 0,
    disputeCount: 0,
    resolvedCount: 0,
    achievementsCount: 0,
    consensusRate: 0,
    empathyScore: 0,
    ...overrides,
  };
}

describe("trust tier policy", () => {
  it("detects linked identity from email", () => {
    expect(
      getLinkedIdentity({
        email: "user@example.com",
        is_anonymous: false,
      })
    ).toBe(true);
  });

  it("ignores anonymous identity", () => {
    expect(
      getLinkedIdentity({
        email: "user@example.com",
        is_anonymous: true,
      })
    ).toBe(false);
  });

  it("calculates account age in whole days", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(differenceInDays(eightDaysAgo, undefined)).toBeGreaterThanOrEqual(8);
  });

  it("keeps user basic without identity or history", () => {
    expect(calculateTrustTier(createSignals())).toBe("basic");
  });

  it("upgrades user to linked from participation history", () => {
    expect(
      calculateTrustTier(
        createSignals({
          disputeCount: 2,
        })
      )
    ).toBe("linked");
  });

  it("upgrades user to trusted with stable positive signals", () => {
    expect(
      calculateTrustTier(
        createSignals({
          hasLinkedIdentity: true,
          accountAgeDays: 14,
          disputeCount: 5,
          resolvedCount: 2,
          consensusRate: 40,
        })
      )
    ).toBe("trusted");
  });

  it("returns next step hint for linked users", () => {
    expect(
      getTrustTierNextStep(
        "linked",
        createSignals({
          hasLinkedIdentity: true,
          disputeCount: 2,
          resolvedCount: 0,
          accountAgeDays: 3,
        })
      )
    ).toContain("Trusted");
  });

  it("compares tier order correctly", () => {
    expect(hasMinimumTrustTier("trusted", "linked")).toBe(true);
    expect(hasMinimumTrustTier("basic", "linked")).toBe(false);
  });

  it("returns explanatory gate messages", () => {
    expect(getTrustTierGateMessage("linked")).toContain("Linked");
    expect(getTrustTierGateMessage("trusted")).toContain("Trusted");
  });
});
