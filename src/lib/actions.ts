"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const maxRounds = parseInt(formData.get("max_rounds") as string) || 3;

  const row: DisputeInsert = {
    title,
    description,
    max_rounds: maxRounds,
    creator_id: user.id,
  };

  const { data, error } = await supabase
    .from("disputes")
    .insert(row as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    redirect("/dashboard?error=" + encodeURIComponent(error?.message ?? "Ошибка создания спора"));
  }

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
  const evidence = (formData.get("evidence") as string)?.trim() || null;

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
    .select("author_id, round")
    .eq("dispute_id", disputeId)
    .returns<Pick<ArgumentRow, "author_id" | "round">[]>();

  const myArgs = existingArgs?.filter((a) => a.author_id === user.id) ?? [];
  const opponentArgs =
    existingArgs?.filter((a) => a.author_id === opponentId) ?? [];
  const currentRound = myArgs.length + 1;

  if (currentRound > dispute.max_rounds) redirect(`/dispute/${disputeId}`);

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
    return [
      `Раунд ${round}:`,
      `${aName}: ${aArg?.position ?? "—"}\n${aArg?.reasoning ?? ""}`,
      `${bName}: ${bArg?.position ?? "—"}\n${bArg?.reasoning ?? ""}`,
    ].join("\n");
  }).join("\n\n---\n\n");

  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

  let analysis: Record<string, unknown> = {};
  const text = response.choices[0]?.message?.content ?? "";
  try {
    analysis = JSON.parse(text);
  } catch {
    analysis = { raw: text };
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

  redirect(`/dispute/${disputeId}/mediation`);
}
