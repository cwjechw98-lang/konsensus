"use client";

import { useState, useTransition } from "react";
import { applyManualAppealOverride } from "@/app/profile/actions";
import {
  getAppealEffectiveResult,
  isAppealManuallyOverridden,
  needsAppealManualReview,
  type AppealSummary,
} from "@/lib/appeal-helpers";

export default function AppealModerationQueue({
  appeals,
}: {
  appeals: AppealSummary[];
}) {
  const [items, setItems] = useState(appeals);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [errorById, setErrorById] = useState<Record<string, string | null>>({});
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
        В очереди модерации сейчас нет спорных апелляций.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((appeal) => {
        const note = notesById[appeal.id] ?? "";
        const error = errorById[appeal.id];
        const autoResult = appeal.reviewResult;
        const effectiveResult = getAppealEffectiveResult(appeal);
        const requiresManualReview = needsAppealManualReview(appeal);

        return (
          <div
            key={appeal.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{appeal.itemLabel}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {appeal.itemType === "ai_summary" ? "AI-резюме профиля" : "Публичный бейдж"}
                  {" · "}
                  {appeal.userDisplayName ?? appeal.userId}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Авто-решение: {autoResult === "hidden" ? "скрыть" : "оставить"}</p>
                <p>
                  Уверенность: {appeal.reviewConfidence ?? "—"}
                  {appeal.reviewConfidence !== null ? "%" : ""}
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-gray-300">{appeal.appealText}</p>
            {appeal.reviewNotes ? (
              <p className="mt-2 text-xs leading-relaxed text-gray-400">{appeal.reviewNotes}</p>
            ) : null}

            {isAppealManuallyOverridden(appeal) ? (
              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                Ручной override уже применён: {effectiveResult === "hidden" ? "вывод скрыт" : "вывод оставлен"}.
              </div>
            ) : requiresManualReview ? (
              <div className="mt-4 space-y-3">
                <textarea
                  value={note}
                  onChange={(event) =>
                    setNotesById((current) => ({ ...current, [appeal.id]: event.target.value }))
                  }
                  rows={3}
                  maxLength={600}
                  placeholder="Коротко зафиксируйте причину ручного решения."
                  className="w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/35 focus:outline-none resize-none"
                />
                {error ? (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await applyManualAppealOverride({
                          appealId: appeal.id,
                          reviewResult: "kept",
                          reviewNotes: note,
                        });

                        if (!result.ok) {
                          setErrorById((current) => ({ ...current, [appeal.id]: result.error }));
                          return;
                        }

                        setErrorById((current) => ({ ...current, [appeal.id]: null }));
                        setItems((current) =>
                          current.map((item) =>
                            item.id === appeal.id
                              ? {
                                  ...item,
                                  manualOverrideResult: result.manualOverrideResult,
                                  manualOverrideNotes: result.manualOverrideNotes,
                                  manualOverriddenAt: result.manualOverriddenAt,
                                }
                              : item
                          )
                        );
                      })
                    }
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Оставить вывод
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await applyManualAppealOverride({
                          appealId: appeal.id,
                          reviewResult: "hidden",
                          reviewNotes: note,
                        });

                        if (!result.ok) {
                          setErrorById((current) => ({ ...current, [appeal.id]: result.error }));
                          return;
                        }

                        setErrorById((current) => ({ ...current, [appeal.id]: null }));
                        setItems((current) =>
                          current.map((item) =>
                            item.id === appeal.id
                              ? {
                                  ...item,
                                  manualOverrideResult: result.manualOverrideResult,
                                  manualOverrideNotes: result.manualOverrideNotes,
                                  manualOverriddenAt: result.manualOverriddenAt,
                                }
                              : item
                          )
                        );
                      })
                    }
                    className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Скрыть вывод
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-gray-400">
                Автопересмотр выглядит достаточно уверенным. Ручной разбор для этого кейса не требуется.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
