import { describe, expect, it } from "vitest";

import {
  isScheduledReleaseDue,
  isScheduledReleaseFulfilled,
} from "@/lib/telegram-schedule";

describe("telegram editorial scheduling", () => {
  it("treats unsent due release as ready", () => {
    expect(
      isScheduledReleaseDue(
        {
          slug: "release-1",
          scheduled_publish_at: "2026-03-16T08:00:00.000Z",
          scheduled_target: "both",
          scheduled_published_at: null,
        },
        new Date("2026-03-16T08:30:00.000Z")
      )
    ).toBe(true);
  });

  it("does not treat already published release as due", () => {
    expect(
      isScheduledReleaseDue(
        {
          slug: "release-1",
          scheduled_publish_at: "2026-03-16T08:00:00.000Z",
          scheduled_target: "both",
          scheduled_published_at: "2026-03-16T08:05:00.000Z",
        },
        new Date("2026-03-16T08:30:00.000Z")
      )
    ).toBe(false);
  });

  it("fulfills both target only when both paths are done or skipped", () => {
    expect(
      isScheduledReleaseFulfilled("both", {
        sentToBot: false,
        sentToChannel: true,
        skippedBot: true,
        skippedChannel: false,
      })
    ).toBe(true);
  });

  it("does not fulfill channel target when channel delivery failed", () => {
    expect(
      isScheduledReleaseFulfilled("channel", {
        sentToBot: true,
        sentToChannel: false,
        skippedBot: false,
        skippedChannel: false,
      })
    ).toBe(false);
  });
});
