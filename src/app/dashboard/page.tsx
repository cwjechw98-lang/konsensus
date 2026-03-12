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

  if (!user) {
    redirect("/login");
  }

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
        <h1 className="text-2xl font-bold">
          Привет, {profile?.display_name ?? "пользователь"}
        </h1>
        <div className="flex gap-2">
          <Link
            href="/dispute/join"
            className="border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Инвайт-код
          </Link>
          <Link
            href="/dispute/new"
            className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
          >
            Новый спор
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md mb-4">
          {errorMsg}
        </div>
      )}

      {!disputes || disputes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">У вас пока нет споров</p>
          <p className="text-sm">
            Создайте новый спор или присоединитесь по инвайт-коду
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {disputes.map((dispute) => (
            <Link
              key={dispute.id}
              href={`/dispute/${dispute.id}`}
              className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium">{dispute.title}</h3>
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
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    mediation:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    resolved:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${colors[status] ?? colors.closed}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
