"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendArgumentNotification, sendMediationReadyNotification, sendInviteEmail, sendDirectChallengeEmail } from "@/lib/email";
import { clearTelegramDisputeNotifications, notifyArgumentReceived, notifyDirectChallengeReceived, notifyDisputeClosed, notifyDisputeReminder, notifyMediationReady, notifyOpponentJoined, notifyDisputeResolved } from "@/lib/telegram";
import { generateRoundInsights, generateWaitingInsight, generatePublicRoundSummary, categorizeTopicAI, generateFinalMediation } from "@/lib/ai";
import { awardAchievement } from "@/lib/achievements";
import type { Database } from "@/types/database";
import { getDisplayName } from "@/lib/display-name";
import { getAppUrl } from "@/lib/url";
import {
  fetchTrustTierState,
  getTrustTierGateMessage,
  hasMinimumTrustTier,
} from "@/lib/trust-tier";

type DisputeInsert = Database["public"]["Tables"]["disputes"]["Insert"];
type DisputeRow = Database["public"]["Tables"]["disputes"]["Row"];
type ArgumentRow = Database["public"]["Tables"]["arguments"]["Row"];
type DisputeUserStateInsert = Database["public"]["Tables"]["dispute_user_state"]["Insert"];
type DisputeUserStateRow = Database["public"]["Tables"]["dispute_user_state"]["Row"];
type DisputeReminderInsert = Database["public"]["Tables"]["dispute_reminders"]["Insert"];

const REMINDER_LIMIT_PER_HOUR = 3;
const REMINDER_LIMIT_PER_DAY = 15;

async function findExistingUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  let page = 1;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;

    const found = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email && !candidate.is_anonymous
    );

    if (found) return found;
    if (data.users.length < 200) break;

    page += 1;
  }

  return null;
}

async function upsertDisputeArchiveState(
  admin: ReturnType<typeof createAdminClient>,
  disputeId: string,
  userId: string,
  isArchived: boolean,
  extra: Partial<DisputeUserStateInsert> = {}
) {
  const payload: DisputeUserStateInsert = {
    dispute_id: disputeId,
    user_id: userId,
    is_archived: isArchived,
    archived_at: isArchived ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    ...extra,
  };

  await admin.from("dispute_user_state").upsert(payload as never, {
    onConflict: "dispute_id,user_id",
  });
}

async function getDisputeUserState(
  admin: ReturnType<typeof createAdminClient>,
  disputeId: string,
  userId: string
) {
  const { data } = await admin
    .from("dispute_user_state")
    .select("*")
    .eq("dispute_id", disputeId)
    .eq("user_id", userId)
    .maybeSingle<DisputeUserStateRow>();

  return data;
}

async function unarchiveDisputeForParticipants(
  admin: ReturnType<typeof createAdminClient>,
  disputeId: string,
  userIds: Array<string | null | undefined>
) {
  const participantIds = Array.from(new Set(userIds.filter(Boolean))) as string[];
  await Promise.all(
    participantIds.map((participantId) =>
      upsertDisputeArchiveState(admin, disputeId, participantId, false, {
        pending_reminder_count: 0,
        last_reminded_at: null,
        last_reminder_from_user_id: null,
        reminder_notifications_muted: false,
        rearchived_after_reminder_at: null,
      })
    )
  );
}

async function countReminderAttempts(
  admin: ReturnType<typeof createAdminClient>,
  disputeId: string,
  fromUserId: string
) {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: hourCount }, { count: dayCount }] = await Promise.all([
    admin
      .from("dispute_reminders")
      .select("*", { count: "exact", head: true })
      .eq("dispute_id", disputeId)
      .eq("from_user_id", fromUserId)
      .gte("created_at", hourAgo),
    admin
      .from("dispute_reminders")
      .select("*", { count: "exact", head: true })
      .eq("dispute_id", disputeId)
      .eq("from_user_id", fromUserId)
      .gte("created_at", dayAgo),
  ]);

  return {
    hourCount: hourCount ?? 0,
    dayCount: dayCount ?? 0,
  };
}

function withMessage(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}message=${encodeURIComponent(message)}`;
}

export async function createDispute(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = ((formData.get("title") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const maxRounds = Math.min(20, Math.max(1, parseInt(formData.get("max_rounds") as string) || 3));
  const opponentEmail = ((formData.get("opponent_email") as string) ?? "").trim().toLowerCase();
  const isPublic = formData.get("is_public") === "true";

  if (isPublic) {
    const trust = await fetchTrustTierState(user.id);
    if (!hasMinimumTrustTier(trust.tier, "trusted")) {
      redirect(
        "/dispute/new?error=" +
          encodeURIComponent(getTrustTierGateMessage("trusted"))
      );
    }
  }

  // Input validation
  if (!title || title.length < 3) {
    redirect("/dispute/new?error=" + encodeURIComponent("Название спора должно содержать минимум 3 символа"));
  }
  if (title.length > 200) {
    redirect("/dispute/new?error=" + encodeURIComponent("Название спора не должно превышать 200 символов"));
  }
  if (!description || description.length < 5) {
    redirect("/dispute/new?error=" + encodeURIComponent("Добавьте описание спора (минимум 5 символов)"));
  }

  // Rate limiting: max 5 active disputes per user
  const { count: activeCount } = await supabase
    .from("disputes")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", user.id)
    .in("status", ["open", "in_progress"]);

  if ((activeCount ?? 0) >= 5) {
    redirect("/dashboard?error=" + encodeURIComponent("У вас уже 5 активных споров. Завершите или закройте существующие."));
  }

  // Direct challenge: look up opponent by email
  let opponentId: string | null = null;
  let initialStatus: DisputeRow["status"] = "open";

  if (opponentEmail) {
    try {
      const admin = createAdminClient();
      const found = await findExistingUserByEmail(admin, opponentEmail);
      if (found && found.id !== user.id) {
        opponentId = found.id;
        initialStatus = "in_progress";
      }
    } catch { /* non-critical */ }
  }

  // AI categorization (non-blocking)
  const category = await categorizeTopicAI(title, description);

  const row: DisputeInsert = {
    title,
    description,
    max_rounds: maxRounds,
    creator_id: user.id,
    is_public: isPublic,
    category,
    ...(opponentId ? { opponent_id: opponentId, status: initialStatus } : {}),
  };

  const { data, error } = await supabase
    .from("disputes")
    .insert(row as never)
    .select("id, invite_code")
    .single<{ id: string; invite_code: string }>();

  if (error || !data) {
    redirect("/dashboard?error=" + encodeURIComponent(error?.message ?? "Ошибка создания спора"));
  }

  let creatorDisplayName = getDisplayName(null, user);
  try {
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single<{ display_name: string | null }>();
    creatorDisplayName = getDisplayName(myProfile?.display_name, user);

    if (!myProfile?.display_name?.trim()) {
      const admin = createAdminClient();
      await admin.from("profiles").upsert({
        id: user.id,
        display_name: creatorDisplayName,
      } as never);
    }
  } catch { /* non-critical */ }

  const postCreateMessages: string[] = [];

  // Award first_dispute achievement
  try {
    const admin = createAdminClient();
    const { count } = await supabase
      .from("disputes")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", user.id);

    if ((count ?? 0) <= 1) {
      await awardAchievement(user.id, "first_dispute", admin);
    }

    // Award milestone achievements based on total disputes
    await checkDisputeMilestones(user.id, admin);
  } catch { /* achievements are non-critical */ }

  if (opponentEmail) {
    const admin = createAdminClient();

    if (opponentId) {
      const opponentUser = await admin.auth.admin.getUserById(opponentId);
      const { data: opponentProfile } = await admin
        .from("profiles")
        .select("display_name, telegram_chat_id")
        .eq("id", opponentId)
        .single<{ display_name: string | null; telegram_chat_id: number | null }>();

      const opponentName = getDisplayName(
        opponentProfile?.display_name,
        opponentUser.data.user ?? null
      );

      if (!opponentProfile?.display_name?.trim()) {
        await admin.from("profiles").upsert({
          id: opponentId,
          display_name: opponentName,
          telegram_chat_id: opponentProfile?.telegram_chat_id ?? null,
        } as never);
      }

      if (opponentUser.data.user?.email) {
        if (!process.env.RESEND_API_KEY) {
          postCreateMessages.push("Спор создан, но email-уведомление для оппонента недоступно: Resend не настроен.");
        } else {
          try {
            await sendDirectChallengeEmail({
              toEmail: opponentUser.data.user.email,
              toName: opponentName,
              fromName: creatorDisplayName,
              disputeTitle: title,
              disputeDescription: description,
              disputeId: data.id,
            });
          } catch {
            postCreateMessages.push("Спор создан, но email-уведомление для оппонента не отправилось.");
          }
        }
      }

      if (opponentProfile?.telegram_chat_id) {
        const sentMessageId = await notifyDirectChallengeReceived(
          opponentProfile.telegram_chat_id,
          creatorDisplayName,
          title,
          description,
          data.id
        );

        if (!sentMessageId) {
          postCreateMessages.push("Спор создан, но Telegram-уведомление для оппонента не отправилось.");
        }
      }
    } else {
      const appUrl = await getAppUrl();

      if (!process.env.RESEND_API_KEY) {
        postCreateMessages.push("Спор создан, но письмо-приглашение не отправилось: Resend не настроен.");
      } else {
        try {
          await sendInviteEmail({
            toEmail: opponentEmail,
            disputeTitle: title,
            creatorName: creatorDisplayName,
            disputeDescription: description,
            inviteUrl: `${appUrl}/dispute/join?code=${data.invite_code}`,
          });
        } catch {
          postCreateMessages.push("Спор создан, но письмо-приглашение не отправилось.");
        }
      }
    }
  }

  const message = postCreateMessages.join(" ");
  redirect(message ? `/dispute/${data.id}?message=${encodeURIComponent(message)}` : `/dispute/${data.id}`);
}

export async function joinDispute(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const code = (formData.get("code") as string).trim().toLowerCase();

  const { data: dispute, error: findError } = await supabase
    .from("disputes")
    .select("id, creator_id, opponent_id, status")
    .eq("invite_code", code)
    .single<Pick<DisputeRow, "id" | "creator_id" | "opponent_id" | "status">>();

  if (findError || !dispute) {
    redirect("/dashboard?error=" + encodeURIComponent("Спор не найден"));
  }

  if (dispute.creator_id === user.id) {
    redirect(`/dispute/${dispute.id}`);
  }

  if (dispute.opponent_id && dispute.opponent_id !== user.id) {
    redirect("/dashboard?error=" + encodeURIComponent("В этом споре уже есть оппонент"));
  }

  if (!dispute.opponent_id) {
    const { error: joinError } = await supabase
      .from("disputes")
      .update({ opponent_id: user.id, status: "in_progress" } as never)
      .eq("id", dispute.id);

    if (joinError) {
      redirect("/dashboard?error=" + encodeURIComponent(joinError.message));
    }

    // Award accepted_invite + milestone achievements
    try {
      const admin = createAdminClient();
      await unarchiveDisputeForParticipants(admin, dispute.id, [dispute.creator_id, user.id]);
      await awardAchievement(user.id, "accepted_invite", admin);
      await checkDisputeMilestones(user.id, admin);

      // Notify creator that opponent joined via Telegram
      const { data: creatorProfile } = await admin
        .from("profiles")
        .select("telegram_chat_id")
        .eq("id", dispute.creator_id)
        .single<{ telegram_chat_id: number | null }>();
      if (creatorProfile?.telegram_chat_id) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single<{ display_name: string | null }>();
        const { data: disputeInfo } = await supabase
          .from("disputes")
          .select("title")
          .eq("id", dispute.id)
          .single<{ title: string }>();
        await notifyOpponentJoined(
          creatorProfile.telegram_chat_id,
          myProfile?.display_name ?? "Участник",
          disputeInfo?.title ?? "Спор",
          dispute.id
        );
      }
    } catch { /* non-critical */ }
  }

  redirect(`/dispute/${dispute.id}`);
}

export async function joinDisputeFromMatchmaking(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const disputeId = (formData.get("dispute_id") as string) ?? "";

  const { data: dispute } = await supabase
    .from("disputes")
    .select("id, title, creator_id, opponent_id, status")
    .eq("id", disputeId)
    .single<Pick<DisputeRow, "id" | "title" | "creator_id" | "opponent_id" | "status">>();

  if (!dispute || dispute.status !== "open") {
    redirect("/matchmaking?error=" + encodeURIComponent("Спор уже недоступен"));
  }

  if (dispute.creator_id === user.id) {
    redirect(`/dispute/${dispute.id}`);
  }

  if (dispute.opponent_id) {
    redirect("/matchmaking?error=" + encodeURIComponent("У этого спора уже появился оппонент"));
  }

  const { error: joinError } = await supabase
    .from("disputes")
    .update({ opponent_id: user.id, status: "in_progress" } as never)
    .eq("id", dispute.id)
    .is("opponent_id", null)
    .eq("status", "open");

  if (joinError) {
    redirect("/matchmaking?error=" + encodeURIComponent(joinError.message));
  }

  try {
    const admin = createAdminClient();
    await unarchiveDisputeForParticipants(admin, dispute.id, [dispute.creator_id, user.id]);
    await awardAchievement(user.id, "accepted_invite", admin);
    await checkDisputeMilestones(user.id, admin);

    const { data: creatorProfile } = await admin
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", dispute.creator_id)
      .single<{ telegram_chat_id: number | null }>();
    if (creatorProfile?.telegram_chat_id) {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single<{ display_name: string | null }>();
      await notifyOpponentJoined(
        creatorProfile.telegram_chat_id,
        myProfile?.display_name ?? "Участник",
        dispute.title,
        dispute.id
      );
    }
  } catch { /* non-critical */ }

  redirect(`/dispute/${dispute.id}`);
}

export async function submitArgument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const disputeId = formData.get("dispute_id") as string;
  const position = formData.get("position") as string;
  const reasoning = formData.get("reasoning") as string;
  const evidenceLinks = formData
    .getAll("evidence")
    .map((v) => (v as string).trim())
    .filter(Boolean);
  const evidence = evidenceLinks.length > 0 ? evidenceLinks.join("\n") : null;

  const { data: dispute } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", disputeId)
    .single<DisputeRow>();

  if (!dispute || dispute.status !== "in_progress") {
    redirect(`/dispute/${disputeId}`);
  }

  const isCreator = dispute.creator_id === user.id;
  const isOpponent = dispute.opponent_id === user.id;
  if (!isCreator && !isOpponent) redirect("/dashboard");

  const opponentId = isCreator ? dispute.opponent_id! : dispute.creator_id;

  const { data: existingArgs } = await supabase
    .from("arguments")
    .select("author_id, round, position, reasoning, evidence")
    .eq("dispute_id", disputeId)
    .returns<Pick<ArgumentRow, "author_id" | "round" | "position" | "reasoning" | "evidence">[]>();

  const myArgs = existingArgs?.filter((a) => a.author_id === user.id) ?? [];
  const opponentArgs =
    existingArgs?.filter((a) => a.author_id === opponentId) ?? [];
  const currentRound = myArgs.length + 1;

  if (currentRound > dispute.max_rounds) redirect(`/dispute/${disputeId}`);

  if (myArgs.length > opponentArgs.length) {
    redirect(
      `/dispute/${disputeId}/argue?error=${encodeURIComponent("Дождитесь ответа оппонента перед следующим раундом")}`
    );
  }

  const { error } = await supabase.from("arguments").insert({
    dispute_id: disputeId,
    author_id: user.id,
    round: currentRound,
    position,
    reasoning,
    evidence,
  } as never);

  if (error) {
    redirect(
      `/dispute/${disputeId}/argue?error=${encodeURIComponent(error.message)}`
    );
  }

  const opponentDoneThisRound = opponentArgs.some(
    (a) => a.round === currentRound
  );

  try {
    const admin = createAdminClient();
    await unarchiveDisputeForParticipants(admin, disputeId, [user.id, opponentId]);
  } catch { /* non-critical */ }

  // Award argument-related achievements
  try {
    const admin = createAdminClient();

    // first_argument: check total args across all disputes
    const { count: totalMyArgs } = await supabase
      .from("arguments")
      .select("*", { count: "exact", head: true })
      .eq("author_id", user.id);
    if ((totalMyArgs ?? 0) <= 1) {
      await awardAchievement(user.id, "first_argument", admin);
    }

    // attached_evidence
    if (evidence) {
      await awardAchievement(user.id, "attached_evidence", admin);
    }

    // three_rounds: both players completed round 3+
    if (opponentDoneThisRound && currentRound >= 3) {
      await awardAchievement(user.id, "three_rounds", admin);
      await awardAchievement(opponentId, "three_rounds", admin);
    }

    // reached_mediation + resolution milestones
    if (opponentDoneThisRound && currentRound >= dispute.max_rounds) {
      await awardAchievement(user.id, "reached_mediation", admin);
      await awardAchievement(opponentId, "reached_mediation", admin);
    }
  } catch { /* non-critical */ }

  // Отправляем email оппоненту
  try {
    const admin = createAdminClient();
    const { data: { user: opponentUser } } = await admin.auth.admin.getUserById(opponentId);
    const myProfile = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single<{ display_name: string | null }>();

    if (opponentUser?.email && !opponentUser.is_anonymous) {
      if (opponentDoneThisRound && currentRound >= dispute.max_rounds) {
        const creatorUser = await admin.auth.admin.getUserById(dispute.creator_id);
        await sendMediationReadyNotification({
          toEmail: opponentUser.email,
          toName: opponentUser.user_metadata?.display_name ?? "Участник",
          disputeTitle: dispute.title,
          disputeId,
        });
        if (creatorUser.data.user?.email && !creatorUser.data.user.is_anonymous) {
          await sendMediationReadyNotification({
            toEmail: creatorUser.data.user.email,
            toName: creatorUser.data.user.user_metadata?.display_name ?? "Участник",
            disputeTitle: dispute.title,
            disputeId,
          });
        }
      } else {
        await sendArgumentNotification({
          toEmail: opponentUser.email,
          toName: opponentUser.user_metadata?.display_name ?? "Участник",
          fromName: myProfile.data?.display_name ?? "Участник",
          disputeTitle: dispute.title,
          round: currentRound,
          disputeId,
        });
      }
    }
  } catch { /* email — non-critical */ }

  // Telegram notifications
  try {
    const admin = createAdminClient();
    const { data: opponentProfile } = await admin
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", opponentId)
      .single<{ telegram_chat_id: number | null }>();
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single<{ display_name: string | null }>();

    if (opponentProfile?.telegram_chat_id) {
      if (opponentDoneThisRound && currentRound >= dispute.max_rounds) {
        // notify both about mediation
        await notifyMediationReady(opponentProfile.telegram_chat_id, dispute.title, disputeId);
        const { data: myTg } = await admin
          .from("profiles")
          .select("telegram_chat_id")
          .eq("id", user.id)
          .single<{ telegram_chat_id: number | null }>();
        if (myTg?.telegram_chat_id) {
          await notifyMediationReady(myTg.telegram_chat_id, dispute.title, disputeId);
        }
      } else {
        await notifyArgumentReceived(
          opponentProfile.telegram_chat_id,
          myProfile?.display_name ?? "Участник",
          dispute.title,
          currentRound,
          disputeId
        );
      }
    }
  } catch { /* non-critical */ }

  // Fetch profiles for AI calls (needed for both waiting insight and round insight)
  type ProfilePick = { id: string; display_name: string | null };
  let allProfiles: ProfilePick[] = [];
  if (dispute.opponent_id) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [dispute.creator_id, dispute.opponent_id])
      .returns<ProfilePick[]>();
    allProfiles = profilesData ?? [];
  }

  // AI-инсайт для ожидающего: сразу после подачи аргумента
  if (!opponentDoneThisRound && dispute.opponent_id) {
    try {
      await generateWaitingInsight(
        {
          id: disputeId,
          title: dispute.title,
          description: dispute.description,
          creator_id: dispute.creator_id,
          opponent_id: dispute.opponent_id,
          max_rounds: dispute.max_rounds,
        },
        user.id,
        { author_id: user.id, round: currentRound, position, reasoning, evidence: evidence ?? "" },
        currentRound,
        existingArgs ?? [],
        allProfiles
      );
    } catch { /* AI — non-critical */ }
  }

  // AI-анализ: оба подали аргумент
  if (opponentDoneThisRound && dispute.opponent_id) {
    const { data: fullArgs } = await supabase
      .from("arguments")
      .select("author_id, round, position, reasoning, evidence")
      .eq("dispute_id", disputeId)
      .returns<{ author_id: string; round: number; position: string; reasoning: string; evidence: string | null }[]>();

    const disputeCtx = {
      id: disputeId,
      title: dispute.title,
      description: dispute.description,
      creator_id: dispute.creator_id,
      opponent_id: dispute.opponent_id,
      max_rounds: dispute.max_rounds,
    };

    try {
      await generateRoundInsights(disputeCtx, currentRound, fullArgs ?? [], allProfiles);
    } catch { /* AI — non-critical */ }

    try {
      await generatePublicRoundSummary(disputeCtx, currentRound, fullArgs ?? [], allProfiles);
    } catch { /* AI — non-critical */ }
  }

  if (opponentDoneThisRound && currentRound >= dispute.max_rounds) {
    await supabase
      .from("disputes")
      .update({ status: "mediation" } as never)
      .eq("id", disputeId);
    redirect(`/dispute/${disputeId}/mediation`);
  }

  redirect(`/dispute/${disputeId}`);
}

export async function triggerMediation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const disputeId = formData.get("dispute_id") as string;

  const { data: dispute } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", disputeId)
    .single<DisputeRow>();

  if (!dispute || dispute.status !== "mediation") {
    redirect(`/dispute/${disputeId}`);
  }

  const isParticipant =
    dispute.creator_id === user.id || dispute.opponent_id === user.id;
  if (!isParticipant) redirect("/dashboard");

  const { data: existing } = await supabase
    .from("mediations")
    .select("id")
    .eq("dispute_id", disputeId)
    .single();

  if (existing) redirect(`/dispute/${disputeId}/mediation`);

  const { data: args } = await supabase
    .from("arguments")
    .select("*")
    .eq("dispute_id", disputeId)
    .order("round", { ascending: true })
    .returns<ArgumentRow[]>();

  type ProfilePick = { id: string; display_name: string | null };
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", [dispute.creator_id, dispute.opponent_id!])
    .returns<ProfilePick[]>();

  const mediation = await generateFinalMediation(
    {
      id: dispute.id,
      title: dispute.title,
      description: dispute.description,
      creator_id: dispute.creator_id,
      opponent_id: dispute.opponent_id!,
      max_rounds: dispute.max_rounds,
    },
    (args ?? []).map((argument) => ({
      author_id: argument.author_id,
      round: argument.round,
      position: argument.position,
      reasoning: argument.reasoning,
      evidence: argument.evidence,
    })),
    (profiles ?? []).map((profile) => ({
      id: profile.id,
      display_name: profile.display_name,
    }))
  );

  await supabase.from("mediations").insert({
    dispute_id: disputeId,
    analysis: mediation.analysis,
    solutions: mediation.solutions,
  } as never);

  await supabase
    .from("disputes")
    .update({ status: "resolved" } as never)
    .eq("id", disputeId);

  // Award resolution achievement to both participants + AI-generated achievements
  try {
    const admin = createAdminClient();
    await unarchiveDisputeForParticipants(admin, disputeId, [dispute.creator_id, dispute.opponent_id]);
    const { data: disputeAnalysis } = await admin
      .from("dispute_analysis")
      .select("plane, tone_level")
      .eq("dispute_id", disputeId)
      .single<{ plane: string; tone_level: number }>();

    await awardAchievement(dispute.creator_id, "resolution", admin);
    if (dispute.opponent_id) {
      await awardAchievement(dispute.opponent_id, "resolution", admin);
    }

    // AI-generated unique achievements
    const { generateUniqueAchievement, saveUniqueAchievement } = await import("@/lib/ai-achievements");
    const { updateAIProfileAfterDispute, updateCounterparts } = await import("@/lib/ai-profile");

    const participants = [dispute.creator_id, dispute.opponent_id].filter(Boolean) as string[];
    for (const pid of participants) {
      const { count: argCount } = await admin
        .from("arguments")
        .select("*", { count: "exact", head: true })
        .eq("dispute_id", disputeId)
        .eq("author_id", pid);

      const { count: evidenceCount } = await admin
        .from("arguments")
        .select("*", { count: "exact", head: true })
        .eq("dispute_id", disputeId)
        .eq("author_id", pid)
        .not("evidence", "is", null);

      const unique = await generateUniqueAchievement(pid, {
        title: dispute.title,
        plane: disputeAnalysis?.plane,
        userArgCount: argCount ?? 0,
        hadEvidence: (evidenceCount ?? 0) > 0,
        reachedConsensus: true,
        roundCount: dispute.max_rounds,
        toneLevel: disputeAnalysis?.tone_level,
      });

      if (unique) {
        await saveUniqueAchievement(pid, unique, disputeId);
      }

      // Update AI profile
      await updateAIProfileAfterDispute(pid, { reachedConsensus: true });
    }

    // Update counterparts
    if (dispute.opponent_id) {
      await updateCounterparts(dispute.creator_id, dispute.opponent_id, true);
    }
  } catch { /* non-critical */ }

  // Telegram notifications — dispute resolved
  try {
    const admin = createAdminClient();
    const participants = [dispute.creator_id, dispute.opponent_id].filter(Boolean) as string[];
    const { data: tgProfiles } = await admin
      .from("profiles")
      .select("id, telegram_chat_id")
      .in("id", participants)
      .returns<{ id: string; telegram_chat_id: number | null }[]>();
    for (const p of tgProfiles ?? []) {
      if (p.telegram_chat_id) {
        await notifyDisputeResolved(p.telegram_chat_id, dispute.title, disputeId);
      }
    }
  } catch { /* non-critical */ }

  redirect(`/dispute/${disputeId}/mediation`);
}

export async function sendDisputeInviteEmail(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нужно войти в аккаунт" };

  const toEmail = ((formData.get("to_email") as string) ?? "").trim();
  const inviteUrl = ((formData.get("invite_url") as string) ?? "").trim();
  const disputeTitle = ((formData.get("dispute_title") as string) ?? "").trim();
  const creatorName = ((formData.get("creator_name") as string) ?? "").trim();

  if (!toEmail || !inviteUrl) {
    return { ok: false, error: "Не хватает данных для отправки письма" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return { ok: false, error: "Введите корректный email" };
  }

  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "Email-рассылка сейчас не настроена на сервере" };
  }

  try {
    await sendInviteEmail({ toEmail, disputeTitle, creatorName, inviteUrl });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось отправить письмо",
    };
  }
}

export async function archiveDisputeForUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const disputeId = (formData.get("dispute_id") as string) ?? "";
  const returnTo = ((formData.get("return_to") as string) ?? "/dashboard").trim();

  const { data: dispute } = await supabase
    .from("disputes")
    .select("id, creator_id, opponent_id")
    .eq("id", disputeId)
    .single<Pick<DisputeRow, "id" | "creator_id" | "opponent_id">>();

  if (!dispute) redirect("/dashboard?error=" + encodeURIComponent("Спор не найден"));
  if (dispute.creator_id !== user.id && dispute.opponent_id !== user.id) {
    redirect("/dashboard?error=" + encodeURIComponent("Нет доступа к архивированию этого спора"));
  }

  const admin = createAdminClient();
  const existingState = await getDisputeUserState(admin, disputeId, user.id);
  const shouldMuteReminders =
    Boolean(existingState?.last_reminded_at) || Boolean(existingState?.pending_reminder_count);

  await upsertDisputeArchiveState(admin, disputeId, user.id, true, {
    pending_reminder_count: existingState?.pending_reminder_count ?? 0,
    last_reminded_at: existingState?.last_reminded_at ?? null,
    last_reminder_from_user_id: existingState?.last_reminder_from_user_id ?? null,
    reminder_notifications_muted: shouldMuteReminders,
    rearchived_after_reminder_at: shouldMuteReminders ? new Date().toISOString() : null,
  });

  const { data: profile } = await admin
    .from("profiles")
    .select("telegram_chat_id")
    .eq("id", user.id)
    .single<{ telegram_chat_id: number | null }>();

  if (profile?.telegram_chat_id) {
    await clearTelegramDisputeNotifications(profile.telegram_chat_id, disputeId);
  }

  redirect(returnTo);
}

export async function unarchiveDisputeForUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const disputeId = (formData.get("dispute_id") as string) ?? "";
  const returnTo = ((formData.get("return_to") as string) ?? "/dashboard?view=archived").trim();

  const { data: dispute } = await supabase
    .from("disputes")
    .select("id, creator_id, opponent_id")
    .eq("id", disputeId)
    .single<Pick<DisputeRow, "id" | "creator_id" | "opponent_id">>();

  if (!dispute) redirect("/dashboard?error=" + encodeURIComponent("Спор не найден"));
  if (dispute.creator_id !== user.id && dispute.opponent_id !== user.id) {
    redirect("/dashboard?error=" + encodeURIComponent("Нет доступа к архиву этого спора"));
  }

  const admin = createAdminClient();
  await upsertDisputeArchiveState(admin, disputeId, user.id, false, {
    pending_reminder_count: 0,
    last_reminded_at: null,
    last_reminder_from_user_id: null,
    reminder_notifications_muted: false,
    rearchived_after_reminder_at: null,
  });

  redirect(returnTo);
}

export async function sendDisputeReminder(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const disputeId = (formData.get("dispute_id") as string) ?? "";
  const returnTo = ((formData.get("return_to") as string) ?? `/dispute/${disputeId}`).trim();

  const { data: dispute } = await supabase
    .from("disputes")
    .select("id, title, status, creator_id, opponent_id")
    .eq("id", disputeId)
    .single<Pick<DisputeRow, "id" | "title" | "status" | "creator_id" | "opponent_id">>();

  if (!dispute) {
    redirect("/dashboard?error=" + encodeURIComponent("Спор не найден"));
  }

  const isParticipant = dispute.creator_id === user.id || dispute.opponent_id === user.id;
  if (!isParticipant) {
    redirect("/dashboard?error=" + encodeURIComponent("Нет доступа к этому спору"));
  }

  if (dispute.status !== "in_progress" || !dispute.opponent_id) {
    redirect(withMessage(returnTo, "Напоминание доступно только для активного спора с оппонентом."));
  }

  const opponentId = dispute.creator_id === user.id ? dispute.opponent_id : dispute.creator_id;
  const { data: args } = await supabase
    .from("arguments")
    .select("author_id, round")
    .eq("dispute_id", disputeId)
    .returns<Pick<ArgumentRow, "author_id" | "round">[]>();

  const myArgCount = (args ?? []).filter((arg) => arg.author_id === user.id).length;
  const opponentArgCount = (args ?? []).filter((arg) => arg.author_id === opponentId).length;

  if (myArgCount <= opponentArgCount) {
    redirect(withMessage(returnTo, "Напоминание можно отправить только когда сейчас ждут ответ оппонента."));
  }

  const admin = createAdminClient();
  const { hourCount, dayCount } = await countReminderAttempts(admin, disputeId, user.id);

  if (hourCount >= REMINDER_LIMIT_PER_HOUR) {
    redirect(withMessage(returnTo, "Лимит напоминаний исчерпан: не больше 3 напоминаний в час по одному спору."));
  }

  if (dayCount >= REMINDER_LIMIT_PER_DAY) {
    redirect(withMessage(returnTo, "Лимит напоминаний исчерпан: не больше 15 напоминаний в сутки по одному спору."));
  }

  const [recipientState, senderProfile, recipientProfile] = await Promise.all([
    getDisputeUserState(admin, disputeId, opponentId),
    admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single<{ display_name: string | null }>(),
    admin
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", opponentId)
      .single<{ telegram_chat_id: number | null }>(),
  ]);

  const senderName = getDisplayName(senderProfile.data?.display_name, user);
  let deliveredViaTelegram = false;
  let suppressedReason: string | null = null;

  if (recipientState?.is_archived) {
    if (recipientState.reminder_notifications_muted) {
      suppressedReason = "muted_after_rearchive";
      await upsertDisputeArchiveState(admin, disputeId, opponentId, true, {
        pending_reminder_count: Math.min((recipientState.pending_reminder_count ?? 0) + 1, REMINDER_LIMIT_PER_DAY),
        last_reminded_at: new Date().toISOString(),
        last_reminder_from_user_id: user.id,
        reminder_notifications_muted: true,
        rearchived_after_reminder_at: recipientState.rearchived_after_reminder_at ?? new Date().toISOString(),
      });
    } else {
      await upsertDisputeArchiveState(admin, disputeId, opponentId, false, {
        pending_reminder_count: 0,
        last_reminded_at: new Date().toISOString(),
        last_reminder_from_user_id: user.id,
        reminder_notifications_muted: false,
        rearchived_after_reminder_at: null,
      });

      if (recipientProfile.data?.telegram_chat_id) {
        const sentMessageId = await notifyDisputeReminder(
          recipientProfile.data.telegram_chat_id,
          senderName,
          dispute.title,
          disputeId
        );
        deliveredViaTelegram = Boolean(sentMessageId);
        if (!sentMessageId) {
          suppressedReason = "telegram_delivery_failed";
        }
      } else {
        suppressedReason = "no_telegram_chat";
      }
    }
  } else {
    suppressedReason = "recipient_active";
  }

  const reminderPayload: DisputeReminderInsert = {
    dispute_id: disputeId,
    from_user_id: user.id,
    to_user_id: opponentId,
    delivered_via_telegram: deliveredViaTelegram,
    suppressed_reason: suppressedReason,
  };

  await admin.from("dispute_reminders").insert(reminderPayload as never);

  if (recipientState?.is_archived && recipientState.reminder_notifications_muted) {
    redirect(withMessage(returnTo, "Напоминание зафиксировано в архиве. Telegram больше не беспокоит оппонента по этому спору."));
  }

  redirect(withMessage(returnTo, "Напоминание отправлено. Спор снова отмечен как ожидающий ответа."));
}

export async function proposeEarlyEnd(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const disputeId = formData.get("dispute_id") as string;

  const { data: dispute } = await supabase
    .from("disputes")
    .select("status, creator_id, opponent_id")
    .eq("id", disputeId)
    .single<Pick<DisputeRow, "status" | "creator_id" | "opponent_id">>();

  if (!dispute || dispute.status !== "in_progress") return;

  const isParticipant = dispute.creator_id === user.id || dispute.opponent_id === user.id;
  if (!isParticipant) return;

  await supabase
    .from("disputes")
    .update({ early_end_proposed_by: user.id } as never)
    .eq("id", disputeId);

  try {
    const admin = createAdminClient();
    await unarchiveDisputeForParticipants(admin, disputeId, [dispute.creator_id, dispute.opponent_id]);
  } catch { /* non-critical */ }
}

export async function acceptEarlyEnd(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const disputeId = formData.get("dispute_id") as string;

  const { data: dispute } = await supabase
    .from("disputes")
    .select("status, creator_id, opponent_id, early_end_proposed_by, title")
    .eq("id", disputeId)
    .single<Pick<DisputeRow, "status" | "creator_id" | "opponent_id" | "early_end_proposed_by" | "title">>();

  if (!dispute || dispute.status !== "in_progress") return;
  if (dispute.early_end_proposed_by === user.id) return; // Can't accept own proposal
  if (dispute.creator_id !== user.id && dispute.opponent_id !== user.id) return;

  await supabase
    .from("disputes")
    .update({ status: "mediation", early_end_proposed_by: null } as never)
    .eq("id", disputeId);

  // Award reached_mediation to both
  try {
    const admin = createAdminClient();
    await unarchiveDisputeForParticipants(admin, disputeId, [dispute.creator_id, dispute.opponent_id]);
    await awardAchievement(dispute.creator_id, "reached_mediation", admin);
    if (dispute.opponent_id) {
      await awardAchievement(dispute.opponent_id, "reached_mediation", admin);
    }

    const participants = [dispute.creator_id, dispute.opponent_id].filter(Boolean) as string[];
    const { data: profiles } = await admin
      .from("profiles")
      .select("telegram_chat_id")
      .in("id", participants)
      .returns<{ telegram_chat_id: number | null }[]>();

    for (const profile of profiles ?? []) {
      if (profile.telegram_chat_id) {
        await notifyMediationReady(profile.telegram_chat_id, dispute.title, disputeId);
      }
    }
  } catch { /* non-critical */ }

  redirect(`/dispute/${disputeId}/mediation`);
}

export async function declineEarlyEnd(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const disputeId = formData.get("dispute_id") as string;

  await supabase
    .from("disputes")
    .update({ early_end_proposed_by: null } as never)
    .eq("id", disputeId);

  try {
    const admin = createAdminClient();
    const { data: dispute } = await supabase
      .from("disputes")
      .select("creator_id, opponent_id")
      .eq("id", disputeId)
      .single<Pick<DisputeRow, "creator_id" | "opponent_id">>();

    if (dispute) {
      await unarchiveDisputeForParticipants(admin, disputeId, [dispute.creator_id, dispute.opponent_id]);
    }
  } catch { /* non-critical */ }
}

export async function closeDispute(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const disputeId = formData.get("dispute_id") as string;

  // Only creator can close, and only open or in_progress disputes
  const { data: dispute } = await supabase
    .from("disputes")
    .select("creator_id, opponent_id, status, title")
    .eq("id", disputeId)
    .single<{ creator_id: string; opponent_id: string | null; status: string; title: string }>();

  if (!dispute || dispute.creator_id !== user.id) return;
  if (dispute.status !== "open" && dispute.status !== "in_progress") return;

  await supabase
    .from("disputes")
    .update({ status: "closed" } as never)
    .eq("id", disputeId);

  try {
    const admin = createAdminClient();
    await unarchiveDisputeForParticipants(admin, disputeId, [dispute.creator_id, dispute.opponent_id]);

    const participants = [dispute.creator_id, dispute.opponent_id].filter(Boolean) as string[];
    const { data: tgProfiles } = await admin
      .from("profiles")
      .select("telegram_chat_id")
      .in("id", participants)
      .returns<{ telegram_chat_id: number | null }[]>();

    for (const profile of tgProfiles ?? []) {
      if (profile.telegram_chat_id) {
        await notifyDisputeClosed(profile.telegram_chat_id, dispute.title, disputeId);
      }
    }
  } catch { /* non-critical */ }

  redirect("/dashboard");
}

export async function acceptSolution(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const disputeId = formData.get("dispute_id") as string;
  const solutionIndex = parseInt(formData.get("solution_index") as string);

  const { data: dispute } = await supabase
    .from("disputes")
    .select("creator_id, opponent_id, status")
    .eq("id", disputeId)
    .single<Pick<DisputeRow, "creator_id" | "opponent_id" | "status">>();

  if (!dispute) return;
  if (dispute.status !== "resolved" && dispute.status !== "mediation") return;
  if (dispute.creator_id !== user.id && dispute.opponent_id !== user.id) return;

  // Use admin client to bypass RLS
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("resolutions")
    .select("*")
    .eq("dispute_id", disputeId)
    .single();

  if (!existing) {
    await admin.from("resolutions").insert({
      dispute_id: disputeId,
      chosen_solution: solutionIndex,
      accepted_by: [user.id],
      status: "proposed",
    } as never);
  } else if (existing.chosen_solution === solutionIndex) {
    const currentAccepted = (existing.accepted_by as string[]) ?? [];
    const newAccepted = [...new Set([...currentAccepted, user.id])];
    const opponentId = dispute.creator_id === user.id ? dispute.opponent_id : dispute.creator_id;
    const bothAccepted = opponentId ? newAccepted.includes(opponentId) : false;

    await admin.from("resolutions").update({
      accepted_by: newAccepted,
      status: bothAccepted ? "accepted" : "proposed",
    } as never).eq("id", existing.id);
  } else {
    // Different solution — reset
    await admin.from("resolutions").update({
      chosen_solution: solutionIndex,
      accepted_by: [user.id],
      status: "proposed",
    } as never).eq("id", existing.id);
  }

  try {
    await unarchiveDisputeForParticipants(admin, disputeId, [dispute.creator_id, dispute.opponent_id]);
  } catch { /* non-critical */ }

  redirect(`/dispute/${disputeId}/mediation`);
}

// ─── Reactions ───────────────────────────────────────────────────────────────

export async function toggleReaction(
  disputeId: string,
  emoji: string,
  sessionId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("dispute_reactions")
    .select("id")
    .eq("dispute_id", disputeId)
    .eq("emoji", emoji)
    .eq("session_id", sessionId)
    .single();

  if (existing) {
    await admin.from("dispute_reactions").delete().eq("id", existing.id);
  } else {
    await admin.from("dispute_reactions").insert({
      dispute_id: disputeId,
      emoji,
      session_id: sessionId,
    } as never);
  }
}

// ─── Observer chat ────────────────────────────────────────────────────────────

// Thresholds
const SPAM_WINDOW_MS = 10_000;   // 10 seconds window
const SPAM_LIMIT_WARN = 2;       // messages in 10s → 1 min block
const SPAM_LIMIT_BAN  = 4;       // messages in 10s → 5 min block
const DDOS_WINDOW_MS  = 60_000;  // 1 minute window
const DDOS_THRESHOLD  = 60;      // total messages per minute → overload

export async function addComment(
  disputeId: string,
  content: string,
  authorName: string,
  sessionId: string
): Promise<{ error?: string; blockUntil?: number; level?: 1 | 2; overload?: boolean }> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 500) return { error: "Недопустимая длина" };
  if (!sessionId) return { error: "Сессия не найдена" };

  const admin = createAdminClient();
  const now = new Date();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: getTrustTierGateMessage("linked") };
  }

  const trust = await fetchTrustTierState(user.id);
  if (!hasMinimumTrustTier(trust.tier, "linked")) {
    return { error: getTrustTierGateMessage("linked") };
  }

  // 1. DDoS check: total messages in last minute
  const ddosFrom = new Date(now.getTime() - DDOS_WINDOW_MS).toISOString();
  const { count: totalRecent } = await admin
    .from("dispute_comments")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", disputeId)
    .eq("is_ai", false)
    .gte("created_at", ddosFrom);

  if ((totalRecent ?? 0) >= DDOS_THRESHOLD) {
    return { overload: true, blockUntil: now.getTime() + 30_000 };
  }

  // 2. Per-session rate limit
  const spamFrom = new Date(now.getTime() - SPAM_WINDOW_MS).toISOString();
  const { count: sessionRecent } = await admin
    .from("dispute_comments")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", disputeId)
    .eq("session_id", sessionId)
    .eq("is_ai", false)
    .gte("created_at", spamFrom);

  const recent = sessionRecent ?? 0;

  if (recent >= SPAM_LIMIT_BAN) {
    return { error: "spam", level: 2, blockUntil: now.getTime() + 300_000 };
  }
  if (recent >= SPAM_LIMIT_WARN) {
    return { error: "spam", level: 1, blockUntil: now.getTime() + 60_000 };
  }

  // 3. Insert user comment
  await admin.from("dispute_comments").insert({
    dispute_id: disputeId,
    content: trimmed,
    author_name: authorName,
    author_id: user?.id ?? null,
    session_id: sessionId,
    is_ai: false,
  } as never);

  // 4. AI chimes in every 5th human comment
  const { count: total } = await admin
    .from("dispute_comments")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", disputeId)
    .eq("is_ai", false);

  if ((total ?? 0) % 5 === 0 && (total ?? 0) > 0) {
    const { data: dispute } = await admin
      .from("disputes")
      .select("title")
      .eq("id", disputeId)
      .single<{ title: string }>();

    const { data: recentComments } = await admin
      .from("dispute_comments")
      .select("author_name, content")
      .eq("dispute_id", disputeId)
      .eq("is_ai", false)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<{ author_name: string; content: string }[]>();

    if (dispute && recentComments) {
      const { generateChatComment } = await import("@/lib/ai");
      const aiText = await generateChatComment(dispute.title, recentComments.reverse());
      if (aiText) {
        await admin.from("dispute_comments").insert({
          dispute_id: disputeId,
          content: aiText,
          author_name: "Всезнающий Сурок",
          author_id: null,
          session_id: null,
          is_ai: true,
        } as never);
      }
    }
  }

  return {};
}

// ─── Argument strength evaluation ────────────────────────────────────────────

export async function evaluateArgument(
  position: string,
  reasoning: string,
  disputeTitle: string,
  disputeDescription: string
): Promise<{ score: number; strengths: string[]; suggestion: string; escalation_risk: number; escalation_warning: string } | null> {
  const pos = position.trim();
  const rea = reasoning.trim();
  if (!pos || !rea) return null;

  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `Ты — беспристрастный судья качества аргументов. Отвечай строго JSON.

Спор: "${disputeTitle}"${disputeDescription ? `\nКонтекст: "${disputeDescription}"` : ""}

Аргумент участника:
Позиция: "${pos}"
Обоснование: "${rea}"

Оцени качество аргумента по шкале 1-5:
1 = очень слабый (нет обоснования, только мнение)
2 = слабый (есть мнение, мало обоснования)
3 = средний (есть логика, но не хватает деталей)
4 = сильный (чёткая позиция, хорошее обоснование)
5 = убедительный (всё чётко, есть логика и детали)

Также определи, может ли этот аргумент усилить конфликт (агрессивный тон, обвинения, провокации).

Верни JSON:
{
  "score": число 1-5,
  "strengths": ["1-2 коротких сильных стороны аргумента, если есть"],
  "suggestion": "одна конкретная рекомендация как усилить аргумент (1 предложение)",
  "escalation_risk": число 0-3 (0=нет риска, 1=мягкий, 2=заметный, 3=высокий),
  "escalation_warning": "если risk>=2, короткое предупреждение (1 предложение), иначе пустая строка"
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return {
      score: Math.min(5, Math.max(1, Math.round(Number(result.score) || 3))),
      strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 2) : [],
      suggestion: (result.suggestion as string) ?? "",
      escalation_risk: Math.min(3, Math.max(0, Math.round(Number(result.escalation_risk) || 0))),
      escalation_warning: (result.escalation_warning as string) ?? "",
    };
  } catch {
    return null;
  }
}

// Helper: check and award dispute milestone achievements
async function checkDisputeMilestones(userId: string, admin: ReturnType<typeof createAdminClient>) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("disputes")
    .select("*", { count: "exact", head: true })
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`);

  const total = count ?? 0;
  if (total >= 3) await awardAchievement(userId, "three_disputes", admin);
  if (total >= 5) await awardAchievement(userId, "five_disputes", admin);
  if (total >= 10) await awardAchievement(userId, "ten_disputes", admin);
}
