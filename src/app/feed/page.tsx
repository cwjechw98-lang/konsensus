import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDisplayName } from "@/lib/display-name";
import { OnboardingTour } from "@/components/OnboardingTour";
import PageContextCard from "@/components/PageContextCard";
import type { Database } from "@/types/database";

type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ReleaseAnnouncement =
  Database["public"]["Tables"]["release_announcements"]["Row"];

type PublicDisputeRow = Pick<
  Dispute,
  | "id"
  | "title"
  | "description"
  | "status"
  | "max_rounds"
  | "updated_at"
  | "creator_id"
  | "opponent_id"
> & {
  creator_profile: Pick<Profile, "display_name"> | null;
};

type ArenaChallengeRow = Pick<
  Challenge,
  "id" | "topic" | "status" | "max_rounds" | "created_at" | "category"
> & {
  accepted_by: string | null;
  author_profile: Pick<Profile, "display_name"> | null;
  accepted_profile: Pick<Profile, "display_name"> | null;
};

type ChallengeMessageRow = {
  challenge_id: string;
  created_at: string;
  is_ai: boolean;
};

type FeedCard = {
  id: string;
  href: string;
  badge: string;
  title: string;
  description: string;
  meta: string;
  chips: string[];
  eventAt: string;
  actionLabel: string;
  tone: "emerald" | "amber" | "cyan";
};

const STATUS_LABELS: Record<string, string> = {
  open: "Ожидает оппонента",
  in_progress: "В процессе",
  mediation: "Медиация",
  resolved: "Решён",
  closed: "Закрыт",
};

const CARD_STYLES: Record<
  FeedCard["tone"],
  {
    badge: string;
    border: string;
    hover: string;
    chip: string;
  }
> = {
  emerald: {
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    border: "border-emerald-500/15",
    hover: "hover:border-emerald-500/30",
    chip: "border-emerald-500/15 bg-emerald-500/10 text-emerald-200",
  },
  amber: {
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    border: "border-amber-500/15",
    hover: "hover:border-amber-500/30",
    chip: "border-amber-500/15 bg-amber-500/10 text-amber-200",
  },
  cyan: {
    badge: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    border: "border-cyan-500/15",
    hover: "hover:border-cyan-500/30",
    chip: "border-cyan-500/15 bg-cyan-500/10 text-cyan-200",
  },
};

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatEventTime(value: string) {
  return EVENT_DATE_FORMATTER.format(new Date(value));
}

function buildArenaLiveCards(
  challenges: ArenaChallengeRow[],
  messages: ChallengeMessageRow[]
): FeedCard[] {
  return challenges.map((challenge) => {
    const challengeMessages = messages.filter(
      (message) => message.challenge_id === challenge.id
    );
    const humanMessages = challengeMessages.filter((message) => !message.is_ai);
    const latestMessage =
      challengeMessages
        .map((message) => message.created_at)
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? challenge.created_at;

    const completedRounds = Math.floor(humanMessages.length / 2);
    const authorName = getDisplayName(
      challenge.author_profile?.display_name,
      null,
      "Участник 1"
    );
    const opponentName = getDisplayName(
      challenge.accepted_profile?.display_name,
      null,
      "Участник 2"
    );

    return {
      id: `arena-live-${challenge.id}`,
      href: `/arena/${challenge.id}`,
      badge: "live battle",
      title: challenge.topic,
      description: `${authorName} vs ${opponentName}`,
      meta: `${formatEventTime(latestMessage)} · ${completedRounds}/${challenge.max_rounds} раундов`,
      chips: ["Смотреть без входа", "Арена"],
      eventAt: latestMessage,
      actionLabel: "Открыть бой →",
      tone: "emerald",
    };
  });
}

function buildArenaOpenCards(challenges: ArenaChallengeRow[]): FeedCard[] {
  return challenges.map((challenge) => {
    const authorName = getDisplayName(
      challenge.author_profile?.display_name,
      null,
      "Новый автор"
    );

    return {
      id: `arena-open-${challenge.id}`,
      href: "/arena",
      badge: "вызов",
      title: challenge.topic,
      description: `${authorName} ищет оппонента на арене`,
      meta: `${formatEventTime(challenge.created_at)} · ${challenge.max_rounds} раундов`,
      chips: [challenge.category ?? "Категория не указана", "Открытый вызов"],
      eventAt: challenge.created_at,
      actionLabel: "Перейти в арену →",
      tone: "amber",
    };
  });
}

function buildPublicDisputeCards(disputes: PublicDisputeRow[]): FeedCard[] {
  return disputes.map((dispute) => {
    const creatorName = getDisplayName(
      dispute.creator_profile?.display_name,
      null,
      "Участник"
    );

    return {
      id: `public-dispute-${dispute.id}`,
      href: `/dispute/${dispute.id}`,
      badge: "публичный спор",
      title: dispute.title,
      description: dispute.description,
      meta: `${formatEventTime(dispute.updated_at)} · ${STATUS_LABELS[dispute.status] ?? dispute.status}`,
      chips: [
        creatorName,
        dispute.opponent_id ? `${dispute.max_rounds} раундов` : "Ищет оппонента",
      ],
      eventAt: dispute.updated_at,
      actionLabel: "Открыть спор →",
      tone: "cyan",
    };
  });
}

function FeedSummaryCard({
  value,
  label,
  description,
  accent,
}: {
  value: string;
  label: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="glass rounded-2xl border border-white/8 p-4">
      <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accent}`}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function ActivityCard({ card }: { card: FeedCard }) {
  const style = CARD_STYLES[card.tone];

  return (
    <Link
      href={card.href}
      className={`glass block rounded-2xl border ${style.border} p-5 transition-colors ${style.hover}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] ${style.badge}`}
        >
          {card.badge}
        </span>
        <span className="text-xs text-gray-500">{formatEventTime(card.eventAt)}</span>
      </div>

      <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-300">{card.description}</p>
      <p className="mt-3 text-xs text-gray-500">{card.meta}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {card.chips.map((chip) => (
          <span
            key={`${card.id}-${chip}`}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${style.chip}`}
          >
            {chip}
          </span>
        ))}
      </div>

      <p className="mt-5 text-sm font-medium text-white/80">{card.actionLabel}</p>
    </Link>
  );
}

export default async function FeedPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    { data: releases },
    { data: disputes },
    { data: liveChallenges },
    { data: openChallenges },
  ] = await Promise.all([
    admin
      .from("release_announcements")
      .select("id, slug, title, summary, features, created_at")
      .order("created_at", { ascending: false })
      .limit(2)
      .returns<
        Pick<
          ReleaseAnnouncement,
          "id" | "slug" | "title" | "summary" | "features" | "created_at"
        >[]
      >(),
    supabase
      .from("disputes")
      .select(`
        id,
        title,
        description,
        status,
        max_rounds,
        updated_at,
        creator_id,
        opponent_id,
        creator_profile:profiles!disputes_creator_id_fkey(display_name)
      `)
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(8)
      .returns<PublicDisputeRow[]>(),
    supabase
      .from("challenges")
      .select(`
        id,
        topic,
        status,
        max_rounds,
        created_at,
        category,
        accepted_by,
        author_profile:profiles!challenges_author_id_fkey(display_name),
        accepted_profile:profiles!challenges_accepted_by_fkey(display_name)
      `)
      .eq("status", "active")
      .not("accepted_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<ArenaChallengeRow[]>(),
    supabase
      .from("challenges")
      .select(`
        id,
        topic,
        status,
        max_rounds,
        created_at,
        category,
        accepted_by,
        author_profile:profiles!challenges_author_id_fkey(display_name),
        accepted_profile:profiles!challenges_accepted_by_fkey(display_name)
      `)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<ArenaChallengeRow[]>(),
  ]);

  const liveChallengeIds = (liveChallenges ?? []).map((challenge) => challenge.id);
  const { data: liveMessages } = liveChallengeIds.length
    ? await supabase
        .from("challenge_messages")
        .select("challenge_id, created_at, is_ai")
        .in("challenge_id", liveChallengeIds)
        .returns<ChallengeMessageRow[]>()
    : { data: [] as ChallengeMessageRow[] };

  const activityCards = [
    ...buildArenaLiveCards(liveChallenges ?? [], liveMessages ?? []),
    ...buildArenaOpenCards(openChallenges ?? []),
    ...buildPublicDisputeCards(disputes ?? []),
  ]
    .sort((left, right) => Date.parse(right.eventAt) - Date.parse(left.eventAt))
    .slice(0, 12);

  const hasContent =
    (releases?.length ?? 0) > 0 ||
    (disputes?.length ?? 0) > 0 ||
    (liveChallenges?.length ?? 0) > 0 ||
    (openChallenges?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <PageContextCard
          dataTour="events-intro"
          eyebrow="Activity feed"
          title="События показывают пульс проекта: релизы, арена и публичные разногласия"
          description="Этот экран нужен не для вашей личной работы, а для наблюдения за тем, что живёт на платформе прямо сейчас. Здесь видно движение продукта, открытые вызовы и публичные споры."
          bullets={[
            "Новые релизы и заметные обновления",
            "Live battle и открытые вызовы арены",
            "Публичные споры, за которыми можно наблюдать",
          ]}
          tone="emerald"
          actions={
            <OnboardingTour
              page="feed"
              showReplayButton
              buttonLabel="Как читать этот экран"
            />
          }
        />
      </div>

      {!hasContent ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="mb-4 text-4xl">✨</p>
          <p className="mb-2 font-medium text-white">События ещё не начали копиться</p>
          <p className="mb-6 text-sm text-gray-500">
            Когда появятся релизы, активные бои арены и публичные споры, этот экран станет
            живой витриной проекта.
          </p>
          <Link
            href="/dispute/new"
            className="btn-ripple inline-block rounded-lg bg-purple-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-purple-500"
          >
            Создать первый спор
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <section data-tour="events-summary">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Пульс платформы</h2>
                <p className="text-sm text-gray-400">
                  Быстрый срез по тому, где именно сейчас есть движение.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <FeedSummaryCard
                value={String(releases?.length ?? 0)}
                label="Релизы"
                description={
                  releases?.[0]
                    ? `Последний: ${releases[0].title}`
                    : "Новые product-обновления появятся здесь"
                }
                accent="text-cyan-300/80"
              />
              <FeedSummaryCard
                value={String(liveChallenges?.length ?? 0)}
                label="Live battle"
                description="Идущие прямо сейчас бои, за которыми можно наблюдать."
                accent="text-emerald-300/80"
              />
              <FeedSummaryCard
                value={String(openChallenges?.length ?? 0)}
                label="Открытые вызовы"
                description="Темы на арене, которые пока ждут второго участника."
                accent="text-amber-300/80"
              />
              <FeedSummaryCard
                value={String(disputes?.length ?? 0)}
                label="Публичные споры"
                description="Открытые истории и видимые публичные разногласия."
                accent="text-purple-300/80"
              />
            </div>
          </section>

          {(releases?.length ?? 0) > 0 && (
            <section data-tour="events-releases">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white">Что нового в продукте</h2>
                <p className="text-sm text-gray-400">
                  Недавние обновления, которые уже дошли до пользователей.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {releases?.map((release) => (
                  <article
                    key={release.id}
                    className="glass rounded-2xl border border-cyan-500/15 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-300">
                        релиз
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatEventTime(release.created_at)}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-white">
                      {release.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-300">
                      {release.summary}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {release.features.slice(0, 4).map((feature) => (
                        <span
                          key={`${release.id}-${feature}`}
                          className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    <p className="mt-5 text-sm text-white/80">
                      Релиз уже ушёл в Telegram и стал частью живого потока проекта.
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section data-tour="events-stream">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Сейчас происходит</h2>
              <p className="text-sm text-gray-400">
                Live battle, открытые вызовы и публичные споры, которые заметны прямо сейчас.
              </p>
            </div>

            {activityCards.length === 0 ? (
              <div className="glass rounded-2xl border border-white/8 p-8 text-sm text-gray-400">
                Пока нет live battle, открытых вызовов или публичных споров. Как только движение
                появится, основной поток заполнится автоматически.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {activityCards.map((card) => (
                  <ActivityCard key={card.id} card={card} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
