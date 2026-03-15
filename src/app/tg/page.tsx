"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

// Dynamically load Telegram Web App SDK and return the WebApp object
function loadTelegramSdk(): Promise<TelegramWebApp | null> {
  return new Promise((resolve) => {
    // Already loaded?
    const existing = window.Telegram?.WebApp;
    if (existing?.initData) {
      resolve(existing);
      return;
    }

    // Inject script manually (in case layout defer hasn't fired yet)
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.onload = () => {
      // Give it a moment to initialize
      setTimeout(() => resolve(window.Telegram?.WebApp ?? null), 200);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);

    // Fallback timeout
    setTimeout(() => resolve(window.Telegram?.WebApp ?? null), 5000);
  });
}

export default function TelegramAppPage() {
  const [status, setStatus] = useState<"loading" | "not_linked" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function authenticate() {
      const tg = await loadTelegramSdk();

      if (!tg?.initData) {
        setStatus("error");
        setErrorMsg("Эта страница работает только внутри Telegram. Откройте её через кнопку «Открыть приложение» в боте.");
        return;
      }

      // Tell Telegram the app is ready
      tg.ready?.();
      tg.expand?.();

      try {
        // Send initData to our API for validation
        const res = await fetch("/api/telegram/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error === "not_linked") {
            setStatus("not_linked");
            return;
          }
          setStatus("error");
          setErrorMsg(data.error ?? data.message ?? "Ошибка авторизации");
          return;
        }

        // Exchange hashed_token for a real session via verifyOtp
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "email",
          token_hash: data.hashed_token,
        });

        if (verifyError) {
          setStatus("error");
          setErrorMsg("Не удалось создать сессию: " + verifyError.message);
          return;
        }

        // Success — redirect to dashboard
        window.location.href = "/dashboard";
      } catch (e) {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : "Нет соединения с сервером");
      }
    }

    authenticate();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Входим через Telegram...</p>
          </div>
        )}

        {status === "not_linked" && (
          <div className="glass rounded-2xl p-8 flex flex-col gap-4">
            <span className="text-4xl">🔗</span>
            <h1 className="text-xl font-bold text-white">Аккаунт не привязан</h1>
            <p className="text-gray-400 text-sm">
              Чтобы использовать приложение внутри Telegram, сначала привяжите аккаунт:
            </p>
            <ol className="text-left text-gray-400 text-sm space-y-2">
              <li>1. Откройте <a href="https://konsensus-six.vercel.app/profile" target="_blank" rel="noopener" className="text-purple-400 underline">профиль на сайте</a></li>
              <li>2. Нажмите «Подключить Telegram»</li>
              <li>3. Отправьте код боту</li>
              <li>4. Вернитесь сюда</li>
            </ol>
          </div>
        )}

        {status === "error" && (
          <div className="glass rounded-2xl p-8 flex flex-col gap-4">
            <span className="text-4xl">⚠️</span>
            <h1 className="text-xl font-bold text-white">Ошибка</h1>
            <p className="text-gray-400 text-sm">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-2.5 px-4 text-sm font-semibold transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
