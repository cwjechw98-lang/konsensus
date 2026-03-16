import { describe, expect, it } from "vitest";

import {
  isTelegramMembershipActive,
  normalizeTelegramMembershipStatus,
  shouldSuppressBotReleaseTeaser,
} from "@/lib/telegram-editorial";

describe("telegram editorial membership policy", () => {
  it("normalizes supported statuses", () => {
    expect(normalizeTelegramMembershipStatus("member")).toBe("member");
    expect(normalizeTelegramMembershipStatus("administrator")).toBe("administrator");
  });

  it("falls back to unknown for unsupported values", () => {
    expect(normalizeTelegramMembershipStatus("ghost")).toBe("unknown");
    expect(normalizeTelegramMembershipStatus(null)).toBe("unknown");
  });

  it("treats active member statuses as subscribed", () => {
    expect(isTelegramMembershipActive("member")).toBe(true);
    expect(isTelegramMembershipActive("restricted")).toBe(true);
    expect(isTelegramMembershipActive("left")).toBe(false);
  });

  it("suppresses bot teaser for subscribed members only", () => {
    expect(shouldSuppressBotReleaseTeaser("member")).toBe(true);
    expect(shouldSuppressBotReleaseTeaser("administrator")).toBe(true);
    expect(shouldSuppressBotReleaseTeaser("left")).toBe(false);
    expect(shouldSuppressBotReleaseTeaser("unknown")).toBe(false);
  });
});
