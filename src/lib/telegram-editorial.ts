export type TelegramMembershipStatus =
  | "creator"
  | "administrator"
  | "member"
  | "restricted"
  | "left"
  | "kicked"
  | "unknown";

export function normalizeTelegramMembershipStatus(
  status: string | null | undefined
): TelegramMembershipStatus {
  switch (status) {
    case "creator":
    case "administrator":
    case "member":
    case "restricted":
    case "left":
    case "kicked":
      return status;
    default:
      return "unknown";
  }
}

export function isTelegramMembershipActive(status: TelegramMembershipStatus) {
  return (
    status === "creator" ||
    status === "administrator" ||
    status === "member" ||
    status === "restricted"
  );
}

export function shouldSuppressBotReleaseTeaser(status: TelegramMembershipStatus) {
  return isTelegramMembershipActive(status);
}
