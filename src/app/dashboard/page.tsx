import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingGuide from "@/components/OnboardingGuide";
import { OnboardingTour } from "@/components/OnboardingTour";
import DashboardDisputeCard from "@/components/DashboardDisputeCard";
import PageContextCard from "@/components/PageContextCard";
import EducationRecommendationsPanel from "@/components/EducationRecommendationsPanel";
import type { Database, DisputeStatus } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
type DisputeUserState = Database["public"]["Tables"]["dispute_user_state"]["Row"];

const PAGE_SIZE = 10;

const STATUS_FILTERS: { value: "all" | DisputeStatus; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "open", label: "Открытые" },
  { value: "in_progress", label: "В процессе" },
  { value: "mediation", label: "Медиация" },
  { value: "resolved", label: "Решённые" },
  { value: "closed", label: "Закрытые" },
];

const VIEW_FILTERS = [
  { value: "active", label: "Активные" },
  { value: "archived", label: "Архив" },
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string; page?: string; view?: string }>;
}) {
  const { error: errorMsg, status: statusParam, page: pageParam, view: viewParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single<Pick<Profile, "display_name">>();

  const activeStatus = STATUS_FILTERS.find((filter) => filter.value === statusParam)
    ? (statusParam as "all" | DisputeStatus)
    : "all";
  const activeView = VIEW_FILTERS.find((filter) => filter.value === viewParam)?.value ?? "active";
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));

  let disputeQuery = supabase
    .from("disputes")
    .select("*")
    .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  if (activeStatus !== "all") {
    disputeQuery = disputeQuery.eq("status", activeStatus);
  }

  const [{ data: disputes }, { data: disputeStateRows }] = await Promise.all([
    disputeQuery.returns<Dispute[]>(),
    supabase
      .from("dispute_user_state")
      .select("dispute_id, is_archived, pending_reminder_count, last_reminded_at, last_reminder_from_user_id")
      .eq("user_id", user.id)
      .returns<
        Pick<
          DisputeUserState,
          "dispute_id" | "is_archived" | "pending_reminder_count" | "last_reminded_at" | "last_reminder_from_user_id"
        >[]
      >(),
  ]);

  const stateByDisputeId = new Map(
    (disputeStateRows ?? []).map((row) => [row.dispute_id, row])
  );

  const reminderAuthorIds = Array.from(
    new Set(
      (disputeStateRows ?? [])
        .map((row) => row.last_reminder_from_user_id)
        .filter(Boolean)
    )
  ) as string[];

  const { data: reminderProfiles } = reminderAuthorIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", reminderAuthorIds)
        .returns<Pick<Profile, "id" | "display_name">[]>()
    : { data: [] as Pick<Profile, "id" | "display_name">[] };

  const reminderProfileMap = new Map(
    (reminderProfiles ?? []).map((row) => [row.id, row.display_name])
  );

  const archivedDisputeIds = new Set(
    (disputeStateRows ?? [])
      .filter((row) => row.is_archived)
      .map((row) => row.dispute_id)
  );

  const archivedReminderStates = (disputeStateRows ?? []).filter(
    (row) => row.is_archived && row.pending_reminder_count > 0
  );
  const archivedReminderDisputeCount = archivedReminderStates.length;
  const archivedReminderTotal = archivedReminderStates.reduce(
    (sum, row) => sum + row.pending_reminder_count,
    0
  );

  const filteredDisputes = (disputes ?? []).filter((dispute) =>
    activeView === "archived"
      ? archivedDisputeIds.has(dispute.id)
      : !archivedDisputeIds.has(dispute.id)
  );

  const sortedDisputes = [...filteredDisputes].sort((left, right) => {
    if (activeView !== "archived") {
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    }

    const leftState = stateByDisputeId.get(left.id);
    const rightState = stateByDisputeId.get(right.id);
    const leftPending = leftState?.pending_reminder_count ?? 0;
    const rightPending = rightState?.pending_reminder_count ?? 0;

    if (rightPending !== leftPending) {
      return rightPending - leftPending;
    }

    const leftReminderAt = leftState?.last_reminded_at ? new Date(leftState.last_reminded_at).getTime() : 0;
    const rightReminderAt = rightState?.last_reminded_at ? new Date(rightState.last_reminded_at).getTime() : 0;

    if (rightReminderAt !== leftReminderAt) {
      return rightReminderAt - leftReminderAt;
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(sortedDisputes.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const from = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedDisputes = sortedDisputes.slice(from, from + PAGE_SIZE);

  function buildHref(params: { status?: string; page?: number; view?: string }) {
    const urlParams = new URLSearchParams();
    const nextStatus = params.status ?? (activeStatus !== "all" ? activeStatus : undefined);
    const nextView = params.view ?? activeView;

    if (nextStatus && nextStatus !== "all") {
      urlParams.set("status", nextStatus);
    }
    if (nextView !== "active") {
      urlParams.set("view", nextView);
    }
    if (params.page && params.page > 1) {
      urlParams.set("page", String(params.page));
    }

    const qs = urlParams.toString();
    return `/dashboard${qs ? `?${qs}` : ""}`;
  }

  const currentHref = buildHref({ page: safeCurrentPage });

  return (
    <>
      <OnboardingGuide />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-gray-500 mb-1">Добро пожаловать</p>
            <h1 className="text-2xl font-bold text-white">
              {profile?.display_name ?? "Пользователь"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dispute/join"
              data-tour="join-code"
              className="glass px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Инвайт-код
            </Link>
            <Link
              href="/dispute/new"
              data-tour="create-dispute"
              className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              + Новый спор
            </Link>
          </div>
        </div>

        <div className="mb-5">
          <PageContextCard
            dataTour="dashboard-intro"
            eyebrow="Ваши споры"
            title="Главный рабочий экран"
            description="Создайте спор, войдите по коду или вернитесь к уже начатому обсуждению."
          bullets={[
            "Активные и архивные карточки",
            "Напоминания по важным спорам",
          ]}
          tone="purple"
          compact
          mobileTerse
          actions={
            <OnboardingTour
              page="dashboard"
                showReplayButton
                buttonLabel="Подсказки по экрану"
              />
            }
          />
        </div>

        <div className="mb-5 hidden sm:block">
          <EducationRecommendationsPanel
            userId={user.id}
            compact
            title="Следующий полезный шаг"
            description="Один короткий материал под ваш текущий стиль диалога."
          />
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
            {errorMsg}
          </div>
        )}

        {activeView === "active" && archivedReminderDisputeCount > 0 && (
          <Link
            href={buildHref({ view: "archived", page: 1 })}
            className="mb-4 block rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 transition-colors hover:bg-amber-500/15"
          >
            <p className="text-sm font-medium text-amber-200">
              В архиве есть споры с новыми попытками возобновления
            </p>
            <p className="mt-1 text-xs text-amber-100/80">
              Споров: {archivedReminderDisputeCount} · Напоминаний: {archivedReminderTotal}
            </p>
          </Link>
        )}

        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {VIEW_FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={buildHref({ view: filter.value, page: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeView === filter.value
                  ? "bg-cyan-500 text-slate-950"
                  : "glass text-gray-400 hover:text-white"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1" data-tour="filters">
          {STATUS_FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={buildHref({ status: filter.value, page: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeStatus === filter.value
                  ? "bg-purple-600 text-white"
                  : "glass text-gray-400 hover:text-white"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        {paginatedDisputes.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <p className="text-4xl mb-4">{activeView === "archived" ? "🗂️" : "⚖️"}</p>
            <p className="text-white font-medium mb-2">
              {activeView === "archived"
                ? "Архив пока пуст"
                : activeStatus === "all"
                ? "У вас пока нет споров"
                : "Нет споров с таким статусом"}
            </p>
              <p className="text-[15px] text-gray-400">
                {activeView === "archived"
                  ? "Архивированные споры появятся здесь. Новые напоминания поднимут важные из них наверх."
                  : activeStatus === "all"
                ? "Создайте спор или войдите по инвайт-коду."
                : "Попробуйте другой фильтр"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3" data-tour="disputes-list">
              {paginatedDisputes.map((dispute) => {
                const disputeState = stateByDisputeId.get(dispute.id);
                const lastReminderFromUserId = disputeState?.last_reminder_from_user_id;
                const lastReminderFrom =
                  lastReminderFromUserId === user.id
                    ? "Вы"
                    : lastReminderFromUserId
                    ? reminderProfileMap.get(lastReminderFromUserId) ?? "Оппонент"
                    : null;

                return (
                  <DashboardDisputeCard
                    key={dispute.id}
                    id={dispute.id}
                    title={dispute.title}
                    description={dispute.description}
                    status={dispute.status}
                    maxRounds={dispute.max_rounds}
                    updatedAt={dispute.updated_at}
                    archived={archivedDisputeIds.has(dispute.id)}
                    returnTo={currentHref}
                    pendingReminderCount={disputeState?.pending_reminder_count ?? 0}
                    lastRemindedAt={disputeState?.last_reminded_at ?? null}
                    lastReminderFrom={lastReminderFrom}
                    canClose={dispute.creator_id === user.id}
                  />
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {safeCurrentPage > 1 && (
                  <Link
                    href={buildHref({ page: safeCurrentPage - 1 })}
                    className="glass px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    ← Назад
                  </Link>
                )}
                <span className="text-sm text-gray-500">
                  {safeCurrentPage} / {totalPages}
                </span>
                {safeCurrentPage < totalPages && (
                  <Link
                    href={buildHref({ page: safeCurrentPage + 1 })}
                    className="glass px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Вперёд →
                  </Link>
                )}
              </div>
            )}

            <div className="mt-5 sm:hidden">
              <EducationRecommendationsPanel
                userId={user.id}
                compact
                title="Следующий полезный шаг"
                description="Один короткий материал под ваш текущий стиль диалога."
              />
            </div>
          </>
        )}

        {activeView === "archived" && sortedDisputes.length > 0 && (
          <div className="mt-6 text-sm text-gray-400">
            Архив виден только вам. Если спор повторно уходит в архив, новые напоминания копятся на карточке без лишнего шума в Telegram.
          </div>
        )}
      </div>
    </>
  );
}
