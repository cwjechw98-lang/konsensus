"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type DisputeInsert = Database["public"]["Tables"]["disputes"]["Insert"];
type DisputeRow = Database["public"]["Tables"]["disputes"]["Row"];

export async function createDispute(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const maxRounds = parseInt(formData.get("max_rounds") as string) || 3;

  const row: DisputeInsert = {
    title,
    description,
    max_rounds: maxRounds,
    creator_id: user.id,
  };

  const { data, error } = await supabase
    .from("disputes")
    .insert(row as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    redirect("/dashboard?error=" + encodeURIComponent(error?.message ?? "Ошибка создания спора"));
  }

  redirect(`/dispute/${data.id}`);
}

export async function joinDispute(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const code = (formData.get("code") as string).trim().toLowerCase();

  const { data: dispute, error: findError } = await supabase
    .from("disputes")
    .select("id, creator_id, opponent_id, status")
    .eq("invite_code", code)
    .single<Pick<DisputeRow, "id" | "creator_id" | "opponent_id" | "status">>();

  if (findError || !dispute) {
    redirect("/dashboard?error=" + encodeURIComponent("Спор не найден"));
  }

  if (dispute.creator_id === user.id) {
    redirect(`/dispute/${dispute.id}`);
  }

  if (dispute.opponent_id && dispute.opponent_id !== user.id) {
    redirect("/dashboard?error=" + encodeURIComponent("В этом споре уже есть оппонент"));
  }

  if (!dispute.opponent_id) {
    const { error: joinError } = await supabase
      .from("disputes")
      .update({ opponent_id: user.id, status: "in_progress" } as never)
      .eq("id", dispute.id);

    if (joinError) {
      redirect("/dashboard?error=" + encodeURIComponent(joinError.message));
    }
  }

  redirect(`/dispute/${dispute.id}`);
}
