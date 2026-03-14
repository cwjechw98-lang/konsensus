import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoogleOAuthButton from "@/components/GoogleOAuthButton";

// Переводим английские ошибки Supabase на русский
const translateError = (msg: string): string => {
  if (msg.includes("Email not confirmed"))
    return "Сначала подтвердите email — письмо уже у вас в почте.";
  if (msg.includes("Invalid login credentials"))
    return "Неверный email или пароль.";
  if (msg.includes("Too many requests"))
    return "Слишком много попыток — подождите немного.";
  if (msg.includes("User not found"))
    return "Пользователь с таким email не найден.";
  return msg;
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; info?: string }>;
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
      redirect(
        "/login?message=" + encodeURIComponent(translateError(error.message))
      );
    }

    redirect("/dashboard");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">Войти</h1>
          <p className="text-gray-500 text-sm mt-2">Добро пожаловать обратно</p>
        </div>

        <div className="glass rounded-2xl p-8 flex flex-col gap-4">
          <GoogleOAuthButton />
          <Divider />
          <LoginForm action={signIn} searchParams={searchParams} />
        </div>

        <p className="text-sm text-center text-gray-500 mt-6">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-white/8" />
      <span className="text-xs text-gray-600">или</span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

async function LoginForm({
  action,
  searchParams,
}: {
  action: (formData: FormData) => void;
  searchParams: Promise<{ message?: string; info?: string }>;
}) {
  const { message, info } = await searchParams;

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Инфо-сообщение (напр. после регистрации) */}
      {info && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex gap-3 items-start">
          <span className="text-xl flex-shrink-0">✉️</span>
          <div>
            <p className="text-green-400 font-medium text-sm">
              Письмо отправлено!
            </p>
            <p className="text-gray-400 text-xs mt-0.5">{info}</p>
          </div>
        </div>
      )}

      {/* Сообщение об ошибке */}
      {message && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
          {message}
        </div>
      )}

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
        Войти
      </button>
    </form>
  );
}
