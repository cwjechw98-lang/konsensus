import Link from "next/link";
import { archiveDisputeForUser, closeDispute, unarchiveDisputeForUser } from "@/lib/actions";
import type { DisputeStatus } from "@/types/database";
import SubmitButton from "@/components/SubmitButton";

type DashboardDisputeCardProps = {
  id: string;
  title: string;
  description: string;
  status: DisputeStatus;
  maxRounds: number;
  updatedAt: string;
  archived: boolean;
  returnTo: string;
  pendingReminderCount: number;
  lastRemindedAt: string | null;
  lastReminderFrom: string | null;
  canClose: boolean;
};

const STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Открыт",
  in_progress: "В процессе",
  mediation: "Медиация",
  resolved: "Решён",
  closed: "Закрыт",
};

const STATUS_COLORS: Record<DisputeStatus, string> = {
  open: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  in_progress: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  mediation: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  resolved: "bg-green-500/15 text-green-400 border border-green-500/20",
  closed: "bg-gray-500/15 text-gray-400 border border-gray-500/20",
};

export default function DashboardDisputeCard(props: DashboardDisputeCardProps) {
  const {
    id,
    title,
    description,
    status,
    maxRounds,
    updatedAt,
    archived,
    returnTo,
    pendingReminderCount,
    lastRemindedAt,
    lastReminderFrom,
    canClose,
  } = props;
  const hasPriorityReminder = archived && pendingReminderCount > 0;
  const formattedReminderAt = lastRemindedAt
    ? new Date(lastRemindedAt).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const primaryHref =
    status === "in_progress"
      ? `/dispute/${id}/argue`
      : status === "mediation" || status === "resolved"
        ? `/dispute/${id}/mediation`
        : `/dispute/${id}`;
  const primaryActionLabel = archived
    ? "Продолжить спор"
    : status === "in_progress"
      ? "Продолжить спор"
      : status === "mediation" || status === "resolved"
        ? "Открыть итог"
        : "Открыть спор";
  const primaryPendingText = archived ? "Возвращаем..." : "Открываем...";

  return (
    <div className="card-gradient-top glass rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dispute/${id}`}
            className="font-medium text-white hover:text-purple-200 transition-colors"
          >
            {title}
          </Link>
          <p className="mt-1 text-sm text-gray-500 line-clamp-3 sm:line-clamp-2">
            {description}
          </p>
        </div>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-3">
        <span>
          Обновлён: {new Date(updatedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
        </span>
        {status === "in_progress" && (
          <span>
            {maxRounds} {maxRounds === 1 ? "раунд" : maxRounds < 5 ? "раунда" : "раундов"}
          </span>
        )}
        {archived && (
          <span className="text-cyan-300/80">В архиве</span>
        )}
      </div>

      {hasPriorityReminder && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
          <p className="font-medium">Попыток возобновить спор: {pendingReminderCount}</p>
          <p className="mt-1 text-amber-100/80">
            {lastReminderFrom ? `Последнее напоминание от ${lastReminderFrom}` : "Последнее напоминание уже зафиксировано"}
            {formattedReminderAt ? ` · ${formattedReminderAt}` : ""}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {archived ? (
            <form action={unarchiveDisputeForUser} className="sm:flex-shrink-0">
              <input type="hidden" name="dispute_id" value={id} />
              <input type="hidden" name="return_to" value={`/dispute/${id}`} />
              <SubmitButton
                pendingText={primaryPendingText}
                className="w-full rounded-lg bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {primaryActionLabel}
              </SubmitButton>
            </form>
          ) : (
            <Link
              href={primaryHref}
              className="w-full rounded-lg bg-purple-600/20 px-4 py-2 text-center text-sm font-medium text-purple-200 transition-colors hover:bg-purple-600/30 active:scale-[0.98] sm:w-auto sm:flex-shrink-0"
            >
              {primaryActionLabel}
            </Link>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            {!archived ? (
              <form action={archiveDisputeForUser}>
                <input type="hidden" name="dispute_id" value={id} />
                <input type="hidden" name="return_to" value={returnTo} />
                <SubmitButton
                  pendingText="Архивируем..."
                  className="text-gray-500 transition-colors hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Архивировать
                </SubmitButton>
              </form>
            ) : null}

            {archived && canClose && (status === "open" || status === "in_progress") && (
              <form action={closeDispute}>
                <input type="hidden" name="dispute_id" value={id} />
                <SubmitButton
                  pendingText="Закрываем..."
                  className="text-gray-500 transition-colors hover:text-red-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Закрыть
                </SubmitButton>
              </form>
            )}

            <Link
              href={`/dispute/${id}`}
              className="text-gray-500 transition-colors hover:text-white"
            >
              Карточка спора
            </Link>
          </div>
        </div>

        {hasPriorityReminder && (
          <div className="text-[11px] uppercase tracking-[0.16em] text-amber-300/80">
            Приоритетный возврат в обсуждение
          </div>
        )}
      </div>
    </div>
  );
}
