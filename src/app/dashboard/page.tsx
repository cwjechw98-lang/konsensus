import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Dispute = Database["public"]["Tables"]["disputes"]["Row"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorMsg } = await searchParams;
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

  const { data: disputes } = await supabase
    .from("disputes")
    .select("*")
    .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order("updated_at", { ascending: false })
    .returns<Dispute[]>();

  return (
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
            className="glass border-white/10 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
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

      {!disputes || disputes.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-4xl mb-4">⚖️</p>
          <p className="text-white font-medium mb-2">У вас пока нет споров</p>
          <p className="text-sm text-gray-500">
            Создайте новый спор или присоединитесь по инвайт-коду
          </p>
        </div>
      ) : (
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
              <p className="text-sm text-gray-500 line-clamp-1">
                {dispute.description}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
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
      className={`text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap ${colors[status] ?? colors.closed}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
