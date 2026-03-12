import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function DisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: dispute } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", id)
    .single<Dispute>();

  if (!dispute) {
    notFound();
  }

  const isCreator = dispute.creator_id === user.id;
  const isOpponent = dispute.opponent_id === user.id;
  const isParticipant = isCreator || isOpponent;

  if (!isParticipant && dispute.status !== "open") {
    notFound();
  }

  // Fetch participant names
  const participantIds = [dispute.creator_id, dispute.opponent_id].filter(
    Boolean
  ) as string[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", participantIds)
    .returns<Pick<Profile, "id" | "display_name">[]>();

  const getName = (id: string | null) => {
    if (!id) return null;
    return profiles?.find((p) => p.id === id)?.display_name ?? "Пользователь";
  };

  const statusLabels: Record<string, string> = {
    open: "Ожидает оппонента",
    in_progress: "В процессе",
    mediation: "ИИ-медиация",
    resolved: "Решён",
    closed: "Закрыт",
  };

  const statusColors: Record<string, string> = {
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
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:underline mb-4 inline-block"
      >
        &larr; Мои споры
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{dispute.title}</h1>
        <span
          className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${statusColors[dispute.status] ?? statusColors.closed}`}
        >
          {statusLabels[dispute.status] ?? dispute.status}
        </span>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-8 whitespace-pre-wrap">
        {dispute.description}
      </p>

      {/* Participants */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Участники</h2>
        <div className="flex gap-6">
          <div>
            <span className="text-xs text-gray-400">Инициатор</span>
            <p className="font-medium">{getName(dispute.creator_id)}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Оппонент</span>
            <p className="font-medium">
              {dispute.opponent_id
                ? getName(dispute.opponent_id)
                : "Ожидает..."}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Раунды</span>
            <p className="font-medium">{dispute.max_rounds}</p>
          </div>
        </div>
      </div>

      {/* Invite section — only for open disputes */}
      {dispute.status === "open" && isCreator && (
        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold mb-2">
            Пригласите оппонента
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Отправьте этот код вашему оппоненту, чтобы он мог присоединиться к
            спору.
          </p>
          <div className="flex items-center gap-3">
            <code className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-md font-mono text-lg tracking-widest">
              {dispute.invite_code}
            </code>
          </div>
        </div>
      )}

      {/* Actions based on status */}
      {dispute.status === "in_progress" && isParticipant && (
        <div className="flex gap-3">
          <Link
            href={`/dispute/${dispute.id}/argue`}
            className="bg-foreground text-background px-5 py-2 rounded-md font-medium hover:opacity-90"
          >
            Написать аргумент
          </Link>
        </div>
      )}

      {dispute.status === "mediation" && isParticipant && (
        <div className="flex gap-3">
          <Link
            href={`/dispute/${dispute.id}/mediation`}
            className="bg-purple-600 text-white px-5 py-2 rounded-md font-medium hover:opacity-90"
          >
            Посмотреть анализ ИИ
          </Link>
        </div>
      )}
    </div>
  );
}
