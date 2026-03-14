import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/url";
import GoogleOAuthButton from "@/components/GoogleOAuthButton";

const translateError = (msg: string): string => {
  if (msg.includes("User already registered") || msg.includes("already been registered"))
    return "Пользователь с таким email уже зарегистрирован.";
  if (msg.includes("Password should be at least"))
    return "Пароль должен быть не менее 6 символов.";
  if (msg.includes("Unable to validate email"))
    return "Укажите корректный email.";
  if (msg.includes("Too many requests"))
    return "Слишком много попыток — подождите немного.";
  return msg;
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = params.redirect ?? "";
  const message = params.message;

  async function signUp(formData: FormData) {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const displayName = formData.get("display_name") as string;
    const nextUrl = (formData.get("next_url") as string) || "/dashboard";
    const supabase = await createClient();
    const appUrl = await getAppUrl();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    });

    if (error) {
      const p = new URLSearchParams({ message: translateError(error.message) });
      if (nextUrl !== "/dashboard") p.set("redirect", nextUrl);
      redirect(`/register?${p}`);
    }

    redirect(
      "/login?info=" +
        encodeURIComponent(
          "Подтвердите адрес почты — письмо уже на пути к вам."
        )
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">Регистрация</h1>
          <p className="text-gray-500 text-sm mt-2">
            Создайте аккаунт бесплатно
          </p>
        </div>

        <div className="glass rounded-2xl p-8 flex flex-col gap-4">
          <GoogleOAuthButton next={redirectUrl || undefined} />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-gray-600">или</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>
          <form action={signUp} className="flex flex-col gap-4">
            {message && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                {message}
              </div>
            )}

            <input type="hidden" name="next_url" value={redirectUrl || "/dashboard"} />

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-300">Имя</span>
              <input
                name="display_name"
                type="text"
                required
                className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                placeholder="Как вас называть"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-300">Email</span>
              <input
                name="email"
                type="email"
                required
                className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                placeholder="email@example.com"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-300">Пароль</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                placeholder="Минимум 6 символов"
              />
            </label>

            <button
              type="submit"
              className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-2.5 font-semibold transition-colors mt-2"
            >
              Зарегистрироваться
            </button>
          </form>
        </div>

        <p className="text-sm text-center text-gray-500 mt-6">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
