import type { Database, Json } from "@/types/database";
import {
  normalizeScheduledPublishAt,
  type ReleaseTarget,
} from "@/lib/releases";
import {
  publishReleaseAnnouncement,
  scheduleReleaseAnnouncement,
} from "@/lib/telegram";
import { collectEditorialChanges, fetchGitHubHeadCommit } from "@/lib/editorial-git";
import { generateEditorialReleaseDraft } from "@/lib/ai";

export const EDITORIAL_SCOPE = "telegram_release";

export type EditorialCursorRow =
  Database["public"]["Tables"]["editorial_release_cursor"]["Row"];
export type EditorialDraftRow =
  Database["public"]["Tables"]["editorial_release_drafts"]["Row"];

export type EditorialDraftRecord = {
  id: string;
  scope: string;
  fromCommit: string | null;
  toCommit: string;
  commitCount: number;
  status: EditorialDraftRow["status"];
  title: string;
  summary: string;
  features: string[];
  notes: string;
  target: ReleaseTarget;
  scheduleAt: string | null;
  sourceCommits: string[];
  sourceStatusLines: string[];
  generationContext: {
    commits: Array<{ sha: string; shortSha: string; message: string; committedAt: string; url: string }>;
    changedFiles: string[];
  };
  publishedReleaseSlug: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EditorialOverview = {
  cursor: EditorialCursorRow | null;
  baselineCommit: string | null;
  headCommit: { sha: string; shortSha: string; message: string; committedAt: string; url: string };
  pendingCommitCount: number;
  pendingCommitsPreview: Array<{ sha: string; shortSha: string; message: string; committedAt: string; url: string }>;
};

function toDraftRecord(row: EditorialDraftRow): EditorialDraftRecord {
  const generationContext =
    row.generation_context && typeof row.generation_context === "object" && !Array.isArray(row.generation_context)
      ? (row.generation_context as {
          commits?: EditorialDraftRecord["generationContext"]["commits"];
          changedFiles?: string[];
        })
      : {};

  return {
    id: row.id,
    scope: row.scope,
    fromCommit: row.from_commit,
    toCommit: row.to_commit,
    commitCount: row.commit_count,
    status: row.status,
    title: row.title ?? "",
    summary: row.summary ?? "",
    features: row.features ?? [],
    notes: row.notes ?? "",
    target: row.target ?? "both",
    scheduleAt: row.schedule_at,
    sourceCommits: row.source_commits ?? [],
    sourceStatusLines: row.source_status_lines ?? [],
    generationContext: {
      commits: generationContext.commits ?? [],
      changedFiles: generationContext.changedFiles ?? [],
    },
    publishedReleaseSlug: row.published_release_slug,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeFeatureList(input: string[] | string) {
  const values = Array.isArray(input) ? input : input.split(/\r?\n/);
  return values.map((item) => item.trim()).filter(Boolean).slice(0, 5);
}

async function getAdmin() {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return createAdminClient();
}

async function getLatestTrackedDraft(scope = EDITORIAL_SCOPE) {
  const admin = await getAdmin();
  const { data } = await admin
    .from("editorial_release_drafts")
    .select("*")
    .eq("scope", scope)
    .in("status", ["draft", "scheduled", "published"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<EditorialDraftRow>();

  return data ? toDraftRecord(data) : null;
}

export async function fetchEditorialCursor(scope = EDITORIAL_SCOPE) {
  const admin = await getAdmin();
  const { data } = await admin
    .from("editorial_release_cursor")
    .select("*")
    .eq("scope", scope)
    .maybeSingle<EditorialCursorRow>();

  return data ?? null;
}

export async function fetchEditorialDrafts(scope = EDITORIAL_SCOPE, limit = 12) {
  const admin = await getAdmin();
  const { data } = await admin
    .from("editorial_release_drafts")
    .select("*")
    .eq("scope", scope)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<EditorialDraftRow[]>();

  return (data ?? []).map(toDraftRecord);
}

export async function fetchEditorialOverview(scope = EDITORIAL_SCOPE): Promise<EditorialOverview> {
  const cursor = await fetchEditorialCursor(scope);
  const latestTrackedDraft = await getLatestTrackedDraft(scope);
  const baselineCommit = latestTrackedDraft?.toCommit ?? cursor?.last_published_commit ?? null;
  const headCommit = await fetchGitHubHeadCommit();

  if (baselineCommit && baselineCommit === headCommit.sha) {
    return {
      cursor,
      baselineCommit,
      headCommit,
      pendingCommitCount: 0,
      pendingCommitsPreview: [],
    };
  }

  const changes = await collectEditorialChanges({
    fromCommit: baselineCommit,
    toCommit: headCommit.sha,
  });

  return {
    cursor,
    baselineCommit,
    headCommit,
    pendingCommitCount: changes.commitCount,
    pendingCommitsPreview: changes.commits.slice(0, 5),
  };
}

async function findExistingDraftByHeadCommit(toCommit: string, scope = EDITORIAL_SCOPE) {
  const admin = await getAdmin();
  const { data } = await admin
    .from("editorial_release_drafts")
    .select("*")
    .eq("scope", scope)
    .eq("to_commit", toCommit)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<EditorialDraftRow>();

  return data ? toDraftRecord(data) : null;
}

export async function createEditorialDraft(input: {
  userId: string;
  scope?: string;
  target?: ReleaseTarget;
}): Promise<
  | { ok: true; draft: EditorialDraftRecord; reusedExisting: boolean }
  | { ok: false; error: string }
> {
  const scope = input.scope ?? EDITORIAL_SCOPE;
  const overview = await fetchEditorialOverview(scope);

  if (overview.pendingCommitCount === 0) {
    return { ok: false, error: "Новых изменений для editorial draft сейчас нет." };
  }

  const existing = await findExistingDraftByHeadCommit(overview.headCommit.sha, scope);
  if (existing) {
    return { ok: true, draft: existing, reusedExisting: true };
  }

  const changes = await collectEditorialChanges({
    fromCommit: overview.baselineCommit,
    toCommit: overview.headCommit.sha,
  });

  const aiDraft = await generateEditorialReleaseDraft({
    changes,
    scope,
  });

  if (!aiDraft.shouldPublish) {
    return {
      ok: false,
      error: aiDraft.reasonIfSkipped || "ИИ не нашёл достаточного user-facing материала для релиза.",
    };
  }

  const admin = await getAdmin();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("editorial_release_drafts")
    .insert({
      scope,
      from_commit: changes.baseCommit,
      to_commit: changes.headCommit,
      commit_count: changes.commitCount,
      status: "draft",
      title: aiDraft.title,
      summary: aiDraft.summary,
      features: aiDraft.features,
      notes: aiDraft.notes ?? null,
      target: input.target ?? "both",
      source_commits: changes.commits.map((commit) => commit.sha),
      source_status_lines: changes.statusLines,
      generation_context: {
        commits: changes.commits,
        changedFiles: changes.changedFiles,
      } satisfies Json,
      created_by: input.userId,
      updated_at: now,
    } as never)
    .select("*")
    .single<EditorialDraftRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Не удалось сохранить editorial draft." };
  }

  return {
    ok: true,
    draft: toDraftRecord(data),
    reusedExisting: false,
  };
}

export async function updateEditorialDraft(input: {
  draftId: string;
  userId: string;
  title: string;
  summary: string;
  features: string[] | string;
  notes?: string;
  target: ReleaseTarget;
  scheduleAt?: string | null;
}) {
  const admin = await getAdmin();
  const now = new Date().toISOString();
  const title = input.title.trim();
  const summary = input.summary.trim();
  const features = normalizeFeatureList(input.features);
  const notes = input.notes?.trim() || null;
  const scheduleAt = input.scheduleAt?.trim()
    ? normalizeScheduledPublishAt(input.scheduleAt)
    : null;

  if (!title) return { ok: false as const, error: "Нужен заголовок релиза." };
  if (!summary) return { ok: false as const, error: "Нужно краткое summary." };
  if (features.length === 0) {
    return { ok: false as const, error: "Нужен хотя бы один user-facing пункт." };
  }

  const { data, error } = await admin
    .from("editorial_release_drafts")
    .update({
      title,
      summary,
      features,
      notes,
      target: input.target,
      schedule_at: scheduleAt,
      updated_at: now,
    } as never)
    .eq("id", input.draftId)
    .select("*")
    .maybeSingle<EditorialDraftRow>();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Не удалось обновить draft." };
  }

  return { ok: true as const, draft: toDraftRecord(data) };
}

export async function publishEditorialDraft(input: {
  draftId: string;
  userId: string;
}) {
  const admin = await getAdmin();
  const { data: draftRow } = await admin
    .from("editorial_release_drafts")
    .select("*")
    .eq("id", input.draftId)
    .maybeSingle<EditorialDraftRow>();

  if (!draftRow) {
    return { ok: false as const, error: "Editorial draft не найден." };
  }

  const draft = toDraftRecord(draftRow);
  if (draft.status === "published") {
    return { ok: false as const, error: "Этот draft уже опубликован." };
  }

  const result = await publishReleaseAnnouncement({
    title: draft.title,
    summary: draft.summary,
    features: draft.features,
    notes: draft.notes || undefined,
    source_commits: draft.sourceCommits,
  }, draft.target);

  const now = new Date().toISOString();
  await admin
    .from("editorial_release_drafts")
    .update({
      status: "published",
      published_release_slug: result.slug,
      published_at: now,
      updated_at: now,
    } as never)
    .eq("id", input.draftId);

  await admin.from("editorial_release_cursor").upsert({
    scope: draft.scope,
    last_published_commit: draft.toCommit,
    last_published_release_slug: result.slug,
    updated_by: input.userId,
    updated_at: now,
  } as never, { onConflict: "scope" });

  return { ok: true as const, slug: result.slug };
}

export async function scheduleEditorialDraft(input: {
  draftId: string;
}) {
  const admin = await getAdmin();
  const { data: draftRow } = await admin
    .from("editorial_release_drafts")
    .select("*")
    .eq("id", input.draftId)
    .maybeSingle<EditorialDraftRow>();

  if (!draftRow) {
    return { ok: false as const, error: "Editorial draft не найден." };
  }

  const draft = toDraftRecord(draftRow);
  if (!draft.scheduleAt) {
    return { ok: false as const, error: "Укажите дату и время для schedule." };
  }

  const scheduled = await scheduleReleaseAnnouncement({
    payload: {
      title: draft.title,
      summary: draft.summary,
      features: draft.features,
      notes: draft.notes || undefined,
      source_commits: draft.sourceCommits,
    },
    target: draft.target,
    scheduleAt: draft.scheduleAt,
  });

  const now = new Date().toISOString();
  await admin
    .from("editorial_release_drafts")
    .update({
      status: "scheduled",
      published_release_slug: scheduled.slug,
      updated_at: now,
    } as never)
    .eq("id", input.draftId);

  return { ok: true as const, slug: scheduled.slug, scheduledAt: scheduled.scheduledAt };
}

export async function cancelEditorialDraft(input: {
  draftId: string;
}) {
  const admin = await getAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("editorial_release_drafts")
    .update({
      status: "cancelled",
      updated_at: now,
    } as never)
    .eq("id", input.draftId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
