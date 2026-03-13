import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitArgument } from "@/lib/actions";
import EvidenceFields from "@/components/EvidenceFields";
import type { Database } from "@/types/database";

type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
type ArgumentRow = Database["public"]["Tables"]["arguments"]["Row"];

export default async function ArguePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorMsg } = await searchParams;
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
  if (dispute.status !== "in_progress") redirect(`/dispute/${id}`);

  const isCreator = dispute.creator_id === user.id;
  const isOpponent = dispute.opponent_id === user.id;
  if (!isCreator && !isOpponent) redirect("/dashboard");

  const opponentId = isCreator ? dispute.opponent_id! : dispute.creator_id;

  const { data: args } = await supabase
    .from("arguments")
    .select("author_id, round")
    .eq("dispute_id", id)
    .returns<Pick<ArgumentRow, "author_id" | "round">[]>();

  const myArgCount = args?.filter((a) => a.author_id === user.id).length ?? 0;
  const opponentArgCount =
    args?.filter((a) => a.author_id === opponentId).length ?? 0;

  const isWaiting = myArgCount > opponentArgCount;
  const displayRound = isWaiting ? myArgCount : myArgCount + 1;

  if (!isWaiting && myArgCount >= dispute.max_rounds) {
    redirect(`/dispute/${id}`);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link
        href={`/dispute/${id}`}
        className="text-sm text-gray-500 hover:underline mb-4 inline-block"
      >
        &larr; К спору
      </Link>

      {/* Суть спора */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-6 bg-gray-50 dark:bg-gray-900/50">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Предмет спора</p>
        <p className="font-semibold mb-1">{dispute.title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
          {dispute.description}
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Раунд {displayRound}</h1>
        <span className="text-sm text-gray-500">из {dispute.max_rounds}</span>
      </div>

      {isWaiting ? (
        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
          <p className="font-medium mb-2">Ваш аргумент принят ✓</p>
          <p className="text-gray-500 text-sm">
            Ожидаем ответа оппонента...
          </p>
        </div>
      ) : (
        <>
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md mb-4">
              {errorMsg}
            </div>
          )}
          <form action={submitArgument} className="flex flex-col gap-4">
            <input type="hidden" name="dispute_id" value={id} />

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Ваша позиция</span>
              <input
                name="position"
                type="text"
                required
                maxLength={300}
                className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-transparent"
                placeholder="«Я считаю, что...»"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                Аргументы и обоснование
              </span>
              <textarea
                name="reasoning"
                required
                rows={6}
                className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-transparent resize-y"
                placeholder="Подробно объясните свою позицию..."
              />
            </label>

            <EvidenceFields />

            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                className="bg-foreground text-background px-5 py-2 rounded-md font-medium hover:opacity-90"
              >
                Подать аргумент
              </button>
              <Link
                href={`/dispute/${id}`}
                className="border border-gray-300 dark:border-gray-700 px-5 py-2 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                Отмена
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
