import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingGuide from "@/components/OnboardingGuide";
import type { Database, DisputeStatus } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Dispute = Database["public"]["Tables"]["disputes"]["Row"];

const PAGE_SIZE = 10;

const STATUS_FILTERS: { value: "all" | DisputeStatus; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "open", label: "Открытые" },
  { value: "in_progress", label: "В процессе" },
  { value: "mediation", label: "Медиация" },
  { value: "resolved", label: "Решённые" },
  { value: "closed", label: "Закрытые" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string; page?: string }>;
}) {
  const { error: errorMsg, status: statusParam, page: pageParam } = await searchParams;
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

  const activeStatus = STATUS_FILTERS.find((f) => f.value === statusParam)
    ? (statusParam as "all" | DisputeStatus)
    : "all";
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("disputes")
    .select("*", { count: "exact" })
    .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const { data: disputes, count } = await query.returns<Dispute[]>();

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildHref(params: { status?: string; page?: number }) {
    const p = new URLSearchParams();
    const s = params.status ?? (activeStatus !== "all" ? activeStatus : undefined);
    if (s && s !== "all") p.set("status", s);
    if (params.page && params.page > 1) p.set("page", String(params.page));
    const qs = p.toString();
    return `/dashboard${qs ? `?${qs}` : ""}`;
  }

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
              className="glass px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Инвайт-код
            </Link>
            <Link
              href="/dispute/new"
              className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              + Новый спор
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
            {errorMsg}
          </div>
        )}

        {/* Status filter tabs */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
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

        {!disputes || disputes.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <p className="text-4xl mb-4">⚖️</p>
            <p className="text-white font-medium mb-2">
              {activeStatus === "all" ? "У вас пока нет споров" : "Нет споров с таким статусом"}
            </p>
            <p className="text-sm text-gray-500">
              {activeStatus === "all"
                ? "Создайте новый спор или присоединитесь по инвайт-коду"
                : "Попробуйте другой фильтр"}
            </p>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-medium text-white group-hover:text-purple-200 transition-colors">
                      {dispute.title}
                    </h3>
                    <StatusBadge status={dispute.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-gray-500 line-clamp-1 flex-1">
                      {dispute.description}
                    </p>
                    {dispute.status === "in_progress" && (
                      <span className="flex-shrink-0 text-xs text-gray-600">
                        {dispute.max_rounds}{" "}
                        {dispute.max_rounds === 1
                          ? "раунд"
                          : dispute.max_rounds < 5
                          ? "раунда"
                          : "раундов"}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {currentPage > 1 && (
                  <Link
                    href={buildHref({ page: currentPage - 1 })}
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
                    href={buildHref({ page: currentPage + 1 })}
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
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    open: "Открыт",
    in_progress: "В процессе",
    mediation: "Медиация",
    resolved: "Решён",
    closed: "Закрыт",
  };

  const colors: Record<string, string> = {
    open: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
    in_progress: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
    mediation: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
    resolved: "bg-green-500/15 text-green-400 border border-green-500/20",
    closed: "bg-gray-500/15 text-gray-400 border border-gray-500/20",
  };

  return (
    <span
      className={`text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap ${
        colors[status] ?? colors.closed
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}
