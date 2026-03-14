"use client";

import { useEffect, useRef, useState } from "react";
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

export default function DisputeChat({ disputeId }: { disputeId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [nickname, setNickname] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { sessionId: sid, nickname: nick } = getOrCreateSession();
    setSessionId(sid);
    setNickname(nick);

    const supabase = createClient();

    // Initial load — last 50 messages
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

    // Realtime
    const channel = supabase
      .channel(`chat-${disputeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dispute_comments", filter: `dispute_id=eq.${disputeId}` },
        (payload) => {
          const row = payload.new as Comment;
          setComments((prev) => {
            if (prev.some((c) => c.id === row.id)) return prev;
            return [...prev, row];
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [disputeId]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");

    const result = await addComment(disputeId, text.trim(), nickname, sessionId);
    if (result.error) {
      setError(result.error);
    } else {
      setText("");
    }
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

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
            <div key={c.id} className={`flex gap-2 ${c.is_ai ? "items-start" : ""}`}>
              <span
                className={`text-xs font-semibold flex-shrink-0 mt-0.5 ${
                  c.is_ai ? "text-amber-400" : "text-purple-400/70"
                }`}
              >
                {c.is_ai ? "🐾" : ""}
                {c.author_name}
                {c.is_ai ? "" : ":"}
              </span>
              <p
                className={`text-sm leading-relaxed ${
                  c.is_ai ? "text-amber-200/80 italic" : "text-gray-300"
                }`}
              >
                {c.is_ai && <span className="not-italic mr-1">—</span>}
                {c.content}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex flex-col gap-1.5">
        {nickname && (
          <p className="text-xs text-gray-600">
            Вы пишете как <span className="text-gray-500">{nickname}</span>
          </p>
        )}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            maxLength={500}
            placeholder="Ваш комментарий..."
            className="flex-1 border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/40 transition-colors"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="glass border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? "..." : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}
