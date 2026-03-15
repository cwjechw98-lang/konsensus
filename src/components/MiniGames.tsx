"use client";

import { useState, useEffect, useCallback } from "react";

// ── Reaction Time Game ──
function ReactionGame() {
  const [state, setState] = useState<"idle" | "waiting" | "ready" | "done">("idle");
  const [startTime, setStartTime] = useState(0);
  const [result, setResult] = useState(0);
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("konsensus_reaction_best");
    if (saved) setBest(Number(saved));
  }, []);

  const start = () => {
    setState("waiting");
    const delay = 2000 + Math.random() * 4000;
    setTimeout(() => {
      setState("ready");
      setStartTime(Date.now());
    }, delay);
  };

  const click = () => {
    if (state === "waiting") {
      setState("idle"); // Clicked too early
      return;
    }
    if (state === "ready") {
      const ms = Date.now() - startTime;
      setResult(ms);
      setState("done");
      if (!best || ms < best) {
        setBest(ms);
        localStorage.setItem("konsensus_reaction_best", String(ms));
      }
    }
  };

  return (
    <div className="text-center">
      <h3 className="text-sm font-bold text-white mb-3">⚡ Реакция</h3>
      {state === "idle" && (
        <button onClick={start} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors">
          Начать
        </button>
      )}
      {state === "waiting" && (
        <button onClick={click} className="bg-red-600 text-white px-6 py-8 rounded-xl text-sm font-semibold w-full">
          Ждите зелёного...
        </button>
      )}
      {state === "ready" && (
        <button onClick={click} className="bg-green-500 hover:bg-green-400 text-white px-6 py-8 rounded-xl text-sm font-bold w-full animate-pulse">
          ЖМИТЕ!
        </button>
      )}
      {state === "done" && (
        <div>
          <p className="text-2xl font-bold text-white">{result} мс</p>
          {best && <p className="text-xs text-purple-400 mt-1">Рекорд: {best} мс</p>}
          <button onClick={start} className="mt-3 text-xs text-gray-400 hover:text-white">Ещё раз</button>
        </div>
      )}
    </div>
  );
}

// ── Memory Grid Game ──
function MemoryGame() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSeq, setPlayerSeq] = useState<number[]>([]);
  const [showingIdx, setShowingIdx] = useState(-1);
  const [phase, setPhase] = useState<"idle" | "showing" | "input" | "fail">("idle");
  const [score, setScore] = useState(0);

  const startRound = useCallback((level: number) => {
    const seq = Array.from({ length: level + 2 }, () => Math.floor(Math.random() * 9));
    setSequence(seq);
    setPlayerSeq([]);
    setPhase("showing");

    // Show sequence
    seq.forEach((_, i) => {
      setTimeout(() => setShowingIdx(i), (i + 1) * 600);
    });
    setTimeout(() => {
      setShowingIdx(-1);
      setPhase("input");
    }, (seq.length + 1) * 600);
  }, []);

  const start = () => {
    setScore(0);
    startRound(0);
  };

  const handleClick = (idx: number) => {
    if (phase !== "input") return;
    const newSeq = [...playerSeq, idx];
    setPlayerSeq(newSeq);

    if (sequence[newSeq.length - 1] !== idx) {
      setPhase("fail");
      return;
    }

    if (newSeq.length === sequence.length) {
      const newScore = score + 1;
      setScore(newScore);
      setTimeout(() => startRound(newScore), 500);
    }
  };

  return (
    <div className="text-center">
      <h3 className="text-sm font-bold text-white mb-3">🧠 Память</h3>
      {phase === "idle" && (
        <button onClick={start} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl text-sm font-semibold">
          Начать
        </button>
      )}
      {(phase === "showing" || phase === "input") && (
        <>
          <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto">
            {Array.from({ length: 9 }).map((_, i) => (
              <button
                key={i}
                onClick={() => handleClick(i)}
                className={`w-14 h-14 rounded-lg transition-all duration-200 ${
                  showingIdx >= 0 && sequence[showingIdx] === i
                    ? "bg-purple-500 scale-110"
                    : "bg-white/8 hover:bg-white/15"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {phase === "showing" ? "Запоминайте..." : "Повторите последовательность"}
          </p>
          <p className="text-xs text-purple-400 mt-1">Уровень: {score + 1}</p>
        </>
      )}
      {phase === "fail" && (
        <div>
          <p className="text-lg font-bold text-white">Уровень: {score}</p>
          <button onClick={start} className="mt-3 text-xs text-gray-400 hover:text-white">Заново</button>
        </div>
      )}
    </div>
  );
}

// ── Math Speed Game ──
function MathGame() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [active, setActive] = useState(false);

  const newProblem = () => {
    setA(Math.floor(Math.random() * 20) + 1);
    setB(Math.floor(Math.random() * 20) + 1);
    setAnswer("");
  };

  const start = () => {
    setScore(0);
    setTimeLeft(30);
    setActive(true);
    newProblem();
  };

  useEffect(() => {
    if (!active || timeLeft <= 0) {
      if (active && timeLeft <= 0) setActive(false);
      return;
    }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [active, timeLeft]);

  const check = (val: string) => {
    setAnswer(val);
    if (Number(val) === a + b) {
      setScore(score + 1);
      newProblem();
    }
  };

  return (
    <div className="text-center">
      <h3 className="text-sm font-bold text-white mb-3">🔢 Математика</h3>
      {!active && timeLeft === 0 && score === 0 && (
        <button onClick={start} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl text-sm font-semibold">
          30 секунд!
        </button>
      )}
      {active && (
        <>
          <p className="text-2xl font-bold text-white">{a} + {b} = ?</p>
          <input
            type="number"
            value={answer}
            onChange={(e) => check(e.target.value)}
            className="mt-3 w-24 text-center bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-white text-lg"
            autoFocus
          />
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <span>Решено: {score}</span>
            <span>⏱ {timeLeft}с</span>
          </div>
        </>
      )}
      {!active && score > 0 && (
        <div>
          <p className="text-lg font-bold text-white">{score} правильных за 30с!</p>
          <button onClick={start} className="mt-3 text-xs text-gray-400 hover:text-white">Ещё раз</button>
        </div>
      )}
    </div>
  );
}

// ── Main component ──
const GAMES = [
  { id: "reaction", label: "⚡ Реакция", component: ReactionGame },
  { id: "memory", label: "🧠 Память", component: MemoryGame },
  { id: "math", label: "🔢 Математика", component: MathGame },
] as const;

export default function MiniGames() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const GameComponent = GAMES.find((g) => g.id === activeGame)?.component;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          🎮 Мини-игры пока ждёте
        </span>
        <span className="text-gray-600 text-xs">{collapsed ? "▼" : "▲"}</span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4">
          {!activeGame && (
            <div className="grid grid-cols-3 gap-2">
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGame(g.id)}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-center"
                >
                  <span className="text-lg">{g.label.split(" ")[0]}</span>
                  <p className="text-xs text-gray-400 mt-1">{g.label.split(" ").slice(1).join(" ")}</p>
                </button>
              ))}
            </div>
          )}

          {activeGame && GameComponent && (
            <div>
              <button
                onClick={() => setActiveGame(null)}
                className="text-xs text-gray-500 hover:text-gray-300 mb-3"
              >
                ← Назад к играм
              </button>
              <GameComponent />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
