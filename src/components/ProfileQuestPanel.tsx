"use client";

import { useMemo, useState, useTransition } from "react";
import {
  PROFILE_QUESTS,
  getProfileQuest,
  type QuestCompletionResult,
} from "@/lib/profile-quests";
import {
  completeProfileQuest,
  startProfileQuest,
  submitProfileQuestChoice,
  type ProfileQuestActionResult,
} from "@/app/profile/actions";

export type ProfileQuestRunSummary = {
  id: string;
  questKey: string;
  status: string;
  currentStep: number;
  responses: string[];
  completedAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProfileQuestPanel({
  runs,
}: {
  runs: ProfileQuestRunSummary[];
}) {
  const [runsState, setRunsState] = useState(runs);
  const latestByQuest = useMemo(() => {
    const map = new Map<string, ProfileQuestRunSummary>();
    for (const run of runsState) {
      const existing = map.get(run.questKey);
      if (!existing) {
        map.set(run.questKey, run);
        continue;
      }

      const existingStamp = existing.completedAt ?? "";
      const nextStamp = run.completedAt ?? "";
      if (nextStamp > existingStamp) {
        map.set(run.questKey, run);
      }
    }
    return map;
  }, [runsState]);

  const inProgressRun = useMemo(
    () =>
      runsState.find((run) => run.status === "in_progress") ??
      [...latestByQuest.values()].find((run) => run.status === "in_progress") ??
      null,
    [latestByQuest, runsState]
  );

  const [activeRun, setActiveRun] = useState<ProfileQuestRunSummary | null>(inProgressRun);
  const [completion, setCompletion] = useState<QuestCompletionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeQuest = activeRun ? getProfileQuest(activeRun.questKey) : null;
  const currentStep = activeQuest
    ? activeQuest.steps[Math.min(activeRun?.responses.length ?? 0, activeQuest.steps.length - 1)]
    : null;
  const isReadyToComplete =
    Boolean(activeQuest && activeRun && activeRun.responses.length >= activeQuest.steps.length);

  function applyResult(result: ProfileQuestActionResult) {
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    const nextRun: ProfileQuestRunSummary = {
      id: result.runId,
      questKey: result.questKey,
      status: result.completion ? "completed" : "in_progress",
      currentStep: result.currentStep,
      responses: result.responses,
      completedAt: result.completion ? new Date().toISOString() : null,
    };

    setActiveRun(nextRun);
    setRunsState((current) => {
      const filtered = current.filter((run) => run.id !== nextRun.id);
      return [nextRun, ...filtered];
    });

    if (result.completion) {
      setCompletion(result.completion);
    }
  }

  function beginQuest(questKey: string) {
    startTransition(async () => {
      setCompletion(null);
      const result = await startProfileQuest(questKey);
      applyResult(result);
    });
  }

  function answerStep(choiceId: string) {
    if (!activeRun) return;
    startTransition(async () => {
      const result = await submitProfileQuestChoice(activeRun.id, choiceId);
      applyResult(result);
    });
  }

  function finalizeQuest() {
    if (!activeRun) return;
    startTransition(async () => {
      const result = await completeProfileQuest(activeRun.id);
      applyResult(result);
    });
  }

  return (
    <div className="glass rounded-2xl p-6" data-tour="profile-quests">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Сценарии выбора
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300">
            Короткие сценарии выбора дают ИИ более полезный сигнал о вашем стиле,
            чем длинная анкета. Это спокойный способ уточнить ваш профиль без
            лишней формы и без игровой рамки.
          </p>
        </div>
        <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
          Короткий формат
        </span>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {completion ? (
        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">
                Квест завершён
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {completion.questTitle}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setCompletion(null);
                setActiveRun(null);
              }}
              className="text-xs text-gray-400 transition-colors hover:text-white"
            >
              Закрыть
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {completion.changes.map((change) => (
              <div
                key={change.label}
                className="rounded-xl border border-white/10 bg-black/10 p-4"
              >
                <p className="text-xs text-gray-500">{change.label}</p>
                <p className="mt-2 text-sm text-gray-300">
                  {String(change.before)} →{" "}
                  <span className="font-semibold text-white">
                    {String(change.after)}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            {completion.explanation.map((line) => (
              <div
                key={line}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-gray-200"
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeQuest && activeRun && !completion ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-purple-300">
                Сценарий в процессе
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">
                {activeQuest.title}
              </h3>
            </div>
            <span className="text-xs text-gray-500">
              Шаг {Math.min(activeRun.responses.length + 1, activeQuest.steps.length)}/
              {activeQuest.steps.length}
            </span>
          </div>

          {!isReadyToComplete && currentStep ? (
            <>
              <p className="mt-5 text-base font-medium leading-relaxed text-white">
                {currentStep.prompt}
              </p>
              <div className="mt-5 grid gap-3">
                {currentStep.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => answerStep(choice.id)}
                    disabled={isPending}
                    className="rounded-2xl border border-white/10 bg-black/10 p-4 text-left transition-colors hover:border-purple-500/25 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <p className="text-sm font-semibold text-white">{choice.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                      {choice.description}
                    </p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-5">
              <p className="text-sm leading-relaxed text-gray-300">
                Все шаги пройдены. Теперь можно зафиксировать результат и обновить
                ваш AI-профиль на основе этих выборов.
              </p>
              <button
                type="button"
                onClick={finalizeQuest}
                disabled={isPending}
                className="mt-4 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Зафиксировать результат
              </button>
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {PROFILE_QUESTS.map((quest) => {
          const run = latestByQuest.get(quest.key);
          const isCompleted = run?.status === "completed";
          const isCurrent = activeRun?.questKey === quest.key && !completion;
          const completedLabel = formatDate(run?.completedAt ?? null);

          return (
            <div
              key={quest.key}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                    {quest.duration}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {quest.title}
                  </h3>
                </div>
                {isCompleted ? (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
                    пройден
                  </span>
                ) : isCurrent ? (
                  <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[11px] text-purple-300">
                    в процессе
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-relaxed text-gray-300">
                {quest.summary}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {quest.impactLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] text-gray-300"
                  >
                    {label}
                  </span>
                ))}
              </div>

              {isCompleted && completedLabel ? (
                <p className="mt-4 text-xs text-gray-500">
                  Последнее прохождение: {completedLabel}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => beginQuest(quest.key)}
                disabled={isPending || isCompleted || Boolean(activeRun && activeRun.questKey !== quest.key && !completion)}
                className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCurrent ? "Продолжить сценарий" : isCompleted ? "Пройдено" : "Начать сценарий"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
