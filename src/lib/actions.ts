"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendArgumentNotification, sendMediationReadyNotification, sendInviteEmail, sendDirectChallengeEmail } from "@/lib/email";
import { generateRoundInsights, generateWaitingInsight } from "@/lib/ai";
import { awardAchievement } from "@/lib/achievements";
import type { Database } from "@/types/database";

type DisputeInsert = Database["public"]["Tables"]["disputes"]["Insert"];
type DisputeRow = Database["public"]["Tables"]["disputes"]["Row"];
type ArgumentRow = Database["public"]["Tables"]["arguments"]["Row"];

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
      const { data: userList } = await admin.auth.admin.listUsers();
      const found = userList?.users?.find(
        (u) => u.email?.toLowerCase() === opponentEmail && !u.is_anonymous
      );
      if (found && found.id !== user.id) {
        opponentId = found.id;
        initialStatus = "in_progress";
      }
    } catch { /* non-critical */ }
  }

  const row: DisputeInsert = {
    title,
    description,
    max_rounds: maxRounds,
    creator_id: user.id,
    is_public: isPublic,
    ...(opponentId ? { opponent_id: opponentId, status: initialStatus } : {}),
  };

  const { data, error } = await supabase
    .from("disputes")
    .insert(row as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    redirect("/dashboard?error=" + encodeURIComponent(error?.message ?? "Ошибка создания спора"));
  }

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

    // Send direct challenge email
    if (opponentId && opponentEmail) {
      const myProfile = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single<{ display_name: string | null }>();
      const opponentUser = await admin.auth.admin.getUserById(opponentId);
      if (opponentUser.data.user?.email) {
        await sendDirectChallengeEmail({
          toEmail: opponentUser.data.user.email,
          toName: opponentUser.data.user.user_metadata?.display_name ?? "Участник",
          fromName: myProfile.data?.display_name ?? "Участник",
          disputeTitle: title,
          disputeId: data.id,
        });
      }
    }
  } catch { /* achievements are non-critical */ }

  redirect(`/dispute/${data.id}`);
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
      await awardAchievement(user.id, "accepted_invite", admin);
      await checkDisputeMilestones(user.id, admin);
    } catch { /* non-critical */ }
  }

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

    try {
      await generateRoundInsights(
        {
          id: disputeId,
          title: dispute.title,
          description: dispute.description,
          creator_id: dispute.creator_id,
          opponent_id: dispute.opponent_id,
          max_rounds: dispute.max_rounds,
        },
        currentRound,
        fullArgs ?? [],
        allProfiles
      );
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

  const getName = (id: string) =>
    profiles?.find((p) => p.id === id)?.display_name ?? "Участник";

  const roundsText = Array.from({ length: dispute.max_rounds }, (_, i) => {
    const round = i + 1;
    const aArg = args?.find(
      (a) => a.author_id === dispute.creator_id && a.round === round
    );
    const bArg = args?.find(
      (a) => a.author_id === dispute.opponent_id && a.round === round
    );
    const aName = getName(dispute.creator_id);
    const bName = getName(dispute.opponent_id!);
    const aEvidence = aArg?.evidence
      ? `\nДоказательства: ${aArg.evidence}`
      : "";
    const bEvidence = bArg?.evidence
      ? `\nДоказательства: ${bArg.evidence}`
      : "";
    return [
      `Раунд ${round}:`,
      `${aName}: ${aArg?.position ?? "—"}\n${aArg?.reasoning ?? ""}${aEvidence}`,
      `${bName}: ${bArg?.position ?? "—"}\n${bArg?.reasoning ?? ""}${bEvidence}`,
    ].join("\n");
  }).join("\n\n---\n\n");

  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  let analysis: Record<string, unknown> = {};
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `Ты ИИ-медиатор. Проанализируй спор и предложи решения. Отвечай строго в JSON.

Спор: ${dispute.title}
Описание: ${dispute.description}

Аргументы сторон:
${roundsText}

Верни JSON:
{
  "summary_a": "краткое резюме позиции ${getName(dispute.creator_id)}",
  "summary_b": "краткое резюме позиции ${getName(dispute.opponent_id!)}",
  "common_ground": "что объединяет стороны",
  "solutions": ["решение 1", "решение 2", "решение 3"],
  "recommendation": "рекомендация медиатора"
}`,
        },
      ],
    });
    const text = response.choices[0]?.message?.content ?? "";
    try {
      analysis = JSON.parse(text);
    } catch {
      analysis = { raw: text };
    }
  } catch {
    // AI unavailable — store fallback so mediation still completes
    analysis = {
      raw: "ИИ-медиатор временно недоступен. Все аргументы сохранены — попробуйте запустить медиацию позже.",
      summary_a: "",
      summary_b: "",
      solutions: [],
    };
  }

  await supabase.from("mediations").insert({
    dispute_id: disputeId,
    analysis,
    solutions: Array.isArray(analysis.solutions) ? analysis.solutions : [],
  } as never);

  await supabase
    .from("disputes")
    .update({ status: "resolved" } as never)
    .eq("id", disputeId);

  // Award resolution achievement to both participants
  try {
    const admin = createAdminClient();
    await awardAchievement(dispute.creator_id, "resolution", admin);
    if (dispute.opponent_id) {
      await awardAchievement(dispute.opponent_id, "resolution", admin);
    }
  } catch { /* non-critical */ }

  redirect(`/dispute/${disputeId}/mediation`);
}

export async function sendDisputeInviteEmail(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const toEmail = formData.get("to_email") as string;
  const inviteUrl = formData.get("invite_url") as string;
  const disputeTitle = formData.get("dispute_title") as string;
  const creatorName = formData.get("creator_name") as string;

  if (!toEmail || !inviteUrl) return;

  try {
    await sendInviteEmail({ toEmail, disputeTitle, creatorName, inviteUrl });
  } catch { /* non-critical */ }
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
}

export async function acceptEarlyEnd(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const disputeId = formData.get("dispute_id") as string;

  const { data: dispute } = await supabase
    .from("disputes")
    .select("status, creator_id, opponent_id, early_end_proposed_by")
    .eq("id", disputeId)
    .single<Pick<DisputeRow, "status" | "creator_id" | "opponent_id" | "early_end_proposed_by">>();

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
    await awardAchievement(dispute.creator_id, "reached_mediation", admin);
    if (dispute.opponent_id) {
      await awardAchievement(dispute.opponent_id, "reached_mediation", admin);
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

export async function addComment(
  disputeId: string,
  content: string,
  authorName: string,
  sessionId: string
): Promise<{ error?: string }> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 500) return { error: "Недопустимая длина" };

  const admin = createAdminClient();

  // Rate limit: max 1 message per 5 seconds per session
  const { data: recent } = await admin
    .from("dispute_comments")
    .select("created_at")
    .eq("dispute_id", disputeId)
    .eq("author_name", authorName)
    .eq("is_ai", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recent) {
    const diff = Date.now() - new Date(recent.created_at).getTime();
    if (diff < 5000) return { error: "Подождите немного перед следующим сообщением" };
  }

  // Insert user comment
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await admin.from("dispute_comments").insert({
    dispute_id: disputeId,
    content: trimmed,
    author_name: authorName,
    author_id: user?.id ?? null,
    is_ai: false,
  } as never);

  // Check if AI should chime in (every 5th human comment)
  const { count } = await admin
    .from("dispute_comments")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", disputeId)
    .eq("is_ai", false);

  if ((count ?? 0) % 5 === 0 && (count ?? 0) > 0) {
    // Get dispute title + recent comments for AI context
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
      const aiText = await generateChatComment(
        dispute.title,
        recentComments.reverse()
      );
      if (aiText) {
        await admin.from("dispute_comments").insert({
          dispute_id: disputeId,
          content: aiText,
          author_name: "Всезнающий Сурок",
          author_id: null,
          is_ai: true,
        } as never);
      }
    }
  }

  return {};
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
