"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { addComment } from "@/lib/actions";
import { getOrCreateSession } from "@/lib/nicknames";

type Comment = {
  id: string;
  content: string;
  author_name: string;
  is_ai: boolean;
  created_at: string;
};

type BlockState = { until: number; level: 1 | 2 } | null;

const WARN_1 = [
  "Полегче! Сурок ещё не успел прочитать предыдущее. Пауза 1 минуту.",
  "Чат не теннисный стол. Передохни минуту.",
  "Всезнающий Сурок поднял лапу: тормози. Пауза 1 мин.",
  "Слишком быстро. Минута тишины — и снова можно.",
  "Даже капибара не пишет так быстро. 1 минута паузы.",
];

const WARN_2 = [
  "Серьёзное предупреждение. Ещё раз — и вылетишь. 5 минут паузы.",
  "Всезнающий Сурок сердится. Последнее предупреждение. 5 минут тишины.",
  "Ещё одно нарушение — и тебя здесь не будет. Пауза 5 мин.",
  "Это уже флуд. 5 минут. Следующий раз — бан.",
];

const OVERLOAD = [
  "Чат перегружен. Слишком много голосов одновременно.",
  "Всезнающий Сурок не справляется. Чат временно закрыт.",
  "Слишком оживлённо. Зайди чуть позже.",
];

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function useCountdown(until: number | null) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!until) { setSecs(0); return; }
    const tick = () => setSecs(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [until]);
  return secs;
}

const BLOCK_KEY = (id: string) => `konsensus_block_${id}`;

export default function DisputeChat({ disputeId }: { disputeId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [nickname, setNickname] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sending, setSending] = useState(false);
  const [warnMsg, setWarnMsg] = useState("");
  const [block, setBlock] = useState<BlockState>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const secs = useCountdown(block?.until ?? null);

  // Restore block from localStorage on mount
  useEffect(() => {
    const { sessionId: sid, nickname: nick } = getOrCreateSession();
    setSessionId(sid);
    setNickname(nick);

    try {
      const saved = localStorage.getItem(BLOCK_KEY(disputeId));
      if (saved) {
        const parsed = JSON.parse(saved) as BlockState;
        if (parsed && parsed.until > Date.now()) setBlock(parsed);
        else localStorage.removeItem(BLOCK_KEY(disputeId));
      }
    } catch { /* ignore */ }

    const supabase = createClient();
    supabase
      .from("dispute_comments")
      .select("id, content, author_name, is_ai, created_at")
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setComments((data as Comment[]) ?? []);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      });

    const channel = supabase
      .channel(`chat-${disputeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dispute_comments", filter: `dispute_id=eq.${disputeId}` },
        (payload) => {
          const row = payload.new as Comment;
          setComments((prev) => prev.some((c) => c.id === row.id) ? prev : [...prev, row]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [disputeId]);

  // Clear expired block
  useEffect(() => {
    if (block && secs === 0) {
      setBlock(null);
      localStorage.removeItem(BLOCK_KEY(disputeId));
    }
  }, [secs, block, disputeId]);

  const applyBlock = useCallback((until: number, level: 1 | 2) => {
    const b = { until, level };
    setBlock(b);
    localStorage.setItem(BLOCK_KEY(disputeId), JSON.stringify(b));
    setWarnMsg(rnd(level === 1 ? WARN_1 : WARN_2));
  }, [disputeId]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    if (block && block.until > Date.now()) return;

    setSending(true);
    setWarnMsg("");

    const result = await addComment(disputeId, text.trim(), nickname, sessionId);

    if (result.overload) {
      setWarnMsg(rnd(OVERLOAD));
      applyBlock(result.blockUntil ?? Date.now() + 30_000, 1);
    } else if (result.error === "spam" && result.blockUntil && result.level) {
      applyBlock(result.blockUntil, result.level);
    } else if (!result.error) {
      setText("");
    }

    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const isBlocked = block !== null && secs > 0;

  return (
    <div className="mt-6 border-t border-white/8 pt-6">
      <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
        <span>💬</span>
        <span>Чат наблюдателей</span>
        {comments.length > 0 && (
          <span className="text-xs text-gray-600 font-normal">{comments.length}</span>
        )}
      </h3>

      {/* Messages */}
      <div className="flex flex-col gap-2 mb-4 max-h-72 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">
            Будьте первым — напишите что думаете
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2 items-baseline">
              <span className={`text-xs font-semibold flex-shrink-0 ${c.is_ai ? "text-amber-400" : "text-purple-400/70"}`}>
                {c.is_ai ? "🐾 " : ""}{c.author_name}{c.is_ai ? "" : ":"}
              </span>
              <p className={`text-sm leading-relaxed ${c.is_ai ? "text-amber-200/80 italic" : "text-gray-300"}`}>
                {c.is_ai && <span className="not-italic mr-1">—</span>}
                {c.content}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Warning / block banner */}
      {(warnMsg || isBlocked) && (
        <div className={`rounded-xl px-4 py-3 mb-3 text-sm ${
          block?.level === 2
            ? "bg-red-500/10 border border-red-500/20 text-red-400"
            : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
        }`}>
          {warnMsg && <p className="mb-1">{warnMsg}</p>}
          {isBlocked && (
            <p className="text-xs opacity-80">
              Доступ восстановится через {secs} сек.
            </p>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex flex-col gap-1.5">
        {nickname && (
          <p className="text-xs text-gray-600">
            Вы пишете как <span className="text-gray-500">{nickname}</span>
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            maxLength={500}
            disabled={isBlocked}
            placeholder={isBlocked ? `Подождите ${secs} сек...` : "Ваш комментарий..."}
            className="flex-1 border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || isBlocked || !text.trim()}
            className="glass border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? "..." : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}
