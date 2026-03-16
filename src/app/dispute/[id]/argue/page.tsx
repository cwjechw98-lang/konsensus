import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ArgueFormClient from "@/components/ArgueFormClient";
import WaitingAmbient from "@/components/WaitingAmbient";
import PageContextCard from "@/components/PageContextCard";
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

      {/* Dispute context */}
      <div className="mb-6">
        <PageContextCard
          dataTour="argue-context"
          eyebrow={isWaiting ? "Фаза ожидания" : "Текущий ход"}
          title={
            isWaiting
              ? "Ваш ход уже отправлен, дальше система держит паузу до ответа оппонента"
              : isFirstRound
              ? "Первый ход задаёт рамку всего спора"
              : "Перед ответом важно держать в фокусе тему и последний ход оппонента"
          }
          description={
            isWaiting
              ? "В этой фазе не нужно перечитывать инструкции: ниже идёт приватный waiting-layer, который помогает пережить паузу и не потерять контекст."
              : "Этот экран должен помогать именно в моменте: сверху — суть спора, в следующих раундах — последний ответ второй стороны, ниже — ваш новый аргумент."
          }
          bullets={
            isWaiting
              ? [
                  "Статус ожидания без пустоты",
                  "Приватная подсказка от ИИ",
                  "Дальше спор вернётся сам, когда появится новое действие",
                ]
              : [
                  "Предмет спора остаётся на виду",
                  "Последний ответ оппонента показывается отдельно",
                  "Аргумент можно быстро проверить перед отправкой",
                ]
          }
          tone={isWaiting ? "cyan" : "purple"}
          actions={
            !isWaiting ? (
              <OnboardingTour
                page="argue"
                showReplayButton
                buttonLabel="Подсказки по этому ходу"
              />
            ) : null
          }
        />
      </div>

      <div className="glass rounded-xl p-4 mb-6" data-tour="argue-context">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Предмет спора</p>
        <p className="font-semibold text-white mb-1">{dispute.title}</p>
        <p className="text-sm text-gray-400 line-clamp-3">{dispute.description}</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          {isFirstRound ? "Ваша позиция" : `Раунд ${currentRound}`}
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
          <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80 mb-1">Приватная фаза ожидания</p>
            <p className="text-sm text-cyan-100/90">
              Пока идёт пауза между ходами, ИИ готовит личную подсказку только для вас.
            </p>
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
