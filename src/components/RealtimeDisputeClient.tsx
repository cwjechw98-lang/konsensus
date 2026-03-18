"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { proposeEarlyEnd, acceptEarlyEnd, declineEarlyEnd, sendDisputeReminder } from "@/lib/actions";
import WaitingTips from "@/components/WaitingTips";
import WaitingAmbient from "@/components/WaitingAmbient";
import WaitingShadowMediator from "@/components/WaitingShadowMediator";
import InsightBreakdown from "@/components/InsightBreakdown";
import SubmitButton from "@/components/SubmitButton";

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

// ─── Convergence display ───────────────────────────────────────────────────
type PublicSummary = { content: string; convergence: number };

const CONVERGENCE_LABEL = ["Позиции сильно расходятся", "Небольшое расхождение", "Позиции стабильны", "Небольшое сближение", "Позиции сближаются"];
const CONVERGENCE_ICON  = ["↘↘", "↘", "→", "↗", "↗↗"];
const CONVERGENCE_COLOR = ["text-red-400", "text-orange-400", "text-gray-500", "text-emerald-400", "text-emerald-300"];
const CONVERGENCE_BG    = ["bg-red-500/8 border-red-500/15", "bg-orange-500/8 border-orange-500/15", "bg-white/3 border-white/8", "bg-emerald-500/8 border-emerald-500/15", "bg-emerald-500/10 border-emerald-500/20"];

function convergenceIdx(v: number) { return Math.min(4, Math.max(0, v + 2)); }

function PublicRoundCard({ summary, round }: { summary: PublicSummary; round: number }) {
  const idx = convergenceIdx(summary.convergence);
  return (
    <div className={`rounded-2xl px-4 py-3 border ${CONVERGENCE_BG[idx]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
          🤖 Наблюдение · Раунд {round}
        </p>
        <span className={`text-xs font-semibold flex items-center gap-1 ${CONVERGENCE_COLOR[idx]}`}>
          <span>{CONVERGENCE_ICON[idx]}</span>
          <span>{CONVERGENCE_LABEL[idx]}</span>
        </span>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
        {summary.content}
      </p>
    </div>
  );
}

function getConvergenceDirection(convergence: number) {
  if (convergence >= 2) {
    return {
      label: "Сближение усилилось",
      tone: "Стороны начали заметнее двигаться навстречу.",
      chipClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (convergence === 1) {
    return {
      label: "Осторожное сближение",
      tone: "В аргументах уже есть пространство для компромисса.",
      chipClass: "border-emerald-500/15 bg-emerald-500/8 text-emerald-200",
    };
  }

  if (convergence === 0) {
    return {
      label: "Баланс без сдвига",
      tone: "Позиции зафиксированы, но диалог ещё можно развернуть.",
      chipClass: "border-white/10 bg-white/5 text-gray-300",
    };
  }

  if (convergence === -1) {
    return {
      label: "Появилось расхождение",
      tone: "Стороны уцепились за разные трактовки одной темы.",
      chipClass: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    };
  }

  return {
    label: "Расхождение усилилось",
    tone: "Обмен стал жёстче, и общая точка пока отдаляется.",
    chipClass: "border-red-500/20 bg-red-500/10 text-red-300",
  };
}

function getMomentumLabel(current: number, previous?: number) {
  if (previous === undefined) {
    return {
      label: "Первый замер динамики",
      tone: "Это стартовая точка, от которой будет видно движение разговора.",
      chipClass: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    };
  }

  const delta = current - previous;

  if (delta >= 2) {
    return {
      label: "Сильный шаг к консенсусу",
      tone: "Этот обмен заметно сократил дистанцию между позициями.",
      chipClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (delta === 1) {
    return {
      label: "Диалог стал мягче",
      tone: "В ответах появилось больше почвы для взаимного понимания.",
      chipClass: "border-emerald-500/15 bg-emerald-500/8 text-emerald-200",
    };
  }

  if (delta === 0) {
    return {
      label: "Траектория без изменения",
      tone: "Разговор держится на прежнем уровне сближения и напряжения.",
      chipClass: "border-white/10 bg-white/5 text-gray-300",
    };
  }

  if (delta === -1) {
    return {
      label: "Диалог стал жёстче",
      tone: "После этого обмена стороны чуть дальше от общей формулировки.",
      chipClass: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    };
  }

  return {
    label: "Резкий откат",
    tone: "Этот раунд ощутимо увеличил дистанцию и усложнил компромисс.",
    chipClass: "border-red-500/20 bg-red-500/10 text-red-300",
  };
}

function getHeatSnapshot(level: number, isLatestRound: boolean) {
  if (!isLatestRound || level < 1 || level > 5) {
    return {
      label: "Температура раунда не зафиксирована",
      tone: "Для прошлых раундов сохраняем общий фокус на смысле обмена.",
      chipClass: "border-white/10 bg-white/5 text-gray-400",
    };
  }

  if (level <= 2) {
    return {
      label: "Разговор держится спокойно",
      tone: "Даже при разногласии участники пока не уходят в эскалацию.",
      chipClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (level === 3) {
    return {
      label: "Есть рабочее напряжение",
      tone: "Тон стал плотнее, но диалог ещё хорошо управляем.",
      chipClass: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    };
  }

  if (level === 4) {
    return {
      label: "Накал заметно вырос",
      tone: "Лучше опираться на факты и формулировки без уколов.",
      chipClass: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    };
  }

  return {
    label: "Спор на высокой температуре",
    tone: "Сейчас особенно важно не усиливать ответ эмоциональным нажимом.",
    chipClass: "border-red-500/20 bg-red-500/10 text-red-300",
  };
}

function RoundDynamics({
  summary,
  previousSummary,
  heatLevel,
  isLatestRound,
}: {
  summary: PublicSummary;
  previousSummary?: PublicSummary;
  heatLevel: number;
  isLatestRound: boolean;
}) {
  const convergenceState = getConvergenceDirection(summary.convergence);
  const momentumState = getMomentumLabel(summary.convergence, previousSummary?.convergence);
  const heatState = getHeatSnapshot(heatLevel, isLatestRound);

  const cards = [
    {
      title: "Дистанция позиций",
      ...convergenceState,
    },
    {
      title: "Сдвиг после обмена",
      ...momentumState,
    },
    {
      title: "Температура диалога",
      ...heatState,
    },
  ];

  return (
    <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`rounded-2xl border px-3 py-3 ${card.chipClass}`}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/55 mb-1.5">
            {card.title}
          </p>
          <p className="text-sm font-semibold mb-1">
            {card.label}
          </p>
          <p className="text-xs leading-relaxed text-white/70">
            {card.tone}
          </p>
        </div>
      ))}
    </div>
  );
}

function RoundArgumentCard({
  arg,
  isMe,
  displayName,
}: {
  arg: Arg;
  isMe: boolean;
  displayName: string;
}) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
        <span className="text-xs text-gray-500 px-1">
          {displayName}
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
}

function RoundPackage({
  round,
  maxRounds,
  roundArgs,
  currentUserId,
  getName,
  publicSummary,
  previousPublicSummary,
  privateInsight,
  heatLevel,
  isLatestAnalyzedRound,
}: {
  round: number;
  maxRounds: number;
  roundArgs: Arg[];
  currentUserId: string;
  getName: (pid: string | null) => string;
  publicSummary?: PublicSummary;
  previousPublicSummary?: PublicSummary;
  privateInsight?: string;
  heatLevel: number;
  isLatestAnalyzedRound: boolean;
}) {
  const hasAnalysis = roundArgs.length === 2 && (publicSummary || privateInsight);

  return (
    <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.015] px-3 py-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-white/6" />
        <span className="text-xs text-gray-600 px-2">
          Раунд {round} из {maxRounds}
        </span>
        <div className="flex-1 h-px bg-white/6" />
      </div>

      <div className="flex flex-col gap-3">
        {roundArgs.map((arg) => (
          <RoundArgumentCard
            key={arg.id}
            arg={arg}
            isMe={arg.author_id === currentUserId}
            displayName={getName(arg.author_id)}
          />
        ))}
      </div>

      {hasAnalysis && (
        <div className="mt-4 rounded-2xl border border-white/8 bg-black/10 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-1">
                Закрытый раунд
              </p>
              <p className="text-sm text-gray-400">
                Раунд завершён: теперь видно общее наблюдение и личный AI-разбор этого обмена.
              </p>
            </div>
            <span className="text-xs text-violet-300 border border-violet-500/20 bg-violet-500/10 rounded-full px-2.5 py-1 whitespace-nowrap">
              AI-пакет
            </span>
          </div>

          {publicSummary && (
            <RoundDynamics
              summary={publicSummary}
              previousSummary={previousPublicSummary}
              heatLevel={heatLevel}
              isLatestRound={isLatestAnalyzedRound}
            />
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {publicSummary && (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 mb-2 px-2 pt-1">
                  Что видно обоим
                </p>
                <PublicRoundCard summary={publicSummary} round={round} />
              </div>
            )}

            {privateInsight && (
              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-violet-300/80 mb-2 px-2 pt-1">
                  Что ИИ понял для вас
                </p>
                <InsightBreakdown
                  text={privateInsight}
                  eyebrow="Разбор оппонента · Только для вас"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  currentUserDisplayName,
  isParticipant,
  isCreator,
  roundInsights,
  roundPublicSummaries: initialPublicSummaries = {},
  heatLevel: initialHeatLevel = 0,
  earlyEndProposedBy: initialEarlyEndProposedBy = null,
  waitingInsight: initialWaitingInsight = "",
}: {
  initialArgs: Arg[];
  initialStatus: string;
  dispute: DisputeSnap;
  userId: string;
  profiles: Profile[];
  currentUserDisplayName: string;
  isParticipant: boolean;
  isCreator: boolean;
  roundInsights: Record<number, string>;
  roundPublicSummaries?: Record<number, PublicSummary>;
  heatLevel?: number;
  earlyEndProposedBy?: string | null;
  waitingInsight?: string;
}) {
  const router = useRouter();
  const [args, setArgs] = useState<Arg[]>(initialArgs);
  const [status, setStatus] = useState(initialStatus);
  const [newArgFlash, setNewArgFlash] = useState<string | null>(null);
  const [insights, setInsights] = useState<Record<number, string>>(roundInsights);
  const [publicSummaries, setPublicSummaries] = useState<Record<number, PublicSummary>>(initialPublicSummaries);
  const [heatLevel, setHeatLevel] = useState(initialHeatLevel);
  const [earlyEndProposedBy, setEarlyEndProposedBy] = useState<string | null>(initialEarlyEndProposedBy);
  const [currentWaitingInsight, setCurrentWaitingInsight] = useState(initialWaitingInsight);
  const [typingName, setTypingName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Public round summaries
    const publicSummariesChannel = supabase
      .channel(`public-summaries-${dispute.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "round_public_summaries",
          filter: `dispute_id=eq.${dispute.id}`,
        },
        (payload) => {
          const row = payload.new as { round: number; content: string; convergence: number };
          setPublicSummaries((prev) => ({ ...prev, [row.round]: { content: row.content, convergence: row.convergence } }));
          scrollToBottom();
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
            // Clear waiting insight — opponent has now responded
            setCurrentWaitingInsight("");
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

    // Waiting insights: shown while user is waiting for opponent
    const waitingChannel = supabase
      .channel(`waiting-${dispute.id}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "waiting_insights",
          filter: `dispute_id=eq.${dispute.id}`,
        },
        (payload) => {
          const row = payload.new as { round: number; recipient_id: string; content: string };
          if (row.recipient_id === userId) {
            setCurrentWaitingInsight(row.content);
          }
        }
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`dispute-typing:${dispute.id}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const row = payload as { name?: string; isTyping?: boolean };
        if (!row?.isTyping) {
          setTypingName("");
          return;
        }
        setTypingName(row.name ?? "Оппонент");
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingName(""), 2400);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(insightsChannel);
      supabase.removeChannel(publicSummariesChannel);
      supabase.removeChannel(analysisChannel);
      supabase.removeChannel(waitingChannel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [dispute.id, userId, scrollToBottom, router, status]);

  const getName = (pid: string | null) => {
    if (!pid) return "Участник";
    if (pid === userId) return currentUserDisplayName;
    return profiles.find((p) => p.id === pid)?.display_name ?? "Участник";
  };

  const rounds = Array.from({ length: dispute.max_rounds }, (_, i) => i + 1);
  const analyzedRounds = rounds.filter((round) => publicSummaries[round] || insights[round]);
  const latestAnalyzedRound = analyzedRounds.length > 0 ? Math.max(...analyzedRounds) : 0;

  const opponentId = isCreator ? dispute.opponent_id : dispute.creator_id;

  const completedRounds = dispute.opponent_id
    ? rounds.filter(
        (r) =>
          args.some((a) => a.author_id === dispute.creator_id && a.round === r) &&
          args.some((a) => a.author_id === dispute.opponent_id && a.round === r)
      ).length
    : 0;
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

      {typingName && status === "in_progress" && (
        <div className="mb-4 border border-cyan-500/15 bg-cyan-500/[0.06] text-cyan-200 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <span className="pulse-dot w-2 h-2 rounded-full bg-cyan-300 inline-block" />
          {typingName} печатает ответ...
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
              <SubmitButton
                pendingText="Принимаем..."
                className="btn-ripple rounded-lg border border-yellow-500/30 bg-yellow-500/20 px-4 py-1.5 text-sm font-medium text-yellow-400 transition-colors hover:bg-yellow-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Принять
              </SubmitButton>
            </form>
            <form action={declineEarlyEnd}>
              <input type="hidden" name="dispute_id" value={dispute.id} />
              <SubmitButton
                pendingText="Отклоняем..."
                className="glass rounded-lg px-4 py-1.5 text-sm text-gray-400 transition-colors hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Отклонить
              </SubmitButton>
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
            <SubmitButton
              pendingText="Отменяем..."
              className="text-xs text-gray-600 transition-colors hover:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Отменить
            </SubmitButton>
          </form>
        </div>
      )}

      {/* Round progress bar */}
      {status === "in_progress" && isParticipant && completedRounds > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1.5">
            <span>Раундов завершено</span>
            <span>{completedRounds} / {dispute.max_rounds}</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500/50 rounded-full transition-all duration-700"
              style={{ width: `${(completedRounds / dispute.max_rounds) * 100}%` }}
            />
          </div>
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
                <RoundPackage
                  key={round}
                  round={round}
                  maxRounds={dispute.max_rounds}
                  roundArgs={roundArgs}
                  currentUserId={userId}
                  getName={getName}
                  publicSummary={publicSummaries[round]}
                  previousPublicSummary={publicSummaries[round - 1]}
                  privateInsight={insights[round]}
                  heatLevel={heatLevel}
                  isLatestAnalyzedRound={round === latestAnalyzedRound}
                />
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
              {currentWaitingInsight && (
                <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] p-3">
                  <InsightBreakdown
                    text={currentWaitingInsight}
                    eyebrow="Приватная подсказка ИИ, пока ждёте ответ"
                  />
                </div>
              )}
              <WaitingAmbient />
              <WaitingShadowMediator
                round={Math.min(dispute.max_rounds, myArgCount)}
                maxRounds={dispute.max_rounds}
                insight={currentWaitingInsight}
              />
              <WaitingTips />
              <form action={sendDisputeReminder} className="flex justify-center">
                <input type="hidden" name="dispute_id" value={dispute.id} />
                <input type="hidden" name="return_to" value={`/dispute/${dispute.id}`} />
                <SubmitButton
                  pendingText="Напоминаем..."
                  className="text-xs text-cyan-300 transition-colors hover:text-cyan-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Напомнить в Telegram
                </SubmitButton>
              </form>
              {!earlyEndProposedBy && (
                <form action={proposeEarlyEnd}>
                  <input type="hidden" name="dispute_id" value={dispute.id} />
                  <SubmitButton
                    pendingText="Отправляем..."
                    className="text-xs text-gray-600 transition-colors hover:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Предложить завершить досрочно
                  </SubmitButton>
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
              {currentWaitingInsight && (
                <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] p-3">
                  <InsightBreakdown
                    text={currentWaitingInsight}
                    eyebrow="Приватная подсказка ИИ, пока ждёте ответ"
                  />
                </div>
              )}
              <WaitingAmbient />
              <WaitingShadowMediator
                round={Math.min(dispute.max_rounds, myArgCount)}
                maxRounds={dispute.max_rounds}
                insight={currentWaitingInsight}
              />
              <WaitingTips />
              <form action={sendDisputeReminder} className="flex justify-center">
                <input type="hidden" name="dispute_id" value={dispute.id} />
                <input type="hidden" name="return_to" value={`/dispute/${dispute.id}`} />
                <SubmitButton
                  pendingText="Напоминаем..."
                  className="text-xs text-cyan-300 transition-colors hover:text-cyan-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Напомнить в Telegram
                </SubmitButton>
              </form>
              {!earlyEndProposedBy && (
                <form action={proposeEarlyEnd}>
                  <input type="hidden" name="dispute_id" value={dispute.id} />
                  <SubmitButton
                    pendingText="Отправляем..."
                    className="w-full text-center text-xs text-gray-600 transition-colors hover:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Предложить завершить досрочно
                  </SubmitButton>
                </form>
              )}
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-3">
            <Link
              href={`/dispute/${dispute.id}/argue`}
              className="btn-ripple block rounded-lg bg-purple-600 px-6 py-2.5 text-center font-semibold text-white transition-colors hover:bg-purple-500 active:scale-[0.98] sm:inline-block"
            >
              Написать аргумент · Раунд {myArgCount + 1}
            </Link>
            {!earlyEndProposedBy && myArgCount > 0 && (
              <form action={proposeEarlyEnd}>
                <input type="hidden" name="dispute_id" value={dispute.id} />
                <SubmitButton
                  pendingText="Отправляем..."
                  className="text-xs text-gray-600 transition-colors hover:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Предложить завершить досрочно
                </SubmitButton>
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
