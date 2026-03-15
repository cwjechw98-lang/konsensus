"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  addChallengeComment,
  closeChallenge,
  sendChallengeMessage,
  submitChallengeOpinion,
  toggleChallengeWatch,
} from "@/lib/arena-actions";
import WaitingAmbient from "@/components/WaitingAmbient";
import SpectatorPulseGame from "@/components/SpectatorPulseGame";

interface Message {
  id: string;
  content: string;
  author_id: string | null;
  is_ai: boolean;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

interface ObserverComment {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
}

interface ObserverHint {
  round: number;
  content: string;
  created_at: string;
}

interface ChallengeChatProps {
  challengeId: string;
  initialMessages: Message[];
  currentUserId: string | null;
  opponentName: string;
  maxRounds: number;
  isClosed: boolean;
  authorId: string;
  acceptedById: string | null;
  currentUserName: string | null;
  isParticipant: boolean;
  initialComments: ObserverComment[];
  initialObserverHints: ObserverHint[];
  isWatching: boolean;
  canWatchWithTelegram: boolean;
  opinionCount: number;
}

type TimelineItem = Message & {
  derivedRound: number | null;
  startsRound: boolean;
};

type TypingPayload = {
  userId: string;
  name: string;
  isTyping: boolean;
};

function formatRoundLabel(value: number) {
  return `${value} ${value === 1 ? "раунд" : value < 5 ? "раунда" : "раундов"}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
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
  currentUserName,
  isParticipant,
  initialComments,
  initialObserverHints,
  isWatching: initialWatching,
  canWatchWithTelegram,
  opinionCount: initialOpinionCount,
}: ChallengeChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [observerComments, setObserverComments] = useState<ObserverComment[]>(initialComments);
  const [observerHints, setObserverHints] = useState<ObserverHint[]>(initialObserverHints);
  const [input, setInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [opinionInput, setOpinionInput] = useState("");
  const [sending, setSending] = useState(false);
  const [commentSending, setCommentSending] = useState(false);
  const [opinionSending, setOpinionSending] = useState(false);
  const [isClosed, setIsClosed] = useState(initialClosed);
  const [isWatching, setIsWatching] = useState(initialWatching);
  const [opinionCount, setOpinionCount] = useState(initialOpinionCount);
  const [typingName, setTypingName] = useState("");
  const [typingPulse, setTypingPulse] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);

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
  const isMyTurn = isParticipant && !isClosed && !!acceptedById && (
    isAuthor
      ? myCount === opponentCount && myCount < maxRounds
      : myCount < opponentCount && myCount < maxRounds
  );
  const waitingForOpponent = isParticipant && !isClosed && !!acceptedById && !isMyTurn && myCount < maxRounds;
  const nextRound = Math.min(maxRounds, myCount + 1);
  const currentOpinionRound = Math.min(maxRounds, Math.max(1, completedRounds + 1));

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

  const collapseToken = `${completedRounds}-${humanMessages.length}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, observerComments, observerHints, isClosed]);

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

    const commentsChannel = supabase
      .channel(`challenge-comments:${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenge_comments",
          filter: `challenge_id=eq.${challengeId}`,
        },
        (payload) => {
          const row = payload.new as ObserverComment;
          setObserverComments((prev) => prev.some((item) => item.id === row.id) ? prev : [...prev, row]);
        }
      )
      .subscribe();

    const hintsChannel = supabase
      .channel(`challenge-hints:${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenge_observer_hints",
          filter: `challenge_id=eq.${challengeId}`,
        },
        (payload) => {
          const row = payload.new as ObserverHint;
          setObserverHints((prev) => prev.some((item) => item.round === row.round) ? prev : [...prev, row]);
        }
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`arena-typing:${challengeId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const data = payload as TypingPayload;
        if (!data?.userId || data.userId === currentUserId) return;
        if (!data.isTyping) {
          setTypingName("");
          return;
        }

        setTypingName(data.name);
        setTypingPulse((value) => value + 1);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingName(""), 2400);
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(challengeChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(hintsChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [challengeId, currentUserId]);

  async function emitTyping(isTyping: boolean) {
    if (!currentUserId || !isParticipant || !typingChannelRef.current) return;
    await typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
        payload: {
          userId: currentUserId,
          name: currentUserName ?? (isAuthor ? "Инициатор" : "Оппонент"),
          isTyping,
        } satisfies TypingPayload,
    });
  }

  function scheduleTyping() {
    if (!isParticipant) return;
    void emitTyping(true);
    if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
    broadcastTimeoutRef.current = setTimeout(() => {
      void emitTyping(false);
    }, 1800);
  }

  async function handleSend() {
    if (!input.trim() || sending || !isMyTurn || isClosed) return;

    const content = input.trim();
    setInput("");
    setSending(true);
    void emitTyping(false);

    try {
      await sendChallengeMessage(challengeId, content);
    } finally {
      setSending(false);
    }
  }

  async function handleWatchToggle() {
    if (!currentUserId || !canWatchWithTelegram) return;
    const formData = new FormData();
    formData.set("challenge_id", challengeId);
    await toggleChallengeWatch(formData);
    setIsWatching((value) => !value);
  }

  async function handleCommentSend() {
    if (!currentUserId || !commentInput.trim() || commentSending) return;
    setCommentSending(true);

    try {
      const formData = new FormData();
      formData.set("challenge_id", challengeId);
      formData.set("content", commentInput.trim());
      await addChallengeComment(formData);
      setCommentInput("");
    } finally {
      setCommentSending(false);
    }
  }

  async function handleOpinionSend() {
    if (!currentUserId || !opinionInput.trim() || opinionSending || opinionCount >= 3) return;
    setOpinionSending(true);

    try {
      const formData = new FormData();
      formData.set("challenge_id", challengeId);
      formData.set("round", String(currentOpinionRound));
      formData.set("content", opinionInput.trim());
      await submitChallengeOpinion(formData);
      setOpinionInput("");
      setOpinionCount((value) => value + 1);
    } finally {
      setOpinionSending(false);
    }
  }

  const latestHint = observerHints.at(-1) ?? null;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="border-b border-white/8 px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-sm font-semibold text-white">
            {isParticipant ? "Раундовая дискуссия" : "Live battle"}
          </h2>
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
          {isParticipant
            ? `Арена идёт по раундам. После ${formatRoundLabel(maxRounds)} медиация запускается автоматически.`
            : "Смотреть battle можно без входа. Observer chat и мнение доступны после авторизации."}
        </p>
      </div>

      {typingName && (
        <div key={typingPulse} className="border-b border-cyan-500/15 bg-cyan-500/[0.06] px-5 py-3 text-sm text-cyan-200">
          <span className="pulse-dot mr-2 inline-block h-2 w-2 rounded-full bg-cyan-300" />
          {typingName} печатает ответ...
        </div>
      )}

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

      {isParticipant && latestHint && (
        <div className="border-t border-white/8 px-4 py-4">
          <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80 mb-2">
              Взгляд наблюдателей · Приватный hint
            </p>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {latestHint.content}
            </p>
          </div>
        </div>
      )}

      {!isClosed ? (
        <div className="border-t border-white/8 p-4">
          {!acceptedById ? (
            <p className="text-center text-sm text-gray-500 py-2">
              Ждём второго участника. Как только вызов примут, начнётся раунд 1.
            </p>
          ) : isParticipant ? (
            waitingForOpponent ? (
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
                  onChange={(e) => {
                    setInput(e.target.value);
                    scheduleTyping();
                  }}
                  onBlur={() => void emitTyping(false)}
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
            )
          ) : (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Наблюдать за боем</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Подписка в Telegram предупредит о завершении раунда и финале battle.
                    </p>
                  </div>
                  {currentUserId ? (
                    canWatchWithTelegram ? (
                      <button
                        type="button"
                        onClick={handleWatchToggle}
                        className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                          isWatching
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border border-cyan-500/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
                        }`}
                      >
                        {isWatching ? "Вы подписаны в Telegram" : "Подписаться на бой в Telegram"}
                      </button>
                    ) : (
                      <Link href="/profile" className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors">
                        Привяжите Telegram в профиле
                      </Link>
                    )
                  ) : (
                    <Link href="/login" className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors">
                      Войдите, чтобы подписаться
                    </Link>
                  )}
                </div>
              </div>

              <SpectatorPulseGame collapseToken={collapseToken} />

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Чат наблюдателей</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Видят все зрители. Писать могут только авторизованные наблюдатели.
                    </p>
                  </div>
                  <span className="text-xs text-gray-600">{observerComments.length}</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 mb-3 pr-1">
                  {observerComments.length === 0 ? (
                    <p className="text-sm text-gray-500">Пока тихо. Наблюдатели только собираются.</p>
                  ) : (
                    observerComments.map((comment) => (
                      <div key={comment.id} className="text-sm">
                        <span className="text-cyan-300">{comment.author_name}:</span>{" "}
                        <span className="text-gray-300">{comment.content}</span>
                      </div>
                    ))
                  )}
                </div>

                {currentUserId ? (
                  <div className="flex gap-2">
                    <input
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      maxLength={400}
                      placeholder="Короткий комментарий наблюдателя..."
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/35"
                    />
                    <button
                      type="button"
                      onClick={handleCommentSend}
                      disabled={commentSending || !commentInput.trim()}
                      className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 transition-colors hover:bg-cyan-500/15 disabled:opacity-40"
                    >
                      {commentSending ? "..." : "Отправить"}
                    </button>
                  </div>
                ) : (
                  <Link href="/login" className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors">
                    Войдите, чтобы писать в чат наблюдателей
                  </Link>
                )}
              </div>

              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Оставить мнение</p>
                    <p className="text-xs text-gray-500 mt-1">
                      До 3 мнений на battle. Участники увидят только мягкую AI-агрегацию, а не сырые сообщения.
                    </p>
                  </div>
                  <span className="text-xs text-violet-300">{opinionCount}/3</span>
                </div>

                {currentUserId ? (
                  <div className="space-y-3">
                    <textarea
                      value={opinionInput}
                      onChange={(e) => setOpinionInput(e.target.value)}
                      rows={3}
                      maxLength={280}
                      placeholder="Какой угол взгляда мог бы помочь участникам лучше понять друг друга?"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/35 resize-none"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-600">
                        Следующая агрегация пойдёт в раунд {currentOpinionRound}.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpinionSend}
                        disabled={opinionSending || !opinionInput.trim() || opinionCount >= 3}
                        className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-200 transition-colors hover:bg-violet-500/15 disabled:opacity-40"
                      >
                        {opinionSending ? "Отправляем..." : opinionCount >= 3 ? "Лимит исчерпан" : "Отправить мнение"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link href="/login" className="text-sm text-violet-300 hover:text-violet-200 transition-colors">
                    Войдите, чтобы оставить мнение
                  </Link>
                )}
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
