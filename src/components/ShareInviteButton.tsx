"use client";

import { useState } from "react";

export default function ShareInviteButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

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

  return (
    <button
      onClick={handleShare}
      className="bg-foreground text-background px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
    >
      {copied ? "Ссылка скопирована ✓" : "Отправить приглашение"}
    </button>
  );
}
