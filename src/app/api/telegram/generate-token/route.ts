import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const token = "K-" + Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Admin client to bypass RLS (new columns may not be in user policy)
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ telegram_link_token: token } as never)
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 });
    }

    // Verify the token was actually saved
    const { data: check } = await admin
      .from("profiles")
      .select("telegram_link_token")
      .eq("id", user.id)
      .single<{ telegram_link_token: string | null }>();

    if (check?.telegram_link_token !== token) {
      return NextResponse.json({
        error: `Токен не сохранился. Проверьте что миграция 00009_telegram.sql выполнена в Supabase SQL Editor.`,
      }, { status: 500 });
    }

    return NextResponse.json({ token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Exception: ${msg}` }, { status: 500 });
  }
}
