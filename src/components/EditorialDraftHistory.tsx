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
  { key: "rebased", label: "With rebase" },
] as const;

type HistoryFilter = (typeof FILTERS)[number]["key"];

export default function EditorialDraftHistory({
  drafts,
}: {
  drafts: EditorialDraftRecord[];
}) {
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [query, setQuery] = useState("");

  const filteredDrafts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return drafts.filter((draft) => {
      if (filter === "published" || filter === "cancelled") {
        if (draft.status !== filter) return false;
      } else if (filter === "rebased" && draft.generationContext.rebaseHistory.length === 0) {
        return false;
      }

      if (!normalizedQuery) return true;

      const haystack = [
        draft.title,
        draft.summary,
        draft.publishedReleaseSlug,
        draft.toCommit,
        ...draft.features,
      ]
        .filter(Boolean)
        .join("\n")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [drafts, filter, query]);

  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
        История editorial drafts пока пуста.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по заголовку, slug или commit"
          className="w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/35 focus:outline-none lg:max-w-sm"
        />
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
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">
                  {draft.workflowKind}
                </span>
                {draft.generationContext.rebaseHistory.length > 0 ? (
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">
                    rebases: {draft.generationContext.rebaseHistory.length}
                  </span>
                ) : null}
              </div>
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
