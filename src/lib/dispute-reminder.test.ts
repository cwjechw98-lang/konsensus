import { describe, expect, it } from "vitest";

import {
  getMutedPendingReminderCount,
  getReminderEligibilityError,
  getReminderLimitError,
  getReminderRedirectMessage,
  REMINDER_LIMIT_PER_DAY,
  withMessage,
} from "@/lib/dispute-reminder";

describe("dispute reminder policy", () => {
  it("appends message param to clean path", () => {
    expect(withMessage("/dispute/1", "test message")).toBe(
      "/dispute/1?message=test%20message"
    );
  });

  it("appends message param to existing query string", () => {
    expect(withMessage("/dispute/1?foo=bar", "test message")).toBe(
      "/dispute/1?foo=bar&message=test%20message"
    );
  });

  it("blocks reminder when user is not participant", () => {
    expect(
      getReminderEligibilityError({
        status: "in_progress",
        hasOpponent: true,
        isParticipant: false,
        myArgCount: 2,
        opponentArgCount: 1,
      })
    ).toBe("Нет доступа к этому спору");
  });

  it("blocks reminder when dispute is not actively waiting on opponent", () => {
    expect(
      getReminderEligibilityError({
        status: "open",
        hasOpponent: false,
        isParticipant: true,
        myArgCount: 1,
        opponentArgCount: 0,
      })
    ).toBe("Напоминание доступно только для активного спора с оппонентом.");
  });

  it("blocks reminder when sender is not currently waiting for opponent", () => {
    expect(
      getReminderEligibilityError({
        status: "in_progress",
        hasOpponent: true,
        isParticipant: true,
        myArgCount: 1,
        opponentArgCount: 1,
      })
    ).toBe("Напоминание можно отправить только когда сейчас ждут ответ оппонента.");
  });

  it("allows reminder when sender is ahead by one round", () => {
    expect(
      getReminderEligibilityError({
        status: "in_progress",
        hasOpponent: true,
        isParticipant: true,
        myArgCount: 2,
        opponentArgCount: 1,
      })
    ).toBeNull();
  });

  it("returns hourly limit message first", () => {
    expect(getReminderLimitError(3, 15)).toBe(
      "Лимит напоминаний исчерпан: не больше 3 напоминаний в час по одному спору."
    );
  });

  it("returns daily limit message when hourly limit is clear", () => {
    expect(getReminderLimitError(2, 15)).toBe(
      "Лимит напоминаний исчерпан: не больше 15 напоминаний в сутки по одному спору."
    );
  });

  it("caps muted pending reminders by daily limit", () => {
    expect(getMutedPendingReminderCount(REMINDER_LIMIT_PER_DAY)).toBe(
      REMINDER_LIMIT_PER_DAY
    );
  });

  it("returns archive message for muted archived recipient", () => {
    expect(
      getReminderRedirectMessage({
        recipientState: {
          isArchived: true,
          reminderNotificationsMuted: true,
          pendingReminderCount: 4,
        },
        deliveredViaTelegram: false,
        suppressedReason: "muted_after_rearchive",
        successMessage: "ok",
      })
    ).toBe(
      "Напоминание зафиксировано в архиве. Telegram больше не беспокоит оппонента по этому спору."
    );
  });

  it("returns bell unavailable message for active recipient without telegram", () => {
    expect(
      getReminderRedirectMessage({
        recipientState: null,
        deliveredViaTelegram: false,
        suppressedReason: "recipient_active_no_telegram",
        successMessage: "ok",
      })
    ).toBe("У оппонента не подключён Telegram, поэтому bell-напоминание недоступно.");
  });

  it("returns success message when telegram delivery succeeded", () => {
    expect(
      getReminderRedirectMessage({
        recipientState: null,
        deliveredViaTelegram: true,
        suppressedReason: "recipient_active_notified",
        successMessage: "Напоминание отправлено в Telegram.",
      })
    ).toBe("Напоминание отправлено в Telegram.");
  });
});
