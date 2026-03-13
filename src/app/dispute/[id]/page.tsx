import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShareInviteButton from "@/components/ShareInviteButton";
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

  const getName = (pid: string | null) => {
    if (!pid) return null;
    return profiles?.find((p) => p.id === pid)?.display_name ?? "Пользователь";
  };

  const rounds = Array.from({ length: dispute.max_rounds }, (_, i) => i + 1);

  // Action state
  const myArgCount = args?.filter((a) => a.author_id === user.id).length ?? 0;
  const opponentId = isCreator ? dispute.opponent_id : dispute.creator_id;
  const opponentArgCount =
    args?.filter((a) => a.author_id === opponentId).length ?? 0;
  const isWaiting = myArgCount > opponentArgCount;
  const allDone = myArgCount >= dispute.max_rounds;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Back */}
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
      >
        &larr; Мои споры
      </Link>

      {/* Header */}
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

      {/* Participants */}
      <div className="glass rounded-xl p-4 mb-6 flex gap-8">
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

      {/* Invite */}
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

      {/* ── CHAT ARGUMENTS ───────────────────────────── */}
      {args && args.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-col gap-1">
            {rounds.map((round) => {
              const roundArgs = args.filter((a) => a.round === round);
              if (roundArgs.length === 0) return null;

              return (
                <div key={round}>
                  {/* Round divider */}
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-white/6" />
                    <span className="text-xs text-gray-600 px-2">
                      Раунд {round} из {dispute.max_rounds}
                    </span>
                    <div className="flex-1 h-px bg-white/6" />
                  </div>

                  <div className="flex flex-col gap-3">
                    {roundArgs.map((arg) => {
                      const isMe = arg.author_id === user.id;
                      return (
                        <div
                          key={arg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[85%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            {/* Name label */}
                            <span className="text-xs text-gray-500 px-1">
                              {getName(arg.author_id)}
                              {isMe && (
                                <span className="text-purple-500 ml-1">(вы)</span>
                              )}
                            </span>

                            {/* Bubble */}
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                isMe
                                  ? "bg-purple-600/25 border border-purple-500/30 rounded-tr-sm"
                                  : "glass border-white/8 rounded-tl-sm"
                              }`}
                            >
                              <p className="font-semibold text-white text-sm mb-1">
                                {arg.position}
                              </p>
                              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {arg.reasoning}
                              </p>
                              {arg.evidence && (
                                <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-white/8">
                                  📎 {arg.evidence}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ACTIONS ──────────────────────────────────── */}
      {dispute.status === "in_progress" &&
        isParticipant &&
        (() => {
          if (allDone && isWaiting) {
            return (
              <div className="glass rounded-xl p-4 text-center text-sm text-gray-500">
                Все ваши аргументы поданы. Ожидаем последний ответ оппонента...
              </div>
            );
          }
          if (isWaiting) {
            return (
              <div className="glass rounded-xl p-4 text-center text-sm text-gray-500">
                Раунд {myArgCount} — ждём ответа оппонента...
              </div>
            );
          }
          return (
            <Link
              href={`/dispute/${dispute.id}/argue`}
              className="btn-ripple inline-block bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              Написать аргумент · Раунд {myArgCount + 1}
            </Link>
          );
        })()}

      {dispute.status === "mediation" && isParticipant && (
        <Link
          href={`/dispute/${dispute.id}/mediation`}
          className="btn-ripple inline-block bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
        >
          🤖 Посмотреть анализ ИИ
        </Link>
      )}

      {dispute.status === "resolved" && isParticipant && (
        <Link
          href={`/dispute/${dispute.id}/mediation`}
          className="btn-ripple inline-block bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
        >
          ✓ Результат медиации
        </Link>
      )}
    </div>
  );
}
