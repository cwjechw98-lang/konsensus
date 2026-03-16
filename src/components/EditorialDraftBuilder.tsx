"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EditorialDraftRecord, EditorialOverview } from "@/lib/editorial-ops";
import type { ReleaseTarget } from "@/lib/releases";
import {
  cancelEditorialDraftAction,
  generateEditorialDraftAction,
  publishEditorialDraftAction,
  saveEditorialDraftAction,
  scheduleEditorialDraftAction,
} from "@/app/ops/actions";

function toInputDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function DraftEditorCard({
  draft,
}: {
  draft: EditorialDraftRecord;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(draft.title);
  const [summary, setSummary] = useState(draft.summary);
  const [features, setFeatures] = useState(draft.features.join("\n"));
  const [notes, setNotes] = useState(draft.notes);
  const [target, setTarget] = useState<ReleaseTarget>(draft.target);
  const [scheduleAt, setScheduleAt] = useState(toInputDateTime(draft.scheduleAt));
  const [message, setMessage] = useState<string | null>(null);

  const changedFiles = draft.generationContext.changedFiles;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            Draft · {draft.status === "scheduled" ? "scheduled" : "ready"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {draft.commitCount} commit · {draft.fromCommit ? `${draft.fromCommit.slice(0, 7)}..` : ""}
            {draft.toCommit.slice(0, 7)}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p suppressHydrationWarning>
            Создан: {new Date(draft.createdAt).toLocaleString("ru-RU")}
          </p>
          {draft.publishedReleaseSlug ? (
            <p className="mt-1 text-cyan-200">release: {draft.publishedReleaseSlug}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-purple-500/35 focus:outline-none"
            placeholder="Заголовок релиза"
          />
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-purple-500/35 focus:outline-none resize-none"
            placeholder="Краткое summary"
          />
          <textarea
            value={features}
            onChange={(event) => setFeatures(event.target.value)}
            rows={5}
            className="w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-purple-500/35 focus:outline-none resize-none"
            placeholder="По одному user-facing пункту на строку"
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-purple-500/35 focus:outline-none resize-none"
            placeholder="Короткая дополнительная заметка"
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Publish settings</p>
            <label className="mt-3 block text-xs text-gray-400">
              Target
              <select
                value={target}
                onChange={(event) => setTarget(event.target.value as ReleaseTarget)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-purple-500/35 focus:outline-none"
              >
                <option value="both">Бот + канал</option>
                <option value="bot">Только бот</option>
                <option value="channel">Только канал</option>
              </select>
            </label>
            <label className="mt-3 block text-xs text-gray-400">
              Schedule
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-purple-500/35 focus:outline-none"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Source context</p>
            <div className="mt-3 space-y-2 text-xs text-gray-400">
              {draft.generationContext.commits.slice(0, 5).map((commit) => (
                <div key={commit.sha}>
                  <span className="text-cyan-200">{commit.shortSha}</span> {commit.message}
                </div>
              ))}
            </div>
            {changedFiles.length > 0 ? (
              <p className="mt-3 text-xs text-gray-500">
                Файлов в диапазоне: {changedFiles.length}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300">
          {message}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveEditorialDraftAction({
                draftId: draft.id,
                title,
                summary,
                features,
                notes,
                target,
                scheduleAt,
              });
              setMessage(result.ok ? "Черновик сохранён." : result.error);
              if (result.ok) router.refresh();
            })
          }
          className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.08] disabled:opacity-60"
        >
          Сохранить
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await publishEditorialDraftAction({
                draftId: draft.id,
                title,
                summary,
                features,
                notes,
                target,
              });
              setMessage(result.ok ? `Опубликовано: ${result.slug}` : result.error);
              if (result.ok) router.refresh();
            })
          }
          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
        >
          Опубликовать сейчас
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await scheduleEditorialDraftAction({
                draftId: draft.id,
                title,
                summary,
                features,
                notes,
                target,
                scheduleAt,
              });
              setMessage(
                result.ok
                  ? `Запланировано: ${new Date(result.scheduledAt).toLocaleString("ru-RU")}`
                  : result.error
              );
              if (result.ok) router.refresh();
            })
          }
          className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-500/20 disabled:opacity-60"
        >
          Запланировать
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelEditorialDraftAction({ draftId: draft.id });
              setMessage(result.ok ? "Draft отменён." : result.error);
              if (result.ok) router.refresh();
            })
          }
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 transition-colors hover:bg-red-500/20 disabled:opacity-60"
        >
          Отменить
        </button>
      </div>
    </div>
  );
}

export default function EditorialDraftBuilder({
  overview,
  drafts,
}: {
  overview: EditorialOverview;
  drafts: EditorialDraftRecord[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">Release cursor</p>
            <p className="text-sm text-gray-300">
              baseline:{" "}
              <span className="font-medium text-white">
                {overview.baselineCommit ? overview.baselineCommit.slice(0, 7) : "initial window"}
              </span>
            </p>
            <p className="text-sm text-gray-300">
              head: <span className="font-medium text-white">{overview.headCommit.shortSha}</span>{" "}
              {overview.headCommit.message}
            </p>
            <p className="text-sm text-gray-300">
              новых commit:{" "}
              <span className="font-medium text-cyan-200">{overview.pendingCommitCount}</span>
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await generateEditorialDraftAction();
                setMessage(
                  result.ok
                    ? result.reusedExisting
                      ? "Черновик для этого head уже существует. Открыт текущий диапазон."
                      : "Новый editorial draft собран."
                    : result.error
                );
                if (result.ok) router.refresh();
              })
            }
            className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-2.5 text-sm font-medium text-purple-100 transition-colors hover:bg-purple-500/20 disabled:opacity-60"
          >
            Сгенерировать черновик
          </button>
        </div>
        {overview.pendingCommitsPreview.length > 0 ? (
          <div className="mt-4 grid gap-2 text-sm text-gray-400">
            {overview.pendingCommitsPreview.map((commit) => (
              <div key={commit.sha}>
                <span className="text-cyan-200">{commit.shortSha}</span> {commit.message}
              </div>
            ))}
          </div>
        ) : null}
        {message ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-gray-300">
            {message}
          </div>
        ) : null}
      </div>

      {drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <DraftEditorCard key={draft.id} draft={draft} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
          Активных editorial drafts пока нет.
        </div>
      )}
    </div>
  );
}
