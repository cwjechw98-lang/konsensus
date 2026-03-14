"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/achievements";

const ACH = ACHIEVEMENTS["resolution"];
const PROFILE_HINT_KEY = "konsensus_profile_hint_shown";

// ─── Confetti ────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  "#a855f7", "#ec4899", "#3b82f6",
  "#10b981", "#f59e0b", "#e879f9",
  "#60a5fa", "#34d399",
];

type Piece = {
  id: number; left: number; color: string; size: number;
  duration: number; delay: number; isCircle: boolean;
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff);
  };
}

function Confetti({ active }: { active: boolean }) {
  const pieces = useMemo<Piece[]>(() => {
    const rng = seededRandom(42);
    return Array.from({ length: 72 }, (_, i) => ({
      id: i,
      left: rng() * 100,
      color: CONFETTI_COLORS[Math.floor(rng() * CONFETTI_COLORS.length)],
      size: 5 + rng() * 7,
      duration: 2.4 + rng() * 2.2,
      delay: rng() * 2.4,
      isCircle: rng() > 0.5,
    }));
  }, []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: -12,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.isCircle ? "50%" : "2px",
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards,
                        confettiDrift ${p.duration * 0.6}s ${p.delay}s ease-in-out infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─── Floating +30 points ─────────────────────────────────────────────────────
function FloatingPoints() {
  return (
    <div
      className="absolute -top-3 right-4 text-emerald-400 font-bold text-lg float-up pointer-events-none select-none"
      style={{ animationDelay: "0.6s" }}
    >
      +{ACH.points} очков
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ConsensusCelebration({
  commonGround,
  solutionIndex,
}: {
  commonGround?: string;
  solutionIndex: number;
}) {
  const [showHint, setShowHint] = useState(false);
  const [pointsVisible, setPointsVisible] = useState(false);
  const [confettiActive, setConfettiActive] = useState(true);

  useEffect(() => {
    // Show one-time profile hint
    if (typeof window !== "undefined") {
      const shown = localStorage.getItem(PROFILE_HINT_KEY);
      if (!shown) {
        setShowHint(true);
      }
    }
    // Trigger floating points after entrance
    const t1 = setTimeout(() => setPointsVisible(true), 400);
    // Stop confetti after 5s so it doesn't loop forever
    const t2 = setTimeout(() => setConfettiActive(false), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  function dismissHint() {
    localStorage.setItem(PROFILE_HINT_KEY, "1");
    setShowHint(false);
  }

  return (
    <>
      <Confetti active={confettiActive} />

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
            {["✨", "🎉", "✨"].map((s, i) => (
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
          {pointsVisible && <FloatingPoints />}

          <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-3">
            🏅 Достижение разблокировано
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
              <p className="text-purple-400 text-xs font-semibold mt-1.5">+{ACH.points} очков опыта</p>
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
                <span>Отслеживайте все достижения в личном кабинете</span>
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
