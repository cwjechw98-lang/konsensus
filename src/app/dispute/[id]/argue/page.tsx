import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitArgument } from "@/lib/actions";
import EvidenceFields from "@/components/EvidenceFields";
import SubmitButton from "@/components/SubmitButton";
import type { Database } from "@/types/database";

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
  const opponentArgCount =
    args?.filter((a) => a.author_id === opponentId).length ?? 0;

  const isWaiting = myArgCount > opponentArgCount;
  const currentRound = isWaiting ? myArgCount : myArgCount + 1;
  const isFirstRound = currentRound === 1;

  if (!isWaiting && myArgCount >= dispute.max_rounds) {
    redirect(`/dispute/${id}`);
  }

  // Последний аргумент оппонента (для показа в чате)
  const lastOpponentArg = args
    ?.filter((a) => a.author_id === opponentId)
    .at(-1);

  // Профили
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", [dispute.creator_id, opponentId])
    .returns<{ id: string; display_name: string | null }[]>();

  const getName = (pid: string) =>
    profiles?.find((p) => p.id === pid)?.display_name ?? "Участник";

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link
        href={`/dispute/${id}`}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
      >
        &larr; К спору
      </Link>

      {/* Dispute context */}
      <div className="glass rounded-xl p-4 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          Предмет спора
        </p>
        <p className="font-semibold text-white mb-1">{dispute.title}</p>
        <p className="text-sm text-gray-400 line-clamp-3">
          {dispute.description}
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          {isFirstRound ? "Ваша позиция" : `Раунд ${currentRound}`}
        </h1>
        <span className="text-sm text-gray-500">из {dispute.max_rounds}</span>
      </div>

      {isWaiting ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-2xl mb-3">✓</p>
          <p className="font-semibold text-white mb-2">Аргумент принят</p>
          <p className="text-gray-400 text-sm">
            Ожидаем ответа оппонента...
          </p>
        </div>
      ) : isFirstRound ? (
        /* ==================== РАУНД 1: полная форма ==================== */
        <div className="glass rounded-2xl p-8">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-5">
              {errorMsg}
            </div>
          )}

          <form action={submitArgument} className="flex flex-col gap-5">
            <input type="hidden" name="dispute_id" value={id} />

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-300">
                Ваша позиция
              </span>
              <input
                name="position"
                type="text"
                required
                maxLength={300}
                className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                placeholder="«Я считаю, что...»"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-300">
                Аргументы и обоснование
              </span>
              <textarea
                name="reasoning"
                required
                rows={6}
                className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-y"
                placeholder="Подробно объясните свою позицию..."
              />
            </label>

            <EvidenceFields />

            <div className="flex gap-3 mt-2">
              <SubmitButton
                pendingText="Отправляем..."
                className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Подать аргумент
              </SubmitButton>
              <Link
                href={`/dispute/${id}`}
                className="glass px-6 py-2.5 rounded-lg font-medium text-gray-300 hover:text-white transition-colors"
              >
                Отмена
              </Link>
            </div>
          </form>
        </div>
      ) : (
        /* ==================== РАУНД 2+: чат-стиль ==================== */
        <div className="flex flex-col gap-4">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Последний аргумент оппонента */}
          {lastOpponentArg && (
            <div className="flex justify-start">
              <div className="max-w-[85%] flex flex-col gap-1">
                <span className="text-xs text-gray-500 px-1">
                  {getName(opponentId)} · Раунд {lastOpponentArg.round}
                </span>
                <div className="glass border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="font-semibold text-white text-sm mb-1">
                    {lastOpponentArg.position}
                  </p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {lastOpponentArg.reasoning}
                  </p>
                  {lastOpponentArg.evidence && (
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-white/8">
                      📎 {lastOpponentArg.evidence}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Форма ответа — чат-стиль */}
          <div className="flex justify-end">
            <div className="w-full max-w-[85%]">
              <span className="text-xs text-gray-500 px-1 block text-right mb-1">
                {getName(user.id)} <span className="text-purple-500">(вы)</span>
              </span>

              <form action={submitArgument} className="flex flex-col gap-3">
                <input type="hidden" name="dispute_id" value={id} />
                {/* Позиция скрыта — берём «Ответ» как маркер, что это продолжение */}
                <input type="hidden" name="position" value="Ответ" />

                <div className="bg-purple-600/15 border border-purple-500/20 rounded-2xl rounded-tr-sm px-4 py-3">
                  <textarea
                    name="reasoning"
                    required
                    rows={4}
                    className="w-full bg-transparent text-white placeholder:text-gray-600 focus:outline-none resize-y text-sm leading-relaxed"
                    placeholder="Ваш ответ..."
                    autoFocus
                  />

                  <EvidenceFields compact />
                </div>

                <div className="flex gap-2 justify-end">
                  <Link
                    href={`/dispute/${id}`}
                    className="text-sm text-gray-500 hover:text-gray-300 px-3 py-2 transition-colors"
                  >
                    Отмена
                  </Link>
                  <SubmitButton
                    pendingText="..."
                    className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl font-semibold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Отправить →
                  </SubmitButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
