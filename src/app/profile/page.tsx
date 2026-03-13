import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { updateProfile } from "./actions";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error: errorMsg, success } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-white mb-8">Профиль</h1>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
          {errorMsg}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg mb-4">
          Профиль обновлён
        </div>
      )}

      <div className="glass rounded-2xl p-6 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Аккаунт
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-xs text-gray-500">Email</span>
            <p className="text-sm font-medium text-white mt-0.5">
              {user.email}
            </p>
          </div>
          {createdAt && (
            <div>
              <span className="text-xs text-gray-500">Зарегистрирован</span>
              <p className="text-sm font-medium text-white mt-0.5">
                {createdAt}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Данные профиля
        </h2>
        <form action={updateProfile} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">
              Отображаемое имя
            </span>
            <input
              name="display_name"
              type="text"
              required
              defaultValue={profile?.display_name ?? ""}
              className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="Как вас называть"
            />
          </label>

          <button
            type="submit"
            className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-2.5 font-semibold transition-colors"
          >
            Сохранить
          </button>
        </form>
      </div>
    </div>
  );
}
