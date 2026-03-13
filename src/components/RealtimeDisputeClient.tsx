"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

export default function RealtimeDisputeClient({
  initialArgs,
  initialStatus,
  dispute,
  userId,
  profiles,
  isParticipant,
  isCreator,
}: {
  initialArgs: Arg[];
  initialStatus: string;
  dispute: DisputeSnap;
  userId: string;
  profiles: Profile[];
  isParticipant: boolean;
  isCreator: boolean;
}) {
  const [args, setArgs] = useState<Arg[]>(initialArgs);
  const [status, setStatus] = useState(initialStatus);
  const [newArgFlash, setNewArgFlash] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

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
          // Flash уведомление если аргумент не наш
          if (newArg.author_id !== userId) {
            setNewArgFlash("Оппонент ответил");
            setTimeout(() => setNewArgFlash(null), 4000);
          }
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 150);
        }
      )
      // Изменение статуса спора
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "disputes",
          filter: `id=eq.${dispute.id}`,
        },
        (payload) => {
          setStatus(payload.new.status as string);
          if (payload.new.status === "mediation") {
            setNewArgFlash("Все раунды завершены — ИИ готов к анализу");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dispute.id, userId]);

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
