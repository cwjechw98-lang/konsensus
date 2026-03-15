import Link from "next/link";
import { getTelegramBotLink } from "@/lib/site-config";

export default function TelegramAuthButton({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const telegramLink = getTelegramBotLink();

  if (!telegramLink) return null;

  return (
    <Link
      href={telegramLink}
      target="_blank"
      rel="noreferrer"
      className={
        className ||
        `btn-ripple inline-flex items-center justify-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-200 transition-colors hover:bg-sky-500/15 ${
          compact ? "px-4 py-2 text-sm" : "px-4 py-2.5 text-sm font-medium"
        }`
      }
    >
      <span>✈️</span>
      <span>{compact ? "Telegram" : "Войти через Telegram"}</span>
    </Link>
  );
}
