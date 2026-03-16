import type { EditorialDraftRecord } from "@/lib/editorial-ops";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
}

export default function EditorialDraftHistory({
  drafts,
}: {
  drafts: EditorialDraftRecord[];
}) {
  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
        История editorial drafts пока пуста.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {draft.title || "Без заголовка"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {draft.status} · {draft.toCommit.slice(0, 7)} · {draft.commitCount} commit
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
  );
}
