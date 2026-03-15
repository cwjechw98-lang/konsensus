import { createClient } from "@/lib/supabase/server";
import { fetchRPGStats } from "@/lib/rpg";
import ChallengeBoard from "@/components/ChallengeBoard";

export const revalidate = 0;

export default async function ArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load open challenges with author profiles
  const { data: challenges } = await supabase
    .from("challenges")
    .select(`
      id, topic, position_hint, status, category, max_rounds, created_at,
      profiles!challenges_author_id_fkey(id, display_name, bio)
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<{
      id: string;
      topic: string;
      position_hint: string;
      status: string;
      category: string | null;
      max_rounds: number;
      created_at: string;
      profiles: { id: string; display_name: string | null; bio: string | null } | null;
    }[]>();

  // Fetch RPG stats for each unique author
  const authorIds = [...new Set((challenges ?? []).map((c) => c.profiles?.id).filter(Boolean) as string[])];
  const statsMap: Record<string, Awaited<ReturnType<typeof fetchRPGStats>>> = {};

  await Promise.all(
    authorIds.map(async (id) => {
      statsMap[id] = await fetchRPGStats(id, supabase);
    })
  );

  const challengesWithStats = (challenges ?? []).map((c) => ({
    id: c.id,
    topic: c.topic,
    position_hint: c.position_hint,
    status: c.status,
    category: c.category ?? "other",
    max_rounds: c.max_rounds,
    created_at: c.created_at,
    author: {
      id: c.profiles?.id ?? "",
      display_name: c.profiles?.display_name ?? null,
      bio: c.profiles?.bio ?? null,
    },
    rpgStats: statsMap[c.profiles?.id ?? ""] ?? {
      argumentation: 0, diplomacy: 0, activity: 0, persistence: 0,
      characterClass: "Новобранец 🌱", characterTitle: "Первые шаги в мире дискуссий", xp: 0,
    },
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Арена вызовов ⚔️</h1>
        <p className="text-sm text-gray-400">
          Брось вызов — найди оппонента, обменяйтесь аргументами, получи медиацию ИИ
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
          {error === "challenge_unavailable" ? "Вызов недоступен или уже принят" : error}
        </div>
      )}

      <ChallengeBoard challenges={challengesWithStats} currentUserId={user?.id ?? null} />
    </div>
  );
}
