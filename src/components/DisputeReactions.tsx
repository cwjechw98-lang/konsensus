"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { toggleReaction } from "@/lib/actions";
import { getOrCreateSession } from "@/lib/nicknames";

const EMOJIS = ["👍", "👎", "🤔", "🔥", "💯"];

type ReactionRow = { emoji: string; session_id: string };

export default function DisputeReactions({ disputeId }: { disputeId: string }) {
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const { sessionId: sid } = getOrCreateSession();
    setSessionId(sid);

    const supabase = createClient();

    // Initial load
    supabase
      .from("dispute_reactions")
      .select("emoji, session_id")
      .eq("dispute_id", disputeId)
      .then(({ data }) => setReactions((data as ReactionRow[]) ?? []));

    // Realtime
    const channel = supabase
      .channel(`reactions-${disputeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dispute_reactions", filter: `dispute_id=eq.${disputeId}` },
        () => {
          supabase
            .from("dispute_reactions")
            .select("emoji, session_id")
            .eq("dispute_id", disputeId)
            .then(({ data }) => setReactions((data as ReactionRow[]) ?? []));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [disputeId]);

  function handleToggle(emoji: string) {
    if (!sessionId || pending) return;
    startTransition(() => toggleReaction(disputeId, emoji, sessionId));
  }

  const countByEmoji = EMOJIS.reduce<Record<string, number>>((acc, e) => {
    acc[e] = reactions.filter((r) => r.emoji === e).length;
    return acc;
  }, {});

  const myReactions = new Set(
    reactions.filter((r) => r.session_id === sessionId).map((r) => r.emoji)
  );

  return (
    <div className="flex gap-2 flex-wrap">
      {EMOJIS.map((emoji) => {
        const count = countByEmoji[emoji];
        const mine = myReactions.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleToggle(emoji)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
              mine
                ? "bg-purple-600/30 border border-purple-500/40 text-white"
                : "glass border border-white/8 text-gray-400 hover:border-white/20 hover:text-white"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
