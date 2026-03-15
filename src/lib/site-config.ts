const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://konsensus-six.vercel.app";

const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || "";
const TELEGRAM_RELEASE_CHANNEL_ID = process.env.TELEGRAM_RELEASE_CHANNEL_ID || "";

export const SUPPORT_LINKS = {
  boosty: process.env.NEXT_PUBLIC_SUPPORT_BOOSTY_URL || "",
  crypto: process.env.NEXT_PUBLIC_SUPPORT_CRYPTO_URL || "",
  alternative: process.env.NEXT_PUBLIC_SUPPORT_ALT_URL || "",
};

export const SUPPORT_GOALS = [
  "Более сильная reasoning-модель для медиации и тяжёлых кейсов",
  "Запас по Supabase/Vercel и будущему росту нагрузки",
  "Спокойный выпуск новых UX-фич без экономии на инфраструктуре",
];

export function getAppBaseUrl() {
  return APP_URL;
}

export function getTelegramBotUsername() {
  return TELEGRAM_BOT_USERNAME;
}

export function getTelegramBotLink(startApp = "auth") {
  if (!TELEGRAM_BOT_USERNAME) return "";
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?startapp=${encodeURIComponent(startApp)}`;
}

export function getTelegramReleaseChannelId() {
  return TELEGRAM_RELEASE_CHANNEL_ID;
}

export function hasSupportLinks() {
  return Boolean(
    SUPPORT_LINKS.boosty || SUPPORT_LINKS.crypto || SUPPORT_LINKS.alternative
  );
}
