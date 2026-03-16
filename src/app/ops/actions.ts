"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isKonsensusAdminEmail } from "@/lib/site-config";
import {
  bulkCancelEditorialDrafts,
  cancelEditorialDraft,
  createEditorialDraft,
  duplicateEditorialDraft,
  publishEditorialDraft,
  rebaseEditorialDraft,
  reopenEditorialDraft,
  scheduleEditorialDraft,
  updateEditorialDraft,
} from "@/lib/editorial-ops";
import type { ReleaseTarget } from "@/lib/releases";

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isKonsensusAdminEmail(user.email)) {
    return null;
  }

  return user;
}

function revalidateOpsPaths() {
  revalidatePath("/ops");
  revalidatePath("/ops/editorial");
  revalidatePath("/profile");
}

export async function generateEditorialDraftAction(input?: {
  target?: ReleaseTarget;
}) {
  const user = await requireAdminUser();
  if (!user) return { ok: false as const, error: "Нужен доступ администратора." };

  const result = await createEditorialDraft({
    userId: user.id,
    target: input?.target ?? "both",
  });

  if (!result.ok) return result;
  revalidateOpsPaths();
  return {
    ok: true as const,
    draftId: result.draft.id,
    reusedExisting: result.reusedExisting,
  };
}

export async function saveEditorialDraftAction(input: {
  draftId: string;
  title: string;
  summary: string;
  features: string;
  notes?: string;
  target: ReleaseTarget;
  workflowKind: "product_update" | "ux_refresh" | "ops_notice" | "mixed_release";
  scheduleAt?: string | null;
  expectedUpdatedAt?: string | null;
}) {
  const user = await requireAdminUser();
  if (!user) return { ok: false as const, error: "Нужен доступ администратора." };

  const result = await updateEditorialDraft({
    draftId: input.draftId,
    userId: user.id,
    title: input.title,
    summary: input.summary,
    features: input.features,
    notes: input.notes,
    target: input.target,
    workflowKind: input.workflowKind,
    scheduleAt: input.scheduleAt,
    expectedUpdatedAt: input.expectedUpdatedAt,
  });

  if (!result.ok) return result;
  revalidateOpsPaths();
  return { ok: true as const };
}

export async function publishEditorialDraftAction(input: {
  draftId: string;
  title: string;
  summary: string;
  features: string;
  notes?: string;
  target: ReleaseTarget;
  workflowKind: "product_update" | "ux_refresh" | "ops_notice" | "mixed_release";
  expectedUpdatedAt?: string | null;
}) {
  const user = await requireAdminUser();
  if (!user) return { ok: false as const, error: "Нужен доступ администратора." };

  const saved = await updateEditorialDraft({
    draftId: input.draftId,
    userId: user.id,
    title: input.title,
    summary: input.summary,
    features: input.features,
    notes: input.notes,
    target: input.target,
    workflowKind: input.workflowKind,
    scheduleAt: null,
    expectedUpdatedAt: input.expectedUpdatedAt,
  });

  if (!saved.ok) return saved;

  const result = await publishEditorialDraft({
    draftId: input.draftId,
    userId: user.id,
    expectedUpdatedAt: input.expectedUpdatedAt,
  });

  if (!result.ok) return result;
  revalidateOpsPaths();
  return { ok: true as const, slug: result.slug };
}

export async function scheduleEditorialDraftAction(input: {
  draftId: string;
  title: string;
  summary: string;
  features: string;
  notes?: string;
  target: ReleaseTarget;
  workflowKind: "product_update" | "ux_refresh" | "ops_notice" | "mixed_release";
  scheduleAt: string;
  expectedUpdatedAt?: string | null;
}) {
  const user = await requireAdminUser();
  if (!user) return { ok: false as const, error: "Нужен доступ администратора." };

  const saved = await updateEditorialDraft({
    draftId: input.draftId,
    userId: user.id,
    title: input.title,
    summary: input.summary,
    features: input.features,
    notes: input.notes,
    target: input.target,
    workflowKind: input.workflowKind,
    scheduleAt: input.scheduleAt,
    expectedUpdatedAt: input.expectedUpdatedAt,
  });

  if (!saved.ok) return saved;

  const result = await scheduleEditorialDraft({
    draftId: input.draftId,
    expectedUpdatedAt: input.expectedUpdatedAt,
  });

  if (!result.ok) return result;
  revalidateOpsPaths();
  return { ok: true as const, slug: result.slug, scheduledAt: result.scheduledAt };
}

export async function cancelEditorialDraftAction(input: {
  draftId: string;
  expectedUpdatedAt?: string | null;
}) {
  const user = await requireAdminUser();
  if (!user) return { ok: false as const, error: "Нужен доступ администратора." };

  const result = await cancelEditorialDraft(input);
  if (!result.ok) return result;
  revalidateOpsPaths();
  return { ok: true as const };
}

export async function rebaseEditorialDraftAction(input: {
  draftId: string;
  expectedUpdatedAt?: string | null;
}) {
  const user = await requireAdminUser();
  if (!user) return { ok: false as const, error: "Нужен доступ администратора." };

  const result = await rebaseEditorialDraft({
    draftId: input.draftId,
    userId: user.id,
    expectedUpdatedAt: input.expectedUpdatedAt,
  });

  if (!result.ok) return result;
  revalidateOpsPaths();
  return { ok: true as const };
}

export async function bulkCancelEditorialDraftsAction(input: { draftIds: string[] }) {
  const user = await requireAdminUser();
  if (!user) return { ok: false as const, error: "Нужен доступ администратора." };

  const result = await bulkCancelEditorialDrafts(input);
  if (!result.ok) return result;
  revalidateOpsPaths();
  return result;
}

export async function duplicateEditorialDraftAction(input: { draftId: string }) {
  const user = await requireAdminUser();
  if (!user) return { ok: false as const, error: "Нужен доступ администратора." };

  const result = await duplicateEditorialDraft({
    draftId: input.draftId,
    userId: user.id,
  });

  if (!result.ok) return result;
  revalidateOpsPaths();
  return { ok: true as const, draftId: result.draft.id };
}

export async function reopenEditorialDraftAction(input: {
  draftId: string;
  expectedUpdatedAt?: string | null;
}) {
  const user = await requireAdminUser();
  if (!user) return { ok: false as const, error: "Нужен доступ администратора." };

  const result = await reopenEditorialDraft(input);
  if (!result.ok) return result;
  revalidateOpsPaths();
  return { ok: true as const, draftId: result.draft.id };
}
