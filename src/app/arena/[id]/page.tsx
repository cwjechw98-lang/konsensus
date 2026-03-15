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
  searchParams: Promise<{ mediated?: string }>;
}) {
  const { id } = await params;
  const { mediated } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Load challenge
  const { data: challenge } = await supabase
    .from("challenges")
    .select(`
      id, topic, position_hint, status,
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
      author_id: string;
      accepted_by: string | null;
      author_profile: { id: string; display_name: string | null } | null;
      accepted_profile: { id: string; display_name: string | null } | null;
    }>();

  if (!challenge) redirect("/arena");

  // Only participants can view
  const isParticipant = user.id === challenge.author_id || user.id === challenge.accepted_by;
  if (!isParticipant) redirect("/arena");

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

  const authorName = challenge.author_profile?.display_name ?? "Участник 1";
  const acceptedName = challenge.accepted_profile?.display_name ?? "Участник 2";
  const myName = user.id === challenge.author_id ? authorName : acceptedName;
  const opponentName = user.id === challenge.author_id ? acceptedName : authorName;

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
      </div>

      {mediated && (
        <div className="bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm p-4 rounded-xl mb-6">
          ✨ Медиация завершена — ИИ сформулировал итог дискуссии
        </div>
      )}

      <ChallengeChat
        challengeId={id}
        initialMessages={messages ?? []}
        currentUserId={user.id}
        myName={myName}
        opponentName={opponentName}
        isClosed={challenge.status === "closed"}
        authorId={challenge.author_id}
        acceptedById={challenge.accepted_by}
      />
    </div>
  );
}
