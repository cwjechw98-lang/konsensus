"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * After a dispute is resolved, ask AI to generate a unique achievement
 * based on the user's behavior in this specific dispute.
 * Returns null if AI is unavailable or no notable pattern found.
 */
export async function generateUniqueAchievement(
  _userId: string,
  disputeData: {
    title: string;
    plane?: string;
    userArgCount: number;
    hadEvidence: boolean;
    reachedConsensus: boolean;
    roundCount: number;
    toneLevel?: number;
  }
): Promise<{ title: string; desc: string; icon: string } | null> {
  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Ты — система достижений платформы для споров. Придумай УНИКАЛЬНОЕ достижение для пользователя.

Контекст спора:
- Тема: "${disputeData.title}"
- Плоскость: ${disputeData.plane ?? "общая"}
- Аргументов подано: ${disputeData.userArgCount}
- Были доказательства: ${disputeData.hadEvidence ? "да" : "нет"}
- Консенсус достигнут: ${disputeData.reachedConsensus ? "да" : "нет"}
- Раундов: ${disputeData.roundCount}
- Уровень тона: ${disputeData.toneLevel ?? 3}/5

Правила:
- Тон: добрый, с юмором, мотивирующий
- НИКАКИХ негативных/унизительных формулировок
- Название: 2-4 слова
- Описание: 1 предложение, до 60 символов
- Иконка: один emoji
- Должно быть уникальным и связанным с конкретным спором

Если поведение ничем не примечательно — верни {"skip": true}

Верни JSON: {"title": "...", "desc": "...", "icon": "...", "skip": false}`,
      }],
    });

    const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    if (result.skip) return null;
    if (!result.title || !result.desc || !result.icon) return null;

    return {
      title: String(result.title).slice(0, 50),
      desc: String(result.desc).slice(0, 100),
      icon: String(result.icon).slice(0, 4),
    };
  } catch {
    return null;
  }
}

/**
 * Save a unique (AI-generated) achievement to the database.
 */
export async function saveUniqueAchievement(
  userId: string,
  achievement: { title: string; desc: string; icon: string },
  disputeId?: string,
  points: number = 20
): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("user_unique_achievements")
    .insert({
      user_id: userId,
      dispute_id: disputeId ?? null,
      title: achievement.title,
      description: achievement.desc,
      icon: achievement.icon,
      points,
    } as never);

  if (error) return false;

  // Add points
  const { data: existing } = await admin
    .from("user_points")
    .select("total")
    .eq("user_id", userId)
    .single<{ total: number }>();

  await admin
    .from("user_points")
    .upsert({
      user_id: userId,
      total: (existing?.total ?? 0) + points,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "user_id" });

  return true;
}
