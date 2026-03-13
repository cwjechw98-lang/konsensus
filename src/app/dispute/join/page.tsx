import Link from "next/link";
import { joinDispute } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import GuestJoinButton from "@/components/GuestJoinButton";

export default async function JoinDisputePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-2xl font-bold text-white mb-2">
            Присоединиться к спору
          </h1>
          {code ? (
            <p className="text-sm text-green-400">
              Вас пригласили. Нажмите «Присоединиться».
            </p>
          ) : (
            <p className="text-sm text-gray-500">Введите инвайт-код</p>
          )}
        </div>

        <div className="glass rounded-2xl p-8">
          {user ? (
            /* Залогинен — стандартная форма */
            <form action={joinDispute} className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-300">
                  Инвайт-код
                </span>
                <input
                  name="code"
                  type="text"
                  required
                  defaultValue={code ?? ""}
                  className="border border-white/10 bg-white/5 rounded-lg px-3 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors text-center font-mono text-lg tracking-widest"
                  placeholder="abc123def456"
                />
              </label>

              <button
                type="submit"
                className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
              >
                Присоединиться
              </button>

              <Link
                href="/dashboard"
                className="text-sm text-center text-gray-500 hover:text-gray-300 transition-colors"
              >
                Назад к моим спорам
              </Link>
            </form>
          ) : (
            /* Не залогинен — показываем варианты */
            <div className="flex flex-col gap-5">
              {code && (
                <div className="bg-white/5 border border-white/8 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Код приглашения</p>
                  <p className="font-mono text-white font-semibold tracking-widest">
                    {code}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Link
                  href={`/login?redirect=/dispute/join${code ? `?code=${code}` : ""}`}
                  className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg font-semibold transition-colors text-sm text-center"
                >
                  Войти в аккаунт
                </Link>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-xs text-gray-600">или</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                {/* Гостевой вход — клиентский компонент */}
                <GuestJoinButton code={code ?? ""} />
              </div>

              <p className="text-xs text-gray-600 text-center">
                <Link
                  href="/register"
                  className="text-purple-500 hover:text-purple-400"
                >
                  Зарегистрироваться
                </Link>
                {" · "}
                <Link
                  href="/"
                  className="hover:text-gray-400 transition-colors"
                >
                  На главную
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
