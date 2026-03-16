import type { EditorialDraftRecord } from "@/lib/editorial-ops";
import type { EditorialReleaseReport } from "@/lib/editorial-reporting";

type TimelineItem =
  | {
      id: string;
      type: "draft";
      title: string;
      label: string;
      createdAt: string;
      meta: string;
    }
  | {
      id: string;
      type: "release";
      title: string;
      label: string;
      createdAt: string;
      meta: string;
    };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU");
}

function toTimelineItems(
  drafts: EditorialDraftRecord[],
  releases: EditorialReleaseReport[]
): TimelineItem[] {
  const draftItems: TimelineItem[] = drafts.map((draft) => ({
    id: `draft-${draft.id}`,
    type: "draft",
    title: draft.title || "Без заголовка",
    label: draft.status,
    createdAt: draft.updatedAt,
    meta: `${draft.workflowKind} · ${draft.toCommit.slice(0, 7)}`,
  }));

  const releaseItems: TimelineItem[] = releases.map((release) => ({
    id: `release-${release.id}`,
    type: "release",
    title: release.title,
    label: release.scheduled_published_at ? "delivered" : "release",
    createdAt: release.last_delivery_attempt_at || release.created_at,
    meta: release.slug,
  }));

  return [...draftItems, ...releaseItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
}

function getTone(item: TimelineItem) {
  if (item.type === "release") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }

  if (item.label === "scheduled") {
    return "border-cyan-500/20 bg-cyan-500/10 text-cyan-100";
  }

  if (item.label === "cancelled") {
    return "border-red-500/20 bg-red-500/10 text-red-100";
  }

  return "border-violet-500/20 bg-violet-500/10 text-violet-100";
}

export default function EditorialOpsTimeline({
  drafts,
  releases,
}: {
  drafts: EditorialDraftRecord[];
  releases: EditorialReleaseReport[];
}) {
  const items = toTimelineItems(drafts, releases);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
        Timeline пока пуста.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${getTone(
                    item
                  )}`}
                >
                  {item.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{item.meta}</p>
            </div>
            <p className="text-xs text-gray-500" suppressHydrationWarning>
              {formatDateTime(item.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
