"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { acceptSolution } from "@/lib/actions";
import ConsensusCelebration from "@/components/ConsensusCelebration";

type ResolutionRow = {
  id: string;
  chosen_solution: number;
  accepted_by: string[];
  status: string;
};

export default function MediationClient({
  disputeId,
  solutions,
  userId,
  creatorId,
  opponentId,
  initialResolution,
  commonGround,
}: {
  disputeId: string;
  solutions: string[];
  userId: string;
  creatorId: string;
  opponentId: string | null;
  initialResolution: ResolutionRow | null;
  commonGround?: string;
}) {
  const [resolution, setResolution] = useState<ResolutionRow | null>(initialResolution);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`resolution-${disputeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "resolutions",
          filter: `dispute_id=eq.${disputeId}`,
        },
        (payload) => {
          setResolution(payload.new as ResolutionRow);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [disputeId]);

  const accepted = (resolution?.accepted_by as string[]) ?? [];
  const consensus = resolution?.status === "accepted";
  const myChoice = resolution?.chosen_solution;
  const iHaveAccepted = accepted.includes(userId);

  // ─── Consensus achieved ───────────────────────────────────────────────────
  if (consensus && resolution) {
    return (
      <ConsensusCelebration
        commonGround={commonGround}
        solutionIndex={resolution.chosen_solution}
      />
    );
  }

  // ─── Solutions list ───────────────────────────────────────────────────────
  return (
    <div className="glass rounded-xl p-5">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Предложенные решения
      </h2>
      <ol className="flex flex-col gap-3">
        {solutions.map((s, i) => {
          const creatorAcceptedThis = accepted.includes(creatorId) && myChoice === i;
          const opponentAcceptedThis = opponentId && accepted.includes(opponentId) && myChoice === i;
          const iAcceptedThis = accepted.includes(userId) && myChoice === i;

          return (
            <li
              key={i}
              className={`rounded-xl p-4 border transition-all ${
                iAcceptedThis
                  ? "bg-purple-500/10 border-purple-500/30"
                  : "bg-white/2 border-white/8"
              }`}
            >
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border bg-purple-500/20 text-purple-400 border-purple-500/20">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 leading-relaxed">{s}</p>

                  {(creatorAcceptedThis || opponentAcceptedThis) && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {creatorAcceptedThis && (
                        <span className="text-xs bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                          Инициатор ✓
                        </span>
                      )}
                      {opponentAcceptedThis && (
                        <span className="text-xs bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                          Оппонент ✓
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {iAcceptedThis ? (
                  <span className="flex-shrink-0 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg">
                    Вы выбрали ✓
                  </span>
                ) : (
                  <form action={acceptSolution}>
                    <input type="hidden" name="dispute_id" value={disputeId} />
                    <input type="hidden" name="solution_index" value={i} />
                    <button
                      type="submit"
                      className="flex-shrink-0 text-sm bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Принять
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {!iHaveAccepted && (
        <p className="text-xs text-gray-600 mt-4 text-center">
          Выберите решение, которое вас устраивает
        </p>
      )}
      {iHaveAccepted && (
        <p className="text-xs text-yellow-500/60 mt-4 text-center flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/60 inline-block" />
          Ожидаем выбора оппонента...
        </p>
      )}
    </div>
  );
}
