import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { triggerMediation } from "@/lib/actions";
import type { Database } from "@/types/database";

type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
type Mediation = Database["public"]["Tables"]["mediations"]["Row"];

export default async function MediationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dispute } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", id)
    .single<Dispute>();

  if (!dispute) notFound();

  const isParticipant =
    dispute.creator_id === user.id || dispute.opponent_id === user.id;
  if (!isParticipant) redirect("/dashboard");

  if (dispute.status !== "mediation" && dispute.status !== "resolved") {
    redirect(`/dispute/${id}`);
  }

  const { data: mediation } = await supabase
    .from("mediations")
    .select("*")
    .eq("dispute_id", id)
    .single<Mediation>();

  const analysis = mediation?.analysis as {
    summary_a?: string;
    summary_b?: string;
    common_ground?: string;
    solutions?: string[];
    recommendation?: string;
    raw?: string;
  } | null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href={`/dispute/${id}`}
        className="text-sm text-gray-500 hover:underline mb-4 inline-block"
      >
        &larr; К спору
      </Link>

      <h1 className="text-2xl font-bold mb-1">ИИ-медиация</h1>
      <p className="text-gray-500 text-sm mb-8">«{dispute.title}»</p>

      {!mediation ? (
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Все аргументы поданы. ИИ-медиатор готов проанализировать спор и
            предложить решения.
          </p>
          <form action={triggerMediation}>
            <input type="hidden" name="dispute_id" value={id} />
            <button
              type="submit"
              className="bg-purple-600 text-white px-6 py-2.5 rounded-md font-medium hover:bg-purple-700"
            >
              Запустить медиацию
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {analysis?.summary_a && (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Позиция инициатора
              </h2>
              <p>{analysis.summary_a}</p>
            </div>
          )}

          {analysis?.summary_b && (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Позиция оппонента
              </h2>
              <p>{analysis.summary_b}</p>
            </div>
          )}

          {analysis?.common_ground && (
            <div className="border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
                Общее
              </h2>
              <p>{analysis.common_ground}</p>
            </div>
          )}

          {Array.isArray(analysis?.solutions) && (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Предложенные решения
              </h2>
              <ol className="flex flex-col gap-3">
                {(analysis.solutions as string[]).map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </span>
                    <p>{s}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {analysis?.recommendation && (
            <div className="border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">
                Рекомендация медиатора
              </h2>
              <p>{analysis.recommendation}</p>
            </div>
          )}

          {!analysis?.summary_a && analysis?.raw && (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm">{analysis.raw}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
