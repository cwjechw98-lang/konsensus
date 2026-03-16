import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isKonsensusAdminEmail } from "@/lib/site-config";
import PageContextCard from "@/components/PageContextCard";
import AppealModerationQueue from "@/components/AppealModerationQueue";
import { fetchAppealModerationQueue } from "@/lib/appeals";

export default async function OpsAppealsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isKonsensusAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const moderationQueue = await fetchAppealModerationQueue().catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <PageContextCard
          eyebrow="Ops"
          title="Appeals moderation собирает спорные автоматические выводы для ручного override"
          description="Здесь живёт только служебный слой: кейсы с низкой уверенностью, auto-hidden выводы и ручные решения поверх auto-review."
          bullets={[
            "Очередь спорных AI-выводов",
            "Ручной override поверх auto-review",
            "Отдельно от личного профиля пользователя",
          ]}
          tone="amber"
        />
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Appeals Moderation</h1>
            <p className="mt-1 text-sm text-gray-400">
              Очередь ручного пересмотра апелляций.
            </p>
          </div>
          <a
            href="/ops"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.08]"
          >
            ← Назад в Ops
          </a>
        </div>
        <AppealModerationQueue appeals={moderationQueue} />
      </div>
    </div>
  );
}
