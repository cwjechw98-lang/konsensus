import type { SupabaseClient } from "@supabase/supabase-js";

export const ACHIEVEMENTS = {
  // ── Первые шаги ──
  first_argument:    { title: "Первый шаг",        desc: "Подайте свой первый аргумент",              points: 10,  icon: "✍️",  category: "basics" },
  first_dispute:     { title: "Инициатор",          desc: "Создайте первый спор",                      points: 15,  icon: "⚖️",  category: "basics" },
  accepted_invite:   { title: "Оппонент",           desc: "Примите участие в споре по приглашению",     points: 15,  icon: "🤝",  category: "basics" },
  attached_evidence: { title: "Доказательная база", desc: "Прикрепите доказательство к аргументу",     points: 10,  icon: "📎",  category: "basics" },

  // ── Прогресс ──
  three_rounds:      { title: "Удержал ход",        desc: "Доведите спор до трёх и более раундов",      points: 20,  icon: "🔥",  category: "progress" },
  reached_mediation: { title: "До финала",          desc: "Дойдите до стадии ИИ-медиации",              points: 25,  icon: "🤖",  category: "progress" },
  three_disputes:    { title: "Практик",            desc: "Участвуйте в трёх спорах",                  points: 30,  icon: "📊",  category: "progress" },
  five_disputes:     { title: "Опытный участник",   desc: "Участвуйте в пяти спорах",                  points: 50,  icon: "🏆",  category: "progress" },
  ten_disputes:      { title: "Сильная практика",   desc: "Участвуйте в десяти спорах",                points: 100, icon: "👑",  category: "progress" },
  twenty_disputes:   { title: "Устойчивый участник",desc: "Участвуйте в двадцати спорах",              points: 200, icon: "⭐",  category: "progress" },

  // ── Консенсус и дипломатия ──
  resolution:        { title: "Консенсус",          desc: "Достигните решения в споре",                 points: 30,  icon: "✅",  category: "diplomacy" },
  three_consensus:   { title: "Миротворец",         desc: "Достигните консенсуса в 3 спорах",           points: 60,  icon: "🕊️",  category: "diplomacy" },
  five_consensus:    { title: "Дипломат",           desc: "Достигните консенсуса в 5 спорах",           points: 100, icon: "🎖️",  category: "diplomacy" },
  perfect_consensus: { title: "100% консенсус",     desc: "Все ваши споры завершились консенсусом (мин. 3)", points: 150, icon: "💎", category: "diplomacy" },

  // ── Стиль диалога (бейджи) ──
  calm_debater:      { title: "Спокойный ум",       desc: "ИИ оценил ваш тон как спокойный в 3+ спорах", points: 40,  icon: "🧘",  category: "style" },
  evidence_master:   { title: "Учёный",             desc: "Прикрепите доказательства в 5 аргументах",    points: 50,  icon: "🔬",  category: "style" },
  quick_thinker:     { title: "Быстрый ум",         desc: "Ответьте менее чем за 2 минуты",             points: 15,  icon: "⚡",  category: "style" },
  thoughtful:        { title: "Обдуманный",         desc: "Потратьте >10 минут на аргумент",            points: 20,  icon: "🤔",  category: "style" },
  long_argument:     { title: "Писатель",           desc: "Напишите аргумент длиннее 1000 символов",    points: 15,  icon: "📝",  category: "style" },

  // ── Арена ──
  first_challenge:   { title: "Открытая тема",      desc: "Создайте первую открытую тему",              points: 20,  icon: "⚖️",  category: "arena" },
  challenge_accepted:{ title: "Открытый отклик",    desc: "Подключитесь к открытой теме",               points: 20,  icon: "🤝",  category: "arena" },
  arena_veteran:     { title: "Открытый формат",    desc: "Участвуйте в пяти открытых темах",           points: 60,  icon: "🏟️",  category: "arena" },

  // ── ИИ взаимодействие ──
  listened_to_ai:    { title: "Слышащий",           desc: "Измените тон после подсказки ИИ",            points: 25,  icon: "👂",  category: "ai" },
  ai_friend:         { title: "Друг ИИ",            desc: "Следуйте подсказкам ИИ в 5 спорах",         points: 50,  icon: "🤗",  category: "ai" },
  strong_argument:   { title: "Железный аргумент",  desc: "Получите оценку 5/5 за силу аргумента",      points: 30,  icon: "💪",  category: "ai" },

  // ── Социальные ──
  public_debater:    { title: "Публичный оратор",   desc: "Создайте публичный спор",                    points: 15,  icon: "📢",  category: "social" },
  got_reactions:     { title: "Отклик аудитории",   desc: "Получите 10 реакций на ваш спор",            points: 25,  icon: "❤️",  category: "social" },
  telegram_linked:   { title: "На связи",           desc: "Привяжите Telegram к аккаунту",              points: 10,  icon: "📱",  category: "social" },

  // ── Специальные ──
  night_owl:         { title: "Ночная сова",        desc: "Подайте аргумент между 2:00 и 5:00",         points: 15,  icon: "🦉",  category: "special" },
  weekend_warrior:   { title: "Выходной фокус",     desc: "Создайте спор в субботу или воскресенье",     points: 10,  icon: "🗓️",  category: "special" },
  comeback_king:     { title: "Возвращение",        desc: "Вернитесь к спору через 24+ часа",           points: 20,  icon: "🔄",  category: "special" },
  multi_topic:       { title: "Эрудит",             desc: "Участвуйте в спорах 5 разных категорий",     points: 40,  icon: "🎓",  category: "special" },
  speed_resolution:  { title: "Быстрое согласие",   desc: "Завершите спор менее чем за 1 час",           points: 30,  icon: "⏱️",  category: "special" },
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;
export type AchievementCategory = "basics" | "progress" | "diplomacy" | "style" | "arena" | "ai" | "social" | "special";

export const CATEGORY_LABELS: Record<AchievementCategory, { label: string; icon: string }> = {
  basics:    { label: "Первые шаги",     icon: "🌱" },
  progress:  { label: "Прогресс",        icon: "📈" },
  diplomacy: { label: "Дипломатия",      icon: "🕊️" },
  style:     { label: "Стиль диалога",   icon: "🎨" },
  arena:     { label: "Открытые темы",   icon: "⚖️" },
  ai:        { label: "ИИ-взаимодействие", icon: "🤖" },
  social:    { label: "Публичный слой",  icon: "👥" },
  special:   { label: "Дополнительные сигналы", icon: "✨" },
};

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

/**
 * Check milestone achievements for dispute count.
 */
export async function checkDisputeMilestones(
  userId: string,
  adminClient: SupabaseClient
): Promise<void> {
  const { count } = await adminClient
    .from("disputes")
    .select("*", { count: "exact", head: true })
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`);

  const n = count ?? 0;
  if (n >= 3) await awardAchievement(userId, "three_disputes", adminClient);
  if (n >= 5) await awardAchievement(userId, "five_disputes", adminClient);
  if (n >= 10) await awardAchievement(userId, "ten_disputes", adminClient);
  if (n >= 20) await awardAchievement(userId, "twenty_disputes", adminClient);
}
