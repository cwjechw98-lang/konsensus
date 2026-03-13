"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { proposeEarlyEnd, acceptEarlyEnd, declineEarlyEnd } from "@/lib/actions";

type Arg = {
  id: string;
  dispute_id: string;
  author_id: string;
  round: number;
  position: string;
  reasoning: string;
  evidence: string | null;
};

type Profile = { id: string; display_name: string | null };

type DisputeSnap = {
  id: string;
  max_rounds: number;
  creator_id: string;
  opponent_id: string | null;
  status: string;
};

function notify(title: string, body?: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "konsensus",
    });
  }
}

const HEAT_LABELS = ["", "Спокойно", "Почти мирно", "Напряжённо", "Горячо", "Накалено"];
const HEAT_ICONS  = ["", "😊", "🙂", "😤", "🔥", "💥"];
const HEAT_TEXT   = ["", "text-green-400", "text-green-300", "text-yellow-400", "text-orange-400", "text-red-400"];
const HEAT_BORDER = ["", "border-green-500/20", "border-green-500/20", "border-yellow-500/20", "border-orange-500/20", "border-red-500/20"];
const HEAT_BG     = ["", "bg-green-500/10", "bg-green-500/10", "bg-yellow-500/10", "bg-orange-500/10", "bg-red-500/10"];
const HEAT_DOT    = ["", "bg-green-400", "bg-green-400", "bg-yellow-400", "bg-orange-400", "bg-red-400"];

function HeatMeter({ level }: { level: number }) {
  if (!level || level < 1 || level > 5) return null;
  return (
    <div className={`glass rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2 border ${HEAT_BG[level]} ${HEAT_BORDER[level]}`}>
      <span className="text-base">{HEAT_ICONS[level]}</span>
      <span className={`text-sm font-medium ${HEAT_TEXT[level]}`}>
        Накал: {HEAT_LABELS[level]}
      </span>
      <div className="ml-auto flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${i <= level ? HEAT_DOT[level] : "bg-white/10"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function RealtimeDisputeClient({
  initialArgs,
  initialStatus,
  dispute,
  userId,
  profiles,
  isParticipant,
  isCreator,
  roundInsights,
  heatLevel: initialHeatLevel = 0,
  earlyEndProposedBy: initialEarlyEndProposedBy = null,
}: {
  initialArgs: Arg[];
  initialStatus: string;
  dispute: DisputeSnap;
  userId: string;
  profiles: Profile[];
  isParticipant: boolean;
  isCreator: boolean;
  roundInsights: Record<number, string>;
  heatLevel?: number;
  earlyEndProposedBy?: string | null;
}) {
  const router = useRouter();
  const [args, setArgs] = useState<Arg[]>(initialArgs);
  const [status, setStatus] = useState(initialStatus);
  const [newArgFlash, setNewArgFlash] = useState<string | null>(null);
  const [insights, setInsights] = useState<Record<number, string>>(roundInsights);
  const [heatLevel, setHeatLevel] = useState(initialHeatLevel);
  const [earlyEndProposedBy, setEarlyEndProposedBy] = useState<string | null>(initialEarlyEndProposedBy);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    // Инсайты
    const insightsChannel = supabase
      .channel(`insights-${dispute.id}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "round_insights",
          filter: `dispute_id=eq.${dispute.id}`,
        },
        (payload) => {
          const row = payload.new as { round: number; recipient_id: string; content: string };
          if (row.recipient_id === userId) {
            setInsights((prev) => ({ ...prev, [row.round]: row.content }));
            notify("Konsensus", "ИИ подготовил для вас комментарий");
            scrollToBottom();
          }
        }
      )
      .subscribe();

    // Обновления dispute_analysis (heat_level)
    const analysisChannel = supabase
      .channel(`analysis-${dispute.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dispute_analysis",
          filter: `dispute_id=eq.${dispute.id}`,
        },
        (payload) => {
          const row = payload.new as { heat_level?: number };
          if (row.heat_level) setHeatLevel(row.heat_level);
        }
      )
      .subscribe();

    const channel = supabase
      .channel(`dispute-${dispute.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "arguments",
          filter: `dispute_id=eq.${dispute.id}`,
        },
        (payload) => {
          const newArg = payload.new as Arg;
          setArgs((prev) => {
            if (prev.some((a) => a.id === newArg.id)) return prev;
            return [...prev, newArg];
          });
          if (newArg.author_id !== userId) {
            setNewArgFlash("Оппонент ответил");
            notify("Konsensus", "Оппонент подал аргумент — ваш ход");
            setTimeout(() => setNewArgFlash(null), 4000);
          }
          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "disputes",
          filter: `id=eq.${dispute.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status as string;
          const prevStatus = status;
          setStatus(newStatus);

          // Early end proposal state
          const newEarlyEnd = payload.new.early_end_proposed_by as string | null;
          setEarlyEndProposedBy(newEarlyEnd ?? null);

          if (prevStatus === "open" && newStatus === "in_progress") {
            setNewArgFlash("Оппонент присоединился!");
            notify("Konsensus", "Оппонент принял вызов — спор начался!");
            setTimeout(() => setNewArgFlash(null), 4000);
            router.refresh();
          }

          if (newStatus === "mediation") {
            setNewArgFlash("Все раунды завершены — ИИ готов к анализу");
            notify("Konsensus", "Раунды завершены — ИИ готовит анализ");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(insightsChannel);
      supabase.removeChannel(analysisChannel);
    };
  }, [dispute.id, userId, scrollToBottom, router, status]);

  const getName = (pid: string | null) => {
    if (!pid) return "Участник";
    return profiles.find((p) => p.id === pid)?.display_name ?? "Участник";
  };

  const rounds = Array.from({ length: dispute.max_rounds }, (_, i) => i + 1);

  const opponentId = isCreator ? dispute.opponent_id : dispute.creator_id;
  const myArgCount = args.filter((a) => a.author_id === userId).length;
  const opponentArgCount = args.filter((a) => a.author_id === opponentId).length;
  const isWaiting = myArgCount > opponentArgCount;
  const allDone = myArgCount >= dispute.max_rounds;

  const iProposedEarlyEnd = earlyEndProposedBy === userId;
  const opponentProposedEarlyEnd = earlyEndProposedBy !== null && earlyEndProposedBy !== userId;

  return (
    <>
      {/* Flash уведомление */}
      {newArgFlash && (
        <div className="mb-4 bg-purple-500/15 border border-purple-500/25 text-purple-300 text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-pulse">
          <span className="pulse-dot w-2 h-2 rounded-full bg-purple-400 inline-block" />
          {newArgFlash}
        </div>
      )}

      {/* Tension Meter */}
      {status === "in_progress" && isParticipant && (
        <HeatMeter level={heatLevel} />
      )}

      {/* Early end proposal banner */}
      {status === "in_progress" && isParticipant && opponentProposedEarlyEnd && (
        <div className="mb-4 glass border border-yellow-500/25 rounded-xl p-4">
          <p className="text-sm font-semibold text-yellow-400 mb-1">
            Оппонент предлагает завершить спор досрочно
          </p>
          <p className="text-xs text-gray-500 mb-3">
            ИИ-медиатор проанализирует уже поданные аргументы.
          </p>
          <div className="flex gap-2">
            <form action={acceptEarlyEnd}>
              <input type="hidden" name="dispute_id" value={dispute.id} />
              <button
                type="submit"
                className="btn-ripple bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Принять
              </button>
            </form>
            <form action={declineEarlyEnd}>
              <input type="hidden" name="dispute_id" value={dispute.id} />
              <button
                type="submit"
                className="glass text-gray-400 hover:text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                Отклонить
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Waiting for early end acceptance */}
      {status === "in_progress" && isParticipant && iProposedEarlyEnd && (
        <div className="mb-4 glass border border-yellow-500/15 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="pulse-dot w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          <p className="text-sm text-yellow-400/80">Ожидаем согласия оппонента...</p>
          <form action={declineEarlyEnd} className="ml-auto">
            <input type="hidden" name="dispute_id" value={dispute.id} />
            <button type="submit" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Отменить
            </button>
          </form>
        </div>
      )}

      {/* Чат с аргументами */}
      {args.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-col gap-1">
            {rounds.map((round) => {
              const roundArgs = args.filter((a) => a.round === round);
              if (roundArgs.length === 0) return null;

              return (
                <div key={round}>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-white/6" />
                    <span className="text-xs text-gray-600 px-2">
                      Раунд {round} из {dispute.max_rounds}
                    </span>
                    <div className="flex-1 h-px bg-white/6" />
                  </div>

                  <div className="flex flex-col gap-3">
                    {roundArgs.map((arg) => {
                      const isMe = arg.author_id === userId;
                      return (
                        <div
                          key={arg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}
                          >
                            <span className="text-xs text-gray-500 px-1">
                              {getName(arg.author_id)}
                              {isMe && (
                                <span className="text-purple-500 ml-1">(вы)</span>
                              )}
                            </span>
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

                  {/* AI-инсайт после раунда */}
                  {roundArgs.length === 2 && insights[round] && (
                    <div className="mx-auto max-w-[90%] mt-3">
                      <div className="bg-violet-950/40 border border-violet-500/20 rounded-2xl px-4 py-3">
                        <p className="text-xs text-violet-400 font-semibold mb-1.5 flex items-center gap-1.5">
                          <span>🤖</span>
                          <span>Только для вас</span>
                        </p>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {insights[round]}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div ref={bottomRef} />
        </div>
      )}

      {/* Кнопки действий */}
      {status === "in_progress" && isParticipant && (() => {
        if (allDone && isWaiting) {
          return (
            <div className="flex flex-col gap-3">
              <div className="glass rounded-xl p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                <span className="pulse-dot w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                Все ваши аргументы поданы. Ждём оппонента...
              </div>
              {!earlyEndProposedBy && (
                <form action={proposeEarlyEnd}>
                  <input type="hidden" name="dispute_id" value={dispute.id} />
                  <button type="submit" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                    Предложить завершить досрочно
                  </button>
                </form>
              )}
            </div>
          );
        }
        if (isWaiting) {
          return (
            <div className="flex flex-col gap-3">
              <div className="glass rounded-xl p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                <span className="pulse-dot w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                Раунд {myArgCount} — ждём ответа оппонента...
              </div>
              {!earlyEndProposedBy && (
                <form action={proposeEarlyEnd}>
                  <input type="hidden" name="dispute_id" value={dispute.id} />
                  <button type="submit" className="text-xs text-gray-600 hover:text-gray-400 transition-colors text-center w-full">
                    Предложить завершить досрочно
                  </button>
                </form>
              )}
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-3">
            <Link
              href={`/dispute/${dispute.id}/argue`}
              className="btn-ripple inline-block bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              Написать аргумент · Раунд {myArgCount + 1}
            </Link>
            {!earlyEndProposedBy && myArgCount > 0 && (
              <form action={proposeEarlyEnd}>
                <input type="hidden" name="dispute_id" value={dispute.id} />
                <button type="submit" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                  Предложить завершить досрочно
                </button>
              </form>
            )}
          </div>
        );
      })()}

      {status === "mediation" && isParticipant && (
        <Link
          href={`/dispute/${dispute.id}/mediation`}
          className="btn-ripple inline-block bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
        >
          🤖 Посмотреть анализ ИИ
        </Link>
      )}

      {status === "resolved" && isParticipant && (
        <Link
          href={`/dispute/${dispute.id}/mediation`}
          className="btn-ripple inline-block bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
        >
          ✓ Результат медиации
        </Link>
      )}
    </>
  );
}
