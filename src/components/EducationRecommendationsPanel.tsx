import Link from "next/link";
import { fetchEducationRecommendations } from "@/lib/education";

type EducationRecommendationsPanelProps = {
  userId: string;
  title?: string;
  description?: string;
  compact?: boolean;
};

export default async function EducationRecommendationsPanel({
  userId,
  title = "Что почитать сейчас",
  description = "Короткие материалы, которые могут помочь в следующем разговоре.",
  compact = false,
}: EducationRecommendationsPanelProps) {
  const { recommendations, completedCount, totalCount } =
    await fetchEducationRecommendations(userId);

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">{description}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-right">
          <p className="text-xs text-cyan-100/80">Изучено</p>
          <p className="text-sm font-semibold text-cyan-100">
            {completedCount}/{totalCount}
          </p>
        </div>
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
        {recommendations.map(({ material, reason }) => (
          <article
            key={material.slug}
            className="rounded-2xl border border-white/8 bg-white/4 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{material.title}</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-400">
                {material.duration}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-400">{material.summary}</p>
            <p className="mt-3 text-xs leading-5 text-cyan-100/80">{reason}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">{material.focus}</span>
              <Link
                href={`/learn/${material.slug}`}
                className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                Открыть материал
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">Подборка обновляется по мере ваших споров.</p>
        <Link href="/learn" className="text-xs font-medium text-cyan-300 hover:text-cyan-200">
          Все материалы →
        </Link>
      </div>
    </div>
  );
}
