import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isKonsensusAdminEmail } from "@/lib/site-config";
import PageContextCard from "@/components/PageContextCard";
import { fetchEditorialDrafts, fetchEditorialOverview } from "@/lib/editorial-ops";
import { fetchAppealModerationQueue } from "@/lib/appeals";

function OpsCard({
  href,
  eyebrow,
  title,
  description,
  meta,
  accent,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  accent: "cyan" | "amber";
}) {
  const accentClass =
    accent === "cyan"
      ? "border-cyan-500/20 bg-cyan-500/[0.06]"
      : "border-amber-500/20 bg-amber-500/[0.06]";

  return (
    <a
      href={href}
      className={`block rounded-2xl border p-5 transition-colors hover:bg-white/[0.05] ${accentClass}`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">{eyebrow}</p>
      <h2 className="mt-3 text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-300">{description}</p>
      <p className="mt-4 text-sm font-medium text-white">{meta}</p>
    </a>
  );
}

export default async function OpsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isKonsensusAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const [overview, drafts, moderationQueue] = await Promise.all([
    fetchEditorialOverview().catch(() => null),
    fetchEditorialDrafts().catch(() => []),
    fetchAppealModerationQueue().catch(() => []),
  ]);

  const activeDrafts = drafts.filter((draft) => draft.status === "draft" || draft.status === "scheduled");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <PageContextCard
          eyebrow="Ops"
          title="Ops — отдельный рабочий контур для админ-панелей Konsensus"
          description="Здесь собраны служебные поверхности проекта: релизный editorial flow и ручная модерация апелляций. Профиль снова остаётся пользовательским экраном."
          bullets={[
            "Editorial drafts, delivery и scheduled queue",
            "Ручная очередь пересмотра апелляций",
            "Отдельный вход для служебных действий",
          ]}
          tone="cyan"
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Ops Workspace</h1>
        <p className="mt-2 text-sm text-gray-400">
          Выберите admin-поверхность, с которой нужно работать.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <OpsCard
          href="/ops/editorial"
          eyebrow="Editorial"
          title="Релизный контур"
          description="AI-черновики по новым изменениям, review/edit, publish или schedule и delivery reports."
          meta={
            overview
              ? `${overview.pendingCommitCount} новых commit · ${activeDrafts.length} активных draft`
              : `${activeDrafts.length} активных draft`
          }
          accent="cyan"
        />
        <OpsCard
          href="/ops/appeals"
          eyebrow="Moderation"
          title="Апелляции"
          description="Ручной override спорных автоматических выводов поверх auto-review и отдельная moderation queue."
          meta={`${moderationQueue.length} кейс${moderationQueue.length === 1 ? "" : moderationQueue.length < 5 ? "а" : "ов"} в очереди`}
          accent="amber"
        />
      </div>
    </div>
  );
}
