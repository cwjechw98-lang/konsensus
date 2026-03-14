"use client";

import { useState, useTransition } from "react";

interface Props {
  isConnected: boolean;
  botUsername: string | null;
  onDisconnect: () => Promise<void>;
}

export function TelegramConnect({ isConnected, botUsername, onDisconnect }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [disconnecting, startDisconnect] = useTransition();

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/generate-token", { method: "POST" });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        // Open Telegram immediately
        if (botUsername) {
          window.open(`https://t.me/${botUsername}?start=${data.token}`, "_blank");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const botUrl = botUsername ? `https://t.me/${botUsername}` : null;
  const deepLink = botUsername && token ? `https://t.me/${botUsername}?start=${token}` : null;

  // ── Connected ──────────────────────────────────────────────────────────────
  if (isConnected) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-lg">✅</span>
          <p className="text-sm text-green-400 font-medium">Telegram подключён</p>
        </div>
        <p className="text-xs text-gray-500">
          Уведомления о спорах, вызовах и медиации приходят в Telegram.
        </p>
        {botUrl && (
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg py-2 px-4 text-sm font-semibold transition-colors w-fit"
          >
            Открыть бот →
          </a>
        )}
        <form action={onDisconnect}>
          <button
            type="submit"
            disabled={disconnecting}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors underline mt-1"
          >
            {disconnecting ? "Отключение..." : "Отключить"}
          </button>
        </form>
      </div>
    );
  }

  // ── Token shown ─────────────────────────────────────────────────────────────
  if (token) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <p className="text-xs text-gray-400">Ожидаем подтверждения в Telegram...</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-purple-300 text-base tracking-widest select-all">
          {token}
        </div>
        {deepLink ? (
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg py-2.5 px-4 text-sm font-semibold transition-colors"
          >
            Открыть Telegram →
          </a>
        ) : (
          <p className="text-xs text-gray-500">
            Отправьте код боту в Telegram вручную
          </p>
        )}
        <button
          onClick={handleConnect}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors underline"
        >
          Сгенерировать новый код
        </button>
      </div>
    );
  }

  // ── Not connected ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        Получайте пуш-уведомления о новых аргументах, вызовах и медиации прямо в Telegram.
      </p>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="btn-ripple bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2 px-4 text-sm font-semibold transition-colors w-fit"
      >
        {loading ? "Генерируем..." : "Подключить Telegram"}
      </button>
    </div>
  );
}
