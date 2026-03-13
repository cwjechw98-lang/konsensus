import Link from "next/link";
import { joinDispute } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Загружаем данные спора публично (без авторизации) для красивого превью
  type DisputePreview = {
    id: string;
    title: string;
    description: string | null;
    creator_id: string;
    status: string;
    max_rounds: number;
  };
  let dispute: DisputePreview | null = null;
  let creatorName = "Участник";

  if (code) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("disputes")
      .select("id, title, description, creator_id, status, max_rounds")
      .eq("invite_code", code.toLowerCase().trim())
      .single<DisputePreview>();

    if (data) {
      dispute = data;
      const { data: profile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", data.creator_id)
        .single<{ display_name: string | null }>();
      creatorName = profile?.display_name ?? "Участник";
    }
  }

  // Если спор не найден
  if (code && !dispute) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-white mb-2">Ссылка недействительна</h1>
          <p className="text-gray-500 text-sm mb-6">Спор не найден или ссылка устарела.</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  // Если есть спор — показываем красивую страницу вызова
  if (dispute) {
    const isAlreadyClosed = dispute.status !== "open";

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">

          {/* Метка платформы */}
          <div className="text-center mb-8">
            <span className="text-xs text-purple-400/70 tracking-[0.3em] uppercase font-medium">
              Konsensus · Платформа разрешения споров
            </span>
          </div>

          {/* Главный блок вызова */}
          <div className="glass rounded-3xl overflow-hidden">
            {/* Шапка с градиентом */}
            <div className="bg-gradient-to-br from-purple-900/40 via-violet-900/20 to-transparent px-8 pt-8 pb-6 border-b border-white/5">
              <p className="text-xs text-purple-400 font-semibold tracking-widest uppercase mb-3">
                ⚔ Вас вызывают на диспут
              </p>
              <h1 className="text-2xl font-bold text-white leading-snug mb-3">
                {dispute.title}
              </h1>
              {dispute.description && (
                <p className="text-gray-400 text-sm leading-relaxed">
                  {dispute.description}
                </p>
              )}
            </div>

            {/* Детали */}
            <div className="px-8 py-5 border-b border-white/5 flex gap-6 flex-wrap">
              <div>
                <span className="text-xs text-gray-600 block mb-1">Инициатор</span>
                <span className="text-sm font-semibold text-white">{creatorName}</span>
              </div>
              <div>
                <span className="text-xs text-gray-600 block mb-1">Раундов</span>
                <span className="text-sm font-semibold text-white">{dispute.max_rounds}</span>
              </div>
              <div>
                <span className="text-xs text-gray-600 block mb-1">Статус</span>
                <span className="text-sm font-semibold text-green-400">Ожидает вас</span>
              </div>
            </div>

            {/* CTA блок */}
            <div className="px-8 py-6">
              {isAlreadyClosed ? (
                <div className="text-center py-4">
                  <p className="text-yellow-400 text-sm font-medium mb-1">Этот спор уже закрыт</p>
                  <p className="text-gray-600 text-xs">Оппонент уже принял участие.</p>
                </div>
              ) : user ? (
                /* Залогинен — сразу присоединяемся */
                <form action={joinDispute} className="flex flex-col gap-3">
                  <input type="hidden" name="code" value={code} />
                  <button
                    type="submit"
                    className="btn-ripple w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-semibold transition-colors text-sm"
                  >
                    Принять вызов →
                  </button>
                  <p className="text-xs text-center text-gray-600">
                    Вы войдёте как <span className="text-gray-400">{user.email}</span>
                  </p>
                </form>
              ) : (
                /* Не залогинен — варианты */
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-gray-400 text-center mb-1">
                    Как вы хотите участвовать?
                  </p>

                  <Link
                    href={`/login?redirect=/dispute/join?code=${code}`}
                    className="btn-ripple w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-semibold transition-colors text-sm text-center"
                  >
                    Войти в аккаунт
                  </Link>

                  <Link
                    href={`/register?redirect=/dispute/join?code=${code}`}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold transition-colors text-sm text-center border border-white/10"
                  >
                    Создать аккаунт
                  </Link>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-xs text-gray-600">или</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>

                  <GuestJoinButton code={code!} />

                  <p className="text-xs text-gray-600 text-center mt-1">
                    Гостевой режим — временная сессия. Создайте аккаунт позже, чтобы сохранить историю.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Подвал с описанием платформы */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600 leading-relaxed">
              Konsensus — нейтральная платформа для конструктивных споров.<br />
              ИИ-медиатор анализирует аргументы и предлагает решения.
            </p>
            <Link href="/" className="text-xs text-purple-500/60 hover:text-purple-400 mt-2 inline-block">
              Узнать больше
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // Без кода — стандартная форма ввода кода
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-2xl font-bold text-white mb-2">
            Присоединиться к спору
          </h1>
          <p className="text-sm text-gray-500">Введите инвайт-код</p>
        </div>

        <div className="glass rounded-2xl p-8">
          {user ? (
            <form action={joinDispute} className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-300">Инвайт-код</span>
                <input
                  name="code"
                  type="text"
                  required
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
            </form>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">Войдите, чтобы присоединиться к спору</p>
              <Link
                href="/login"
                className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors text-sm inline-block"
              >
                Войти
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
