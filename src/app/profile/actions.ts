"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAIProfile } from "@/lib/ai-profile";
import { reviewAutomaticAppeal } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { isKonsensusAdminEmail } from "@/lib/site-config";
import type { AppealItemType } from "@/lib/appeal-helpers";
import {
  buildAppealableItemSnapshot,
} from "@/lib/appeals";
import {
  calculateQuestOutcome,
  getProfileQuest,
  type QuestCompletionResult,
} from "@/lib/profile-quests";
import type { Database, Json } from "@/types/database";

type ProfileQuestRunRow = Database["public"]["Tables"]["profile_quest_runs"]["Row"];
type AppealRow = Database["public"]["Tables"]["appeals"]["Row"];

function readResponses(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export type ProfileQuestActionResult =
  | {
      ok: true;
      runId: string;
      questKey: string;
      currentStep: number;
      responses: string[];
      isReadyToComplete?: boolean;
      completion?: QuestCompletionResult;
    }
  | {
      ok: false;
      error: string;
      completedAt?: string | null;
    };

export type SubmitAppealResult =
  | {
      ok: true;
      appealId: string;
      status: AppealRow["status"];
      reviewResult: AppealRow["review_result"];
      reviewNotes: string | null;
      reviewConfidence: number | null;
      itemType: AppealItemType;
      itemKey: string;
    }
  | {
      ok: false;
      error: string;
    };

export type ManualAppealOverrideResult =
  | {
      ok: true;
      appealId: string;
      manualOverrideResult: "kept" | "hidden";
      manualOverrideNotes: string | null;
      manualOverriddenAt: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName = (formData.get("display_name") as string).trim();
  const bio = (formData.get("bio") as string | null)?.trim() ?? null;
  const debateStance = (formData.get("debate_stance") as string | null)?.trim() ?? null;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio: bio || null,
      debate_stance: debateStance || null,
    } as never)
    .eq("id", user.id);

  if (error) {
    redirect("/profile?error=" + encodeURIComponent(error.message));
  }

  redirect("/profile?success=1");
}

export async function generateTelegramToken(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const token = "K-" + Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await supabase
    .from("profiles")
    .update({ telegram_link_token: token } as never)
    .eq("id", user.id);

  redirect("/profile?tg_token=" + token);
}

export async function disconnectTelegram(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({
      telegram_chat_id: null,
      telegram_link_token: null,
      telegram_bot_messages: [],
      telegram_message_index: {},
    } as never)
    .eq("id", user.id);

  redirect("/profile");
}

export async function reviewAppeal(
  appealId: string
): Promise<{
  ok: true;
  reviewResult: "kept" | "hidden";
  reviewConfidence: number;
  reviewNotes: string;
} | {
  ok: false;
  error: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нужно войти в аккаунт" };

  const { data: appeal } = await supabase
    .from("appeals")
    .select("*")
    .eq("id", appealId)
    .eq("user_id", user.id)
    .maybeSingle<AppealRow>();

  if (!appeal) return { ok: false, error: "Апелляция не найдена" };

  const review = await reviewAutomaticAppeal({
    itemType: appeal.item_type,
    itemLabel: appeal.item_label,
    sourceSnapshot:
      appeal.source_snapshot && typeof appeal.source_snapshot === "object"
        ? (appeal.source_snapshot as Record<string, unknown>)
        : {},
    appealText: appeal.appeal_text,
  });

  return {
    ok: true,
    reviewResult: review.decision,
    reviewConfidence: review.confidence,
    reviewNotes: review.rationale,
  };
}

export async function resolveAppeal(
  appealId: string,
  resolution: {
    reviewResult: "kept" | "hidden";
    reviewConfidence: number;
    reviewNotes: string;
  }
): Promise<SubmitAppealResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нужно войти в аккаунт" };

  const { data: existing } = await admin
    .from("appeals")
    .select("id")
    .eq("id", appealId)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!existing) {
    return { ok: false, error: "Апелляция не найдена" };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("appeals")
    .update({
      status: "resolved",
      review_result: resolution.reviewResult,
      review_confidence: resolution.reviewConfidence,
      review_notes: resolution.reviewNotes,
      reviewed_at: now,
      resolved_at: now,
      updated_at: now,
    } as never)
    .eq("id", appealId)
    .eq("user_id", user.id)
    .select("*")
    .single<AppealRow>();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Не удалось завершить апелляцию" };
  }

  return {
    ok: true,
    appealId: updated.id,
    status: updated.status,
    reviewResult: updated.review_result,
    reviewNotes: updated.review_notes,
    reviewConfidence: updated.review_confidence,
    itemType: updated.item_type,
    itemKey: updated.item_key,
  };
}

export async function applyManualAppealOverride(input: {
  appealId: string;
  reviewResult: "kept" | "hidden";
  reviewNotes: string;
}): Promise<ManualAppealOverrideResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isKonsensusAdminEmail(user.email)) {
    return { ok: false, error: "Нужен доступ модератора" };
  }

  const reviewNotes = input.reviewNotes.trim();
  if (reviewNotes.length < 8) {
    return { ok: false, error: "Добавьте короткую причину ручного решения." };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("appeals")
    .update({
      status: "resolved",
      manual_override_result: input.reviewResult,
      manual_override_notes: reviewNotes,
      manual_overridden_at: now,
      manual_overridden_by: user.id,
      updated_at: now,
    } as never)
    .eq("id", input.appealId)
    .select("id, manual_override_result, manual_override_notes, manual_overridden_at")
    .maybeSingle<{
      id: string;
      manual_override_result: "kept" | "hidden" | null;
      manual_override_notes: string | null;
      manual_overridden_at: string | null;
    }>();

  if (error || !updated?.manual_override_result || !updated.manual_overridden_at) {
    return { ok: false, error: error?.message ?? "Не удалось применить ручной override" };
  }

  return {
    ok: true,
    appealId: updated.id,
    manualOverrideResult: updated.manual_override_result,
    manualOverrideNotes: updated.manual_override_notes,
    manualOverriddenAt: updated.manual_overridden_at,
  };
}

export async function submitAppeal(input: {
  itemType: AppealItemType;
  itemKey: string;
  appealText: string;
}): Promise<SubmitAppealResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нужно войти в аккаунт" };

  const appealText = input.appealText.trim();
  if (appealText.length < 12) {
    return { ok: false, error: "Опишите апелляцию чуть подробнее: минимум 12 символов." };
  }
  if (appealText.length > 600) {
    return { ok: false, error: "Апелляция не должна превышать 600 символов." };
  }

  const snapshot = await buildAppealableItemSnapshot(user.id, input.itemType, input.itemKey);
  if (!snapshot) {
    return { ok: false, error: "Этот автоматический вывод сейчас недоступен для апелляции." };
  }

  const { data: existing } = await supabase
    .from("appeals")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_type", snapshot.itemType)
    .eq("item_key", snapshot.itemKey)
    .eq("status", "reviewing")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    return { ok: false, error: "По этому выводу уже идёт пересмотр." };
  }

  const now = new Date().toISOString();
  const { data: created, error } = await supabase
    .from("appeals")
    .insert({
      user_id: user.id,
      item_type: snapshot.itemType,
      item_key: snapshot.itemKey,
      item_label: snapshot.itemLabel,
      source_snapshot: snapshot.sourceSnapshot,
      appeal_text: appealText,
      status: "reviewing",
      updated_at: now,
    } as never)
    .select("*")
    .single<AppealRow>();

  if (error || !created) {
    return { ok: false, error: error?.message ?? "Не удалось отправить апелляцию" };
  }

  const review = await reviewAppeal(created.id);
  if (!review.ok) {
    return { ok: false, error: review.error };
  }

  return resolveAppeal(created.id, {
    reviewResult: review.reviewResult,
    reviewConfidence: review.reviewConfidence,
    reviewNotes: review.reviewNotes,
  });
}

export async function startProfileQuest(
  questKey: string
): Promise<ProfileQuestActionResult> {
  const quest = getProfileQuest(questKey);
  if (!quest) return { ok: false, error: "Квест не найден" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нужно войти в аккаунт" };

  const { data: inProgress } = await supabase
    .from("profile_quest_runs")
    .select("*")
    .eq("user_id", user.id)
    .eq("quest_key", questKey)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ProfileQuestRunRow>();

  if (inProgress) {
    const responses = readResponses(inProgress.responses);
    return {
      ok: true,
      runId: inProgress.id,
      questKey,
      currentStep: responses.length,
      responses,
      isReadyToComplete: responses.length >= quest.steps.length,
    };
  }

  const { data: completed } = await supabase
    .from("profile_quest_runs")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("quest_key", questKey)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ completed_at: string | null }>();

  if (completed?.completed_at) {
    return {
      ok: false,
      error: "Этот квест уже пройден. Повторяемость добавим отдельным пакетом.",
      completedAt: completed.completed_at,
    };
  }

  const now = new Date().toISOString();
  const { data: created, error } = await supabase
    .from("profile_quest_runs")
    .insert({
      user_id: user.id,
      quest_key: questKey,
      status: "in_progress",
      current_step: 0,
      responses: [],
      result_delta: {},
      started_at: now,
      updated_at: now,
    } as never)
    .select("*")
    .single<ProfileQuestRunRow>();

  if (error || !created) {
    return { ok: false, error: error?.message ?? "Не удалось запустить квест" };
  }

  return {
    ok: true,
    runId: created.id,
    questKey,
    currentStep: 0,
    responses: [],
  };
}

export async function submitProfileQuestChoice(
  runId: string,
  choiceId: string
): Promise<ProfileQuestActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нужно войти в аккаунт" };

  const { data: run } = await supabase
    .from("profile_quest_runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle<ProfileQuestRunRow>();

  if (!run) return { ok: false, error: "Прохождение квеста не найдено" };
  if (run.status !== "in_progress") {
    return { ok: false, error: "Этот квест уже завершён" };
  }

  const quest = getProfileQuest(run.quest_key);
  if (!quest) return { ok: false, error: "Квест не найден" };

  const responses = readResponses(run.responses);
  const currentStepIndex = responses.length;
  const currentStep = quest.steps[currentStepIndex];

  if (!currentStep) {
    return {
      ok: true,
      runId: run.id,
      questKey: run.quest_key,
      currentStep: currentStepIndex,
      responses,
      isReadyToComplete: true,
    };
  }

  const isValidChoice = currentStep.choices.some((choice) => choice.id === choiceId);
  if (!isValidChoice) {
    return { ok: false, error: "Выбранный вариант не подходит для этого шага" };
  }

  const nextResponses = [...responses, choiceId];
  const nextStepIndex = nextResponses.length;
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("profile_quest_runs")
    .update({
      responses: nextResponses,
      current_step: nextStepIndex,
      updated_at: now,
    } as never)
    .eq("id", run.id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    runId: run.id,
    questKey: run.quest_key,
    currentStep: nextStepIndex,
    responses: nextResponses,
    isReadyToComplete: nextStepIndex >= quest.steps.length,
  };
}

export async function completeProfileQuest(
  runId: string
): Promise<ProfileQuestActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нужно войти в аккаунт" };

  const { data: run } = await supabase
    .from("profile_quest_runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle<ProfileQuestRunRow>();

  if (!run) return { ok: false, error: "Прохождение квеста не найдено" };
  if (run.status !== "in_progress") {
    return { ok: false, error: "Этот квест уже завершён" };
  }

  const quest = getProfileQuest(run.quest_key);
  if (!quest) return { ok: false, error: "Квест не найден" };

  const responses = readResponses(run.responses);
  if (responses.length < quest.steps.length) {
    return { ok: false, error: "Квест ещё не пройден до конца" };
  }

  const profile = await fetchAIProfile(user.id);
  const outcome = calculateQuestOutcome(profile, run.quest_key, responses);
  const now = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("user_ai_profiles")
    .upsert(
      {
        user_id: user.id,
        argumentation_style: outcome.updatedProfile.argumentation_style,
        compromise_tendency: outcome.updatedProfile.compromise_tendency,
        impulsivity: outcome.updatedProfile.impulsivity,
        empathy_score: outcome.updatedProfile.empathy_score,
        updated_at: now,
      } as never,
      { onConflict: "user_id" }
    );

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const { error: runError } = await supabase
    .from("profile_quest_runs")
    .update({
      status: "completed",
      current_step: responses.length,
      result_delta: outcome.delta,
      completed_at: now,
      updated_at: now,
    } as never)
    .eq("id", run.id)
    .eq("user_id", user.id);

  if (runError) {
    return { ok: false, error: runError.message };
  }

  return {
    ok: true,
    runId: run.id,
    questKey: run.quest_key,
    currentStep: responses.length,
    responses,
    completion: outcome.completion,
  };
}
