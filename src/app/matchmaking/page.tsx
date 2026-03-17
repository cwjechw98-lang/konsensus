import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { joinDisputeFromMatchmaking } from "@/lib/actions";
import { acceptChallenge } from "@/lib/arena-actions";
import { OnboardingTour } from "@/components/OnboardingTour";
import PageContextCard from "@/components/PageContextCard";
import SubmitButton from "@/components/SubmitButton";

const CATEGORY_INFO: Record<string, { label: string; icon: string }> = {
  politics: { label: "Политика", icon: "🏛" },
  technology: { label: "Технологии", icon: "💻" },
  philosophy: { label: "Философия", icon: "🧠" },
  lifestyle: { label: "Быт", icon: "🏠" },
  science: { label: "Наука", icon: "🔬" },
  culture: { label: "Культура", icon: "🎭" },
  economics: { label: "Экономика", icon: "💰" },
  relationships: { label: "Отношения", icon: "💬" },
  other: { label: "Другое", icon: "📌" },
};

export const revalidate = 0;

export default async function MatchmakingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; error?: string }>;
}) {
  const { category, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Find open disputes waiting for an opponent (not created by current user)
  let query = supabase
    .from("disputes")
    .select("id, title, description, category, created_at, profiles!disputes_creator_id_fkey(display_name)")
    .eq("status", "open")
    .is("opponent_id", null)
    .neq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data: disputes } = await query.returns<{
    id: string;
    title: string;
    description: string;
    category: string | null;
    created_at: string;
    profiles: { display_name: string | null } | null;
  }[]>();

  // Also get open challenges
  let chalQuery = supabase
    .from("challenges")
    .select("id, topic, position_hint, category, created_at, profiles!challenges_author_id_fkey(display_name)")
    .eq("status", "open")
    .neq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (category && category !== "all") {
    chalQuery = chalQuery.eq("category", category);
  }

  const { data: challenges } = await chalQuery.returns<{
    id: string;
    topic: string;
    position_hint: string;
    category: string | null;
    created_at: string;
    profiles: { display_name: string | null } | null;
  }[]>();

  const allCategories = new Set([
    ...(disputes ?? []).map((d) => d.category ?? "other"),
    ...(challenges ?? []).map((c) => c.category ?? "other"),
  ]);

  const totalItems = (disputes?.length ?? 0) + (challenges?.length ?? 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block">
        ← Мои споры
      </Link>

      <div className="mb-6">
        <PageContextCard
          dataTour="open-intro"
          eyebrow="Готовые к старту"
          title="Здесь ждут споры и открытые темы"
          description="Выберите карточку и подключитесь. После входа обсуждение начнётся без лишних шагов."
          bullets={[
            "Споры и открытые темы",
            "Фильтр по темам",
            "Быстрый вход",
          ]}
          tone="cyan"
          compact
          actions={
            <OnboardingTour
              page="matchmaking"
              showReplayButton
              buttonLabel="Подсказки"
            />
          }
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Category filters */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1" data-tour="open-filters">
        <Link
          href="/matchmaking"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            !category || category === "all"
              ? "bg-purple-600/25 text-purple-300 border border-purple-500/40"
              : "glass text-gray-500 hover:text-gray-300"
          }`}
        >
          🌐 Все
        </Link>
        {Object.entries(CATEGORY_INFO)
          .filter(([key]) => allCategories.has(key))
          .map(([key, info]) => (
            <Link
              key={key}
              href={`/matchmaking?category=${key}`}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                category === key
                  ? "bg-purple-600/25 text-purple-300 border border-purple-500/40"
                  : "glass text-gray-500 hover:text-gray-300"
              }`}
            >
              {info.icon} {info.label}
            </Link>
          ))}
      </div>

      {totalItems === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl">🔍</span>
          <p className="text-gray-300 text-[15px] mt-3">Сейчас нет открытых карточек. Можно создать спор или открыть раздел с публичными темами.</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link href="/dispute/new" className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              Создать спор
            </Link>
            <Link href="/arena" className="glass px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white">
              Открытые темы
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3" data-tour="open-list">
          {/* Open disputes */}
          {(disputes ?? []).map((d) => {
            const cat = CATEGORY_INFO[d.category ?? "other"];
            return (
              <div
                key={d.id}
                className="glass rounded-xl p-4 hover:border-purple-500/30 transition-all border border-white/8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Спор
                      </span>
                      {cat && (
                        <span className="text-xs text-gray-600">{cat.icon} {cat.label}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">{d.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{d.description}</p>
                    <p className="text-xs text-gray-600 mt-2">
                      от {d.profiles?.display_name ?? "Участник"} · {new Date(d.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <form action={joinDisputeFromMatchmaking} className="flex-shrink-0">
                    <input type="hidden" name="dispute_id" value={d.id} />
                    <SubmitButton
                      pendingText="Входим..."
                      className="rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Вступить в спор →
                    </SubmitButton>
                  </form>
                </div>
              </div>
            );
          })}

          {/* Open challenges */}
          {(challenges ?? []).map((c) => {
            const cat = CATEGORY_INFO[c.category ?? "other"];
            return (
              <div
                key={c.id}
                className="glass rounded-xl p-4 hover:border-purple-500/30 transition-all border border-white/8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        Открытая тема
                      </span>
                      {cat && (
                        <span className="text-xs text-gray-600">{cat.icon} {cat.label}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">{c.topic}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.position_hint}</p>
                    <p className="text-xs text-gray-600 mt-2">
                      от {c.profiles?.display_name ?? "Участник"} · {new Date(c.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <form action={acceptChallenge.bind(null, c.id)} className="flex-shrink-0">
                    <SubmitButton
                      pendingText="Подключаем..."
                      className="rounded-lg bg-orange-600/20 px-3 py-1.5 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Подключиться →
                    </SubmitButton>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
