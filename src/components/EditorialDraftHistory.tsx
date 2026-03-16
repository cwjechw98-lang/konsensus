"use client";

import { useMemo, useState } from "react";
import type { EditorialDraftRecord } from "@/lib/editorial-ops";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
}

function getStatusTone(status: EditorialDraftRecord["status"]) {
  switch (status) {
    case "published":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    case "cancelled":
      return "border-red-500/20 bg-red-500/10 text-red-100";
    case "scheduled":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-100";
    default:
      return "border-violet-500/20 bg-violet-500/10 text-violet-100";
  }
}

const FILTERS = [
  { key: "all", label: "Все" },
  { key: "published", label: "Published" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type HistoryFilter = (typeof FILTERS)[number]["key"];

export default function EditorialDraftHistory({
  drafts,
}: {
  drafts: EditorialDraftRecord[];
}) {
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const filteredDrafts = useMemo(() => {
    if (filter === "all") return drafts;
    return drafts.filter((draft) => draft.status === filter);
  }, [drafts, filter]);

  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
        История editorial drafts пока пуста.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const isActive = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-cyan-500/25 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {filteredDrafts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
          Для выбранного фильтра пока нет записей.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrafts.map((draft) => (
            <div
              key={draft.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">
                      {draft.title || "Без заголовка"}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${getStatusTone(
                        draft.status
                      )}`}
                    >
                      {draft.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {draft.toCommit.slice(0, 7)} · {draft.commitCount} commit
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p suppressHydrationWarning>Создан: {formatDateTime(draft.createdAt)}</p>
                  <p suppressHydrationWarning>Опубликован: {formatDateTime(draft.publishedAt)}</p>
                </div>
              </div>
              {draft.summary ? (
                <p className="mt-3 text-sm text-gray-300">{draft.summary}</p>
              ) : null}
              {draft.publishedReleaseSlug ? (
                <p className="mt-2 text-xs text-cyan-200">release: {draft.publishedReleaseSlug}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
