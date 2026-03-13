import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { updateProfile } from "./actions";
import { ACHIEVEMENTS } from "@/lib/achievements";
import AnimatedCounter from "@/components/AnimatedCounter";

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
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error: errorMsg, success } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile
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

  // Fetch points + achievements + stats (graceful fallback before migration)
  let totalPoints = 0;
  let earnedAchievements: { achievement_id: string; earned_at: string }[] = [];
  let disputeCount = 0;
  let argCount = 0;

  try {
    const [pointsRes, achievementsRes, disputesRes, argsRes] = await Promise.all([
      supabase
        .from("user_points")
        .select("total")
        .eq("user_id", user.id)
        .single<{ total: number }>(),
      supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", user.id)
        .returns<{ achievement_id: string; earned_at: string }[]>(),
      supabase
        .from("disputes")
        .select("*", { count: "exact", head: true })
        .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`),
      supabase
        .from("arguments")
        .select("*", { count: "exact", head: true })
        .eq("author_id", user.id),
    ]);

    totalPoints = pointsRes.data?.total ?? 0;
    earnedAchievements = achievementsRes.data ?? [];
    disputeCount = disputesRes.count ?? 0;
    argCount = argsRes.count ?? 0;
  } catch {
    // Tables not migrated yet — show zeros
  }

  const earnedMap = Object.fromEntries(
    earnedAchievements.map((a) => [a.achievement_id, a.earned_at])
  );
  const earnedIds = new Set(earnedAchievements.map((a) => a.achievement_id));

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
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

      {/* Points Banner */}
      <div className="relative glass rounded-2xl p-6 mb-5 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Очки опыта</p>
          <p className="text-5xl font-bold text-white mb-1">
            <AnimatedCounter target={totalPoints} />
          </p>
          <p className="text-xs text-purple-400">
            {earnedIds.size} из {Object.keys(ACHIEVEMENTS).length} достижений разблокировано
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{disputeCount}</p>
          <p className="text-xs text-gray-500 mt-1">Споров</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{argCount}</p>
          <p className="text-xs text-gray-500 mt-1">Аргументов</p>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="glass rounded-2xl p-6 mb-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Достижения
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                          <span className="text-xs text-gray-600">{formatDate(earnedAt)}</span>
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

      {/* Account info */}
      <div className="glass rounded-2xl p-6 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Аккаунт
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-xs text-gray-500">Email</span>
            <p className="text-sm font-medium text-white mt-0.5">
              {user.email}
            </p>
          </div>
          {createdAt && (
            <div>
              <span className="text-xs text-gray-500">Зарегистрирован</span>
              <p className="text-sm font-medium text-white mt-0.5">
                {createdAt}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit profile */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Данные профиля
        </h2>
        <form action={updateProfile} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">
              Отображаемое имя
            </span>
            <input
              name="display_name"
              type="text"
              required
              defaultValue={profile?.display_name ?? ""}
              className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="Как вас называть"
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
    </div>
  );
}
