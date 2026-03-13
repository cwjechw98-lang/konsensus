"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

export default function RealtimeDisputeClient({
  initialArgs,
  initialStatus,
  dispute,
  userId,
  profiles,
  isParticipant,
  isCreator,
  roundInsights,
}: {
  initialArgs: Arg[];
  initialStatus: string;
  dispute: DisputeSnap;
  userId: string;
  profiles: Profile[];
  isParticipant: boolean;
  isCreator: boolean;
  roundInsights: Record<number, string>;
}) {
  const router = useRouter();
  const [args, setArgs] = useState<Arg[]>(initialArgs);
  const [status, setStatus] = useState(initialStatus);
  const [newArgFlash, setNewArgFlash] = useState<string | null>(null);
  const [insights, setInsights] = useState<Record<number, string>>(roundInsights);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Запрашиваем разрешение на уведомления
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

    // Подписка на новые инсайты для этого пользователя
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

    const channel = supabase
      .channel(`dispute-${dispute.id}`)
      // Новые аргументы
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
          // Flash + push-уведомление если аргумент не наш
          if (newArg.author_id !== userId) {
            setNewArgFlash("Оппонент ответил");
            notify("Konsensus", "Оппонент подал аргумент — ваш ход");
            setTimeout(() => setNewArgFlash(null), 4000);
          }
          scrollToBottom();
        }
      )
      // Изменение статуса или оппонента
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

          // Оппонент присоединился — перерисовываем серверную часть
          if (prevStatus === "open" && newStatus === "in_progress") {
            setNewArgFlash("Оппонент присоединился!");
            notify("Konsensus", "Оппонент принял вызов — спор начался!");
            setTimeout(() => setNewArgFlash(null), 4000);
            router.refresh(); // перезагрузить серверные данные (имя оппонента, invite-секция скроется)
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
    };
  }, [dispute.id, userId, scrollToBottom, router, status]);

  const getName = (pid: string | null) => {
    if (!pid) return "Участник";
    return profiles.find((p) => p.id === pid)?.display_name ?? "Участник";
  };

  const rounds = Array.from({ length: dispute.max_rounds }, (_, i) => i + 1);

  // Вычисляем состояние
  const opponentId = isCreator ? dispute.opponent_id : dispute.creator_id;
  const myArgCount = args.filter((a) => a.author_id === userId).length;
  const opponentArgCount = args.filter(
    (a) => a.author_id === opponentId
  ).length;
  const isWaiting = myArgCount > opponentArgCount;
  const allDone = myArgCount >= dispute.max_rounds;

  return (
    <>
      {/* Flash уведомление о новом событии */}
      {newArgFlash && (
        <div className="mb-4 bg-purple-500/15 border border-purple-500/25 text-purple-300 text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-pulse">
          <span className="pulse-dot w-2 h-2 rounded-full bg-purple-400 inline-block" />
          {newArgFlash}
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
                  {/* Разделитель раунда */}
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
                                <span className="text-purple-500 ml-1">
                                  (вы)
                                </span>
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

                  {/* Персональный AI-инсайт после раунда (только если оба ответили) */}
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
      {status === "in_progress" &&
        isParticipant &&
        (() => {
          if (allDone && isWaiting) {
            return (
              <div className="glass rounded-xl p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                <span className="pulse-dot w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                Все ваши аргументы поданы. Ждём оппонента...
              </div>
            );
          }
          if (isWaiting) {
            return (
              <div className="glass rounded-xl p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                <span className="pulse-dot w-2 h-2 rounded-full bg-yellow-400 inline-block" />
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
