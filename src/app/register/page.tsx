import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  async function signUp(formData: FormData) {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const displayName = formData.get("display_name") as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      redirect("/register?message=" + encodeURIComponent(error.message));
    }

    redirect("/login?message=" + encodeURIComponent("Проверьте email для подтверждения аккаунта"));
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold mb-6 text-center">Регистрация</h1>

      <RegisterForm action={signUp} searchParams={searchParams} />

      <p className="text-sm text-center text-gray-500 mt-6">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Войти
        </Link>
      </p>
    </div>
  );
}

async function RegisterForm({
  action,
  searchParams,
}: {
  action: (formData: FormData) => void;
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <form action={action} className="flex flex-col gap-4">
      {message && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm p-3 rounded-md">
          {message}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Имя</span>
        <input
          name="display_name"
          type="text"
          required
          className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-transparent"
          placeholder="Как вас называть"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-transparent"
          placeholder="email@example.com"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Пароль</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-transparent"
          placeholder="Минимум 6 символов"
        />
      </label>

      <button
        type="submit"
        className="bg-foreground text-background rounded-md py-2 font-medium hover:opacity-90 mt-2"
      >
        Зарегистрироваться
      </button>
    </form>
  );
}
