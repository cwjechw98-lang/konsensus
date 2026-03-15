import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ChallengeChat from "@/components/ChallengeChat";

export const revalidate = 0;

export default async function ChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mediated?: string; error?: string }>;
}) {
  const { id } = await params;
  const { mediated, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load challenge
  const { data: challenge } = await supabase
    .from("challenges")
    .select(`
      id, topic, position_hint, status, category, max_rounds,
      author_id, accepted_by,
      author_profile:profiles!challenges_author_id_fkey(id, display_name),
      accepted_profile:profiles!challenges_accepted_by_fkey(id, display_name)
    `)
    .eq("id", id)
    .single<{
      id: string;
      topic: string;
      position_hint: string;
      status: string;
      category: string | null;
      max_rounds: number;
      author_id: string;
      accepted_by: string | null;
      author_profile: { id: string; display_name: string | null } | null;
      accepted_profile: { id: string; display_name: string | null } | null;
    }>();

  if (!challenge) redirect("/arena");

  const isParticipant = !!user && (user.id === challenge.author_id || user.id === challenge.accepted_by);
  const isSpectatorView = challenge.status === "active" || challenge.status === "closed";

  if (challenge.status === "open" && !isParticipant) {
    redirect("/arena");
  }
  if (!isParticipant && !isSpectatorView) {
    redirect("/arena");
  }

  // Load messages
  const { data: messages } = await supabase
    .from("challenge_messages")
    .select("id, content, author_id, is_ai, created_at, profiles(display_name)")
    .eq("challenge_id", id)
    .order("created_at", { ascending: true })
    .returns<{
      id: string;
      content: string;
      author_id: string | null;
      is_ai: boolean;
      created_at: string;
      profiles: { display_name: string | null } | null;
    }[]>();

  const { data: comments } = await supabase
    .from("challenge_comments")
    .select("id, content, author_name, created_at")
    .eq("challenge_id", id)
    .order("created_at", { ascending: true })
    .limit(80)
    .returns<{
      id: string;
      content: string;
      author_name: string;
      created_at: string;
    }[]>();

  const { data: observerHints } = isParticipant
    ? await supabase
      .from("challenge_observer_hints")
      .select("round, content, created_at")
      .eq("challenge_id", id)
      .order("round", { ascending: true })
      .returns<{
        round: number;
        content: string;
        created_at: string;
      }[]>()
    : { data: [] as {
        round: number;
        content: string;
        created_at: string;
      }[] };

  const { count: opinionCount } = user
    ? await supabase
      .from("challenge_opinions")
      .select("id", { count: "exact", head: true })
      .eq("challenge_id", id)
      .eq("user_id", user.id)
    : { count: 0 };

  const { data: watch } = user
    ? await supabase
      .from("challenge_watchers")
      .select("id")
      .eq("challenge_id", id)
      .eq("user_id", user.id)
      .single<{ id: string }>()
    : { data: null };

  const { data: currentProfile } = user
    ? await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", user.id)
      .single<{ telegram_chat_id: number | null }>()
    : { data: null };

  const authorName = challenge.author_profile?.display_name ?? "Участник 1";
  const acceptedName = challenge.accepted_profile?.display_name ?? "Участник 2";
  const opponentName = user?.id === challenge.author_id ? acceptedName : authorName;
  const currentUserName = user?.id
    ? user.id === challenge.author_id
      ? authorName
      : user.id === challenge.accepted_by
        ? acceptedName
        : null
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/arena" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ← Арена
          </Link>
        </div>
        <h1 className="text-xl font-bold text-white">{challenge.topic}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {authorName} vs {acceptedName}
        </p>
        <div className="mt-3 glass rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Позиция инициатора</p>
          <p className="text-sm text-gray-300 leading-relaxed">{challenge.position_hint}</p>
          <p className="text-xs text-gray-600 mt-3">
            Формат арены: {challenge.max_rounds} {challenge.max_rounds === 1 ? "раунд" : challenge.max_rounds < 5 ? "раунда" : "раундов"} с автоматической медиацией в финале
          </p>
        </div>
      </div>

      {mediated && (
        <div className="bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm p-4 rounded-xl mb-6">
          ✨ Медиация завершена — ИИ сформулировал итог дискуссии
        </div>
      )}

      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm p-4 rounded-xl mb-6">
          {error === "telegram_required"
            ? "Для подписки на бой нужен привязанный Telegram в профиле."
            : error}
        </div>
      )}

      <ChallengeChat
        challengeId={id}
        challengeTopic={challenge.topic}
        challengeCategory={challenge.category}
        initialMessages={messages ?? []}
        currentUserId={user?.id ?? null}
        opponentName={opponentName}
        maxRounds={challenge.max_rounds}
        isClosed={challenge.status === "closed"}
        authorId={challenge.author_id}
        acceptedById={challenge.accepted_by}
        authorName={authorName}
        acceptedName={acceptedName}
        currentUserName={currentUserName}
        isParticipant={isParticipant}
        initialComments={comments ?? []}
        initialObserverHints={observerHints ?? []}
        isWatching={!!watch}
        canWatchWithTelegram={!!currentProfile?.telegram_chat_id}
        opinionCount={opinionCount ?? 0}
      />
    </div>
  );
}
