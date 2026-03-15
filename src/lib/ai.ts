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

const PERSONAL_INSIGHT_FORMAT = `Use exactly this 3-part structure in Russian:
Что он защищает: ...
Почему он так реагирует: ...
Что можно учесть дальше: ...

Rules:
- each line is 1-2 sentences max
- concise, perceptive, strategically useful
- no markdown bullets, no numbering, no winner language`;

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
- Make it feel strategically useful for ${submitterName}, not like a judge's verdict
- Be empathetic and diplomatic — never say who is right
- Use exactly this structure in Russian:
  Что он, вероятно, защищает: ...
  Почему он может так ответить: ...
  Что можно держать в уме: ...
- each line 1 sentence max
- This is private — only ${submitterName} will see this

Return JSON:
{
  "insight": "coaching message in Russian for ${submitterName} in the exact 3-line structure"
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

export async function generatePublicRoundSummary(
  dispute: DisputeContext,
  currentRound: number,
  allArgs: ArgumentRow[],
  profiles: Profile[]
): Promise<void> {
  const admin = createAdminClient();

  // Skip if already exists
  const { data: existing } = await admin
    .from("round_public_summaries")
    .select("id")
    .eq("dispute_id", dispute.id)
    .eq("round", currentRound)
    .single();
  if (existing) return;

  const getName = (id: string) =>
    profiles.find((p) => p.id === id)?.display_name ?? "Участник";

  const creatorName = getName(dispute.creator_id);
  const opponentName = getName(dispute.opponent_id);

  const roundArgs = allArgs.filter((a) => a.round === currentRound);
  const creatorArg = roundArgs.find((a) => a.author_id === dispute.creator_id);
  const opponentArg = roundArgs.find((a) => a.author_id === dispute.opponent_id);
  if (!creatorArg || !opponentArg) return;

  // Previous rounds context
  const prevRounds = Array.from({ length: currentRound - 1 }, (_, i) => {
    const r = i + 1;
    const ca = allArgs.find((a) => a.author_id === dispute.creator_id && a.round === r);
    const oa = allArgs.find((a) => a.author_id === dispute.opponent_id && a.round === r);
    return `Раунд ${r}: ${creatorName}: "${ca?.position ?? "—"}" | ${opponentName}: "${oa?.position ?? "—"}"`;
  }).join("\n");

  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Ты — нейтральный ИИ-наблюдатель спора. Отвечай на русском. Верни только JSON.

Спор: "${dispute.title}"${dispute.description ? `\nОписание: "${dispute.description}"` : ""}

${prevRounds ? `Предыдущие раунды:\n${prevRounds}\n\n` : ""}Раунд ${currentRound}:
${creatorName}: позиция — "${creatorArg.position}". Аргумент: "${creatorArg.reasoning}"
${opponentName}: позиция — "${opponentArg.position}". Аргумент: "${opponentArg.reasoning}"

Задача:
1. Напиши короткое нейтральное наблюдение об этом раунде (2-3 предложения). Видно ОБОИМ участникам. Не говори кто прав. Отметь, что интересного в аргументах, есть ли точки соприкосновения.
2. Оцени, сближаются ли позиции (по сравнению с предыдущими раундами или начальным состоянием):
   -2 = позиции сильно расходятся
   -1 = небольшое расхождение
    0 = позиции стабильны, движения нет
   +1 = небольшое сближение
   +2 = позиции заметно сближаются

Верни JSON:
{
  "content": "нейтральное наблюдение на русском, 2-3 предложения",
  "convergence": число от -2 до 2
}`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 300,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  let content = "";
  let convergence = 0;
  try {
    const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    content = (result.content as string) ?? "";
    convergence = Math.min(2, Math.max(-2, Math.round(Number(result.convergence) || 0)));
  } catch { return; }

  if (!content) return;

  await admin.from("round_public_summaries").upsert({
    dispute_id: dispute.id,
    round: currentRound,
    content,
    convergence,
  } as never, { onConflict: "dispute_id,round" });
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

export async function generateChallengeInsight(
  messages: { author: string; content: string }[],
  topic: string
): Promise<string> {
  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const history = messages.map((m) => `${m.author}: "${m.content}"`).join("\n");

    const prompt = `Ты — нейтральный ИИ-медиатор в живом чате дискуссии. Пиши на русском.

Тема дискуссии: «${topic}»

Последние сообщения участников:
${history}

Твоя задача: написать короткое наблюдение (1-2 предложения). Ты — нейтральный помощник, не судья.
Можешь задать вопрос, который поможет сторонам лучше понять друг друга.
Будь краток, уважителен, без выводов о правоте.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

export async function generateChallengeMediation(
  messages: { author: string; content: string }[],
  topic: string
): Promise<{ summary: string; commonGround: string; solutions: string[] }> {
  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const history = messages.map((m) => `${m.author}: "${m.content}"`).join("\n");

    const prompt = `Ты — ИИ-медиатор. Проанализируй дискуссию и верни JSON. Отвечай на русском.

Тема: «${topic}»

Диалог:
${history}

Сделай итоговую медиацию:
1. Краткое нейтральное резюме дискуссии
2. Что общего у участников (точки соприкосновения)
3. 2-3 конкретных решения/предложения для движения вперёд

Верни JSON:
{
  "summary": "краткое резюме (2-3 предложения)",
  "commonGround": "что объединяет стороны",
  "solutions": ["решение 1", "решение 2", "решение 3"]
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return {
      summary: (result.summary as string) ?? "",
      commonGround: (result.commonGround as string) ?? "",
      solutions: (result.solutions as string[]) ?? [],
    };
  } catch {
    return { summary: "", commonGround: "", solutions: [] };
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

Critical behavior:
- Each participant should feel that the AI is helping THEM understand how to answer better
- Do not sound like a referee or therapist
- Do not say "you both", "both sides", or "let's reconcile"
- Explain the opponent's logic in a way that lowers hostility and improves understanding
- If useful, suggest one subtle angle the recipient may keep in mind in the next reply
- Never declare a winner and never bluntly tell the recipient to surrender or agree
${PERSONAL_INSIGHT_FORMAT}

${TONE_GUIDE}

heat_level guide (1-5): 1 = very calm, 2 = mild, 3 = moderate tension, 4 = heated, 5 = very intense

Planes: ${Object.entries(PLANE_DESCRIPTIONS).map(([k, v]) => `${k} = ${v}`).join("; ")}

Return JSON:
{
  "plane": "one of: casual|legal|family|scientific|religious|business|political|general",
  "tone_level": 1-5,
  "heat_level": 1-5,
  "core_tension": "one sentence: what makes them incompatible",
  "insight_for_creator": "Direct private message to ${creatorName} using the exact 3-part structure. Explain WHY ${opponentName} thinks this way, what may be behind their reaction, and what nuance ${creatorName} may have missed. Make it feel strategically useful for ${creatorName}. Never say who is right.",
  "insight_for_opponent": "Direct private message to ${opponentName} using the exact 3-part structure. Explain WHY ${creatorName} thinks this way, what may be behind their reaction, and what nuance ${opponentName} may have missed. Make it feel strategically useful for ${opponentName}. Never say who is right."
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

Critical behavior:
- Each participant should feel privately assisted, not judged
- The goal is to reduce misunderstanding by explaining the logic behind the opponent's answer
- Do not sound like a final verdict, therapy session, or moral lecture
- Avoid phrases like "you both need" or "the correct position is"
- If helpful, include one subtle suggestion about what the recipient could clarify in the next round without ordering them around
${PERSONAL_INSIGHT_FORMAT}

heat_level guide (1-5): 1 = very calm, 2 = mild, 3 = moderate tension, 4 = heated, 5 = very intense

Return JSON:
{
  "heat_level": 1-5,
  "insight_for_creator": "Direct private message to ${creatorName} using the exact 3-part structure. Explain WHY ${opponentName} answered this way in round ${currentRound}, what may be informing that response, and what ${creatorName} may want to keep in mind before replying. Make it feel strategically helpful for ${creatorName}. Diplomatic, tone_level ${toneLevel}.",
  "insight_for_opponent": "Direct private message to ${opponentName} using the exact 3-part structure. Explain WHY ${creatorName} answered this way in round ${currentRound}, what may be informing that response, and what ${opponentName} may want to keep in mind before replying. Make it feel strategically helpful for ${opponentName}. Diplomatic, tone_level ${toneLevel}."
}`;
}

function buildPlaneSystemPrompt(plane: string, toneLevel: number): string {
  return `Dispute plane: ${plane}. Tone: ${toneLevel}/5. ${PLANE_DESCRIPTIONS[plane] ?? ""}. Always respond in Russian. Never declare a winner. Explain perspectives, not verdicts.`;
}

// Lightweight AI categorization for topics (used by bot notifications, arena, etc.)
const VALID_CATEGORIES = ["politics", "technology", "philosophy", "lifestyle", "science", "culture", "economics", "relationships", "other"] as const;
export type TopicCategory = typeof VALID_CATEGORIES[number];

export async function categorizeTopicAI(topic: string, description?: string): Promise<TopicCategory> {
  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 50,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Classify this topic into exactly ONE category. Return ONLY the category word, nothing else.

Categories: politics, technology, philosophy, lifestyle, science, culture, economics, relationships, other

Topic: "${topic}"${description ? `\nDescription: "${description}"` : ""}

Category:`,
      }],
    });

    const raw = (response.choices[0]?.message?.content ?? "").trim().toLowerCase();
    const cat = VALID_CATEGORIES.find((c) => raw.includes(c));
    return cat ?? "other";
  } catch {
    return "other";
  }
}
