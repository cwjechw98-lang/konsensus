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

  return (
    <div className="card-gradient-top glass rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <Link href={`/dispute/${id}`} className="font-medium text-white hover:text-purple-200 transition-colors">
            {title}
          </Link>
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">
            {description}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[status]}`}>
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

      {archived && pendingReminderCount > 0 && (
        <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <p className="font-medium">
            Новых попыток возобновить спор: {pendingReminderCount}
          </p>
          <p className="mt-1 text-amber-100/80">
            {lastReminderFrom ? `Последнее напоминание: ${lastReminderFrom}` : "Последнее напоминание уже зафиксировано"}
            {lastRemindedAt ? ` · ${new Date(lastRemindedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <form action={archived ? unarchiveDisputeForUser : archiveDisputeForUser}>
            <input type="hidden" name="dispute_id" value={id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <SubmitButton
              pendingText={archived ? "Возвращаем..." : "Архивируем..."}
              className="text-gray-500 transition-colors hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {archived ? "Продолжить" : "Архивировать"}
            </SubmitButton>
          </form>

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

          <Link href={`/dispute/${id}`} className="text-gray-500 hover:text-white transition-colors">
            Открыть
          </Link>
        </div>

        {archived && pendingReminderCount > 0 && (
          <span className="text-[11px] uppercase tracking-[0.16em] text-amber-300/80">
            Возврат в приоритете
          </span>
        )}
      </div>
    </div>
  );
}
