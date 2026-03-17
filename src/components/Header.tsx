import Link from "next/link";
import { MobileMenu } from "./MobileMenu";
import TelegramAuthButton from "./TelegramAuthButton";
import { getTelegramBotLink } from "@/lib/site-config";

export function Header({ isLoggedIn, isAdmin }: { isLoggedIn: boolean; isAdmin?: boolean }) {
  const telegramLink = getTelegramBotLink();
  const logoHref = isLoggedIn ? "/?landing=1" : "/";

  return (
    <header className="glass fixed top-0 left-0 right-0 z-50 border-b border-white/8">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href={logoHref}
          className="text-lg font-bold gradient-text logo-pulse select-none"
        >
          Konsensus
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-5" aria-label="Основная навигация">
          <Link href="/feed" className="text-sm text-gray-400 hover:text-white nav-link transition-colors">
            События
          </Link>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white nav-link transition-colors">
                Споры
              </Link>
              <Link href="/matchmaking" className="text-sm text-gray-400 hover:text-white nav-link transition-colors">
                Открытые
              </Link>
              <Link href="/arena" className="text-sm text-gray-400 hover:text-white nav-link transition-colors">
                Диспуты
              </Link>
              <Link href="/profile" className="text-sm text-gray-400 hover:text-white nav-link transition-colors">
                Профиль
              </Link>
              {isAdmin ? (
                <Link href="/ops" className="text-sm text-cyan-300 hover:text-cyan-100 nav-link transition-colors">
                  Ops
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <TelegramAuthButton compact />
              <Link href="/login" className="text-sm text-gray-400 hover:text-white nav-link transition-colors">
                Войти
              </Link>
              <Link href="/register" className="btn-ripple text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-md font-medium transition-colors">
                Регистрация
              </Link>
            </>
          )}
          </nav>
          <Link
            href="/support"
            className="rounded-full border border-amber-500/20 bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/20"
          >
            Поддержать
          </Link>
          {isLoggedIn && (
            <>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Выйти
                </button>
              </form>
            </>
          )}
        </div>

        {/* Mobile overflow */}
        <MobileMenu isLoggedIn={isLoggedIn} isAdmin={Boolean(isAdmin)} telegramLink={telegramLink} logoHref={logoHref} />
      </div>
    </header>
  );
}
