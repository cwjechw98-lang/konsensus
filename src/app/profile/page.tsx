import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { updateProfile, generateTelegramToken, disconnectTelegram } from "./actions";
import { ACHIEVEMENTS } from "@/lib/achievements";
import AnimatedCounter from "@/components/AnimatedCounter";
import RPGProfileCard from "@/components/RPGProfileCard";
import { fetchRPGStats } from "@/lib/rpg";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; tg_token?: string }>;
}) {
  const { error: errorMsg, success, tg_token } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  let totalPoints = 0;
  let earnedAchievements: { achievement_id: string; earned_at: string }[] = [];
  let disputeCount = 0;
  let argCount = 0;

  try {
    const [pointsRes, achievementsRes, disputesRes, argsRes] = await Promise.all([
      supabase.from("user_points").select("total").eq("user_id", user.id).single<{ total: number }>(),
      supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", user.id).returns<{ achievement_id: string; earned_at: string }[]>(),
      supabase.from("disputes").select("*", { count: "exact", head: true }).or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`),
      supabase.from("arguments").select("*", { count: "exact", head: true }).eq("author_id", user.id),
    ]);

    totalPoints = pointsRes.data?.total ?? 0;
    earnedAchievements = achievementsRes.data ?? [];
    disputeCount = disputesRes.count ?? 0;
    argCount = argsRes.count ?? 0;
  } catch { /* Tables not migrated yet */ }

  const rpgStats = await fetchRPGStats(user.id, supabase);

  const earnedMap = Object.fromEntries(earnedAchievements.map((a) => [a.achievement_id, a.earned_at]));
  const earnedIds = new Set(earnedAchievements.map((a) => a.achievement_id));

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-white mb-6">Профиль</h1>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
          {errorMsg}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg mb-4">
          Профиль обновлён
        </div>
      )}

      {/* ─── Points Banner — full width ─── */}
      <div className="relative glass rounded-2xl p-6 mb-5 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Очки опыта</p>
            <p className="text-5xl font-bold text-white mb-1">
              <AnimatedCounter target={totalPoints} />
            </p>
            <p className="text-xs text-purple-400">
              {earnedIds.size} из {Object.keys(ACHIEVEMENTS).length} достижений разблокировано
            </p>
          </div>
          {/* Stats inline on wide banner */}
          <div className="hidden sm:flex gap-6 flex-shrink-0">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{disputeCount}</p>
              <p className="text-xs text-gray-500 mt-1">Споров</p>
            </div>
            <div className="w-px bg-white/8 self-stretch" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{argCount}</p>
              <p className="text-xs text-gray-500 mt-1">Аргументов</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row — mobile only */}
      <div className="grid grid-cols-2 gap-4 mb-5 sm:hidden">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{disputeCount}</p>
          <p className="text-xs text-gray-500 mt-1">Споров</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{argCount}</p>
          <p className="text-xs text-gray-500 mt-1">Аргументов</p>
        </div>
      </div>

      {/* ─── Two-column layout on lg+ ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-5">

        {/* Left: account + edit */}
        <div className="flex flex-col gap-5">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Аккаунт</h2>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-xs text-gray-500">Email</span>
                <p className="text-sm font-medium text-white mt-0.5">{user.email}</p>
              </div>
              {createdAt && (
                <div>
                  <span className="text-xs text-gray-500">Зарегистрирован</span>
                  <p className="text-sm font-medium text-white mt-0.5" suppressHydrationWarning>{createdAt}</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Данные профиля</h2>
            <form action={updateProfile} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-300">Отображаемое имя</span>
                <input
                  name="display_name"
                  type="text"
                  required
                  defaultValue={profile?.display_name ?? ""}
                  className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="Как вас называть"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-300">О себе</span>
                <textarea
                  name="bio"
                  rows={3}
                  maxLength={500}
                  defaultValue={profile?.bio ?? ""}
                  className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none text-sm"
                  placeholder="Расскажите о себе (покажется в RPG-карточке)"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-300">Кредо в спорах</span>
                <input
                  name="debate_stance"
                  type="text"
                  maxLength={200}
                  defaultValue={profile?.debate_stance ?? ""}
                  className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                  placeholder="Я спорю, потому что..."
                />
              </label>
              <button
                type="submit"
                className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-2.5 font-semibold transition-colors"
              >
                Сохранить
              </button>
            </form>
          </div>

          {/* RPG Profile Card */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">RPG-профиль</h2>
            <RPGProfileCard
              stats={rpgStats}
              displayName={profile?.display_name ?? user.email ?? "Игрок"}
              bio={profile?.bio}
            />
          </div>

          {/* Telegram Notifications */}
          {(() => {
            const botUsername = process.env.TELEGRAM_BOT_USERNAME;
            const botUrl = botUsername ? `https://t.me/${botUsername}` : null;
            const deepLink = botUsername && tg_token ? `https://t.me/${botUsername}?start=${tg_token}` : null;

            return (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Telegram-уведомления</h2>

                {profile?.telegram_chat_id ? (
                  /* ── Connected ── */
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-lg">✅</span>
                      <p className="text-sm text-green-400 font-medium">Telegram подключён</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Уведомления о спорах, вызовах и медиации приходят в Telegram.
                    </p>
                    {botUrl && (
                      <a
                        href={botUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg py-2 px-4 text-sm font-semibold transition-colors w-fit"
                      >
                        Открыть бот →
                      </a>
                    )}
                    <form action={disconnectTelegram}>
                      <button type="submit" className="text-xs text-gray-600 hover:text-red-400 transition-colors underline mt-1">
                        Отключить
                      </button>
                    </form>
                  </div>

                ) : tg_token ? (
                  /* ── Token generated — open Telegram ── */
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-gray-400">Код для привязки сгенерирован:</p>
                    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-purple-300 text-base tracking-widest select-all">
                      {tg_token}
                    </div>
                    {deepLink ? (
                      <a
                        href={deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg py-2.5 px-4 text-sm font-semibold transition-colors w-fit"
                      >
                        Открыть Telegram и привязать →
                      </a>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Отправьте боту: <span className="font-mono text-purple-400">{tg_token}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-600">
                      Если Telegram не открылся — скопируйте код и вставьте его в бот вручную.
                    </p>
                  </div>

                ) : (
                  /* ── Not connected ── */
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-gray-500">
                      Получайте пуш-уведомления о новых аргументах, вызовах и медиации прямо в Telegram.
                    </p>
                    <form action={generateTelegramToken}>
                      <button
                        type="submit"
                        className="btn-ripple bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg py-2 px-4 text-sm font-semibold transition-colors"
                      >
                        Подключить Telegram
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Right: achievements */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Достижения</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(ACHIEVEMENTS).map(([id, ach]) => {
              const earned = earnedIds.has(id);
              const earnedAt = earnedMap[id];
              return (
                <div
                  key={id}
                  className={`rounded-xl p-3 transition-all ${
                    earned
                      ? "bg-purple-500/10 border border-purple-500/25"
                      : "bg-white/2 border border-white/5 opacity-45"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl leading-none mt-0.5">{ach.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${earned ? "text-white" : "text-gray-500"}`}>
                        {ach.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{ach.desc}</p>
                      {earned ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-purple-400 font-semibold">+{ach.points} очков</span>
                          {earnedAt && (
                            <span className="text-xs text-gray-600" suppressHydrationWarning>{formatDate(earnedAt)}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600 mt-1">{ach.points} очков</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
