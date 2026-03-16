import type { DisputeStatus } from "@/types/database";

export const REMINDER_LIMIT_PER_HOUR = 3;
export const REMINDER_LIMIT_PER_DAY = 15;

export type ReminderSuppressedReason =
  | "muted_after_rearchive"
  | "telegram_delivery_failed"
  | "recipient_active_notified"
  | "recipient_active_no_telegram"
  | "no_telegram_chat"
  | null;

export type ReminderRecipientState = {
  isArchived: boolean;
  reminderNotificationsMuted: boolean;
  pendingReminderCount: number | null;
};

export function withMessage(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}message=${encodeURIComponent(message)}`;
}

export function getReminderLimitError(hourCount: number, dayCount: number) {
  if (hourCount >= REMINDER_LIMIT_PER_HOUR) {
    return "Лимит напоминаний исчерпан: не больше 3 напоминаний в час по одному спору.";
  }

  if (dayCount >= REMINDER_LIMIT_PER_DAY) {
    return "Лимит напоминаний исчерпан: не больше 15 напоминаний в сутки по одному спору.";
  }

  return null;
}

export function getReminderEligibilityError(input: {
  status: DisputeStatus;
  hasOpponent: boolean;
  isParticipant: boolean;
  myArgCount: number;
  opponentArgCount: number;
}) {
  if (!input.isParticipant) {
    return "Нет доступа к этому спору";
  }

  if (input.status !== "in_progress" || !input.hasOpponent) {
    return "Напоминание доступно только для активного спора с оппонентом.";
  }

  if (input.myArgCount <= input.opponentArgCount) {
    return "Напоминание можно отправить только когда сейчас ждут ответ оппонента.";
  }

  return null;
}

export function getMutedPendingReminderCount(currentCount: number | null | undefined) {
  return Math.min((currentCount ?? 0) + 1, REMINDER_LIMIT_PER_DAY);
}

export function getReminderRedirectMessage(input: {
  recipientState: ReminderRecipientState | null;
  deliveredViaTelegram: boolean;
  suppressedReason: ReminderSuppressedReason;
  successMessage: string;
}) {
  if (input.recipientState?.isArchived && input.recipientState.reminderNotificationsMuted) {
    return "Напоминание зафиксировано в архиве. Telegram больше не беспокоит оппонента по этому спору.";
  }

  if (!input.deliveredViaTelegram && input.suppressedReason === "telegram_delivery_failed") {
    return "Не удалось отправить Telegram-напоминание. Попробуйте ещё раз позже.";
  }

  if (!input.deliveredViaTelegram && input.suppressedReason === "recipient_active_no_telegram") {
    return "У оппонента не подключён Telegram, поэтому bell-напоминание недоступно.";
  }

  if (!input.deliveredViaTelegram && input.suppressedReason === "no_telegram_chat") {
    return "У оппонента не подключён Telegram, поэтому спор только отмечен как ожидающий ответа.";
  }

  return input.successMessage;
}
