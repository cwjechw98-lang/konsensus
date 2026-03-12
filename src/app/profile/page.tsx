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

  if (!user) {
    redirect("/login");
  }

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
      <h1 className="text-2xl font-bold mb-8">Профиль</h1>

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md mb-4">
          {errorMsg}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm p-3 rounded-md mb-4">
          Профиль обновлён
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">Аккаунт</h2>
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-sm text-gray-500">Email</span>
            <p className="text-sm font-medium mt-0.5">{user.email}</p>
          </div>
          {createdAt && (
            <div>
              <span className="text-sm text-gray-500">Зарегистрирован</span>
              <p className="text-sm font-medium mt-0.5">{createdAt}</p>
            </div>
          )}
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">Данные профиля</h2>
        <form action={updateProfile} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Отображаемое имя</span>
            <input
              name="display_name"
              type="text"
              required
              defaultValue={profile?.display_name ?? ""}
              className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-transparent"
              placeholder="Как вас называть"
            />
          </label>

          <button
            type="submit"
            className="bg-foreground text-background rounded-md py-2 font-medium hover:opacity-90"
          >
            Сохранить
          </button>
        </form>
      </div>
    </div>
  );
}
