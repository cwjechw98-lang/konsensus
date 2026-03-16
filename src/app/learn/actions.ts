"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEducationMaterial } from "@/lib/education";

export async function markEducationMaterialComplete(slug: string) {
  const material = await getEducationMaterial(slug);
  if (!material) {
    redirect("/learn");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("user_learning_progress")
    .select("id, started_at")
    .eq("user_id", user.id)
    .eq("material_slug", slug)
    .maybeSingle<{ id: string; started_at: string }>();

  const { error } = await supabase.from("user_learning_progress").upsert(
    {
      id: existing?.id,
      user_id: user.id,
      material_slug: slug,
      started_at: existing?.started_at ?? now,
      completed_at: now,
      last_opened_at: now,
      updated_at: now,
    } as never,
    { onConflict: "user_id,material_slug" }
  );

  if (error) {
    redirect(`/learn/${slug}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/learn");
  revalidatePath(`/learn/${slug}`);

  redirect(`/learn/${slug}?completed=1`);
}
