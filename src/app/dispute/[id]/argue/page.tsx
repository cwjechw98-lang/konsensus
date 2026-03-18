import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ArgueFormClient from "@/components/ArgueFormClient";
import WaitingAmbient from "@/components/WaitingAmbient";
import { OnboardingTour } from "@/components/OnboardingTour";
import type { Database } from "@/types/database";
import { getDisplayName } from "@/lib/display-name";

type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
type ArgumentRow = Database["public"]["Tables"]["arguments"]["Row"];

export default async function ArguePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorMsg } = await searchParams;
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
  if (dispute.status !== "in_progress") redirect(`/dispute/${id}`);

  const isCreator = dispute.creator_id === user.id;
  const isOpponent = dispute.opponent_id === user.id;
  if (!isCreator && !isOpponent) redirect("/dashboard");

  const opponentId = isCreator ? dispute.opponent_id! : dispute.creator_id;

  const { data: args } = await supabase
    .from("arguments")
    .select("*")
    .eq("dispute_id", id)
    .order("round", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<ArgumentRow[]>();

  const myArgCount = args?.filter((a) => a.author_id === user.id).length ?? 0;
  const opponentArgCount = args?.filter((a) => a.author_id === opponentId).length ?? 0;

  const isWaiting = myArgCount > opponentArgCount;
  const currentRound = isWaiting ? myArgCount : myArgCount + 1;
  const isFirstRound = currentRound === 1;

  if (!isWaiting && myArgCount >= dispute.max_rounds) {
    redirect(`/dispute/${id}`);
  }

  const lastOpponentArg = args?.filter((a) => a.author_id === opponentId).at(-1) ?? null;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", [dispute.creator_id, opponentId])
    .returns<{ id: string; display_name: string | null }[]>();

  const getName = (pid: string) =>
    profiles?.find((p) => p.id === pid)?.display_name ??
    (pid === user.id ? getDisplayName(null, user) : "Участник");

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link
        href={`/dispute/${id}`}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
      >
        &larr; К спору
      </Link>

      <div className="glass rounded-xl p-4 mb-6" data-tour="argue-context">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Тема спора</p>
            <p className="font-semibold text-white">{dispute.title}</p>
          </div>
          {!isWaiting ? (
            <OnboardingTour
              page="argue"
              showReplayButton
              buttonLabel="?"
              className="h-9 w-9 rounded-full px-0 text-sm"
            />
          ) : null}
        </div>
        <p className="text-sm text-gray-400 line-clamp-3">{dispute.description}</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          {isWaiting
            ? "Ждём ответ"
            : isFirstRound
              ? "Ваш первый аргумент"
              : `Ваш ответ · Раунд ${currentRound}`}
        </h1>
        <span className="text-sm text-gray-500">из {dispute.max_rounds}</span>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-5">
          {errorMsg}
        </div>
      )}

      {isWaiting ? (
        <div className="flex flex-col gap-4">
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-2xl mb-3">✓</p>
            <p className="font-semibold text-white mb-2">Аргумент принят</p>
            <p className="text-gray-400 text-sm">Ожидаем ответа оппонента...</p>
          </div>
          <WaitingAmbient />
        </div>
      ) : (
        <ArgueFormClient
          disputeId={id}
          disputeTitle={dispute.title}
          disputeDescription={dispute.description}
          isFirstRound={isFirstRound}
          currentRound={currentRound}
          maxRounds={dispute.max_rounds}
          userName={getName(user.id)}
          opponentName={getName(opponentId)}
          lastOpponentArg={
            lastOpponentArg
              ? {
                  position: lastOpponentArg.position,
                  reasoning: lastOpponentArg.reasoning,
                  evidence: lastOpponentArg.evidence,
                  round: lastOpponentArg.round,
                }
              : null
          }
        />
      )}
    </div>
  );
}
