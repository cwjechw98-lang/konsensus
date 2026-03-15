"use client";

import { useEffect, useMemo, useState } from "react";

type Dot = { id: number; x: number; y: number; size: number };

function randomDots(seed: number) {
  return Array.from({ length: 8 }, (_, index) => ({
    id: seed + index,
    x: Math.random() * 84 + 4,
    y: Math.random() * 70 + 10,
    size: Math.random() * 12 + 8,
  }));
}

export default function SpectatorPulseGame({ collapseToken }: { collapseToken: string }) {
  const [score, setScore] = useState(0);
  const [dots, setDots] = useState<Dot[]>(() => randomDots(Date.now()));
  const [expandedToken, setExpandedToken] = useState(collapseToken);

  useEffect(() => {
    const timeout = setTimeout(() => setExpandedToken(collapseToken), 2200);
    return () => clearTimeout(timeout);
  }, [collapseToken]);

  const collapsed = expandedToken !== collapseToken;

  const label = useMemo(() => {
    if (score < 5) return "разогрев";
    if (score < 12) return "в потоке";
    return "зрительский MVP";
  }, [score]);

  function eatDot(dotId: number) {
    setScore((value) => value + 1);
    setDots((current) =>
      current.map((dot) =>
        dot.id === dotId
          ? {
              ...dot,
              x: Math.random() * 84 + 4,
              y: Math.random() * 70 + 10,
              size: Math.random() * 12 + 8,
            }
          : dot
      )
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80 mb-1">
            spectator idle-game
          </p>
          <p className="text-sm text-gray-300">
            Собирайте импульсы, пока ждёте следующий ответ.
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-cyan-200">{score}</p>
          <p className="text-xs text-cyan-300/70">{label}</p>
        </div>
      </div>

      <div className={`transition-all duration-500 ${collapsed ? "opacity-35 scale-[0.985]" : "opacity-100 scale-100"}`}>
        <div className="relative h-44 overflow-hidden rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_45%),linear-gradient(180deg,rgba(10,14,25,0.95),rgba(10,14,25,0.75))]">
          {dots.map((dot) => (
            <button
              key={dot.id}
              type="button"
              onClick={() => eatDot(dot.id)}
              className="absolute rounded-full border border-cyan-300/40 bg-cyan-300/30 shadow-[0_0_18px_rgba(103,232,249,0.25)] transition-transform hover:scale-110"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
              }}
              aria-label="Собрать импульс"
            />
          ))}

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3 text-xs text-gray-400">
            <span>Новый ответ мягко сворачивает игру, чтобы battle оставался главным.</span>
            <button
              type="button"
              onClick={() => {
                setScore(0);
                setDots(randomDots(Date.now()));
              }}
              className="text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
