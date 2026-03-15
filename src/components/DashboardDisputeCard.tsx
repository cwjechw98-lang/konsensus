import Link from "next/link";
import { archiveDisputeForUser, unarchiveDisputeForUser } from "@/lib/actions";
import type { DisputeStatus } from "@/types/database";

type DashboardDisputeCardProps = {
  id: string;
  title: string;
  description: string;
  status: DisputeStatus;
  maxRounds: number;
  updatedAt: string;
  archived: boolean;
  returnTo: string;
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
  const { id, title, description, status, maxRounds, updatedAt, archived, returnTo } = props;

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

      <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-3">
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

        <form action={archived ? unarchiveDisputeForUser : archiveDisputeForUser}>
          <input type="hidden" name="dispute_id" value={id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <button
            type="submit"
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            {archived ? "Вернуть в активные" : "Архивировать"}
          </button>
        </form>
      </div>
    </div>
  );
}
