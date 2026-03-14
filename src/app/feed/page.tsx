import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  open: "Ожидает оппонента",
  in_progress: "В процессе",
  mediation: "Медиация",
  resolved: "Решён",
  closed: "Закрыт",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-400",
  in_progress: "bg-yellow-500/15 text-yellow-400",
  mediation: "bg-purple-500/15 text-purple-400",
  resolved: "bg-green-500/15 text-green-400",
  closed: "bg-gray-500/15 text-gray-400",
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  const { data: disputes, count } = await supabase
    .from("disputes")
    .select("*", { count: "exact" })
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .range(from, to)
    .returns<Dispute[]>();

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Load profiles for all creators
  const creatorIds = [...new Set((disputes ?? []).map((d) => d.creator_id))];
  const { data: profiles } = creatorIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", creatorIds)
        .returns<Pick<Profile, "id" | "display_name">[]>()
    : { data: [] };

  const getName = (id: string) =>
    profiles?.find((p) => p.id === id)?.display_name ?? "Участник";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Публичные споры</h1>
        <p className="text-sm text-gray-500">
          Реальные разногласия — ИИ помогает найти решение
        </p>
      </div>

      {!disputes || disputes.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-4xl mb-4">⚖️</p>
          <p className="text-white font-medium mb-2">Пока нет публичных споров</p>
          <p className="text-sm text-gray-500 mb-6">
            Создайте первый — он появится здесь
          </p>
          <Link
            href="/dispute/new"
            className="btn-ripple inline-block bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
          >
            Создать спор
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {disputes.map((dispute) => (
              <Link
                key={dispute.id}
                href={`/dispute/${dispute.id}`}
                className="card-gradient-top glass rounded-xl p-4 hover:bg-white/[0.06] transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h3 className="font-medium text-white group-hover:text-purple-200 transition-colors leading-snug">
                    {dispute.title}
                  </h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                      STATUS_COLORS[dispute.status] ?? STATUS_COLORS.closed
                    }`}
                  >
                    {STATUS_LABELS[dispute.status] ?? dispute.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                  {dispute.description}
                </p>
                <p className="text-xs text-gray-600">
                  {getName(dispute.creator_id)}
                  {dispute.opponent_id ? ` · ${dispute.max_rounds} раунд${dispute.max_rounds === 1 ? "" : dispute.max_rounds < 5 ? "а" : "ов"}` : " · ищет оппонента"}
                </p>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {currentPage > 1 && (
                <Link
                  href={`/feed?page=${currentPage - 1}`}
                  className="glass px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                >
                  ← Назад
                </Link>
              )}
              <span className="text-sm text-gray-500">
                {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/feed?page=${currentPage + 1}`}
                  className="glass px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Вперёд →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
