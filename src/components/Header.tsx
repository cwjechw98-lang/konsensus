import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="glass fixed top-0 left-0 right-0 z-50 border-b border-white/8">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-bold gradient-text logo-pulse select-none"
        >
          Konsensus
        </Link>

        <nav className="flex items-center gap-5">
          <Link
            href="/feed"
            className="text-sm text-gray-400 hover:text-white nav-link transition-colors"
          >
            Лента
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-gray-400 hover:text-white nav-link transition-colors"
              >
                Мои споры
              </Link>
              <Link
                href="/arena"
                className="text-sm text-gray-400 hover:text-white nav-link transition-colors"
              >
                Арена ⚔️
              </Link>
              <Link
                href="/profile"
                className="text-sm text-gray-400 hover:text-white nav-link transition-colors"
              >
                Профиль
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-white nav-link transition-colors"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="btn-ripple text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-md font-medium transition-colors"
              >
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
