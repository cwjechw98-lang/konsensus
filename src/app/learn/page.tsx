import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageContextCard from "@/components/PageContextCard";
import EducationRecommendationsPanel from "@/components/EducationRecommendationsPanel";
import { fetchLearningProgress, listEducationMaterials } from "@/lib/education";

export default async function LearnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [materials, progress] = await Promise.all([
    listEducationMaterials(),
    fetchLearningProgress(user.id),
  ]);

  const progressBySlug = new Map(progress.map((row) => [row.material_slug, row]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <PageContextCard
          eyebrow="Короткие материалы"
          title="Здесь собраны короткие материалы по спору и переговорам"
          description="Без длинного курса: выбираете нужную тему, читаете несколько минут и идёте дальше."
          bullets={[
            "Короткие тексты вместо длинного курса",
            "Рекомендации под ваш стиль",
            "Прогресс без бюрократии",
          ]}
          tone="cyan"
        />
      </div>

      <div className="mb-6">
        <EducationRecommendationsPanel
          userId={user.id}
          title="Что читать сейчас"
          description="Сначала показываются материалы, которые полезнее всего именно сейчас."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {materials.map((material) => {
          const itemProgress = progressBySlug.get(material.slug);
          const isCompleted = Boolean(itemProgress?.completed_at);

          return (
            <article key={material.slug} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{material.title}</p>
                  <p className="mt-2 text-sm text-gray-400">{material.summary}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    isCompleted
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                      : "border border-white/10 bg-white/5 text-gray-400"
                  }`}
                >
                  {isCompleted ? "Пройдено" : material.duration}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {material.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">{material.focus}</span>
                <Link
                  href={`/learn/${material.slug}`}
                  className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
                >
                  Читать →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
