import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShareInviteButton from "@/components/ShareInviteButton";
import RealtimeDisputeClient from "@/components/RealtimeDisputeClient";
import type { Database } from "@/types/database";

type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ArgumentRow = Database["public"]["Tables"]["arguments"]["Row"];

const STATUS_LABELS: Record<string, string> = {
  open: "Ожидает оппонента",
  in_progress: "В процессе",
  mediation: "ИИ-медиация",
  resolved: "Решён",
  closed: "Закрыт",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  in_progress: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  mediation: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  resolved: "bg-green-500/15 text-green-400 border border-green-500/20",
  closed: "bg-gray-500/15 text-gray-400 border border-gray-500/20",
};

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

  if (!user) redirect("/login");

  const { data: dispute } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", id)
    .single<Dispute>();

  if (!dispute) notFound();

  const isCreator = dispute.creator_id === user.id;
  const isOpponent = dispute.opponent_id === user.id;
  const isParticipant = isCreator || isOpponent;

  if (!isParticipant && dispute.status !== "open") notFound();

  const participantIds = [dispute.creator_id, dispute.opponent_id].filter(
    Boolean
  ) as string[];

  const [{ data: profiles }, { data: args }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", participantIds)
      .returns<Pick<Profile, "id" | "display_name">[]>(),
    supabase
      .from("arguments")
      .select("*")
      .eq("dispute_id", id)
      .order("round", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<ArgumentRow[]>(),
  ]);

  // round_insights: graceful fallback до запуска миграции
  let insights: { round: number; content: string }[] = [];
  try {
    const { data: insightsData } = await supabase
      .from("round_insights")
      .select("round, content")
      .eq("dispute_id", id)
      .eq("recipient_id", user.id)
      .returns<{ round: number; content: string }[]>();
    insights = insightsData ?? [];
  } catch {
    insights = [];
  }

  const getName = (pid: string | null) => {
    if (!pid) return null;
    return profiles?.find((p) => p.id === pid)?.display_name ?? "Участник";
  };

  // Анонимный пользователь (гость)
  const isGuest = user.is_anonymous ?? false;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Назад */}
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
      >
        &larr; Мои споры
      </Link>

      {/* Заголовок */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-xl font-bold text-white">{dispute.title}</h1>
        <span
          className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
            STATUS_COLORS[dispute.status] ?? STATUS_COLORS.closed
          }`}
        >
          {STATUS_LABELS[dispute.status] ?? dispute.status}
        </span>
      </div>

      <p className="text-gray-400 text-sm mb-6 whitespace-pre-wrap">
        {dispute.description}
      </p>

      {/* Участники */}
      <div className="glass rounded-xl p-4 mb-6 flex gap-8 flex-wrap">
        <div>
          <span className="text-xs text-gray-500">Инициатор</span>
          <p className="text-sm font-medium text-white mt-0.5">
            {getName(dispute.creator_id)}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500">Оппонент</span>
          <p className="text-sm font-medium text-white mt-0.5">
            {dispute.opponent_id ? getName(dispute.opponent_id) : "Ожидает..."}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500">Раундов</span>
          <p className="text-sm font-medium text-white mt-0.5">
            {dispute.max_rounds}
          </p>
        </div>
      </div>

      {/* Баннер для гостя */}
      {isGuest && isParticipant && (
        <div className="glass border border-yellow-500/20 rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium text-yellow-400">
              Вы участвуете как гость
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Создайте аккаунт — сохраните историю всех споров
            </p>
          </div>
          <Link
            href="/register"
            className="flex-shrink-0 text-xs bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            Создать аккаунт
          </Link>
        </div>
      )}

      {/* Приглашение */}
      {dispute.status === "open" && isCreator && (
        <div className="border border-dashed border-white/10 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-white mb-1">
            Пригласите оппонента
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Отправьте ссылку — оппонент перейдёт сразу в спор.
          </p>
          <ShareInviteButton
            inviteUrl={`${process.env.NEXT_PUBLIC_APP_URL}/dispute/join?code=${dispute.invite_code}`}
          />
        </div>
      )}

      {/* Realtime чат + кнопки действий */}
      <RealtimeDisputeClient
        initialArgs={(args ?? []).map((a) => ({
          id: a.id,
          dispute_id: a.dispute_id,
          author_id: a.author_id,
          round: a.round,
          position: a.position,
          reasoning: a.reasoning,
          evidence: a.evidence,
        }))}
        initialStatus={dispute.status}
        dispute={{
          id: dispute.id,
          max_rounds: dispute.max_rounds,
          creator_id: dispute.creator_id,
          opponent_id: dispute.opponent_id,
          status: dispute.status,
        }}
        userId={user.id}
        profiles={(profiles ?? []).map((p) => ({
          id: p.id,
          display_name: p.display_name,
        }))}
        isParticipant={isParticipant}
        isCreator={isCreator}
        roundInsights={insights.reduce<Record<number, string>>(
          (acc, i) => { acc[i.round] = i.content; return acc; },
          {}
        )}
      />
    </div>
  );
}
