import Link from "next/link";
import { getTelegramBotLink, getTelegramBotUsername } from "@/lib/site-config";

export function Footer() {
  const botLink = getTelegramBotLink();
  const botUsername = getTelegramBotUsername();

  return (
    <footer className="border-t border-white/8 bg-black/20">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Konsensus</p>
          <p className="text-xs text-gray-500 mt-1">
            Спор это не война. Это возможность договориться.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400 md:hidden">
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
                Telegram
              </Link>
            )}
          </div>

          <div className="hidden flex-wrap items-center gap-4 text-sm text-gray-400 md:flex">
            <Link href="/feed" className="hover:text-white transition-colors">
              События
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Споры
            </Link>
            <Link href="/arena" className="hover:text-white transition-colors">
              Диспуты
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
          {botLink && (
            <p className="hidden text-[11px] text-gray-600 md:block">
              {botUsername ? `Бот: @${botUsername}` : "Telegram-бот подключён"}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
