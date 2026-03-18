"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { submitArgument, evaluateArgument } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import SubmitButton from "@/components/SubmitButton";

type EvalResult = {
  score: number;
  strengths: string[];
  suggestion: string;
  escalation_risk: number;
  escalation_warning: string;
};

const SCORE_LABEL = ["", "Слабый", "Средний", "Хороший", "Сильный", "Убедительный"];
const SCORE_COLOR = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-emerald-400", "text-emerald-300"];
const SCORE_BG    = ["", "bg-red-500/8 border-red-500/20", "bg-orange-500/8 border-orange-500/20", "bg-yellow-500/8 border-yellow-500/20", "bg-emerald-500/8 border-emerald-500/20", "bg-emerald-500/12 border-emerald-500/30"];
const SCORE_DOT   = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-300"];

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-1.5 mt-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${i <= score ? SCORE_DOT[score] : "bg-white/10"}`}
        />
      ))}
    </div>
  );
}

type Props = {
  disputeId: string;
  disputeTitle: string;
  disputeDescription: string;
  isFirstRound: boolean;
  currentRound: number;
  maxRounds: number;
  userName: string;
  opponentName?: string;
  lastOpponentArg?: {
    position: string;
    reasoning: string;
    evidence: string | null;
    round: number;
  } | null;
};

export default function ArgueFormClient({
  disputeId,
  disputeTitle,
  disputeDescription,
  isFirstRound,
  userName,
  opponentName,
  lastOpponentArg,
}: Props) {
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState(false);
  const [typingReady, setTypingReady] = useState(false);
  const positionRef = useRef<HTMLInputElement>(null);
  const reasoningRef = useRef<HTMLTextAreaElement>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dispute-typing:${disputeId}`)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setTypingReady(true);
        }
      });
    typingChannelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTypingReady(false);
      supabase.removeChannel(channel);
    };
  }, [disputeId]);

  const emitTypingEvent = useCallback(async (isTyping: boolean) => {
    if (!typingReady || !typingChannelRef.current) return;
    await typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        name: userName,
        isTyping,
      },
    });
  }, [typingReady, userName]);

  useEffect(() => {
    if (!typingReady) return;
    const hasDraft = Boolean(
      positionRef.current?.value?.trim() || reasoningRef.current?.value?.trim()
    );
    if (hasDraft) {
      void emitTypingEvent(true);
    }
  }, [typingReady, emitTypingEvent]);

  function scheduleTyping() {
    if (!typingReady) return;
    void emitTypingEvent(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      void emitTypingEvent(false);
    }, 1800);
  }

  async function handleEvaluate() {
    const position = (isFirstRound ? positionRef.current?.value : "Ответ") ?? "";
    const reasoning = reasoningRef.current?.value ?? "";
    if (!reasoning.trim()) return;

    setEvaluating(true);
    setEvalResult(null);
    setEvalError(false);

    try {
      const result = await evaluateArgument(position, reasoning, disputeTitle, disputeDescription);
      if (result) {
        setEvalResult(result);
      } else {
        setEvalError(true);
      }
    } catch {
      setEvalError(true);
    } finally {
      setEvaluating(false);
    }
  }

  // ─── Round 1: Full form ───────────────────────────────────────────────────
  if (isFirstRound) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-8">
        <form action={submitArgument} className="flex flex-col gap-5" onSubmit={() => void emitTypingEvent(false)}>
          <input type="hidden" name="dispute_id" value={disputeId} />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">Коротко</span>
            <input
              data-tour="position"
              ref={positionRef}
              name="position"
              type="text"
              required
              maxLength={300}
              onChange={() => {
                if (evalResult) setEvalResult(null);
                scheduleTyping();
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-gray-600 transition-colors focus:border-purple-500/50 focus:outline-none"
              placeholder="Сформулируйте позицию в одной строке"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">Аргументы и обоснование</span>
            <textarea
              data-tour="reasoning"
              ref={reasoningRef}
              name="reasoning"
              required
              rows={6}
              maxLength={2000}
              onChange={() => {
                if (evalResult) setEvalResult(null);
                scheduleTyping();
              }}
              onBlur={() => void emitTypingEvent(false)}
              className="resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-gray-600 transition-colors focus:border-purple-500/50 focus:outline-none"
              placeholder="Объясните свою позицию простыми словами..."
            />
          </label>

          {/* Evaluation result */}
          <EvalCard result={evalResult} error={evalError} />

          <div className="flex flex-wrap gap-3 mt-2">
            <SubmitButton
              pendingText="Отправляем аргумент..."
              className="btn-ripple rounded-lg bg-purple-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Подать аргумент
            </SubmitButton>
            <button
              type="button"
              data-tour="evaluate"
              onClick={handleEvaluate}
              disabled={evaluating}
              className="glass border border-white/10 hover:border-purple-500/30 text-gray-400 hover:text-purple-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {evaluating ? "Анализируем..." : evalResult ? "✓ Перепроверить" : "✨ Проверить"}
            </button>
            <Link
              href={`/dispute/${disputeId}`}
              className="glass px-6 py-2.5 rounded-lg font-medium text-gray-300 hover:text-white transition-colors"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    );
  }

  // ─── Round 2+: Chat-style form ────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Opponent's last arg */}
      {lastOpponentArg && (
        <div className="sticky top-4 z-10 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-3 backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80 mb-2">
            Контекст перед вашим ходом
          </p>
          <div className="flex justify-start">
            <div className="max-w-[85%] flex flex-col gap-1">
              <span className="text-xs text-gray-500 px-1">
                {opponentName} · Раунд {lastOpponentArg.round}
              </span>
              <div className="glass border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                <p className="font-semibold text-white text-sm mb-1">{lastOpponentArg.position}</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{lastOpponentArg.reasoning}</p>
                {lastOpponentArg.evidence && (
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-white/8">
                    📎 {lastOpponentArg.evidence}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My reply form */}
      <div className="flex justify-end">
        <div className="w-full max-w-[85%]">
          <span className="text-xs text-gray-500 px-1 block text-right mb-1">
            {userName} <span className="text-purple-500">(вы)</span>
          </span>

          <form action={submitArgument} className="flex flex-col gap-3" onSubmit={() => void emitTypingEvent(false)}>
            <input type="hidden" name="dispute_id" value={disputeId} />
            <input type="hidden" name="position" value="Ответ" />

            <div className="bg-purple-600/15 border border-purple-500/20 rounded-2xl rounded-tr-sm px-4 py-3">
              <textarea
                data-tour="reasoning"
                ref={reasoningRef}
                name="reasoning"
                required
                rows={4}
                maxLength={2000}
                autoFocus
                onChange={() => {
                  if (evalResult) setEvalResult(null);
                  scheduleTyping();
                }}
                onBlur={() => void emitTypingEvent(false)}
                className="w-full bg-transparent text-white placeholder:text-gray-600 focus:outline-none resize-y text-sm leading-relaxed"
                placeholder="Ответьте по сути..."
              />
            </div>

            {/* Evaluation result */}
            {(evalResult || evalError) && (
              <EvalCard result={evalResult} error={evalError} />
            )}

            <div className="flex gap-2 justify-end items-center">
              <button
                type="button"
                data-tour="evaluate"
                onClick={handleEvaluate}
                disabled={evaluating}
                className="text-xs text-gray-600 hover:text-purple-400 transition-colors disabled:opacity-50"
              >
                {evaluating ? "..." : evalResult ? "✓ Перепроверить" : "✨ Проверить"}
              </button>
              <Link
                href={`/dispute/${disputeId}`}
                className="text-sm text-gray-500 hover:text-gray-300 px-3 py-2 transition-colors"
              >
                Отмена
              </Link>
              <SubmitButton
                pendingText="Отправляем..."
                className="btn-ripple rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Отправить →
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EvalCard({ result, error }: { result: EvalResult | null; error: boolean }) {
  if (error) {
    return (
      <div className="rounded-xl px-4 py-3 bg-white/3 border border-white/8 text-sm text-gray-500">
        ИИ временно недоступен — можно отправлять без проверки.
      </div>
    );
  }
  if (!result) return null;

  const idx = result.score;
  return (
    <div className={`rounded-2xl px-4 py-3 border ${SCORE_BG[idx]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">✨ Оценка аргумента</p>
        <span className={`text-sm font-bold ${SCORE_COLOR[idx]}`}>{SCORE_LABEL[idx]}</span>
      </div>
      <ScoreDots score={result.score} />
      {result.strengths.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {result.strengths.map((s, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-start gap-1.5">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
      {result.suggestion && (
        <p className="text-sm text-gray-400 mt-2.5 pt-2.5 border-t border-white/8 flex items-start gap-1.5">
          <span className="text-purple-400 mt-0.5 flex-shrink-0">💡</span>
          <span>{result.suggestion}</span>
        </p>
      )}
      {result.escalation_risk >= 2 && result.escalation_warning && (
        <div className="mt-2.5 pt-2.5 border-t border-white/8">
          <p className="text-sm flex items-start gap-1.5">
            <span className={`mt-0.5 flex-shrink-0 ${result.escalation_risk >= 3 ? "text-red-400" : "text-orange-400"}`}>
              {result.escalation_risk >= 3 ? "🔥" : "⚠️"}
            </span>
            <span className={result.escalation_risk >= 3 ? "text-red-400" : "text-orange-400"}>
              {result.escalation_warning}
            </span>
          </p>
          <p className="text-xs text-gray-600 mt-1 ml-5">
            Вы можете отправить как есть или смягчить формулировки.
          </p>
        </div>
      )}
    </div>
  );
}
