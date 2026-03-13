import type { SupabaseClient } from "@supabase/supabase-js";

export const ACHIEVEMENTS = {
  first_argument:    { title: "Первый шаг",        desc: "Подайте свой первый аргумент",             points: 10,  icon: "✍️" },
  first_dispute:     { title: "Инициатор",          desc: "Создайте первый спор",                      points: 15,  icon: "⚖️" },
  attached_evidence: { title: "Доказательная база", desc: "Прикрепите доказательство к аргументу",    points: 10,  icon: "📎" },
  accepted_invite:   { title: "Оппонент",           desc: "Примите участие в споре по приглашению",    points: 15,  icon: "🤝" },
  three_rounds:      { title: "Марафонец",          desc: "Завершите спор с тремя и более раундами",   points: 20,  icon: "🔥" },
  reached_mediation: { title: "До финала",          desc: "Дойдите до стадии ИИ-медиации",             points: 25,  icon: "🤖" },
  three_disputes:    { title: "Практик",            desc: "Участвуйте в трёх спорах",                 points: 30,  icon: "📊" },
  five_disputes:     { title: "Опытный",            desc: "Участвуйте в пяти спорах",                 points: 50,  icon: "🏆" },
  ten_disputes:      { title: "Мастер",             desc: "Участвуйте в десяти спорах",               points: 100, icon: "👑" },
  resolution:        { title: "Консенсус",          desc: "Достигните решения в споре",                points: 30,  icon: "✅" },
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;

/**
 * Awards an achievement and adds points.
 * Returns true if newly awarded, false if already earned.
 * Silently ignores errors — achievements are non-critical.
 */
export async function awardAchievement(
  userId: string,
  achievementId: AchievementId,
  adminClient: SupabaseClient
): Promise<boolean> {
  const achievement = ACHIEVEMENTS[achievementId];
  if (!achievement) return false;

  // UNIQUE (user_id, achievement_id) prevents duplicates
  const { error } = await adminClient
    .from("user_achievements")
    .insert({ user_id: userId, achievement_id: achievementId } as never);

  if (error) return false; // Already earned or table missing

  const { data: existing } = await adminClient
    .from("user_points")
    .select("total")
    .eq("user_id", userId)
    .single<{ total: number }>();

  await adminClient
    .from("user_points")
    .upsert(
      {
        user_id: userId,
        total: (existing?.total ?? 0) + achievement.points,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" }
    );

  return true;
}
