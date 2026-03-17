import type { SupabaseClient } from "@supabase/supabase-js";

export type RPGStats = {
  argumentation: number; // 0–100
  diplomacy: number;
  activity: number;
  persistence: number;
  characterClass: string;
  characterTitle: string;
  xp: number;
};

type CoreStats = Omit<RPGStats, "characterClass" | "characterTitle" | "xp">;

export function computeCharacterClass(stats: CoreStats & { xp: number }): { class: string; title: string } {
  const { xp, argumentation, diplomacy, activity } = stats;

  if (xp < 15) return { class: "Начальный профиль 🌱", title: "Первые сигналы стиля только начинают собираться" };
  if (diplomacy >= 75) return { class: "Дипломатичный профиль 🕊️", title: "Чаще других удерживает путь к договорённости" };
  if (argumentation >= 75) return { class: "Структурный профиль 📐", title: "Опирается на ясные формулировки и сильную аргументацию" };
  if (activity >= 80) return { class: "Устойчивый профиль 🛡️", title: "Редко выпадает из разговора и держит темп обсуждения" };
  if (argumentation >= 65 && diplomacy >= 65 && activity >= 65 && stats.persistence >= 65) {
    return { class: "Сбалансированный профиль 👑", title: "Ровно сочетает аргументацию, выдержку и движение к согласию" };
  }
  return { class: "Рабочий профиль 🤝", title: "Движется к более устойчивому стилю диалога" };
}

export async function fetchRPGStats(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<RPGStats> {
  const [argsRes, disputesRes, resolvedRes] = await Promise.all([
    supabase
      .from("arguments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
    supabase
      .from("disputes")
      .select("id, status, max_rounds", { count: "exact" })
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`),
    supabase
      .from("resolutions")
      .select("dispute_id")
      .contains("accepted_by", [userId]),
  ]);

  const argumentsCount = argsRes.count ?? 0;
  const allDisputes = disputesRes.data ?? [];
  const totalDisputes = disputesRes.count ?? allDisputes.length;
  const resolvedCount = resolvedRes.data?.length ?? 0;

  // Max rounds completed in one dispute (from max_rounds on resolved disputes)
  const maxRoundsCompleted = allDisputes.reduce((max, d) => {
    if (d.status === "resolved" || d.status === "closed") {
      return Math.max(max, d.max_rounds ?? 0);
    }
    return max;
  }, 0);

  const argumentation = Math.min(100, argumentsCount * 5);
  const diplomacy = totalDisputes > 0 ? Math.round((resolvedCount / totalDisputes) * 100) : 0;
  const activity = Math.min(100, totalDisputes * 8);
  const persistence = Math.min(100, maxRoundsCompleted * 10);

  const xp = Math.round((argumentation + diplomacy + activity + persistence) / 4);

  const { class: characterClass, title: characterTitle } = computeCharacterClass({
    argumentation,
    diplomacy,
    activity,
    persistence,
    xp,
  });

  return { argumentation, diplomacy, activity, persistence, characterClass, characterTitle, xp };
}
