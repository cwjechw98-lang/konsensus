"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateChallengeInsight, generateChallengeMediation } from "@/lib/ai";
import { notifyChallengeAccepted, notifyChallengeMessage, notifyNewChallenge } from "@/lib/telegram";
import { categorizeTopicAI } from "@/lib/ai";

export async function createChallenge(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const topic = (formData.get("topic") as string).trim();
  const position_hint = (formData.get("position_hint") as string).trim();

  // AI categorization (non-blocking fallback to 'other')
  const category = await categorizeTopicAI(topic, position_hint);

  const { data, error } = await supabase
    .from("challenges")
    .insert({ author_id: user.id, topic, position_hint, category } as never)
    .select("id")
    .single<{ id: string }>();

  if (error) redirect("/arena?error=" + encodeURIComponent(error.message));

  // Notify all linked Telegram users about the new challenge (except author)
  try {
    const admin = createAdminClient();
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single<{ display_name: string | null }>();

    const { data: tgUsers } = await admin
      .from("profiles")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null)
      .neq("id", user.id)
      .returns<{ telegram_chat_id: number }[]>();

    // Limit broadcast to first 50 users to avoid timeout
    for (const u of (tgUsers ?? []).slice(0, 50)) {
      await notifyNewChallenge(u.telegram_chat_id, myProfile?.display_name ?? "Участник", topic, category);
    }
  } catch { /* non-critical */ }

  redirect("/arena");
}

export async function acceptChallenge(challengeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check challenge is open and not by this user
  const { data: challenge } = await supabase
    .from("challenges")
    .select("author_id, status, topic")
    .eq("id", challengeId)
    .single<{ author_id: string; status: string; topic: string }>();

  if (!challenge || challenge.status !== "open" || challenge.author_id === user.id) {
    redirect("/arena?error=challenge_unavailable");
  }

  const { error } = await supabase
    .from("challenges")
    .update({ accepted_by: user.id, status: "active" } as never)
    .eq("id", challengeId);

  if (error) redirect("/arena?error=" + encodeURIComponent(error.message));

  // Notify challenge author via Telegram
  try {
    const admin = createAdminClient();
    const { data: authorProfile } = await admin
      .from("profiles")
      .select("telegram_chat_id, display_name")
      .eq("id", challenge.author_id)
      .single<{ telegram_chat_id: number | null; display_name: string | null }>();
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single<{ display_name: string | null }>();
    if (authorProfile?.telegram_chat_id) {
      await notifyChallengeAccepted(
        authorProfile.telegram_chat_id,
        myProfile?.display_name ?? "Участник",
        challenge.topic,
        challengeId
      );
    }
  } catch { /* non-critical */ }

  redirect("/arena/" + challengeId);
}

export async function sendChallengeMessage(
  challengeId: string,
  content: string,
  triggerAI?: boolean
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();

  // Insert user message
  await admin.from("challenge_messages").insert({
    challenge_id: challengeId,
    author_id: user.id,
    content,
    is_ai: false,
  } as never);

  // Notify the other participant via Telegram
  try {
    const { data: challengeInfo } = await admin
      .from("challenges")
      .select("author_id, accepted_by, topic")
      .eq("id", challengeId)
      .single<{ author_id: string; accepted_by: string | null; topic: string }>();
    if (challengeInfo) {
      const otherId = challengeInfo.author_id === user.id ? challengeInfo.accepted_by : challengeInfo.author_id;
      if (otherId) {
        const { data: otherProfile } = await admin
          .from("profiles")
          .select("telegram_chat_id, display_name")
          .eq("id", otherId)
          .single<{ telegram_chat_id: number | null; display_name: string | null }>();
        const { data: myProfile } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single<{ display_name: string | null }>();
        if (otherProfile?.telegram_chat_id) {
          await notifyChallengeMessage(
            otherProfile.telegram_chat_id,
            myProfile?.display_name ?? "Участник",
            challengeInfo.topic,
            challengeId
          );
        }
      }
    }
  } catch { /* non-critical */ }

  if (!triggerAI) return;

  // Fetch topic + recent messages for AI
  const { data: challenge } = await admin
    .from("challenges")
    .select("topic, profiles!challenges_author_id_fkey(display_name), accepted_profile:profiles!challenges_accepted_by_fkey(display_name)")
    .eq("id", challengeId)
    .single<{
      topic: string;
      profiles: { display_name: string | null } | null;
      accepted_profile: { display_name: string | null } | null;
    }>();

  const { data: messages } = await admin
    .from("challenge_messages")
    .select("content, author_id, profiles(display_name)")
    .eq("challenge_id", challengeId)
    .eq("is_ai", false)
    .order("created_at", { ascending: true })
    .returns<{ content: string; author_id: string; profiles: { display_name: string | null } | null }[]>();

  if (!challenge || !messages) return;

  const formatted = messages.map((m) => ({
    author: m.profiles?.display_name ?? "Участник",
    content: m.content,
  }));

  const aiComment = await generateChallengeInsight(formatted, challenge.topic);
  if (!aiComment) return;

  await admin.from("challenge_messages").insert({
    challenge_id: challengeId,
    author_id: null,
    content: aiComment,
    is_ai: true,
  } as never);
}

export async function closeChallenge(challengeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("challenges")
    .update({ status: "closed" } as never)
    .eq("id", challengeId);

  redirect("/arena");
}

export async function requestChallengeMediation(challengeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: challenge } = await admin
    .from("challenges")
    .select("topic")
    .eq("id", challengeId)
    .single<{ topic: string }>();

  const { data: messages } = await admin
    .from("challenge_messages")
    .select("content, author_id, profiles(display_name)")
    .eq("challenge_id", challengeId)
    .eq("is_ai", false)
    .order("created_at", { ascending: true })
    .returns<{ content: string; author_id: string; profiles: { display_name: string | null } | null }[]>();

  if (!challenge || !messages) redirect("/arena/" + challengeId);

  const formatted = messages.map((m) => ({
    author: m.profiles?.display_name ?? "Участник",
    content: m.content,
  }));

  const result = await generateChallengeMediation(formatted, challenge.topic);

  // Save mediation as AI message
  const summary = `**Итог медиации:**\n\n${result.summary}\n\n**Общее:**\n${result.commonGround}\n\n**Решения:**\n${result.solutions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;

  await admin.from("challenge_messages").insert({
    challenge_id: challengeId,
    author_id: null,
    content: summary,
    is_ai: true,
  } as never);

  await admin
    .from("challenges")
    .update({ status: "closed" } as never)
    .eq("id", challengeId);

  redirect("/arena/" + challengeId + "?mediated=1");
}
