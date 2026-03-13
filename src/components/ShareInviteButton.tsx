"use client";

import { useState, useTransition } from "react";
import { sendDisputeInviteEmail } from "@/lib/actions";

export default function ShareInviteButton({
  inviteUrl,
  disputeTitle,
  creatorName,
}: {
  inviteUrl: string;
  disputeTitle: string;
  creatorName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isPending, startTransition] = useTransition();

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
        // отменил — fallback
      }
    }
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailSend = () => {
    if (!email || isPending) return;
    const fd = new FormData();
    fd.set("to_email", email);
    fd.set("invite_url", inviteUrl);
    fd.set("dispute_title", disputeTitle);
    fd.set("creator_name", creatorName);

    startTransition(async () => {
      await sendDisputeInviteEmail(fd);
      setEmailSent(true);
      setEmail("");
      setTimeout(() => {
        setEmailSent(false);
        setShowEmail(false);
      }, 3000);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleShare}
          className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {copied ? "Ссылка скопирована ✓" : "Скопировать ссылку"}
        </button>
        <button
          onClick={() => setShowEmail((v) => !v)}
          className="glass px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          Отправить на email
        </button>
      </div>

      {showEmail && (
        <div className="flex flex-col gap-2">
          {emailSent ? (
            <p className="text-sm text-green-400 flex items-center gap-1.5">
              ✓ Письмо отправлено
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSend()}
                placeholder="email@example.com"
                className="flex-1 border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                autoFocus
              />
              <button
                onClick={handleEmailSend}
                disabled={!email || isPending}
                className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
              >
                {isPending ? "..." : "Отправить"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
