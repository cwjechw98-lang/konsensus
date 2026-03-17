import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { updateProfile, disconnectTelegram } from "./actions";
import { TelegramConnect } from "@/components/TelegramConnect";
import PageContextCard from "@/components/PageContextCard";
import { OnboardingTour } from "@/components/OnboardingTour";
import SubmitButton from "@/components/SubmitButton";
import {
  fetchAIProfile,
  fetchCounterparts,
  getStyleInfo,
  getReactionInfo,
} from "@/lib/ai-profile";
import ProfileQuestPanel, {
  type ProfileQuestRunSummary,
} from "@/components/ProfileQuestPanel";
import PublicReputationBadges from "@/components/PublicReputationBadges";
import { fetchPublicReputationBadges } from "@/lib/reputation";
import EducationRecommendationsPanel from "@/components/EducationRecommendationsPanel";
import TrustTierCard from "@/components/TrustTierCard";
import { fetchTrustTierState } from "@/lib/trust-tier";
import AppealComposer from "@/components/AppealComposer";
import { fetchUserAppeals } from "@/lib/appeals";
import {
  buildLatestAppealMap,
  getAppealEffectiveNotes,
  getLatestAppealForItem,
  isAppealHidden,
  sortBadgesWithAppeals,
} from "@/lib/appeal-helpers";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
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

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs text-gray-400">{value}%</span>
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

  const questRunsPromise = (async () => {
    const result = await supabase
      .from("profile_quest_runs")
      .select(
        "id, quest_key, status, current_step, responses, completed_at, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<ProfileQuestRunQueryRow[]>();

    return result.error
      ? { data: [] as ProfileQuestRunQueryRow[] }
      : { data: result.data ?? [] };
  })();

  const [
    disputesRes,
    argsRes,
    aiProfile,
    counterparts,
    questRunsRes,
    reputationBadges,
    appealableBadges,
    trustTierState,
    appeals,
  ] = await Promise.all([
    supabase
      .from("disputes")
      .select("id, status, category", { count: "exact" })
      .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .returns<{ id: string; status: string; category: string | null }[]>(),
    supabase.from("arguments").select("*", { count: "exact", head: true }).eq("author_id", user.id),
    fetchAIProfile(user.id).catch(() => null),
    fetchCounterparts(user.id).catch(() => []),
    questRunsPromise,
    fetchPublicReputationBadges(user.id).catch(() => []),
    fetchPublicReputationBadges(user.id, { includeHidden: true }).catch(() => []),
    fetchTrustTierState(user.id).catch(() => null),
    fetchUserAppeals(user.id).catch(() => []),
  ]);

  const allDisputes = disputesRes.data ?? [];
  const disputeCount = disputesRes.count ?? 0;
  const argCount = argsRes.count ?? 0;
  const resolvedCount = allDisputes.filter((d) => d.status === "resolved").length;
  const consensusRate =
    disputeCount > 0 ? Math.round((resolvedCount / disputeCount) * 100) : 0;

  const categoryMap: Record<string, number> = {};
  for (const dispute of allDisputes) {
    const category = dispute.category ?? "other";
    categoryMap[category] = (categoryMap[category] ?? 0) + 1;
  }

  const profileQuestRuns: ProfileQuestRunSummary[] = (
    questRunsRes.data ?? []
  ).map((run) => ({
    id: run.id,
    questKey: run.quest_key,
    status: run.status,
    currentStep: run.current_step,
    responses: Array.isArray(run.responses)
      ? run.responses.filter((item): item is string => typeof item === "string")
      : [],
    completedAt: run.completed_at,
  }));

  const tabs = [
    { id: "overview", label: "Обзор", icon: "📊" },
    { id: "ai-profile", label: "ИИ-профиль", icon: "🧠" },
    { id: "settings", label: "Настройки", icon: "⚙️" },
  ];

  const styleInfo = aiProfile
    ? await getStyleInfo(aiProfile.argumentation_style)
    : null;
  const reactionInfo = aiProfile
    ? await getReactionInfo(aiProfile.ai_hint_reaction)
    : null;
  const latestAppeals = buildLatestAppealMap(appeals);
  const aiSummaryAppeal = getLatestAppealForItem(
    latestAppeals,
    "ai_summary",
    "current"
  );
  const isAiSummaryHidden = isAppealHidden(aiSummaryAppeal);
  const profileBadgeCards = sortBadgesWithAppeals(
    appealableBadges,
    latestAppeals
  );
  const overviewSummary =
    aiProfile?.ai_summary && !isAiSummaryHidden ? aiProfile.ai_summary : null;

  const categoryEmoji: Record<string, string> = {
    politics: "🏛",
    technology: "💻",
    philosophy: "🧠",
    lifestyle: "🏠",
    science: "🔬",
    culture: "🎭",
    economics: "💰",
    relationships: "💬",
    other: "📌",
  };
  const categoryLabels: Record<string, string> = {
    politics: "Политика",
    technology: "Технологии",
    philosophy: "Философия",
    lifestyle: "Быт",
    science: "Наука",
    culture: "Культура",
    economics: "Экономика",
    relationships: "Отношения",
    other: "Другое",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          {profile?.display_name ?? "Профиль"}
        </h1>
        {createdAt ? (
          <p
            className="mt-1 text-xs text-gray-500"
            suppressHydrationWarning
          >
            На платформе с {createdAt}
          </p>
        ) : null}
      </div>

      <div className="mb-6">
        <PageContextCard
          dataTour="profile-intro"
          eyebrow="Ваш профиль"
          title="Здесь собраны ваш AI-профиль, архив и настройки"
          description="Профиль показывает, как вы ведёте диалог, к каким темам возвращаетесь и что можно улучшить дальше."
          bullets={[
            "Обзор споров и тем",
            "ИИ-профиль и публичные бейджи",
            "Настройки и Telegram",
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

      {errorMsg ? (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {errorMsg}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
          Профиль обновлён
        </div>
      ) : null}

      <div
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
        data-tour="profile-stats"
      >
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
          <p className="text-2xl font-bold text-white">{reputationBadges.length}</p>
          <p className="text-xs text-gray-500">Публичных бейджей</p>
        </div>
      </div>

      <div
        className="mb-6 flex gap-1 overflow-x-auto pb-1"
        data-tour="profile-tabs"
      >
        {tabs.map((tabItem) => (
          <a
            key={tabItem.id}
            href={`/profile${tabItem.id === "overview" ? "" : `?tab=${tabItem.id}`}`}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tabItem.id
                ? "border border-purple-500/30 bg-purple-600/20 text-purple-400"
                : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
            }`}
          >
            <span>{tabItem.icon}</span>
            {tabItem.label}
          </a>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {trustTierState ? <TrustTierCard state={trustTierState} /> : null}

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Коротко о вашем стиле
            </h2>
            {overviewSummary ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">
                {overviewSummary}
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                AI-резюме появится после нескольких завершённых споров.
              </p>
            )}

            {reputationBadges.length > 0 ? (
              <div className="mt-5 border-t border-white/8 pt-4">
                <PublicReputationBadges badges={reputationBadges} />
              </div>
            ) : null}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Темы споров
            </h2>
            {Object.keys(categoryMap).length === 0 ? (
              <p className="text-sm text-gray-500">
                Пока нет данных. Создайте первый спор.
              </p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(categoryMap)
                  .sort((left, right) => right[1] - left[1])
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center gap-3">
                      <span className="text-lg">{categoryEmoji[category] ?? "📌"}</span>
                      <span className="flex-1 text-sm text-gray-300">
                        {categoryLabels[category] ?? category}
                      </span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${(count / disputeCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-xs text-gray-500">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Контрагенты
            </h2>
            {counterparts.length === 0 ? (
              <p className="text-sm text-gray-500">
                Вы ещё ни с кем не спорили. Начните с первой темы.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {counterparts.slice(0, 10).map((counterpart) => (
                  <div
                    key={counterpart.counterpart_id}
                    className="rounded-xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {counterpart.display_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {counterpart.dispute_count} спор
                          {counterpart.dispute_count === 1
                            ? ""
                            : counterpart.dispute_count < 5
                              ? "а"
                              : "ов"}
                          {counterpart.consensus_count > 0
                            ? ` · ${counterpart.consensus_count} согласований`
                            : ""}
                        </p>
                      </div>
                      <span className="text-xs text-gray-600" suppressHydrationWarning>
                        {formatDate(counterpart.last_dispute_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "ai-profile" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              ИИ-анализ вашего стиля
            </h2>
            {aiProfile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-white/3 p-3">
                  <span className="text-2xl">{styleInfo?.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {styleInfo?.label}
                    </p>
                    <p className="text-xs text-gray-500">{styleInfo?.desc}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <StatBar
                    label="Компромисс"
                    value={aiProfile.compromise_tendency}
                    color="bg-green-500"
                  />
                  <StatBar
                    label="Эмпатия"
                    value={aiProfile.empathy_score}
                    color="bg-blue-500"
                  />
                  <StatBar
                    label="Импульсивность"
                    value={aiProfile.impulsivity}
                    color="bg-orange-500"
                  />
                  <StatBar
                    label="Консенсус"
                    value={aiProfile.consensus_rate}
                    color="bg-purple-500"
                  />
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/3 p-3">
                  <span className="text-xl">{reactionInfo?.icon}</span>
                  <div>
                    <p className="text-xs text-gray-500">Реакция на подсказки ИИ</p>
                    <p className="text-sm font-medium text-white">
                      {reactionInfo?.label}
                    </p>
                  </div>
                  {aiProfile.hints_total > 0 ? (
                    <span className="ml-auto text-xs text-gray-500">
                      {aiProfile.hints_accepted}/{aiProfile.hints_total} принято
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <span className="text-4xl">🔮</span>
                <p className="mt-3 text-sm text-gray-500">
                  ИИ-профиль формируется автоматически по мере ваших споров.
                  <br />
                  Начните спорить, чтобы увидеть анализ.
                </p>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Резюме от ИИ
            </h2>
            {aiProfile?.ai_summary ? (
              <div className="space-y-4">
                {isAiSummaryHidden ? (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                    Этот AI-вывод скрыт после апелляции. История пересмотра сохранена ниже.
                  </div>
                ) : (
                  <div className="whitespace-pre-line text-sm leading-relaxed text-gray-300">
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
              <div className="py-8 text-center">
                <span className="text-4xl">📝</span>
                <p className="mt-3 text-sm text-gray-500">
                  После нескольких споров ИИ соберёт персональное резюме вашего
                  стиля диалога.
                </p>
              </div>
            )}

            {aiProfile && aiProfile.typical_planes.length > 0 ? (
              <div className="mt-6">
                <p className="mb-2 text-xs text-gray-500">Ваши типичные темы:</p>
                <div className="flex flex-wrap gap-2">
                  {aiProfile.typical_planes.map((plane) => (
                    <span
                      key={plane}
                      className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-400"
                    >
                      {categoryEmoji[plane] ?? "📌"} {categoryLabels[plane] ?? plane}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Публичные бейджи
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
                  Это безопасный публичный слой репутации. Он показывает, как вы
                  обычно ведёте диалог, но не выставляет общий балл и не вешает
                  негативные ярлыки.
                </p>
                {reputationBadges.length === 0 ? (
                  <p className="text-xs leading-relaxed text-cyan-200">
                    Сейчас все публичные бейджи скрыты после апелляции. Внутри
                    профиля история пересмотра остаётся видимой.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Когда накопится больше сигналов по спорным темам, здесь появятся
                первые публичные стилевые бейджи.
              </p>
            )}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              История апелляций
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
                        <p className="text-sm font-semibold text-white">
                          {appeal.itemLabel}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {appeal.itemType === "ai_summary"
                            ? "AI-резюме"
                            : "Публичный бейдж"}
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

          <div className="lg:col-span-2">
            <ProfileQuestPanel runs={profileQuestRuns} />
          </div>

          <div className="lg:col-span-2">
            <EducationRecommendationsPanel
              userId={user.id}
              title="Что добрать по навыкам"
              description="Материалы подбираются по AI-профилю, стилю споров и уже пройденным коротким сценариям. Это не курс, а следующий точный шаг."
            />
          </div>

          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Как ИИ использует ваш профиль
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white/3 p-4">
                <span className="text-2xl">🎯</span>
                <p className="mt-2 text-sm font-semibold text-white">
                  Адаптивные подсказки
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  ИИ подстраивает тон и стиль подсказок под ваш способ вести диалог.
                </p>
              </div>
              <div className="rounded-xl bg-white/3 p-4">
                <span className="text-2xl">🔬</span>
                <p className="mt-2 text-sm font-semibold text-white">
                  Точнее видит напряжение
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Медиатор учитывает профили обеих сторон и точнее объясняет, где спор застрял.
                </p>
              </div>
              <div className="rounded-xl bg-white/3 p-4">
                <span className="text-2xl">📈</span>
                <p className="mt-2 text-sm font-semibold text-white">
                  Показывает рост
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  История споров постепенно показывает, как меняется ваш стиль общения.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Аккаунт
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-xs text-gray-500">Email</span>
                <p className="mt-0.5 text-sm font-medium text-white">{user.email}</p>
              </div>
              {createdAt ? (
                <div>
                  <span className="text-xs text-gray-500">Зарегистрирован</span>
                  <p
                    className="mt-0.5 text-sm font-medium text-white"
                    suppressHydrationWarning
                  >
                    {createdAt}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-gray-600 transition-colors focus:border-purple-500/50 focus:outline-none"
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
                  className="resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 transition-colors focus:border-purple-500/50 focus:outline-none"
                  placeholder="Коротко расскажите о себе"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-300">
                  Позиция в диалоге
                </span>
                <input
                  name="debate_stance"
                  type="text"
                  maxLength={200}
                  defaultValue={profile?.debate_stance ?? ""}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 transition-colors focus:border-purple-500/50 focus:outline-none"
                  placeholder="Например: стараюсь искать рабочее решение"
                />
              </label>
              <SubmitButton
                pendingText="Сохраняем..."
                className="btn-ripple rounded-lg bg-purple-600 py-2.5 font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Сохранить
              </SubmitButton>
            </form>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Telegram-уведомления
            </h2>
            <TelegramConnect
              isConnected={!!profile?.telegram_chat_id}
              botUsername={process.env.TELEGRAM_BOT_USERNAME ?? null}
              onDisconnect={disconnectTelegram}
            />
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Публичный слой
            </h2>
            <p className="text-sm leading-relaxed text-gray-300">
              Вне личного кабинета показываются только безопасные сигналы:
              доверительный уровень и ограниченный набор публичных бейджей
              диалога.
            </p>
            {reputationBadges.length > 0 ? (
              <div className="mt-4 border-t border-white/8 pt-4">
                <PublicReputationBadges badges={reputationBadges} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Публичные бейджи появятся, когда накопится больше данных по спорам.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
