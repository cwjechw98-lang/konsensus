"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/achievements";

const ACH = ACHIEVEMENTS["resolution"];
const PROFILE_HINT_KEY = "konsensus_profile_hint_shown";

// ─── Main component ───────────────────────────────────────────────────────────
export default function ConsensusCelebration({
  commonGround,
  solutionIndex,
}: {
  commonGround?: string;
  solutionIndex: number;
}) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Show one-time profile hint
    if (typeof window !== "undefined") {
      const shown = localStorage.getItem(PROFILE_HINT_KEY);
      if (!shown) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowHint(true);
      }
    }
    return undefined;
  }, []);

  function dismissHint() {
    localStorage.setItem(PROFILE_HINT_KEY, "1");
    setShowHint(false);
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* ── Hero banner ── */}
        <div
          className="celebrate-in relative rounded-3xl p-8 text-center overflow-hidden consensus-glow"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(124,58,237,0.10) 50%, rgba(59,130,246,0.08) 100%)",
            border: "1px solid rgba(16,185,129,0.25)",
          }}
        >
          {/* Glow orbs */}
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Stars */}
          <div className="flex justify-center gap-3 mb-4">
            {["✨", "🤝", "✨"].map((s, i) => (
              <span
                key={i}
                className="star-pop text-2xl"
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                {s}
              </span>
            ))}
          </div>

          <h2
            className="text-3xl font-bold mb-2"
            style={{
              background: "linear-gradient(135deg, #34d399 0%, #a78bfa 50%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Консенсус достигнут!
          </h2>
          <p className="text-gray-400 text-sm">
            Обе стороны приняли решение №{solutionIndex + 1}
          </p>
        </div>

        {/* ── Common ground ── */}
        {commonGround && (
          <div
            className="celebrate-in rounded-2xl p-5"
            style={{
              animationDelay: "0.15s",
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.2)",
            }}
          >
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>🤝</span>
              <span>Что вас объединяет</span>
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">{commonGround}</p>
          </div>
        )}

        {/* ── Resolution achievement ── */}
        <div
          className="celebrate-in relative rounded-2xl p-5 overflow-hidden"
          style={{
            animationDelay: "0.3s",
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.25)",
          }}
        >
          <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-3">
            🧭 Сигнал профиля обновлён
          </p>

          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              {ACH.icon}
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">{ACH.title}</p>
              <p className="text-gray-400 text-sm mt-0.5">{ACH.desc}</p>
              <p className="text-purple-400 text-xs font-semibold mt-1.5">Результат добавлен в историю вашего стиля диалога</p>
            </div>
          </div>

          {/* One-time profile hint */}
          {showHint && (
            <div
              className="celebrate-in mt-4 pt-4 border-t border-white/8 flex items-center justify-between gap-3"
              style={{ animationDelay: "0.5s" }}
            >
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <span>💡</span>
                <span>Подробности можно посмотреть в личном профиле</span>
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href="/profile"
                  onClick={dismissHint}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors whitespace-nowrap"
                >
                  Открыть →
                </Link>
                <button
                  onClick={dismissHint}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  aria-label="Закрыть"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
