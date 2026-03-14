"use server";

import { createAdminClient } from "@/lib/supabase/admin";

type ArgumentRow = {
  author_id: string;
  round: number;
  position: string;
  reasoning: string;
  evidence: string | null;
};

type DisputeContext = {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  opponent_id: string;
  max_rounds: number;
};

type Profile = { id: string; display_name: string | null };

const TONE_GUIDE = `
tone_level guide:
1 = playful/casual — use light tone, can be slightly humorous, short sentences
2 = friendly — warm, conversational, accessible
3 = neutral — balanced, no emotions, factual
4 = serious — analytical, careful word choice
5 = formal — precise terminology, structured, like a legal or scientific document
`;

const PLANE_DESCRIPTIONS: Record<string, string> = {
  casual:     "lighthearted, philosophical, or abstract everyday topic",
  legal:      "legal rights, contracts, money, obligations",
  family:     "personal relationship, family conflict — handle with psychological sensitivity",
  scientific: "factual, evidence-based, scientific or historical topic",
  religious:  "belief, spirituality, worldview — be respectful, never challenge faith",
  business:   "professional, work-related, financial dispute",
  political:  "ideological or political topic — stay strictly neutral",
  general:    "general topic that doesn't fit a specific category",
};

export async function generateRoundInsights(
  dispute: DisputeContext,
  currentRound: number,
  allArgs: ArgumentRow[],
  profiles: Profile[]
): Promise<void> {
  const admin = createAdminClient();

  const getName = (id: string) =>
    profiles.find((p) => p.id === id)?.display_name ?? "Участник";

  const creatorName = getName(dispute.creator_id);
  const opponentName = getName(dispute.opponent_id);

  const roundArgs = allArgs.filter((a) => a.round === currentRound);
  const creatorArg = roundArgs.find((a) => a.author_id === dispute.creator_id);
  const opponentArg = roundArgs.find((a) => a.author_id === dispute.opponent_id);

  if (!creatorArg || !opponentArg) return;

  const { data: existingAnalysis } = await admin
    .from("dispute_analysis")
    .select("*")
    .eq("dispute_id", dispute.id)
    .single();

  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  let plane = existingAnalysis?.plane ?? "general";
  let toneLevel = existingAnalysis?.tone_level ?? 3;
  let heatLevel = existingAnalysis?.heat_level ?? 3;
  let coreTension = existingAnalysis?.core_tension ?? "";

  // --- ПЕРВЫЙ РАУНД: категоризация + инсайты ---
  if (!existingAnalysis) {
    const categorizationPrompt = buildCategorizationPrompt(
      dispute, creatorName, opponentName, creatorArg, opponentArg
    );

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: categorizationPrompt }],
    });

    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    } catch { result = {}; }

    plane = (result.plane as string) ?? "general";
    toneLevel = Math.min(5, Math.max(1, Number(result.tone_level) || 3));
    heatLevel = Math.min(5, Math.max(1, Number(result.heat_level) || 3));
    coreTension = (result.core_tension as string) ?? "";

    const planePrompt = buildPlaneSystemPrompt(plane, toneLevel);

    await admin.from("dispute_analysis").insert({
      dispute_id: dispute.id,
      plane,
      tone_level: toneLevel,
      heat_level: heatLevel,
      core_tension: coreTension,
      plane_prompt: planePrompt,
      patterns: {},
    } as never);

    const insightCreator = (result.insight_for_creator as string) ?? "";
    const insightOpponent = (result.insight_for_opponent as string) ?? "";

    if (insightCreator && insightOpponent) {
      await saveInsights(admin, dispute.id, currentRound, {
        [dispute.creator_id]: insightCreator,
        [dispute.opponent_id]: insightOpponent,
      });
      return;
    }
  }

  // --- ПОСЛЕДУЮЩИЕ РАУНДЫ: инсайты + обновление heat_level ---
  const insightsPrompt = buildInsightsPrompt(
    dispute, currentRound, allArgs, profiles,
    plane, toneLevel, coreTension,
    creatorName, opponentName, creatorArg, opponentArg
  );

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: insightsPrompt }],
  });

  let result: Record<string, unknown> = {};
  try {
    result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  } catch { result = {}; }

  // Обновляем heat_level если AI вернул его
  if (result.heat_level) {
    const newHeat = Math.min(5, Math.max(1, Number(result.heat_level)));
    await admin
      .from("dispute_analysis")
      .update({ heat_level: newHeat } as never)
      .eq("dispute_id", dispute.id);
  }

  const insightCreator = (result.insight_for_creator as string) ?? "";
  const insightOpponent = (result.insight_for_opponent as string) ?? "";

  if (insightCreator && insightOpponent) {
    await saveInsights(admin, dispute.id, currentRound, {
      [dispute.creator_id]: insightCreator,
      [dispute.opponent_id]: insightOpponent,
    });
  }
}

export async function generateWaitingInsight(
  dispute: DisputeContext,
  submitterId: string,
  submitterArg: ArgumentRow,
  currentRound: number,
  previousArgs: ArgumentRow[],
  profiles: Profile[]
): Promise<void> {
  const admin = createAdminClient();

  // Check if insight already exists for this round
  const { data: existing } = await admin
    .from("waiting_insights")
    .select("id")
    .eq("dispute_id", dispute.id)
    .eq("round", currentRound)
    .eq("recipient_id", submitterId)
    .single();

  if (existing) return;

  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const getName = (id: string) =>
    profiles.find((p) => p.id === id)?.display_name ?? "Участник";

  const submitterName = getName(submitterId);
  const opponentId = submitterId === dispute.creator_id ? dispute.opponent_id : dispute.creator_id;
  const opponentName = getName(opponentId);

  const prevRoundsText = previousArgs.length > 0
    ? "Previous rounds:\n" + Array.from(new Set(previousArgs.map((a) => a.round))).sort().map((r) => {
        const cA = previousArgs.find((a) => a.round === r && a.author_id === dispute.creator_id);
        const cB = previousArgs.find((a) => a.round === r && a.author_id === dispute.opponent_id);
        return `Round ${r}: ${getName(dispute.creator_id)}: "${cA?.position ?? "—"}" | ${getName(dispute.opponent_id)}: "${cB?.position ?? "—"}"`;
      }).join("\n") + "\n"
    : "";

  const prompt = `You are an AI mediator giving private coaching. Respond in Russian. Return JSON only.

Dispute: "${dispute.title}"${dispute.description ? `\nDescription: "${dispute.description}"` : ""}

${prevRoundsText}${submitterName} just submitted Round ${currentRound}:
Position: "${submitterArg.position}"
Reasoning: "${submitterArg.reasoning}"

${submitterName} is now waiting for ${opponentName} to respond. Give ${submitterName} a brief private coaching hint:
- Explain why ${opponentName} likely holds their position (based on the dispute context and prior arguments)
- Help ${submitterName} understand ${opponentName}'s perspective
- Be empathetic and diplomatic — never say who is right
- 2-3 sentences max
- This is private — only ${submitterName} will see this

Return JSON:
{
  "insight": "coaching message in Russian for ${submitterName}"
}`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 250,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  let content = "";
  try {
    const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    content = (result.insight as string) ?? "";
  } catch { content = ""; }

  if (!content) return;

  await admin.from("waiting_insights").upsert({
    dispute_id: dispute.id,
    round: currentRound,
    recipient_id: submitterId,
    content,
  } as never, { onConflict: "dispute_id,round,recipient_id" });
}

export async function generateChatComment(
  disputeTitle: string,
  recentComments: { author_name: string; content: string }[]
): Promise<string> {
  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const chatHistory = recentComments
      .map((c) => `${c.author_name}: "${c.content}"`)
      .join("\n");

    const prompt = `Ты — «Всезнающий Сурок», остроумный ИИ-наблюдатель интернет-споров.
Ты комментируешь происходящее в чате зрителей публичного спора.
Твой стиль: ироничный, немного занудный, но незлобный. Короткие реплики.
Никогда не переходи на личности. Пиши на русском.

Спор называется: «${disputeTitle}»

Последние сообщения в чате зрителей:
${chatHistory}

Напиши ONE короткий комментарий (1-2 предложения) — наблюдение о происходящем в чате или о споре в целом.
Можно с лёгкой иронией. Без хэштегов и эмодзи.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 120,
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

async function saveInsights(
  admin: ReturnType<typeof createAdminClient>,
  disputeId: string,
  round: number,
  insights: Record<string, string>
): Promise<void> {
  for (const [recipientId, content] of Object.entries(insights)) {
    await admin.from("round_insights").upsert({
      dispute_id: disputeId,
      round,
      recipient_id: recipientId,
      content,
    } as never, { onConflict: "dispute_id,round,recipient_id" });
  }
}

function buildCategorizationPrompt(
  dispute: DisputeContext,
  creatorName: string,
  opponentName: string,
  creatorArg: ArgumentRow,
  opponentArg: ArgumentRow
): string {
  return `You are an AI mediator analyzing a dispute. Respond in Russian. Return JSON only.

Dispute: "${dispute.title}"
Description: "${dispute.description}"

Round 1:
${creatorName}: "${creatorArg.position}. ${creatorArg.reasoning}"
${opponentName}: "${opponentArg.position}. ${opponentArg.reasoning}"

Determine:
1. The plane of this dispute
2. The tone level appropriate for it
3. The heat level (emotional intensity)
4. The core tension (why they can't hear each other)
5. A personalized insight for each participant

${TONE_GUIDE}

heat_level guide (1-5): 1 = very calm, 2 = mild, 3 = moderate tension, 4 = heated, 5 = very intense

Planes: ${Object.entries(PLANE_DESCRIPTIONS).map(([k, v]) => `${k} = ${v}`).join("; ")}

Return JSON:
{
  "plane": "one of: casual|legal|family|scientific|religious|business|political|general",
  "tone_level": 1-5,
  "heat_level": 1-5,
  "core_tension": "one sentence: what makes them incompatible",
  "insight_for_creator": "Personal message for ${creatorName}: explain WHY ${opponentName} thinks this way, from their perspective. Be diplomatic. Match the tone_level. 3-4 sentences max. Never say who is right.",
  "insight_for_opponent": "Personal message for ${opponentName}: explain WHY ${creatorName} thinks this way, from their perspective. Be diplomatic. Match the tone_level. 3-4 sentences max. Never say who is right."
}`;
}

function buildInsightsPrompt(
  dispute: DisputeContext,
  currentRound: number,
  allArgs: ArgumentRow[],
  profiles: Profile[],
  plane: string,
  toneLevel: number,
  coreTension: string,
  creatorName: string,
  opponentName: string,
  creatorArg: ArgumentRow,
  opponentArg: ArgumentRow
): string {
  const prevRounds = Array.from({ length: currentRound - 1 }, (_, i) => {
    const r = i + 1;
    const ca = allArgs.find((a) => a.author_id === dispute.creator_id && a.round === r);
    const oa = allArgs.find((a) => a.author_id === dispute.opponent_id && a.round === r);
    return `Round ${r}: ${creatorName}: "${ca?.position ?? "—"}" | ${opponentName}: "${oa?.position ?? "—"}"`;
  }).join("\n");

  return `You are an AI mediator. Respond in Russian. Return JSON only.

Dispute plane: ${plane} (${PLANE_DESCRIPTIONS[plane] ?? ""})
Tone level: ${toneLevel}/5
Core tension: "${coreTension}"

${prevRounds ? `Previous rounds:\n${prevRounds}\n` : ""}
Round ${currentRound}:
${creatorName}: "${creatorArg.position}. ${creatorArg.reasoning}"
${opponentName}: "${opponentArg.position}. ${opponentArg.reasoning}"

Generate personalized insights and update heat level for round ${currentRound}.

heat_level guide (1-5): 1 = very calm, 2 = mild, 3 = moderate tension, 4 = heated, 5 = very intense

Return JSON:
{
  "heat_level": 1-5,
  "insight_for_creator": "Personal message for ${creatorName}: explain WHY ${opponentName} argues this way in round ${currentRound}. What drove this response? Be diplomatic, tone_level ${toneLevel}. 3-4 sentences.",
  "insight_for_opponent": "Personal message for ${opponentName}: explain WHY ${creatorName} argues this way in round ${currentRound}. What drove this response? Be diplomatic, tone_level ${toneLevel}. 3-4 sentences."
}`;
}

function buildPlaneSystemPrompt(plane: string, toneLevel: number): string {
  return `Dispute plane: ${plane}. Tone: ${toneLevel}/5. ${PLANE_DESCRIPTIONS[plane] ?? ""}. Always respond in Russian. Never declare a winner. Explain perspectives, not verdicts.`;
}
