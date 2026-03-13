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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link
        href={`/dispute/${id}`}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
      >
        &larr; К спору
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl">🤖</span>
        <h1 className="text-2xl font-bold text-white">ИИ-медиация</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8 ml-11">«{dispute.title}»</p>

      {!mediation ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-5xl mb-6">⚡</p>
          <p className="text-white font-semibold mb-2">
            Все аргументы собраны
          </p>
          <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
            ИИ-медиатор проанализирует позиции обеих сторон и предложит
            варианты решения.
          </p>
          <form action={triggerMediation}>
            <input type="hidden" name="dispute_id" value={id} />
            <button
              type="submit"
              className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Запустить медиацию
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Positions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {analysis?.summary_a && (
              <div className="glass rounded-xl p-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Позиция инициатора
                </h2>
                <p className="text-sm text-gray-300">{analysis.summary_a}</p>
              </div>
            )}
            {analysis?.summary_b && (
              <div className="glass rounded-xl p-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Позиция оппонента
                </h2>
                <p className="text-sm text-gray-300">{analysis.summary_b}</p>
              </div>
            )}
          </div>

          {/* Common ground */}
          {analysis?.common_ground && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2">
                🤝 Общее
              </h2>
              <p className="text-sm text-gray-300">{analysis.common_ground}</p>
            </div>
          )}

          {/* Solutions */}
          {Array.isArray(analysis?.solutions) &&
            analysis.solutions.length > 0 && (
              <div className="glass rounded-xl p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Предложенные решения
                </h2>
                <ol className="flex flex-col gap-3">
                  {(analysis.solutions as string[]).map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-semibold border border-purple-500/20">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-300">{s}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

          {/* Recommendation */}
          {analysis?.recommendation && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-2">
                ✦ Рекомендация медиатора
              </h2>
              <p className="text-sm text-gray-300">{analysis.recommendation}</p>
            </div>
          )}

          {/* Raw fallback */}
          {!analysis?.summary_a && analysis?.raw && (
            <div className="glass rounded-xl p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-400">
                {analysis.raw}
              </pre>
            </div>
          )}

          <div className="mt-2">
            <Link
              href={`/dispute/${id}`}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              &larr; Вернуться к спору
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
