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
type JsonRecord = Record<string, unknown>;
type AgentStage = "waiting" | "round_private" | "round_public" | "final_mediation";
type AgentKey = "legal_lens" | "empathy_lens" | "mediation_lens" | "fact_lens";
type RoundPrivateResult = {
  heatLevel: number;
  insightCreator: string;
  insightOpponent: string;
};
type WaitingInsightResult = { insight: string };
type PublicSummaryResult = { content: string; convergence: number };
type FinalMediationResult = {
  analysis: JsonRecord;
  solutions: string[];
};

const GROQ_MODEL = "llama-3.3-70b-versatile";

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
Вектор следующего хода: ...

Rules:
- each line is 1-2 sentences max
- concise, perceptive, strategically useful
- the third line must describe the best direction for the recipient's next reply, not a generic reflection
- no markdown bullets, no numbering, no winner language`;

const AGENT_SYSTEM_PROMPTS: Record<AgentKey, string> = {
  legal_lens:
    "You are the legal_lens in a mediation system. Focus on obligations, fairness, boundaries, practical consequences, and where the sides may be talking past each other about rules or expectations. Never act as a judge, never declare who is right, never give formal legal advice. Respond in Russian and strictly as structured JSON when requested.",
  empathy_lens:
    "You are the empathy_lens in a mediation system. Focus on emotional triggers, dignity, fear, face-saving, unmet needs, and why a person may react defensively. Never pathologize people, never moralize, never declare who is right. Respond in Russian and strictly as structured JSON when requested.",
  mediation_lens:
    "You are the mediation_lens in a mediation system. Focus on reframing, overlap, de-escalation, constructive next moves, and what can move the dialogue forward without forcing agreement. Never choose a winner. Respond in Russian and strictly as structured JSON when requested.",
  fact_lens:
    "You are the fact_lens in a mediation system. Focus on verifiability, evidence quality, factual gaps, assumptions, and where stronger grounding is needed. Never invent facts, never choose a winner. Respond in Russian and strictly as structured JSON when requested.",
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Math.round(Number(value));
  if (Number.isNaN(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function getProfileName(profiles: Profile[], id: string) {
  return profiles.find((profile) => profile.id === id)?.display_name ?? "Участник";
}

function getPlaneSpecificLens(plane: string): AgentKey | null {
  if (plane === "legal" || plane === "business") return "legal_lens";
  if (plane === "family" || plane === "religious") return "empathy_lens";
  if (plane === "scientific") return "fact_lens";
  return null;
}

function selectAgentKeys(params: {
  stage: AgentStage;
  plane: string;
  heatLevel: number;
  hasEvidence: boolean;
}) {
  const keys = new Set<AgentKey>();
  const planeLens = getPlaneSpecificLens(params.plane);

  if (params.stage === "waiting") {
    keys.add("empathy_lens");
    if (params.plane === "legal" || params.plane === "business") {
      keys.add("legal_lens");
    }
    return Array.from(keys);
  }

  keys.add("mediation_lens");
  if (planeLens) keys.add(planeLens);
  if (params.heatLevel >= 4) keys.add("empathy_lens");
  if (params.hasEvidence) keys.add("fact_lens");
  if ((params.stage === "round_public" || params.stage === "final_mediation") && params.plane === "scientific") {
    keys.add("fact_lens");
  }

  return Array.from(keys);
}

async function createGroqClient() {
  const Groq = (await import("groq-sdk")).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function runJsonPrompt(
  messages: Array<{ role: "system" | "user"; content: string }>,
  maxTokens: number
): Promise<JsonRecord> {
  const groq = await createGroqClient();
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages,
  });

  try {
    return JSON.parse(response.choices[0]?.message?.content ?? "{}");
  } catch {
    return {};
  }
}

async function runAgent(
  agentKey: AgentKey,
  prompt: string,
  maxTokens: number
): Promise<JsonRecord> {
  return runJsonPrompt(
    [
      { role: "system", content: AGENT_SYSTEM_PROMPTS[agentKey] },
      { role: "user", content: prompt },
    ],
    maxTokens
  );
}

async function runAgentSet(
  agentKeys: AgentKey[],
  promptBuilder: (agentKey: AgentKey) => string,
  maxTokens: number
) {
  const results = await Promise.all(
    agentKeys.map(async (agentKey) => ({
      agentKey,
      result: await runAgent(agentKey, promptBuilder(agentKey), maxTokens),
    }))
  );

  return Object.fromEntries(
    results
      .filter((entry) => Object.keys(entry.result).length > 0)
      .map((entry) => [entry.agentKey, entry.result])
  ) as Partial<Record<AgentKey, JsonRecord>>;
}

function buildPreviousRoundsText(
  dispute: DisputeContext,
  profiles: Profile[],
  allArgs: ArgumentRow[],
  roundsCount: number
) {
  if (roundsCount <= 0) return "";

  const creatorName = getProfileName(profiles, dispute.creator_id);
  const opponentName = getProfileName(profiles, dispute.opponent_id);

  return Array.from({ length: roundsCount }, (_, i) => {
    const round = i + 1;
    const creatorArg = allArgs.find(
      (argument) => argument.author_id === dispute.creator_id && argument.round === round
    );
    const opponentArg = allArgs.find(
      (argument) => argument.author_id === dispute.opponent_id && argument.round === round
    );

    return `Раунд ${round}: ${creatorName}: "${creatorArg?.position ?? "—"}" | ${opponentName}: "${opponentArg?.position ?? "—"}"`;
  }).join("\n");
}

function buildRoundsText(
  dispute: DisputeContext,
  profiles: Profile[],
  allArgs: ArgumentRow[]
) {
  const creatorName = getProfileName(profiles, dispute.creator_id);
  const opponentName = getProfileName(profiles, dispute.opponent_id);

  return Array.from({ length: dispute.max_rounds }, (_, index) => {
    const round = index + 1;
    const creatorArg = allArgs.find(
      (argument) => argument.author_id === dispute.creator_id && argument.round === round
    );
    const opponentArg = allArgs.find(
      (argument) => argument.author_id === dispute.opponent_id && argument.round === round
    );
    const creatorEvidence = creatorArg?.evidence ? `\nДоказательства: ${creatorArg.evidence}` : "";
    const opponentEvidence = opponentArg?.evidence ? `\nДоказательства: ${opponentArg.evidence}` : "";

    return [
      `Раунд ${round}:`,
      `${creatorName}: ${creatorArg?.position ?? "—"}\n${creatorArg?.reasoning ?? ""}${creatorEvidence}`,
      `${opponentName}: ${opponentArg?.position ?? "—"}\n${opponentArg?.reasoning ?? ""}${opponentEvidence}`,
    ].join("\n");
  }).join("\n\n---\n\n");
}

function buildRoundPrivateAgentPrompt(params: {
  dispute: DisputeContext;
  currentRound: number;
  allArgs: ArgumentRow[];
  plane: string;
  toneLevel: number;
  heatLevel: number;
  coreTension: string;
  profiles: Profile[];
}) {
  const { dispute, currentRound, allArgs, plane, toneLevel, heatLevel, coreTension, profiles } = params;
  const creatorName = getProfileName(profiles, dispute.creator_id);
  const opponentName = getProfileName(profiles, dispute.opponent_id);
  const roundArgs = allArgs.filter((argument) => argument.round === currentRound);
  const creatorArg = roundArgs.find((argument) => argument.author_id === dispute.creator_id);
  const opponentArg = roundArgs.find((argument) => argument.author_id === dispute.opponent_id);
  const previousRounds = buildPreviousRoundsText(dispute, profiles, allArgs, currentRound - 1);

  return `Ты работаешь как одна из аналитических линз системы медиации. Отвечай строго JSON на русском.

Плоскость спора: ${plane} (${PLANE_DESCRIPTIONS[plane] ?? ""})
Тон: ${toneLevel}/5
Текущая температура: ${heatLevel}/5
Core tension: "${coreTension}"

Спор: "${dispute.title}"${dispute.description ? `\nОписание: "${dispute.description}"` : ""}
${previousRounds ? `\nПредыдущие раунды:\n${previousRounds}` : ""}

Раунд ${currentRound}:
${creatorName}: "${creatorArg?.position ?? "—"}. ${creatorArg?.reasoning ?? ""}"
${opponentName}: "${opponentArg?.position ?? "—"}. ${opponentArg?.reasoning ?? ""}"

Верни JSON:
{
  "insight_for_creator": {
    "what_they_defend": "1 короткое предложение о том, что, вероятно, защищает ${opponentName}",
    "why_they_react": "1 короткое предложение, почему ${opponentName} так реагирует",
    "next_move_vector": "1 короткое предложение о лучшем направлении следующего ответа для ${creatorName}"
  },
  "insight_for_opponent": {
    "what_they_defend": "1 короткое предложение о том, что, вероятно, защищает ${creatorName}",
    "why_they_react": "1 короткое предложение, почему ${creatorName} так реагирует",
    "next_move_vector": "1 короткое предложение о лучшем направлении следующего ответа для ${opponentName}"
  },
  "heat_signal": число 1-5
}`;
}

async function orchestrateRoundPrivateInsight(params: {
  dispute: DisputeContext;
  currentRound: number;
  allArgs: ArgumentRow[];
  profiles: Profile[];
  plane: string;
  toneLevel: number;
  heatLevel: number;
  coreTension: string;
}): Promise<RoundPrivateResult | null> {
  const roundArgs = params.allArgs.filter((argument) => argument.round === params.currentRound);
  const hasEvidence = roundArgs.some((argument) => Boolean(argument.evidence?.trim()));
  const agentKeys = selectAgentKeys({
    stage: "round_private",
    plane: params.plane,
    heatLevel: params.heatLevel,
    hasEvidence,
  });

  const lensOutputs = await runAgentSet(agentKeys, () => buildRoundPrivateAgentPrompt(params), 450);
  if (Object.keys(lensOutputs).length === 0) return null;

  const creatorName = getProfileName(params.profiles, params.dispute.creator_id);
  const opponentName = getProfileName(params.profiles, params.dispute.opponent_id);

  const aggregated = await runJsonPrompt(
    [
      {
        role: "system",
        content:
          "You are the orchestration aggregator. Merge multiple lens outputs into one coherent private coaching result. Never mention lenses, never declare a winner. Always respond in Russian and strictly as JSON.",
      },
      {
        role: "user",
        content: `Собери единый приватный результат для обоих участников на основе выходов аналитических линз.

Плоскость: ${params.plane}
Тон: ${params.toneLevel}/5
Текущая температура: ${params.heatLevel}/5
Core tension: "${params.coreTension}"

Выходы линз:
${JSON.stringify(lensOutputs, null, 2)}

Верни JSON:
{
  "heat_level": число 1-5,
  "insight_for_creator": "Приватное сообщение для ${creatorName} в точном 3-строчном формате:\nЧто он защищает: ...\nПочему он так реагирует: ...\nВектор следующего хода: ...",
  "insight_for_opponent": "Приватное сообщение для ${opponentName} в точном 3-строчном формате:\nЧто он защищает: ...\nПочему он так реагирует: ...\nВектор следующего хода: ..."
}

Критические правила:
${PERSONAL_INSIGHT_FORMAT}
- не пиши про победителя
- не говори от лица психотерапевта
- третий пункт должен быть направлением хода, а не готовой репликой`,
      },
    ],
    650
  );

  const insightCreator = String(aggregated.insight_for_creator ?? "").trim();
  const insightOpponent = String(aggregated.insight_for_opponent ?? "").trim();
  if (!insightCreator || !insightOpponent) return null;

  return {
    heatLevel: clampInt(aggregated.heat_level, 1, 5, params.heatLevel),
    insightCreator,
    insightOpponent,
  };
}

function buildWaitingAgentPrompt(params: {
  dispute: DisputeContext;
  submitterId: string;
  submitterArg: ArgumentRow;
  currentRound: number;
  previousArgs: ArgumentRow[];
  profiles: Profile[];
  plane: string;
  toneLevel: number;
  heatLevel: number;
  coreTension: string;
}) {
  const submitterName = getProfileName(params.profiles, params.submitterId);
  const opponentId = params.submitterId === params.dispute.creator_id
    ? params.dispute.opponent_id
    : params.dispute.creator_id;
  const opponentName = getProfileName(params.profiles, opponentId);
  const previousRounds = params.previousArgs.length > 0
    ? "Предыдущие раунды:\n" +
      Array.from(new Set(params.previousArgs.map((argument) => argument.round)))
        .sort((left, right) => left - right)
        .map((round) => {
          const creatorArg = params.previousArgs.find(
            (argument) => argument.author_id === params.dispute.creator_id && argument.round === round
          );
          const opponentArg = params.previousArgs.find(
            (argument) => argument.author_id === params.dispute.opponent_id && argument.round === round
          );
          return `Раунд ${round}: ${getProfileName(params.profiles, params.dispute.creator_id)}: "${creatorArg?.position ?? "—"}" | ${getProfileName(params.profiles, params.dispute.opponent_id)}: "${opponentArg?.position ?? "—"}"`;
        })
        .join("\n")
    : "";

  return `Ты работаешь как одна из аналитических линз системы ожидания ответа. Отвечай строго JSON на русском.

Плоскость спора: ${params.plane} (${PLANE_DESCRIPTIONS[params.plane] ?? ""})
Тон: ${params.toneLevel}/5
Текущая температура: ${params.heatLevel}/5
Core tension: "${params.coreTension}"

Спор: "${params.dispute.title}"${params.dispute.description ? `\nОписание: "${params.dispute.description}"` : ""}
${previousRounds ? `\n${previousRounds}` : ""}

${submitterName} только что отправил аргумент в раунде ${params.currentRound}:
Позиция: "${params.submitterArg.position}"
Обоснование: "${params.submitterArg.reasoning}"

Сейчас ${submitterName} ждёт ответ от ${opponentName}. Верни JSON:
{
  "candidate_insight": "Точное 3-строчное приватное сообщение для ${submitterName}:\nЧто он защищает: ...\nПочему он так реагирует: ...\nВектор следующего хода: ..."
}

Правила:
- это приватный коучинг, а не вердикт
- третий пункт должен быть направлением следующего ответа, а не готовой репликой
- не пиши про правоту одной стороны`;
}

async function orchestrateWaitingInsight(params: {
  dispute: DisputeContext;
  submitterId: string;
  submitterArg: ArgumentRow;
  currentRound: number;
  previousArgs: ArgumentRow[];
  profiles: Profile[];
  plane: string;
  toneLevel: number;
  heatLevel: number;
  coreTension: string;
}): Promise<WaitingInsightResult | null> {
  const agentKeys = selectAgentKeys({
    stage: "waiting",
    plane: params.plane,
    heatLevel: params.heatLevel,
    hasEvidence: Boolean(params.submitterArg.evidence?.trim()),
  });

  const lensOutputs = await runAgentSet(agentKeys, () => buildWaitingAgentPrompt(params), 280);
  if (Object.keys(lensOutputs).length === 0) return null;

  const submitterName = getProfileName(params.profiles, params.submitterId);
  const aggregated = await runJsonPrompt(
    [
      {
        role: "system",
        content:
          "You are the orchestration aggregator for waiting insights. Merge lens outputs into one concise private coaching message. Respond in Russian and strictly as JSON.",
      },
      {
        role: "user",
        content: `Собери единый waiting insight для ${submitterName}.

Выходы линз:
${JSON.stringify(lensOutputs, null, 2)}

Верни JSON:
{
  "insight": "Точное 3-строчное приватное сообщение в формате:\nЧто он защищает: ...\nПочему он так реагирует: ...\nВектор следующего хода: ..."
}

Правила:
${PERSONAL_INSIGHT_FORMAT}
- это приватный hint на время ожидания
- не звучать как финальный вывод по спору`,
      },
    ],
    320
  );

  const insight = String(aggregated.insight ?? "").trim();
  if (!insight) return null;

  return { insight };
}

function buildPublicSummaryAgentPrompt(params: {
  dispute: DisputeContext;
  currentRound: number;
  allArgs: ArgumentRow[];
  profiles: Profile[];
  plane: string;
  toneLevel: number;
  heatLevel: number;
  coreTension: string;
}) {
  const creatorName = getProfileName(params.profiles, params.dispute.creator_id);
  const opponentName = getProfileName(params.profiles, params.dispute.opponent_id);
  const roundArgs = params.allArgs.filter((argument) => argument.round === params.currentRound);
  const creatorArg = roundArgs.find((argument) => argument.author_id === params.dispute.creator_id);
  const opponentArg = roundArgs.find((argument) => argument.author_id === params.dispute.opponent_id);
  const previousRounds = buildPreviousRoundsText(params.dispute, params.profiles, params.allArgs, params.currentRound - 1);

  return `Ты работаешь как одна из аналитических линз публичного AI-наблюдения. Отвечай строго JSON на русском.

Плоскость: ${params.plane}
Тон: ${params.toneLevel}/5
Текущая температура: ${params.heatLevel}/5
Core tension: "${params.coreTension}"

Спор: "${params.dispute.title}"${params.dispute.description ? `\nОписание: "${params.dispute.description}"` : ""}
${previousRounds ? `\nПредыдущие раунды:\n${previousRounds}` : ""}

Раунд ${params.currentRound}:
${creatorName}: "${creatorArg?.position ?? "—"}". Аргумент: "${creatorArg?.reasoning ?? ""}"
${opponentName}: "${opponentArg?.position ?? "—"}". Аргумент: "${opponentArg?.reasoning ?? ""}"

Верни JSON:
{
  "observation": "2-3 нейтральных предложения, которые можно показать обеим сторонам",
  "convergence_signal": число от -2 до 2
}

Правила:
- не говори кто прав
- отметь, где стороны сблизились или продолжают расходиться
- текст должен быть пригоден для публичного показа обеим сторонам`;
}

async function orchestratePublicSummary(params: {
  dispute: DisputeContext;
  currentRound: number;
  allArgs: ArgumentRow[];
  profiles: Profile[];
  plane: string;
  toneLevel: number;
  heatLevel: number;
  coreTension: string;
}): Promise<PublicSummaryResult | null> {
  const roundArgs = params.allArgs.filter((argument) => argument.round === params.currentRound);
  const hasEvidence = roundArgs.some((argument) => Boolean(argument.evidence?.trim()));
  const agentKeys = selectAgentKeys({
    stage: "round_public",
    plane: params.plane,
    heatLevel: params.heatLevel,
    hasEvidence,
  });

  const lensOutputs = await runAgentSet(agentKeys, () => buildPublicSummaryAgentPrompt(params), 260);
  if (Object.keys(lensOutputs).length === 0) return null;

  const aggregated = await runJsonPrompt(
    [
      {
        role: "system",
        content:
          "You are the orchestration aggregator for a public round summary. Merge lens outputs into one neutral observation for both participants. Respond in Russian and strictly as JSON.",
      },
      {
        role: "user",
        content: `Собери единое публичное наблюдение по раунду.

Выходы линз:
${JSON.stringify(lensOutputs, null, 2)}

Верни JSON:
{
  "content": "2-3 нейтральных предложения для обеих сторон",
  "convergence": число от -2 до 2
}

Правила:
- не объявлять победителя
- не давать приватных советов
- показывать динамику обмена и точки соприкосновения, если они есть`,
      },
    ],
    320
  );

  const content = String(aggregated.content ?? "").trim();
  if (!content) return null;

  return {
    content,
    convergence: Math.min(2, Math.max(-2, Math.round(Number(aggregated.convergence) || 0))),
  };
}

function buildFinalMediationAgentPrompt(params: {
  dispute: DisputeContext;
  allArgs: ArgumentRow[];
  profiles: Profile[];
  plane: string;
  toneLevel: number;
  heatLevel: number;
  coreTension: string;
}) {
  const creatorName = getProfileName(params.profiles, params.dispute.creator_id);
  const opponentName = getProfileName(params.profiles, params.dispute.opponent_id);
  const roundsText = buildRoundsText(params.dispute, params.profiles, params.allArgs);

  return `Ты работаешь как одна из аналитических линз финальной медиации. Отвечай строго JSON на русском.

Плоскость: ${params.plane}
Тон: ${params.toneLevel}/5
Температура к финалу: ${params.heatLevel}/5
Core tension: "${params.coreTension}"

Спор: "${params.dispute.title}"${params.dispute.description ? `\nОписание: "${params.dispute.description}"` : ""}

Полная история раундов:
${roundsText}

Верни JSON:
{
  "summary_a": "краткое резюме позиции ${creatorName}",
  "summary_b": "краткое резюме позиции ${opponentName}",
  "common_ground": "что реально объединяет стороны или где есть пересечение",
  "solutions": ["решение 1", "решение 2", "решение 3"],
  "recommendation": "мягкая рекомендация медиатора"
}

Правила:
- не объявлять победителя
- не писать юридически категоричных выводов
- решения должны быть практичными и применимыми
- если общего мало, честно покажи минимальную точку соприкосновения`;
}

async function orchestrateFinalMediation(params: {
  dispute: DisputeContext;
  allArgs: ArgumentRow[];
  profiles: Profile[];
  plane: string;
  toneLevel: number;
  heatLevel: number;
  coreTension: string;
}): Promise<FinalMediationResult | null> {
  const hasEvidence = params.allArgs.some((argument) => Boolean(argument.evidence?.trim()));
  const agentKeys = selectAgentKeys({
    stage: "final_mediation",
    plane: params.plane,
    heatLevel: params.heatLevel,
    hasEvidence,
  });

  const lensOutputs = await runAgentSet(agentKeys, () => buildFinalMediationAgentPrompt(params), 500);
  if (Object.keys(lensOutputs).length === 0) return null;

  const creatorName = getProfileName(params.profiles, params.dispute.creator_id);
  const opponentName = getProfileName(params.profiles, params.dispute.opponent_id);
  const aggregated = await runJsonPrompt(
    [
      {
        role: "system",
        content:
          "You are the orchestration aggregator for final mediation. Merge lens outputs into one coherent mediation result. Never declare a winner. Respond in Russian and strictly as JSON.",
      },
      {
        role: "user",
        content: `Собери финальную медиацию по спору.

Выходы линз:
${JSON.stringify(lensOutputs, null, 2)}

Верни JSON:
{
  "summary_a": "краткое резюме позиции ${creatorName}",
  "summary_b": "краткое резюме позиции ${opponentName}",
  "common_ground": "что объединяет стороны",
  "solutions": ["решение 1", "решение 2", "решение 3"],
  "recommendation": "рекомендация медиатора"
}

Правила:
- решения должны быть реалистичными
- recommendation не должна звучать как приговор
- можно признать, что конфликт остаётся сложным, но всё равно предложить путь вперёд`,
      },
    ],
    700
  );

  const solutions = Array.isArray(aggregated.solutions)
    ? aggregated.solutions.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!String(aggregated.summary_a ?? "").trim() && !String(aggregated.summary_b ?? "").trim() && solutions.length === 0) {
    return null;
  }

  return {
    analysis: {
      summary_a: String(aggregated.summary_a ?? "").trim(),
      summary_b: String(aggregated.summary_b ?? "").trim(),
      common_ground: String(aggregated.common_ground ?? "").trim(),
      recommendation: String(aggregated.recommendation ?? "").trim(),
    },
    solutions,
  };
}

function buildLegacyWaitingPrompt(params: {
  dispute: DisputeContext;
  submitterId: string;
  submitterArg: ArgumentRow;
  currentRound: number;
  previousArgs: ArgumentRow[];
  profiles: Profile[];
}) {
  const submitterName = getProfileName(params.profiles, params.submitterId);
  const opponentId = params.submitterId === params.dispute.creator_id ? params.dispute.opponent_id : params.dispute.creator_id;
  const opponentName = getProfileName(params.profiles, opponentId);
  const previousRounds = params.previousArgs.length > 0
    ? "Previous rounds:\n" + Array.from(new Set(params.previousArgs.map((argument) => argument.round))).sort().map((round) => {
        const creatorArg = params.previousArgs.find((argument) => argument.round === round && argument.author_id === params.dispute.creator_id);
        const opponentArg = params.previousArgs.find((argument) => argument.round === round && argument.author_id === params.dispute.opponent_id);
        return `Round ${round}: ${getProfileName(params.profiles, params.dispute.creator_id)}: "${creatorArg?.position ?? "—"}" | ${getProfileName(params.profiles, params.dispute.opponent_id)}: "${opponentArg?.position ?? "—"}"`;
      }).join("\n") + "\n"
    : "";

  return `You are an AI mediator giving private coaching. Respond in Russian. Return JSON only.

Dispute: "${params.dispute.title}"${params.dispute.description ? `\nDescription: "${params.dispute.description}"` : ""}

${previousRounds}${submitterName} just submitted Round ${params.currentRound}:
Position: "${params.submitterArg.position}"
Reasoning: "${params.submitterArg.reasoning}"

${submitterName} is now waiting for ${opponentName} to respond. Give ${submitterName} a brief private coaching hint:
- Explain why ${opponentName} likely holds their position (based on the dispute context and prior arguments)
- Help ${submitterName} understand ${opponentName}'s perspective
- Make it feel strategically useful for ${submitterName}, not like a judge's verdict
- Be empathetic and diplomatic — never say who is right
- Use exactly this structure in Russian:
  Что он, вероятно, защищает: ...
  Почему он может так ответить: ...
  Вектор следующего хода: ...
- each line 1 sentence max
- the third line must suggest the direction of the next response, not a canned phrase and not a literal script
- This is private — only ${submitterName} will see this

Return JSON:
{
  "insight": "coaching message in Russian for ${submitterName} in the exact 3-line structure"
}`;
}

function buildLegacyPublicSummaryPrompt(params: {
  dispute: DisputeContext;
  currentRound: number;
  allArgs: ArgumentRow[];
  profiles: Profile[];
}) {
  const creatorName = getProfileName(params.profiles, params.dispute.creator_id);
  const opponentName = getProfileName(params.profiles, params.dispute.opponent_id);
  const roundArgs = params.allArgs.filter((argument) => argument.round === params.currentRound);
  const creatorArg = roundArgs.find((argument) => argument.author_id === params.dispute.creator_id);
  const opponentArg = roundArgs.find((argument) => argument.author_id === params.dispute.opponent_id);
  const previousRounds = buildPreviousRoundsText(params.dispute, params.profiles, params.allArgs, params.currentRound - 1);

  return `Ты — нейтральный ИИ-наблюдатель спора. Отвечай на русском. Верни только JSON.

Спор: "${params.dispute.title}"${params.dispute.description ? `\nОписание: "${params.dispute.description}"` : ""}

${previousRounds ? `Предыдущие раунды:\n${previousRounds}\n\n` : ""}Раунд ${params.currentRound}:
${creatorName}: позиция — "${creatorArg?.position ?? "—"}". Аргумент: "${creatorArg?.reasoning ?? ""}"
${opponentName}: позиция — "${opponentArg?.position ?? "—"}". Аргумент: "${opponentArg?.reasoning ?? ""}"

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
}

function buildLegacyFinalMediationPrompt(params: {
  dispute: DisputeContext;
  allArgs: ArgumentRow[];
  profiles: Profile[];
}) {
  return `Ты ИИ-медиатор. Проанализируй спор и предложи решения. Отвечай строго в JSON.

Спор: ${params.dispute.title}
Описание: ${params.dispute.description}

Аргументы сторон:
${buildRoundsText(params.dispute, params.profiles, params.allArgs)}

Верни JSON:
{
  "summary_a": "краткое резюме позиции ${getProfileName(params.profiles, params.dispute.creator_id)}",
  "summary_b": "краткое резюме позиции ${getProfileName(params.profiles, params.dispute.opponent_id)}",
  "common_ground": "что объединяет стороны",
  "solutions": ["решение 1", "решение 2", "решение 3"],
  "recommendation": "рекомендация медиатора"
}`;
}

export async function generateRoundInsights(
  dispute: DisputeContext,
  currentRound: number,
  allArgs: ArgumentRow[],
  profiles: Profile[]
): Promise<void> {
  const admin = createAdminClient();
  const roundArgs = allArgs.filter((a) => a.round === currentRound);
  const creatorArg = roundArgs.find((a) => a.author_id === dispute.creator_id);
  const opponentArg = roundArgs.find((a) => a.author_id === dispute.opponent_id);
  if (!creatorArg || !opponentArg) return;

  const { data: existingAnalysis } = await admin
    .from("dispute_analysis")
    .select("*")
    .eq("dispute_id", dispute.id)
    .maybeSingle<{
      plane: string;
      tone_level: number;
      heat_level: number;
      core_tension: string | null;
    }>();

  let plane = existingAnalysis?.plane ?? "general";
  let toneLevel = existingAnalysis?.tone_level ?? 3;
  let heatLevel = existingAnalysis?.heat_level ?? 3;
  let coreTension = existingAnalysis?.core_tension ?? "";

  if (!existingAnalysis) {
    const categorization = await runJsonPrompt(
      [{ role: "user", content: buildCategorizationPrompt(dispute, creatorArg, opponentArg) }],
      350
    );

    plane = String(categorization.plane ?? "general");
    toneLevel = clampInt(categorization.tone_level, 1, 5, 3);
    heatLevel = clampInt(categorization.heat_level, 1, 5, 3);
    coreTension = String(categorization.core_tension ?? "").trim();

    await admin.from("dispute_analysis").insert({
      dispute_id: dispute.id,
      plane,
      tone_level: toneLevel,
      heat_level: heatLevel,
      core_tension: coreTension,
      plane_prompt: buildPlaneSystemPrompt(plane, toneLevel),
      patterns: {},
    } as never);
  }

  const orchestrated = await orchestrateRoundPrivateInsight({
    dispute,
    currentRound,
    allArgs,
    profiles,
    plane,
    toneLevel,
    heatLevel,
    coreTension,
  });

  if (orchestrated) {
    await admin
      .from("dispute_analysis")
      .update({ heat_level: orchestrated.heatLevel } as never)
      .eq("dispute_id", dispute.id);

    await saveInsights(admin, dispute.id, currentRound, {
      [dispute.creator_id]: orchestrated.insightCreator,
      [dispute.opponent_id]: orchestrated.insightOpponent,
    });
    return;
  }

  const creatorName = getProfileName(profiles, dispute.creator_id);
  const opponentName = getProfileName(profiles, dispute.opponent_id);
  const legacy = await runJsonPrompt(
    [
      {
        role: "user",
        content: buildInsightsPrompt(
          dispute,
          currentRound,
          allArgs,
          profiles,
          plane,
          toneLevel,
          coreTension,
          creatorName,
          opponentName,
          creatorArg,
          opponentArg
        ),
      },
    ],
    600
  );

  const fallbackHeat = clampInt(legacy.heat_level, 1, 5, heatLevel);
  const insightCreator = String(legacy.insight_for_creator ?? "").trim();
  const insightOpponent = String(legacy.insight_for_opponent ?? "").trim();
  if (!insightCreator || !insightOpponent) return;

  await admin
    .from("dispute_analysis")
    .update({ heat_level: fallbackHeat } as never)
    .eq("dispute_id", dispute.id);

  await saveInsights(admin, dispute.id, currentRound, {
    [dispute.creator_id]: insightCreator,
    [dispute.opponent_id]: insightOpponent,
  });
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
  const { data: existing } = await admin
    .from("waiting_insights")
    .select("id")
    .eq("dispute_id", dispute.id)
    .eq("round", currentRound)
    .eq("recipient_id", submitterId)
    .single();
  if (existing) return;

  const { data: analysis } = await admin
    .from("dispute_analysis")
    .select("plane, tone_level, heat_level, core_tension")
    .eq("dispute_id", dispute.id)
    .maybeSingle<{
      plane: string;
      tone_level: number;
      heat_level: number;
      core_tension: string | null;
    }>();

  const orchestrated = await orchestrateWaitingInsight({
    dispute,
    submitterId,
    submitterArg,
    currentRound,
    previousArgs,
    profiles,
    plane: analysis?.plane ?? "general",
    toneLevel: analysis?.tone_level ?? 3,
    heatLevel: analysis?.heat_level ?? 3,
    coreTension: analysis?.core_tension ?? "",
  });

  let content = orchestrated?.insight?.trim() ?? "";
  if (!content) {
    const legacy = await runJsonPrompt(
      [{ role: "user", content: buildLegacyWaitingPrompt({ dispute, submitterId, submitterArg, currentRound, previousArgs, profiles }) }],
      250
    );
    content = String(legacy.insight ?? "").trim();
  }
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

  const { data: existing } = await admin
    .from("round_public_summaries")
    .select("id")
    .eq("dispute_id", dispute.id)
    .eq("round", currentRound)
    .single();
  if (existing) return;

  const roundArgs = allArgs.filter((a) => a.round === currentRound);
  const creatorArg = roundArgs.find((a) => a.author_id === dispute.creator_id);
  const opponentArg = roundArgs.find((a) => a.author_id === dispute.opponent_id);
  if (!creatorArg || !opponentArg) return;

  const { data: analysis } = await admin
    .from("dispute_analysis")
    .select("plane, tone_level, heat_level, core_tension")
    .eq("dispute_id", dispute.id)
    .maybeSingle<{
      plane: string;
      tone_level: number;
      heat_level: number;
      core_tension: string | null;
    }>();

  let content = "";
  let convergence = 0;

  const orchestrated = await orchestratePublicSummary({
    dispute,
    currentRound,
    allArgs,
    profiles,
    plane: analysis?.plane ?? "general",
    toneLevel: analysis?.tone_level ?? 3,
    heatLevel: analysis?.heat_level ?? 3,
    coreTension: analysis?.core_tension ?? "",
  });

  if (orchestrated) {
    content = orchestrated.content;
    convergence = orchestrated.convergence;
  } else {
    const legacy = await runJsonPrompt(
      [{ role: "user", content: buildLegacyPublicSummaryPrompt({ dispute, currentRound, allArgs, profiles }) }],
      300
    );
    content = String(legacy.content ?? "").trim();
    convergence = Math.min(2, Math.max(-2, Math.round(Number(legacy.convergence) || 0)));
  }
  if (!content) return;

  await admin.from("round_public_summaries").upsert({
    dispute_id: dispute.id,
    round: currentRound,
    content,
    convergence,
  } as never, { onConflict: "dispute_id,round" });
}

export async function generateFinalMediation(
  dispute: DisputeContext,
  allArgs: ArgumentRow[],
  profiles: Profile[]
): Promise<FinalMediationResult> {
  const admin = createAdminClient();
  const { data: analysis } = await admin
    .from("dispute_analysis")
    .select("plane, tone_level, heat_level, core_tension")
    .eq("dispute_id", dispute.id)
    .maybeSingle<{
      plane: string;
      tone_level: number;
      heat_level: number;
      core_tension: string | null;
    }>();

  try {
    const orchestrated = await orchestrateFinalMediation({
      dispute,
      allArgs,
      profiles,
      plane: analysis?.plane ?? "general",
      toneLevel: analysis?.tone_level ?? 3,
      heatLevel: analysis?.heat_level ?? 3,
      coreTension: analysis?.core_tension ?? "",
    });

    if (orchestrated) return orchestrated;
  } catch {
    // fall through to legacy prompt
  }

  try {
    const legacy = await runJsonPrompt(
      [{ role: "user", content: buildLegacyFinalMediationPrompt({ dispute, allArgs, profiles }) }],
      1500
    );
    const solutions = Array.isArray(legacy.solutions)
      ? legacy.solutions.map((item) => String(item).trim()).filter(Boolean)
      : [];

    return {
      analysis: {
        summary_a: String(legacy.summary_a ?? "").trim(),
        summary_b: String(legacy.summary_b ?? "").trim(),
        common_ground: String(legacy.common_ground ?? "").trim(),
        recommendation: String(legacy.recommendation ?? "").trim(),
      },
      solutions,
    };
  } catch {
    return {
      analysis: {
        raw: "ИИ-медиатор временно недоступен. Все аргументы сохранены — попробуйте запустить медиацию позже.",
        summary_a: "",
        summary_b: "",
        common_ground: "",
        recommendation: "",
      },
      solutions: [],
    };
  }
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

export async function moderateChallengeOpinion(content: string): Promise<{
  approved: boolean;
  reason: string;
}> {
  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 120,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Ты модерируешь короткое мнение наблюдателя в дискуссии. Отвечай строго JSON.

Проверь текст на:
- прямые оскорбления
- токсичное подстрекательство
- спам или бессмысленный шум
- попытку командовать участниками в грубой форме

Если мнение можно использовать как часть общего наблюдения, одобри его.

Текст:
"${content}"

Верни JSON:
{
  "approved": true или false,
  "reason": "коротко на русском, почему одобрено или отклонено"
}`,
      }],
    });

    const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return {
      approved: Boolean(result.approved),
      reason: (result.reason as string) ?? "",
    };
  } catch {
    return {
      approved: true,
      reason: "Мнение принято без ИИ-модерации",
    };
  }
}

export async function generateChallengeObserverHint(
  topic: string,
  round: number,
  messages: { author: string; content: string }[],
  opinions: { content: string }[]
): Promise<string> {
  if (opinions.length === 0) return "";

  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const dialogue = messages.map((m) => `${m.author}: "${m.content}"`).join("\n");
    const crowd = opinions.map((op, index) => `${index + 1}. ${op.content}`).join("\n");

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 220,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Ты ИИ-медиатор. На основе коротких мнений наблюдателей сформируй мягкий приватный hint для участников. Отвечай строго JSON на русском.

Тема: "${topic}"
Раунд: ${round}

Диалог:
${dialogue}

Одобренные мнения наблюдателей:
${crowd}

Правила:
- не перечисляй мнения по одному
- не говори "зрители считают"
- не давай сырые цитаты
- сделай 2-3 предложения
- тон: нейтральный, мягкий, полезный, без ощущения давления толпы
- hint должен звучать как дополнительный угол взгляда, который может помочь участникам лучше понять друг друга

Верни JSON:
{
  "hint": "краткий aggregated hint на русском"
}`,
      }],
    });

    const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return (result.hint as string) ?? "";
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
  creatorArg: ArgumentRow,
  opponentArg: ArgumentRow
): string {
  return `You are an AI mediator analyzing a dispute. Respond in Russian. Return JSON only.

Dispute: "${dispute.title}"
Description: "${dispute.description}"

Round 1:
Участник A: "${creatorArg.position}. ${creatorArg.reasoning}"
Участник B: "${opponentArg.position}. ${opponentArg.reasoning}"

Determine:
1. The plane of this dispute
2. The tone level appropriate for it
3. The heat level (emotional intensity)
4. The core tension (why they can't hear each other)

${TONE_GUIDE}

heat_level guide (1-5): 1 = very calm, 2 = mild, 3 = moderate tension, 4 = heated, 5 = very intense

Planes: ${Object.entries(PLANE_DESCRIPTIONS).map(([k, v]) => `${k} = ${v}`).join("; ")}

Return JSON:
{
  "plane": "one of: casual|legal|family|scientific|religious|business|political|general",
  "tone_level": 1-5,
  "heat_level": 1-5,
  "core_tension": "one sentence: what makes them incompatible"
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
- The third line must give a subtle tactical direction for the next round without scripting the exact words
${PERSONAL_INSIGHT_FORMAT}

heat_level guide (1-5): 1 = very calm, 2 = mild, 3 = moderate tension, 4 = heated, 5 = very intense

Return JSON:
{
  "heat_level": 1-5,
  "insight_for_creator": "Direct private message to ${creatorName} using the exact 3-part structure. Explain WHY ${opponentName} answered this way in round ${currentRound}, what may be informing that response, and what strategic direction ${creatorName} may take before replying. The third line must be a tactical direction, not a ready-made phrase. Make it feel strategically helpful for ${creatorName}. Diplomatic, tone_level ${toneLevel}.",
  "insight_for_opponent": "Direct private message to ${opponentName} using the exact 3-part structure. Explain WHY ${creatorName} answered this way in round ${currentRound}, what may be informing that response, and what strategic direction ${opponentName} may take before replying. The third line must be a tactical direction, not a ready-made phrase. Make it feel strategically helpful for ${opponentName}. Diplomatic, tone_level ${toneLevel}."
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
