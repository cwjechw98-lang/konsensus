import Link from "next/link";
import { SUPPORT_LINKS, getTelegramBotLink, getTelegramBotUsername, hasSupportLinks } from "@/lib/site-config";

export function Footer() {
  const botLink = getTelegramBotLink();
  const botUsername = getTelegramBotUsername();
  const supportVisible = hasSupportLinks();

  return (
    <footer className="border-t border-white/8 bg-black/20">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Konsensus</p>
          <p className="text-xs text-gray-500 mt-1">
            Спор это не война. Это возможность договориться.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <Link href="/feed" className="hover:text-white transition-colors">
            События
          </Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Споры
          </Link>
          <Link href="/arena" className="hover:text-white transition-colors">
            Арена
          </Link>
          <Link href="/matchmaking" className="hover:text-white transition-colors">
            Открытые
          </Link>
          <Link href="/support" className="hover:text-white transition-colors">
            Поддержать проект
          </Link>
          {botLink && (
            <Link
              href={botLink}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Telegram {botUsername ? `@${botUsername}` : ""}
            </Link>
          )}
        </div>

        {supportVisible && (
          <div className="flex flex-wrap gap-2">
            {SUPPORT_LINKS.boosty && (
              <Link
                href={SUPPORT_LINKS.boosty}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-500/15"
              >
                Boosty
              </Link>
            )}
            {SUPPORT_LINKS.crypto && (
              <Link
                href={SUPPORT_LINKS.crypto}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 transition-colors hover:bg-emerald-500/15"
              >
                Crypto
              </Link>
            )}
            {SUPPORT_LINKS.alternative && (
              <Link
                href={SUPPORT_LINKS.alternative}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 transition-colors hover:bg-violet-500/15"
              >
                Поддержка
              </Link>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
