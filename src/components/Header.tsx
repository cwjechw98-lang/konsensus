import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          Konsensus
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm hover:underline underline-offset-4"
              >
                Мои споры
              </Link>
              <Link
                href="/profile"
                className="text-sm hover:underline underline-offset-4"
              >
                Профиль
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm text-gray-500 hover:text-foreground"
                >
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm hover:underline underline-offset-4"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="text-sm bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90"
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
