import { createClient } from "@/lib/supabase/server";
import { fetchPublicReputationBadges } from "@/lib/reputation";
import { fetchTrustTierState, hasMinimumTrustTier } from "@/lib/trust-tier";
import ChallengeBoard from "@/components/ChallengeBoard";
import ArenaLiveBoard from "@/components/ArenaLiveBoard";
import { OnboardingTour } from "@/components/OnboardingTour";
import PageContextCard from "@/components/PageContextCard";

export const revalidate = 0;

export default async function ArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentTrustState = user ? await fetchTrustTierState(user.id).catch(() => null) : null;

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

  const authorIds = [...new Set((challenges ?? []).map((c) => c.profiles?.id).filter(Boolean) as string[])];
  const badgesMap: Record<string, Awaited<ReturnType<typeof fetchPublicReputationBadges>>> = {};

  await Promise.all(
    authorIds.map(async (id) => {
      badgesMap[id] = await fetchPublicReputationBadges(id);
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
    reputationBadges: badgesMap[c.profiles?.id ?? ""] ?? [],
  }));

  const { data: activeChallenges } = await supabase
    .from("challenges")
    .select(`
      id, topic, status, max_rounds, author_id, accepted_by,
      author_profile:profiles!challenges_author_id_fkey(display_name),
      accepted_profile:profiles!challenges_accepted_by_fkey(display_name)
    `)
    .eq("status", "active")
    .not("accepted_by", "is", null)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<{
      id: string;
      topic: string;
      status: string;
      max_rounds: number;
      author_id: string;
      accepted_by: string | null;
      author_profile: { display_name: string | null } | null;
      accepted_profile: { display_name: string | null } | null;
    }[]>();

  const activeIds = (activeChallenges ?? []).map((challenge) => challenge.id);
  const { data: activeMessages } = activeIds.length > 0
    ? await supabase
      .from("challenge_messages")
      .select("challenge_id, is_ai")
      .in("challenge_id", activeIds)
      .returns<{ challenge_id: string; is_ai: boolean }[]>()
    : { data: [] as { challenge_id: string; is_ai: boolean }[] };

  const liveChallenges = (activeChallenges ?? []).map((challenge) => ({
    id: challenge.id,
    topic: challenge.topic,
    max_rounds: challenge.max_rounds,
    message_count: (activeMessages ?? []).filter((message) => message.challenge_id === challenge.id && !message.is_ai).length,
    author_name: challenge.author_profile?.display_name ?? "Участник 1",
    opponent_name: challenge.accepted_profile?.display_name ?? "Участник 2",
    status: challenge.status,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <PageContextCard
          dataTour="arena-intro"
          eyebrow="Открытые диспуты"
          title="Публичный слой без лишнего шума"
          description="Здесь можно открыть тему, подключиться к обсуждению или просто наблюдать за ходом открытого диспута."
          bullets={["Активные диспуты", "Темы в ожидании", "Наблюдение за ходом обсуждения"]}
          tone="amber"
          compact
          actions={
            <OnboardingTour
              page="arena"
              showReplayButton
              buttonLabel="Как устроен открытый слой"
            />
          }
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
          {error === "challenge_unavailable"
            ? "Тема недоступна или к ней уже подключился второй участник"
            : error === "trust_tier_trusted_required"
              ? "Для открытия публичной темы нужен уровень Trusted."
              : error === "trust_tier_linked_required"
                ? "Для участия в открытых диспутах нужен уровень Linked."
                : error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        <div data-tour="arena-live">
          <ArenaLiveBoard challenges={liveChallenges} />
        </div>
        <div data-tour="arena-open-list">
          <ChallengeBoard
            challenges={challengesWithStats}
            currentUserId={user?.id ?? null}
            canCreatePublicChallenge={currentTrustState ? hasMinimumTrustTier(currentTrustState.tier, "trusted") : false}
            canJoinPublicChallenge={currentTrustState ? hasMinimumTrustTier(currentTrustState.tier, "linked") : false}
          />
        </div>
      </div>
    </div>
  );
}
