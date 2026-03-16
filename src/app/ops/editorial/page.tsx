import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isKonsensusAdminEmail } from "@/lib/site-config";
import PageContextCard from "@/components/PageContextCard";
import EditorialDraftBuilder from "@/components/EditorialDraftBuilder";
import EditorialDraftHistory from "@/components/EditorialDraftHistory";
import EditorialDeliveryPanel from "@/components/EditorialDeliveryPanel";
import {
  fetchEditorialDrafts,
  fetchEditorialOverview,
} from "@/lib/editorial-ops";
import { fetchEditorialDeliveryReports } from "@/lib/editorial-reporting";

export default async function OpsEditorialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isKonsensusAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const [overview, drafts, deliveryReports] = await Promise.all([
    fetchEditorialOverview(),
    fetchEditorialDrafts(),
    fetchEditorialDeliveryReports(),
  ]);

  const activeDrafts = drafts.filter((draft) => draft.status === "draft" || draft.status === "scheduled");
  const historyDrafts = drafts.filter((draft) => draft.status === "published" || draft.status === "cancelled");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <PageContextCard
          eyebrow="Ops"
          title="Editorial ops собирает релиз из новых изменений и проводит его в delivery flow"
          description="Здесь админ видит текущий cursor, диапазон новых commit’ов, AI-черновики и очередь запланированных релизов. Это отдельный ops-контур, а не часть обычного профиля."
          bullets={[
            "Собрать AI draft по новым изменениям",
            "Проверить и отредактировать релиз перед публикацией",
            "Увидеть delivery report и scheduled queue",
          ]}
          tone="cyan"
        />
      </div>

      <div className="space-y-8">
        <section>
          <h1 className="mb-4 text-2xl font-bold text-white">Editorial Ops</h1>
          <EditorialDraftBuilder overview={overview} drafts={activeDrafts} />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Delivery reports</h2>
          <EditorialDeliveryPanel
            queued={deliveryReports.queued}
            recent={deliveryReports.recent}
          />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">История draft-ов</h2>
          <EditorialDraftHistory drafts={historyDrafts} />
        </section>
      </div>
    </div>
  );
}
