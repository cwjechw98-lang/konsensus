"use client";

import { useEffect, useState } from "react";

const AMBIENT_LINES = {
  dispute: [
    "ИИ собирает контекст и удерживает напряжение в безопасной зоне.",
    "Пока оппонент думает, система сопоставляет тон, логику и скрытые точки трения.",
    "Иногда лучшая пауза полезнее самого быстрого ответа.",
  ],
  arena: [
    "Арена не спешит: хороший раунд любит точный тайминг.",
    "Пока ход не сделан, тема как будто висит в воздухе и собирает напряжение.",
    "Здесь важен не шум, а момент, когда мысль попадает точно в цель.",
  ],
} as const;

export default function WaitingAmbient({
  variant = "dispute",
}: {
  variant?: keyof typeof AMBIENT_LINES;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % AMBIENT_LINES[variant].length);
    }, 5000);

    return () => clearInterval(timer);
  }, [variant]);

  return (
    <div className="glass rounded-2xl p-4 overflow-hidden relative border border-white/8">
      <div className="ambient-stage h-36 rounded-xl relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.14),transparent_45%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]">
        <div className="ambient-ring ambient-ring-one" />
        <div className="ambient-ring ambient-ring-two" />
        <div className="ambient-orb ambient-orb-main" />
        <div className="ambient-orb ambient-orb-side" />
        <div className="ambient-orb ambient-orb-small" />

        <div className="absolute inset-x-4 bottom-4 z-10">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500 mb-2">
            {variant === "arena" ? "Арена в паузе" : "Момент ожидания"}
          </p>
          <p className="text-sm text-gray-300 leading-relaxed min-h-[2.75rem] transition-opacity duration-500">
            {AMBIENT_LINES[variant][index]}
          </p>
        </div>
      </div>

      <style jsx>{`
        .ambient-stage::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.08) 18%, transparent 36%),
            linear-gradient(300deg, transparent 0%, rgba(255,255,255,0.05) 14%, transparent 28%);
          animation: shimmer 9s linear infinite;
        }

        .ambient-ring {
          position: absolute;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          filter: blur(0.2px);
        }

        .ambient-ring-one {
          width: 180px;
          height: 180px;
          left: -30px;
          top: -70px;
          animation: rotateSlow 18s linear infinite;
        }

        .ambient-ring-two {
          width: 120px;
          height: 120px;
          right: 20px;
          top: 14px;
          animation: rotateSlowReverse 13s linear infinite;
        }

        .ambient-orb {
          position: absolute;
          border-radius: 999px;
          mix-blend-mode: screen;
        }

        .ambient-orb-main {
          width: 68px;
          height: 68px;
          left: 28px;
          top: 34px;
          background: radial-gradient(circle, rgba(251,191,36,0.65) 0%, rgba(249,115,22,0.18) 55%, transparent 72%);
          animation: driftMain 7s ease-in-out infinite;
        }

        .ambient-orb-side {
          width: 54px;
          height: 54px;
          right: 44px;
          top: 26px;
          background: radial-gradient(circle, rgba(96,165,250,0.55) 0%, rgba(59,130,246,0.16) 58%, transparent 74%);
          animation: driftSide 8.5s ease-in-out infinite;
        }

        .ambient-orb-small {
          width: 24px;
          height: 24px;
          right: 104px;
          top: 76px;
          background: radial-gradient(circle, rgba(196,181,253,0.8) 0%, rgba(168,85,247,0.12) 58%, transparent 78%);
          animation: driftSmall 5.8s ease-in-out infinite;
        }

        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotateSlowReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes driftMain {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(14px, -8px, 0) scale(1.08); }
        }

        @keyframes driftSide {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-16px, 10px, 0) scale(0.94); }
        }

        @keyframes driftSmall {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.7; }
          50% { transform: translate3d(10px, -12px, 0); opacity: 1; }
        }

        @keyframes shimmer {
          from { transform: translateX(-20%); opacity: 0.45; }
          to { transform: translateX(20%); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
