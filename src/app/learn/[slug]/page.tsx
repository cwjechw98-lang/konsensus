import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "@/components/SubmitButton";
import EducationMarkdown from "@/components/EducationMarkdown";
import {
  fetchEducationRecommendations,
  fetchLearningProgress,
  getEducationMaterial,
} from "@/lib/education";
import { markEducationMaterialComplete } from "../actions";

export default async function EducationMaterialPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ completed?: string; error?: string }>;
}) {
  const [{ slug }, { completed, error }] = await Promise.all([params, searchParams]);
  const material = await getEducationMaterial(slug);
  if (!material) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [progress, recommendationState] = await Promise.all([
    fetchLearningProgress(user.id),
    fetchEducationRecommendations(user.id),
  ]);

  const progressRow = progress.find((row) => row.material_slug === slug);
  const isCompleted = Boolean(progressRow?.completed_at);
  const recommendation = recommendationState.recommendations.find(
    (item) => item.material.slug === slug
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/learn" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Все материалы
        </Link>
        <Link href="/profile?tab=ai-profile" className="text-sm text-gray-400 hover:text-white">
          К профилю
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{material.title}</h1>
        <p className="mt-2 text-sm text-gray-400">{material.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            {material.focus}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            {material.duration}
          </span>
          {isCompleted ? (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
              Уже изучено
            </span>
          ) : null}
        </div>
      </div>

      {recommendation && (
        <div className="mb-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-100/80">
            Почему это рекомендовано
          </p>
          <p className="mt-2 text-sm text-cyan-50/90">{recommendation.reason}</p>
        </div>
      )}

      {completed && (
        <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          Материал отмечен как изученный. Следующие рекомендации уже обновлены.
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <article className="glass rounded-2xl p-6">
        <EducationMarkdown markdown={material.body} />
      </article>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        {isCompleted ? (
          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200">
            Уже изучено
          </span>
        ) : (
          <form action={markEducationMaterialComplete.bind(null, slug)}>
            <SubmitButton
              pendingText="Сохраняем..."
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Отметить как изученное
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
