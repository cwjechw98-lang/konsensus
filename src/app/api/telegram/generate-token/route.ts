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

    // Try user client first (works if RLS allows telegram_link_token update)
    const { error: userErr } = await supabase
      .from("profiles")
      .update({ telegram_link_token: token } as never)
      .eq("id", user.id);

    if (userErr) {
      // Fallback to admin client
      const admin = createAdminClient();
      const { error: adminErr } = await admin
        .from("profiles")
        .update({ telegram_link_token: token } as never)
        .eq("id", user.id);

      if (adminErr) {
        return NextResponse.json({ error: adminErr.message }, { status: 500 });
      }
    }

    // Verify with admin client that token was saved
    const admin = createAdminClient();
    const { data: check } = await admin
      .from("profiles")
      .select("telegram_link_token")
      .eq("id", user.id)
      .single<{ telegram_link_token: string | null }>();

    if (check?.telegram_link_token !== token) {
      // Token wasn't saved — RLS silently blocked the update, retry with admin
      const { error: retryErr } = await admin
        .from("profiles")
        .update({ telegram_link_token: token } as never)
        .eq("id", user.id);

      if (retryErr) {
        return NextResponse.json({ error: retryErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
