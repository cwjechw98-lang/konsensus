"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName = (formData.get("display_name") as string).trim();
  const bio = (formData.get("bio") as string | null)?.trim() ?? null;
  const debateStance = (formData.get("debate_stance") as string | null)?.trim() ?? null;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio: bio || null,
      debate_stance: debateStance || null,
    } as never)
    .eq("id", user.id);

  if (error) {
    redirect("/profile?error=" + encodeURIComponent(error.message));
  }

  redirect("/profile?success=1");
}

export async function generateTelegramToken(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const token = "K-" + Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await supabase
    .from("profiles")
    .update({ telegram_link_token: token } as never)
    .eq("id", user.id);

  redirect("/profile?tg_token=" + token);
}

export async function disconnectTelegram(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({
      telegram_chat_id: null,
      telegram_link_token: null,
      telegram_bot_messages: [],
      telegram_message_index: {},
    } as never)
    .eq("id", user.id);

  redirect("/profile");
}
