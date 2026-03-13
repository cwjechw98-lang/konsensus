"use client";

import { useState } from "react";

export default function ShareInviteButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Приглашение в спор — Konsensus",
          text: "Тебя приглашают поучаствовать в споре",
          url: inviteUrl,
        });
        return;
      } catch {
        // отменил — fallback на копирование
      }
    }
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailSend = () => {
    if (!email) return;
    const subject = encodeURIComponent("Тебя приглашают в спор — Konsensus");
    const body = encodeURIComponent(
      `Привет!\n\nТебя пригласили поучаствовать в споре на платформе Konsensus.\n\nПерейди по ссылке, чтобы принять участие:\n${inviteUrl}\n\nKonsensus — платформа для конструктивного разрешения споров с ИИ-медиатором.`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    setEmail("");
    setShowEmail(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
        >
          {copied ? "Ссылка скопирована ✓" : "Поделиться ссылкой"}
        </button>
        <button
          onClick={() => setShowEmail((v) => !v)}
          className="border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          Отправить на email
        </button>
      </div>

      {showEmail && (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmailSend()}
            placeholder="email@example.com"
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-transparent"
            autoFocus
          />
          <button
            onClick={handleEmailSend}
            disabled={!email}
            className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            Отправить
          </button>
        </div>
      )}
    </div>
  );
}
