"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { closeChallenge, sendChallengeMessage } from "@/lib/arena-actions";
import WaitingAmbient from "@/components/WaitingAmbient";

interface Message {
  id: string;
  content: string;
  author_id: string | null;
  is_ai: boolean;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

interface ChallengeChatProps {
  challengeId: string;
  initialMessages: Message[];
  currentUserId: string;
  opponentName: string;
  maxRounds: number;
  isClosed: boolean;
  authorId: string;
  acceptedById: string | null;
}

type TimelineItem = Message & {
  derivedRound: number | null;
  startsRound: boolean;
};

function formatRoundLabel(value: number) {
  return `${value} ${value === 1 ? "раунд" : value < 5 ? "раунда" : "раундов"}`;
}

export default function ChallengeChat({
  challengeId,
  initialMessages,
  currentUserId,
  opponentName,
  maxRounds,
  isClosed: initialClosed,
  authorId,
  acceptedById,
}: ChallengeChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isClosed, setIsClosed] = useState(initialClosed);
  const bottomRef = useRef<HTMLDivElement>(null);

  const humanMessages = useMemo(
    () => messages.filter((message) => !message.is_ai),
    [messages]
  );

  const myCount = humanMessages.filter((message) => message.author_id === currentUserId).length;
  const opponentId = currentUserId === authorId ? acceptedById : authorId;
  const opponentCount = humanMessages.filter((message) => message.author_id === opponentId).length;
  const completedRounds = Math.min(
    humanMessages.filter((message) => message.author_id === authorId).length,
    humanMessages.filter((message) => message.author_id === acceptedById).length
  );
  const isAuthor = currentUserId === authorId;
  const isMyTurn = !isClosed && !!acceptedById && (
    isAuthor
      ? myCount === opponentCount && myCount < maxRounds
      : myCount < opponentCount && myCount < maxRounds
  );
  const waitingForOpponent = !isClosed && !!acceptedById && !isMyTurn && myCount < maxRounds;
  const nextRound = Math.min(maxRounds, myCount + 1);

  const timeline = useMemo<TimelineItem[]>(() => {
    let authorTurns = 0;
    let acceptedTurns = 0;
    let lastRound = 0;

    return messages.map((message) => {
      if (message.is_ai || !message.author_id) {
        return { ...message, derivedRound: lastRound || null, startsRound: false };
      }

      const derivedRound = message.author_id === authorId
        ? ++authorTurns
        : message.author_id === acceptedById
          ? ++acceptedTurns
          : null;

      const startsRound = !!derivedRound && derivedRound !== lastRound;
      if (derivedRound) lastRound = derivedRound;

      return { ...message, derivedRound, startsRound };
    });
  }, [acceptedById, authorId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isClosed]);

  useEffect(() => {
    const supabase = createClient();
    const messagesChannel = supabase
      .channel(`challenge:${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenge_messages",
          filter: `challenge_id=eq.${challengeId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((message) => message.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    const challengeChannel = supabase
      .channel(`challenge-state:${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "challenges",
          filter: `id=eq.${challengeId}`,
        },
        (payload) => {
          const status = payload.new.status as string | undefined;
          if (status === "closed") {
            setIsClosed(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(challengeChannel);
    };
  }, [challengeId]);

  async function handleSend() {
    if (!input.trim() || sending || !isMyTurn || isClosed) return;

    const content = input.trim();
    setInput("");
    setSending(true);

    try {
      await sendChallengeMessage(challengeId, content);
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="border-b border-white/8 px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-sm font-semibold text-white">Раундовая дискуссия</h2>
          <span className="text-xs text-gray-500">
            {completedRounds} / {maxRounds}
          </span>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500/60 rounded-full transition-all duration-500"
            style={{ width: `${(completedRounds / maxRounds) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Арена идёт по раундам. После {formatRoundLabel(maxRounds)} медиация запускается автоматически.
        </p>
      </div>

      <div className="max-h-[560px] overflow-y-auto p-5 flex flex-col gap-3">
        {timeline.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-600 text-sm">Инициатор начинает первый раунд.</p>
          </div>
        )}

        {timeline.map((message) => {
          if (message.startsRound && message.derivedRound) {
            const separator = (
              <div key={`round-${message.id}`} className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-white/6" />
                <span className="text-xs text-gray-600 px-2">
                  Раунд {message.derivedRound} из {maxRounds}
                </span>
                <div className="flex-1 h-px bg-white/6" />
              </div>
            );

            const node = message.is_ai ? null : (
              <div
                key={message.id}
                className={`flex flex-col ${message.author_id === currentUserId ? "items-end" : "items-start"}`}
              >
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                  message.author_id === currentUserId
                    ? "bg-orange-600/20 border border-orange-500/30 text-white rounded-br-sm"
                    : "bg-white/8 border border-white/10 text-gray-200 rounded-bl-sm"
                }`}>
                  {message.author_id !== currentUserId && (
                    <p className="text-xs text-gray-500 font-medium mb-1">
                      {message.profiles?.display_name ?? opponentName}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
                <span className="text-xs text-gray-700 mt-1 px-1">{formatTime(message.created_at)}</span>
              </div>
            );

            return (
              <div key={`group-${message.id}`} className="contents">
                {separator}
                {node}
              </div>
            );
          }

          if (message.is_ai) {
            return (
              <div key={message.id} className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3 mx-2">
                <p className="text-xs text-purple-400 font-semibold mb-1">
                  {message.content.startsWith("🏁") ? "🤖 Итог арены" : "🤖 Комментарий арены"}
                </p>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            );
          }

          const isMine = message.author_id === currentUserId;
          return (
            <div key={message.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                isMine
                  ? "bg-orange-600/20 border border-orange-500/30 text-white rounded-br-sm"
                  : "bg-white/8 border border-white/10 text-gray-200 rounded-bl-sm"
              }`}>
                {!isMine && (
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    {message.profiles?.display_name ?? opponentName}
                  </p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
              <span className="text-xs text-gray-700 mt-1 px-1">{formatTime(message.created_at)}</span>
            </div>
          );
        })}

        {waitingForOpponent && (
          <div className="flex flex-col gap-3">
            <div className="glass rounded-xl p-4 text-center text-sm text-gray-500">
              Раунд {Math.min(maxRounds, myCount)}: ждём ответ от {opponentName}.
            </div>
            <WaitingAmbient variant="arena" />
          </div>
        )}

        {isClosed && (
          <div className="glass rounded-xl p-4 text-center text-sm text-emerald-300 border border-emerald-500/20">
            Дискуссия завершена. Финальная медиация уже опубликована в ленте выше.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {!isClosed ? (
        <div className="border-t border-white/8 p-4">
          {!acceptedById ? (
            <p className="text-center text-sm text-gray-500 py-2">
              Ждём второго участника. Как только вызов примут, начнётся раунд 1.
            </p>
          ) : waitingForOpponent ? (
            <p className="text-center text-sm text-gray-500 py-2">
              Сейчас ход у {opponentName}. Медиация запустится автоматически после финального раунда.
            </p>
          ) : (
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Ваш ход · Раунд {nextRound}</p>
                <span className="text-xs text-gray-600">до 2000 символов</span>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending || !isMyTurn}
                rows={4}
                placeholder={isAuthor ? "Сформулируйте свой аргумент для текущего раунда..." : "Ответьте на аргумент оппонента в рамках текущего раунда..."}
                maxLength={2000}
                className="w-full border border-white/10 bg-white/5 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/40 text-sm transition-colors resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl font-medium transition-colors text-sm"
                >
                  {sending ? "Отправляем..." : `Отправить раунд ${nextRound}`}
                </button>
                <form action={closeChallenge.bind(null, challengeId)}>
                  <button
                    type="submit"
                    className="text-xs text-gray-600 hover:text-gray-400 border border-white/8 hover:border-white/20 rounded-lg px-3 py-2 transition-colors h-full"
                  >
                    Закрыть вызов
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-white/8 p-4 text-center">
          <p className="text-sm text-gray-500">Дискуссия завершена</p>
          <Link href="/arena" className="text-sm text-purple-400 hover:underline mt-1 inline-block">
            ← Вернуться на Арену
          </Link>
        </div>
      )}
    </div>
  );
}
