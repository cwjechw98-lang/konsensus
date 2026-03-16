"use client";

import { useMemo, useState, useTransition } from "react";
import {
  submitAppeal,
  type SubmitAppealResult,
} from "@/app/profile/actions";
import {
  getAppealStatusText,
  type AppealItemType,
  type AppealSummary,
} from "@/lib/appeal-helpers";

function statusToneClasses(appeal: AppealSummary | null) {
  if (!appeal) return "border-white/10 bg-white/[0.04] text-gray-400";
  if (appeal.status === "reviewing") return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  if (appeal.reviewResult === "hidden") return "border-cyan-500/20 bg-cyan-500/10 text-cyan-200";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
}

export default function AppealComposer({
  itemType,
  itemKey,
  title,
  latestAppeal,
  compact = false,
}: {
  itemType: AppealItemType;
  itemKey: string;
  title: string;
  latestAppeal: AppealSummary | null;
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [appeal, setAppeal] = useState<AppealSummary | null>(latestAppeal);
  const [isPending, startTransition] = useTransition();

  const helperText = useMemo(() => getAppealStatusText(appeal), [appeal]);

  function applyResult(result: SubmitAppealResult) {
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    setAppeal({
      id: result.appealId,
      userId: "self",
      userDisplayName: null,
      itemType: result.itemType,
      itemKey: result.itemKey,
      itemLabel: title,
      appealText: text.trim(),
      status: result.status,
      reviewResult: result.reviewResult,
      reviewConfidence: result.reviewConfidence,
      reviewNotes: result.reviewNotes,
      manualOverrideResult: null,
      manualOverrideNotes: null,
      manualOverriddenAt: null,
      manualOverriddenBy: null,
      createdAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    });
    setText("");
    setIsOpen(false);
  }

  return (
    <div className={`rounded-xl border ${statusToneClasses(appeal)} ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">
            Апелляция
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            {helperText ?? "Если автоматический вывод выглядит спорно, можно оспорить его и запустить повторный пересмотр."}
          </p>
          {appeal?.reviewNotes ? (
            <p className="mt-2 text-xs leading-relaxed text-gray-300">
              {appeal.reviewNotes}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/[0.05]"
        >
          {isOpen ? "Скрыть форму" : "Оспорить"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {isOpen ? (
        <div className="mt-3 space-y-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={compact ? 3 : 4}
            maxLength={600}
            placeholder="Коротко объясните, почему этот вывод кажется вам неточным или неуместным."
            className="w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/35 resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Автопересмотр запускается сразу. Спорные кейсы затем могут попасть в ручную очередь модерации.
            </p>
            <button
              type="button"
              disabled={isPending || !text.trim()}
              onClick={() =>
                startTransition(async () => {
                  const result = await submitAppeal({
                    itemType,
                    itemKey,
                    appealText: text,
                  });
                  applyResult(result);
                })
              }
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Пересматриваем..." : "Отправить апелляцию"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
