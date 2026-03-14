"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendChallengeMessage, closeChallenge, requestChallengeMediation } from "@/lib/arena-actions";

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
  myName: string;
  opponentName: string;
  isClosed: boolean;
  authorId: string;
  acceptedById: string | null;
}

export default function ChallengeChat({
  challengeId,
  initialMessages,
  currentUserId,
  myName,
  opponentName,
  isClosed,
  authorId,
  acceptedById,
}: ChallengeChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Count non-AI messages
  const realMessageCount = messages.filter((m) => !m.is_ai).length;
  // Last non-AI message
  const lastRealMsg = [...messages].reverse().find((m) => !m.is_ai);
  const isMyTurn = lastRealMsg ? lastRealMsg.author_id !== currentUserId : true;
  const waitingForOpponent = !isMyTurn && !isClosed;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("challenge:" + challengeId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenge_messages",
          filter: `challenge_id=eq.${challengeId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [challengeId]);

  async function handleSend() {
    if (!input.trim() || sending || !isMyTurn || isClosed) return;

    const content = input.trim();
    setInput("");
    setSending(true);

    // Trigger AI after every 4 real messages
    const newCount = realMessageCount + 1;
    const triggerAI = newCount > 0 && newCount % 4 === 0;

    try {
      await sendChallengeMessage(challengeId, content, triggerAI);
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Messages */}
      <div className="h-[460px] overflow-y-auto p-5 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-600 text-sm">Начните дискуссию — напишите первое сообщение</p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.is_ai) {
            return (
              <div key={msg.id} className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3 mx-4">
                <p className="text-xs text-purple-400 font-semibold mb-1">🤖 Медиатор</p>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            );
          }

          const isMe = msg.author_id === currentUserId;
          const name = msg.profiles?.display_name ?? (isMe ? myName : opponentName);

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isMe
                  ? "bg-purple-600/80 text-white rounded-br-sm"
                  : "bg-white/8 text-gray-200 rounded-bl-sm"
              }`}>
                {!isMe && (
                  <p className="text-xs text-gray-500 font-medium mb-1">{name}</p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
              <span className="text-xs text-gray-700 mt-1 px-1">{formatTime(msg.created_at)}</span>
            </div>
          );
        })}

        {waitingForOpponent && (
          <div className="text-center py-2">
            <p className="text-xs text-gray-600 italic">Ожидаем ответа от {opponentName}...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!isClosed ? (
        <div className="border-t border-white/8 p-4">
          {waitingForOpponent ? (
            <p className="text-center text-sm text-gray-500 py-2">
              Ожидаем {opponentName}...
            </p>
          ) : (
            <div className="flex gap-2 mb-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={sending}
                placeholder="Ваш аргумент..."
                maxLength={2000}
                className="flex-1 border border-white/10 bg-white/5 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 text-sm transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl font-medium transition-colors text-sm"
              >
                {sending ? "..." : "→"}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <form action={requestChallengeMediation.bind(null, challengeId)} className="flex-1">
              <button
                type="submit"
                className="w-full text-xs text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-lg py-2 transition-colors"
              >
                🤝 Запросить медиацию ИИ
              </button>
            </form>
            <form action={closeChallenge.bind(null, challengeId)}>
              <button
                type="submit"
                className="text-xs text-gray-600 hover:text-gray-400 border border-white/8 hover:border-white/20 rounded-lg px-3 py-2 transition-colors"
              >
                Закрыть
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="border-t border-white/8 p-4 text-center">
          <p className="text-sm text-gray-500">Дискуссия завершена</p>
          <a href="/arena" className="text-sm text-purple-400 hover:underline mt-1 inline-block">
            ← Вернуться на Арену
          </a>
        </div>
      )}
    </div>
  );
}
