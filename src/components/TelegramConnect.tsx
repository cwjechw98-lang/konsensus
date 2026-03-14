"use client";

import { useState, useEffect, useTransition } from "react";

const DEFAULT_BOT = "KonsensusAppBot";

interface Props {
  isConnected: boolean;
  botUsername: string | null;
  onDisconnect: () => Promise<void>;
}

export function TelegramConnect({ isConnected: initialConnected, botUsername, onDisconnect }: Props) {
  const bot = botUsername ?? DEFAULT_BOT;
  const botUrl = `https://t.me/${bot}`;

  const [connected, setConnected] = useState(initialConnected);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, startDisconnect] = useTransition();

  // Poll for connection after token is generated
  useEffect(() => {
    if (!token || connected) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/telegram/check-connected");
        const { connected: isNow } = await res.json();
        if (isNow) {
          setConnected(true);
          setToken(null);
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [token, connected]);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/generate-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка генерации кода. Проверьте консоль Vercel.");
        return;
      }
      if (data.token) {
        setToken(data.token);
        window.open(`${botUrl}?start=${data.token}`, "_blank");
      }
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setLoading(false);
    }
  }

  // ── Connected — just one button ────────────────────────────────────────────
  if (connected) {
    return (
      <div className="flex flex-col gap-3">
        <a
          href={botUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg py-2.5 px-4 text-sm font-semibold transition-colors w-fit"
        >
          ✅ Открыть Telegram бот →
        </a>
        <form action={onDisconnect}>
          <button
            type="submit"
            disabled={disconnecting}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors underline"
          >
            {disconnecting ? "Отключение..." : "Отключить"}
          </button>
        </form>
      </div>
    );
  }

  // ── Token shown — waiting for confirmation ──────────────────────────────────
  if (token) {
    const deepLink = `${botUrl}?start=${token}`;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
          <p className="text-xs text-gray-400">Ожидаем подтверждения в Telegram...</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-purple-300 text-base tracking-widest select-all">
          {token}
        </div>
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg py-2.5 px-4 text-sm font-semibold transition-colors"
        >
          Открыть Telegram →
        </a>
        <p className="text-xs text-gray-600">
          Если Telegram не открылся — скопируйте код и отправьте его боту вручную.
        </p>
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
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
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
