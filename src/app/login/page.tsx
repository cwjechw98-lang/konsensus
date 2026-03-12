import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  async function signIn(formData: FormData) {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirect("/login?message=" + encodeURIComponent(error.message));
    }

    redirect("/dashboard");
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold mb-6 text-center">Вход</h1>

      <LoginForm action={signIn} searchParams={searchParams} />

      <p className="text-sm text-center text-gray-500 mt-6">
        Нет аккаунта?{" "}
        <Link href="/register" className="underline underline-offset-4">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}

async function LoginForm({
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
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md">
          {message}
        </div>
      )}

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
        Войти
      </button>
    </form>
  );
}
