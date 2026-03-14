"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateChallengeInsight, generateChallengeMediation } from "@/lib/ai";

export async function createChallenge(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const topic = (formData.get("topic") as string).trim();
  const position_hint = (formData.get("position_hint") as string).trim();

  const { data, error } = await supabase
    .from("challenges")
    .insert({ author_id: user.id, topic, position_hint } as never)
    .select("id")
    .single<{ id: string }>();

  if (error) redirect("/arena?error=" + encodeURIComponent(error.message));

  redirect("/arena");
}

export async function acceptChallenge(challengeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check challenge is open and not by this user
  const { data: challenge } = await supabase
    .from("challenges")
    .select("author_id, status")
    .eq("id", challengeId)
    .single<{ author_id: string; status: string }>();

  if (!challenge || challenge.status !== "open" || challenge.author_id === user.id) {
    redirect("/arena?error=challenge_unavailable");
  }

  const { error } = await supabase
    .from("challenges")
    .update({ accepted_by: user.id, status: "active" } as never)
    .eq("id", challengeId);

  if (error) redirect("/arena?error=" + encodeURIComponent(error.message));

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
