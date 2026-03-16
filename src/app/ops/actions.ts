"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isKonsensusAdminEmail } from "@/lib/site-config";
import {
  cancelEditorialDraft,
  createEditorialDraft,
  publishEditorialDraft,
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
  scheduleAt?: string | null;
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
    scheduleAt: input.scheduleAt,
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
    scheduleAt: null,
  });

  if (!saved.ok) return saved;

  const result = await publishEditorialDraft({
    draftId: input.draftId,
    userId: user.id,
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
  scheduleAt: string;
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
    scheduleAt: input.scheduleAt,
  });

  if (!saved.ok) return saved;

  const result = await scheduleEditorialDraft({
    draftId: input.draftId,
  });

  if (!result.ok) return result;
  revalidateOpsPaths();
  return { ok: true as const, slug: result.slug, scheduledAt: result.scheduledAt };
}

export async function cancelEditorialDraftAction(input: { draftId: string }) {
  const user = await requireAdminUser();
  if (!user) return { ok: false as const, error: "Нужен доступ администратора." };

  const result = await cancelEditorialDraft(input);
  if (!result.ok) return result;
  revalidateOpsPaths();
  return { ok: true as const };
}
