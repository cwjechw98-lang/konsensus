import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { updateProfile, disconnectTelegram } from "./actions";
import { TelegramConnect } from "@/components/TelegramConnect";
import { ACHIEVEMENTS, CATEGORY_LABELS, type AchievementCategory } from "@/lib/achievements";
import AnimatedCounter from "@/components/AnimatedCounter";
import RPGProfileCard from "@/components/RPGProfileCard";
import PageContextCard from "@/components/PageContextCard";
import { OnboardingTour } from "@/components/OnboardingTour";
import SubmitButton from "@/components/SubmitButton";
import { fetchRPGStats } from "@/lib/rpg";
import { fetchAIProfile, fetchCounterparts, getStyleInfo, getReactionInfo } from "@/lib/ai-profile";
import ProfileQuestPanel, { type ProfileQuestRunSummary } from "@/components/ProfileQuestPanel";
import PublicReputationBadges from "@/components/PublicReputationBadges";
import { fetchPublicReputationBadges } from "@/lib/reputation";
import EducationRecommendationsPanel from "@/components/EducationRecommendationsPanel";
import TrustTierCard from "@/components/TrustTierCard";
import { fetchTrustTierState } from "@/lib/trust-tier";
import AppealComposer from "@/components/AppealComposer";
import AppealModerationQueue from "@/components/AppealModerationQueue";
import {
  fetchAppealModerationQueue,
  fetchUserAppeals,
} from "@/lib/appeals";
import {
  buildLatestAppealMap,
  getAppealEffectiveNotes,
  getLatestAppealForItem,
  isAppealHidden,
  sortBadgesWithAppeals,
} from "@/lib/appeal-helpers";
import { isKonsensusAdminEmail } from "@/lib/site-config";
import { fetchEditorialDeliveryReports } from "@/lib/editorial-reporting";
import EditorialDeliveryPanel from "@/components/EditorialDeliveryPanel";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UniqueAchievement = Database["public"]["Tables"]["user_unique_achievements"]["Row"];
type ProfileQuestRunQueryRow = {
  id: string;
  quest_key: string;
  status: string;
  current_step: number;
  responses: Database["public"]["Tables"]["profile_quest_runs"]["Row"]["responses"];
  completed_at: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{value}%</span>
    </div>
  );
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; tab?: string }>;
}) {
  const { error: errorMsg, success, tab } = await searchParams;
  const activeTab = tab ?? "overview";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const isAdminUser = isKonsensusAdminEmail(user.email);

  const questRunsPromise = (async () => {
    const result = await supabase
      .from("profile_quest_runs")
      .select("id, quest_key, status, current_step, responses, completed_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<ProfileQuestRunQueryRow[]>();

    return result.error
      ? { data: [] as ProfileQuestRunQueryRow[] }
      : { data: result.data ?? [] };
  })();

  // Parallel data fetch
  const [
    pointsRes,
    achievementsRes,
    uniqueAchievementsRes,
    disputesRes,
    argsRes,
    rpgStats,
    aiProfile,
    counterparts,
    questRunsRes,
    reputationBadges,
    appealableBadges,
    trustTierState,
    appeals,
    moderationQueue,
    editorialReports,
  ] = await Promise.all([
    supabase.from("user_points").select("total").eq("user_id", user.id).single<{ total: number }>(),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", user.id).returns<{ achievement_id: string; earned_at: string }[]>(),
    supabase.from("user_unique_achievements").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).returns<UniqueAchievement[]>(),
    supabase.from("disputes").select("id, status, category", { count: "exact" }).or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`).returns<{ id: string; status: string; category: string | null }[]>(),
    supabase.from("arguments").select("*", { count: "exact", head: true }).eq("author_id", user.id),
    fetchRPGStats(user.id, supabase),
    fetchAIProfile(user.id).catch(() => null),
    fetchCounterparts(user.id).catch(() => []),
    questRunsPromise,
    fetchPublicReputationBadges(user.id).catch(() => []),
    fetchPublicReputationBadges(user.id, { includeHidden: true }).catch(() => []),
    fetchTrustTierState(user.id).catch(() => null),
    fetchUserAppeals(user.id).catch(() => []),
    isAdminUser ? fetchAppealModerationQueue().catch(() => []) : Promise.resolve([]),
    isAdminUser
      ? fetchEditorialDeliveryReports().catch(() => ({ queued: [], recent: [] }))
      : Promise.resolve({ queued: [], recent: [] }),
  ]);

  const totalPoints = pointsRes.data?.total ?? 0;
  const earnedAchievements = achievementsRes.data ?? [];
  const uniqueAchievements = uniqueAchievementsRes.data ?? [];
  const allDisputes = disputesRes.data ?? [];
  const disputeCount = disputesRes.count ?? 0;
  const argCount = argsRes.count ?? 0;

  const resolvedCount = allDisputes.filter((d) => d.status === "resolved").length;
  const consensusRate = disputeCount > 0 ? Math.round((resolvedCount / disputeCount) * 100) : 0;
  const profileQuestRuns: ProfileQuestRunSummary[] = (questRunsRes.data ?? []).map((run) => ({
    id: run.id,
    questKey: run.quest_key,
    status: run.status,
    currentStep: run.current_step,
    responses: Array.isArray(run.responses)
      ? run.responses.filter((item): item is string => typeof item === "string")
      : [],
    completedAt: run.completed_at,
  }));

  // Category distribution
  const categoryMap: Record<string, number> = {};
  for (const d of allDisputes) {
    const cat = d.category ?? "other";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
  }

  const earnedMap = Object.fromEntries(earnedAchievements.map((a) => [a.achievement_id, a.earned_at]));
  const earnedIds = new Set(earnedAchievements.map((a) => a.achievement_id));
  const recentItems = [
    ...earnedAchievements.map((ea) => ({
      type: "standard" as const,
      created_at: ea.earned_at,
      title: ACHIEVEMENTS[ea.achievement_id as keyof typeof ACHIEVEMENTS]?.title ?? ea.achievement_id,
      desc: ACHIEVEMENTS[ea.achievement_id as keyof typeof ACHIEVEMENTS]?.desc ?? "",
      icon: ACHIEVEMENTS[ea.achievement_id as keyof typeof ACHIEVEMENTS]?.icon ?? "✨",
      points: ACHIEVEMENTS[ea.achievement_id as keyof typeof ACHIEVEMENTS]?.points ?? 0,
    })),
    ...uniqueAchievements.map((ua) => ({
      type: "unique" as const,
      created_at: ua.created_at,
      title: ua.title,
      desc: ua.description,
      icon: ua.icon,
      points: ua.points,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Group achievements by category
  const achievementsByCategory: Record<string, { id: string; ach: typeof ACHIEVEMENTS[keyof typeof ACHIEVEMENTS]; earned: boolean; earnedAt?: string }[]> = {};
  for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
    const cat = ach.category;
    if (!achievementsByCategory[cat]) achievementsByCategory[cat] = [];
    achievementsByCategory[cat].push({ id, ach, earned: earnedIds.has(id), earnedAt: earnedMap[id] });
  }

  const tabs = [
    { id: "overview", label: "Обзор", icon: "📊" },
    { id: "achievements", label: "Достижения", icon: "🏆" },
    { id: "ai-profile", label: "ИИ-профиль", icon: "🧠" },
    { id: "settings", label: "Настройки", icon: "⚙️" },
  ];

  const styleInfo = aiProfile ? await getStyleInfo(aiProfile.argumentation_style) : null;
  const reactionInfo = aiProfile ? await getReactionInfo(aiProfile.ai_hint_reaction) : null;
  const latestAppeals = buildLatestAppealMap(appeals);
  const aiSummaryAppeal = getLatestAppealForItem(latestAppeals, "ai_summary", "current");
  const isAiSummaryHidden = isAppealHidden(aiSummaryAppeal);
  const profileBadgeCards = sortBadgesWithAppeals(appealableBadges, latestAppeals);

  const categoryEmoji: Record<string, string> = {
    politics: "🏛", technology: "💻", philosophy: "🧠", lifestyle: "🏠",
    science: "🔬", culture: "🎭", economics: "💰", relationships: "💬", other: "📌",
  };
  const categoryLabels: Record<string, string> = {
    politics: "Политика", technology: "Технологии", philosophy: "Философия", lifestyle: "Быт",
    science: "Наука", culture: "Культура", economics: "Экономика", relationships: "Отношения", other: "Другое",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* ─── Header with name and XP ─── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{profile?.display_name ?? "Профиль"}</h1>
          {createdAt && <p className="text-xs text-gray-500 mt-1" suppressHydrationWarning>На платформе с {createdAt}</p>}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-white"><AnimatedCounter target={totalPoints} /></p>
          <p className="text-xs text-purple-400">XP</p>
        </div>
      </div>

      <div className="mb-6">
        <PageContextCard
          dataTour="profile-intro"
          eyebrow="Личный контур"
          title="Профиль собирает ваш след в Konsensus, а не просто анкету"
          description="Здесь сходятся прогресс, архив, достижения, ИИ-профиль и настройки связки с Telegram. Экран нужен, чтобы видеть свой путь, а не только редактировать имя."
          bullets={[
            "Обзор и быстрый срез прогресса",
            "Достижения и уникальные сигналы от ИИ",
            "AI-профиль, архив и настройки",
          ]}
          tone="amber"
          actions={
            <OnboardingTour
              page="profile"
              showReplayButton
              buttonLabel="Подсказки по профилю"
            />
          }
        />
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">{errorMsg}</div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg mb-4">Профиль обновлён</div>
      )}

      {/* ─── Quick Stats Row ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-tour="profile-stats">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{disputeCount}</p>
          <p className="text-xs text-gray-500">Споров</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{argCount}</p>
          <p className="text-xs text-gray-500">Аргументов</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{consensusRate}%</p>
          <p className="text-xs text-gray-500">Консенсус</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{earnedIds.size}/{Object.keys(ACHIEVEMENTS).length}</p>
          <p className="text-xs text-gray-500">Ачивок</p>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1" data-tour="profile-tabs">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`/profile${t.id === "overview" ? "" : `?tab=${t.id}`}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </a>
        ))}
      </div>

      {/* ─── Tab Content ─── */}

      {/* ────── OVERVIEW TAB ────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* RPG Card */}
          <RPGProfileCard
            stats={rpgStats}
            displayName={profile?.display_name ?? user.email ?? "Игрок"}
            bio={profile?.bio}
            reputationBadges={reputationBadges}
          />

          {trustTierState ? <TrustTierCard state={trustTierState} /> : null}

          {/* Category Distribution */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Темы споров</h2>
            {Object.keys(categoryMap).length === 0 ? (
              <p className="text-sm text-gray-500">Пока нет данных. Создайте первый спор!</p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(categoryMap)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-lg">{categoryEmoji[cat] ?? "📌"}</span>
                      <span className="text-sm text-gray-300 flex-1">{categoryLabels[cat] ?? cat}</span>
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(count / disputeCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Counterparts */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Контрагенты</h2>
            {counterparts.length === 0 ? (
              <p className="text-sm text-gray-500">Вы ещё ни с кем не спорили. Начните!</p>
            ) : (
              <div className="space-y-3">
                {counterparts.slice(0, 10).map((c) => (
                  <div key={c.counterpart_id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{c.display_name}</p>
                      <p className="text-xs text-gray-500">
                        {c.dispute_count} спор{c.dispute_count === 1 ? "" : c.dispute_count < 5 ? "а" : "ов"}
                        {c.consensus_count > 0 && ` · ${c.consensus_count} консенсус`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-600" suppressHydrationWarning>
                      {formatDate(c.last_dispute_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Achievements */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Последние достижения</h2>
            {recentItems.length === 0 ? (
              <p className="text-sm text-gray-500">Пока нет достижений. Начните спорить!</p>
            ) : (
              <div className="space-y-2.5">
                {recentItems.map((item, index) => (
                  <div key={`${item.type}-${item.title}-${index}`} className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                        {item.type === "unique" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <span className="text-xs text-purple-400 font-semibold">+{item.points}</span>
                  </div>
                ))}
              </div>
            )}
            <a href="/profile?tab=achievements" className="block text-center text-xs text-purple-400 mt-4 hover:underline">
              Все достижения →
            </a>
          </div>
        </div>
      )}

      {/* ────── ACHIEVEMENTS TAB ────── */}
      {activeTab === "achievements" && (
        <div className="space-y-6">
          {uniqueAchievements.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>✨</span>
                  Уникальные от ИИ
                </h3>
                <span className="text-xs text-gray-500">{uniqueAchievements.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uniqueAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="rounded-xl p-3 bg-purple-500/10 border border-purple-500/25"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl leading-none mt-0.5">{achievement.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {achievement.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                          {achievement.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-purple-400 font-semibold">
                            +{achievement.points}
                          </span>
                          <span className="text-xs text-gray-600" suppressHydrationWarning>
                            {formatDate(achievement.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">Общий прогресс</span>
              <span className="text-sm text-purple-400 font-bold">{earnedIds.size}/{Object.keys(ACHIEVEMENTS).length}</span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-1000"
                style={{ width: `${(earnedIds.size / Object.keys(ACHIEVEMENTS).length) * 100}%` }}
              />
            </div>
          </div>

          {/* By category */}
          {(Object.keys(CATEGORY_LABELS) as AchievementCategory[]).map((cat) => {
            const items = achievementsByCategory[cat] ?? [];
            if (items.length === 0) return null;
            const catInfo = CATEGORY_LABELS[cat];
            const earned = items.filter((i) => i.earned).length;
            return (
              <div key={cat} className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{catInfo.icon}</span>
                    {catInfo.label}
                  </h3>
                  <span className="text-xs text-gray-500">{earned}/{items.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map(({ id, ach, earned: isEarned, earnedAt }) => (
                    <div
                      key={id}
                      className={`rounded-xl p-3 transition-all ${
                        isEarned
                          ? "bg-purple-500/10 border border-purple-500/25"
                          : "bg-white/2 border border-white/5 opacity-45"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl leading-none mt-0.5">{ach.icon}</span>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${isEarned ? "text-white" : "text-gray-500"}`}>
                            {ach.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-tight">{ach.desc}</p>
                          {isEarned ? (
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs text-purple-400 font-semibold">+{ach.points}</span>
                              {earnedAt && <span className="text-xs text-gray-600" suppressHydrationWarning>{formatDate(earnedAt)}</span>}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600 mt-1">{ach.points} очков</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────── AI PROFILE TAB ────── */}
      {activeTab === "ai-profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* AI Analysis */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              🧠 ИИ-анализ вашего стиля
            </h2>
            {aiProfile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3">
                  <span className="text-2xl">{styleInfo?.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{styleInfo?.label}</p>
                    <p className="text-xs text-gray-500">{styleInfo?.desc}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <StatBar label="Компромисс" value={aiProfile.compromise_tendency} color="bg-green-500" />
                  <StatBar label="Эмпатия" value={aiProfile.empathy_score} color="bg-blue-500" />
                  <StatBar label="Импульсивность" value={aiProfile.impulsivity} color="bg-orange-500" />
                  <StatBar label="Консенсус" value={aiProfile.consensus_rate} color="bg-purple-500" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 mt-4">
                  <span className="text-xl">{reactionInfo?.icon}</span>
                  <div>
                    <p className="text-xs text-gray-500">Реакция на подсказки ИИ</p>
                    <p className="text-sm font-medium text-white">{reactionInfo?.label}</p>
                  </div>
                  {aiProfile.hints_total > 0 && (
                    <span className="text-xs text-gray-500 ml-auto">
                      {aiProfile.hints_accepted}/{aiProfile.hints_total} принято
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl">🔮</span>
                <p className="text-sm text-gray-500 mt-3">
                  ИИ-профиль формируется автоматически по мере ваших споров.
                  <br />Начните спорить, чтобы увидеть анализ!
                </p>
              </div>
            )}
          </div>

          {/* AI Summary */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              📋 Резюме от ИИ
            </h2>
            {aiProfile?.ai_summary ? (
              <div className="space-y-4">
                {isAiSummaryHidden ? (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                    Этот AI-вывод скрыт после апелляции. История пересмотра сохранена ниже, а новый summary можно будет собрать на следующем витке развития блока.
                  </div>
                ) : (
                  <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                    {aiProfile.ai_summary}
                  </div>
                )}
                <AppealComposer
                  itemType="ai_summary"
                  itemKey="current"
                  title="AI-резюме профиля"
                  latestAppeal={aiSummaryAppeal}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl">📝</span>
                <p className="text-sm text-gray-500 mt-3">
                  После нескольких споров ИИ составит персональное резюме вашего стиля дебатирования.
                </p>
              </div>
            )}

            {/* Typical planes */}
            {aiProfile && aiProfile.typical_planes.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-gray-500 mb-2">Ваши типичные темы:</p>
                <div className="flex flex-wrap gap-2">
                  {aiProfile.typical_planes.map((plane) => (
                    <span key={plane} className="px-2.5 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {categoryEmoji[plane] ?? "📌"} {categoryLabels[plane] ?? plane}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              🏷 Публичные бейджи
            </h2>
            {profileBadgeCards.length > 0 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {profileBadgeCards.map((badge) => {
                    const badgeAppeal = getLatestAppealForItem(
                      latestAppeals,
                      "reputation_badge",
                      badge.key
                    );
                    const hidden = isAppealHidden(badgeAppeal);

                    return (
                      <div
                        key={badge.key}
                        className={`rounded-2xl border p-4 ${
                          hidden
                            ? "border-cyan-500/20 bg-cyan-500/[0.06]"
                            : "border-white/10 bg-white/[0.03]"
                        }`}
                      >
                        <div className="space-y-3">
                          <PublicReputationBadges badges={[badge]} title="Автовывод" />
                          {hidden ? (
                            <p className="text-sm text-cyan-100">
                              Этот бейдж скрыт из публичного слоя после апелляции.
                            </p>
                          ) : null}
                          <AppealComposer
                            itemType="reputation_badge"
                            itemKey={badge.key}
                            title={badge.label}
                            latestAppeal={badgeAppeal}
                            compact
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs leading-relaxed text-gray-500">
                  Это безопасный публичный слой репутации. Он показывает, как вы обычно ведёте диалог, но не выставляет общий балл и не вешает негативные ярлыки.
                </p>
                {reputationBadges.length === 0 ? (
                  <p className="text-xs leading-relaxed text-cyan-200">
                    Сейчас все публичные бейджи скрыты после апелляции. Внутри профиля история пересмотра остаётся видимой.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Когда накопится больше спорных сигналов, здесь появятся первые
                публичные стилевые бейджи.
              </p>
            )}
          </div>

          <div className="lg:col-span-2">
            <ProfileQuestPanel runs={profileQuestRuns} />
          </div>

          <div className="lg:col-span-2">
            <EducationRecommendationsPanel
              userId={user.id}
              title="Что добрать по навыкам"
              description="Материалы подбираются по AI-профилю, стилю споров и уже пройденным коротким квестам. Это не курс, а следующий точный шаг."
            />
          </div>

          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              🧾 История апелляций
            </h2>
            {appeals.length > 0 ? (
              <div className="space-y-3">
                {appeals.slice(0, 6).map((appeal) => (
                  <div
                    key={appeal.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{appeal.itemLabel}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {appeal.itemType === "ai_summary" ? "AI-резюме" : "Публичный бейдж"}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500" suppressHydrationWarning>
                        {formatDate(appeal.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-300">{appeal.appealText}</p>
                    {getAppealEffectiveNotes(appeal) ? (
                      <p className="mt-2 text-xs leading-relaxed text-gray-400">
                        {getAppealEffectiveNotes(appeal)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Когда вы оспорите автоматический вывод, история апелляций появится здесь.
              </p>
            )}
          </div>

          {isAdminUser ? (
            <div className="glass rounded-2xl p-6 lg:col-span-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                🛡 Очередь ручной модерации апелляций
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-gray-400">
                Здесь собираются кейсы, где автопересмотр оказался спорным: низкая уверенность
                или автоматическое скрытие вывода. Ручной override фиксируется поверх auto-review.
              </p>
              <AppealModerationQueue appeals={moderationQueue} />
            </div>
          ) : null}

          {isAdminUser ? (
            <div className="glass rounded-2xl p-6 lg:col-span-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                📣 Editorial delivery
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-gray-400">
                Последние релизы, их delivery-метрики по боту и каналу, а также очередь
                запланированных публикаций. Это admin-only ops-срез без отдельной CMS.
              </p>
              <EditorialDeliveryPanel
                queued={editorialReports.queued}
                recent={editorialReports.recent}
              />
            </div>
          ) : null}

          {/* How AI uses your profile */}
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              💡 Как ИИ использует ваш профиль
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/3">
                <span className="text-2xl">🎯</span>
                <p className="text-sm font-semibold text-white mt-2">Адаптивные подсказки</p>
                <p className="text-xs text-gray-500 mt-1">ИИ подстраивает тон и стиль подсказок под ваш характер</p>
              </div>
              <div className="p-4 rounded-xl bg-white/3">
                <span className="text-2xl">🔬</span>
                <p className="text-sm font-semibold text-white mt-2">Глубокий анализ</p>
                <p className="text-xs text-gray-500 mt-1">Медиатор учитывает профили обоих сторон для точного анализа</p>
              </div>
              <div className="p-4 rounded-xl bg-white/3">
                <span className="text-2xl">📈</span>
                <p className="text-sm font-semibold text-white mt-2">Рост навыков</p>
                <p className="text-xs text-gray-500 mt-1">Отслеживает вашу эволюцию как спорщика со временем</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────── SETTINGS TAB ────── */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Account info */}
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

          {/* Edit profile */}
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
                  placeholder="Расскажите о себе"
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
              <SubmitButton
                pendingText="Сохраняем..."
                className="btn-ripple rounded-lg bg-purple-600 py-2.5 font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Сохранить
              </SubmitButton>
            </form>
          </div>

          {/* Telegram */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Telegram-уведомления</h2>
            <TelegramConnect
              isConnected={!!profile?.telegram_chat_id}
              botUsername={process.env.TELEGRAM_BOT_USERNAME ?? null}
              onDisconnect={disconnectTelegram}
            />
          </div>

          {/* RPG Card */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">RPG-профиль</h2>
            <RPGProfileCard
              stats={rpgStats}
              displayName={profile?.display_name ?? user.email ?? "Игрок"}
              bio={profile?.bio}
            />
          </div>
        </div>
      )}
    </div>
  );
}
