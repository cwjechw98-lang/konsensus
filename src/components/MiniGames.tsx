"use client";

import { useState, useEffect, useCallback } from "react";

const SYMBOLS = ["▲", "■", "●", "◆", "✦", "✚"];

function buildSequenceTask() {
  const start = Math.floor(Math.random() * 8) + 1;
  const step = Math.floor(Math.random() * 4) + 1;
  const nextValue = start + step * 3;
  const generated = [start, start + step, start + step * 2];
  const wrongA = nextValue + (Math.random() > 0.5 ? step : -step);
  const wrongB = nextValue + (Math.random() > 0.5 ? step * 2 : -step * 2);

  return {
    sequence: generated,
    options: [nextValue, wrongA, wrongB].sort(() => Math.random() - 0.5),
    answer: nextValue,
  };
}

function buildSymbolTask() {
  const nextTarget = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const pool = [nextTarget];

  while (pool.length < 4) {
    const candidate = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    if (!pool.includes(candidate)) {
      pool.push(candidate);
    }
  }

  return {
    target: nextTarget,
    choices: pool.sort(() => Math.random() - 0.5),
  };
}

function pickFeaturedGames() {
  return [...GAMES].sort(() => Math.random() - 0.5).slice(0, 3).map((game) => game.id);
}

// ── Reaction Time Game ──
function ReactionGame() {
  const [state, setState] = useState<"idle" | "waiting" | "ready" | "done">("idle");
  const [startTime, setStartTime] = useState(0);
  const [result, setResult] = useState(0);
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("konsensus_reaction_best");
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBest(Number(saved));
    }
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
      if (active && timeLeft <= 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActive(false);
      }
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

function BiggerNumberGame() {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [active, setActive] = useState(false);

  const nextRound = useCallback(() => {
    setLeft(Math.floor(Math.random() * 90) + 10);
    setRight(Math.floor(Math.random() * 90) + 10);
  }, []);

  const start = () => {
    setScore(0);
    setTimeLeft(20);
    setActive(true);
    nextRound();
  };

  useEffect(() => {
    if (!active || timeLeft <= 0) {
      if (active && timeLeft <= 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActive(false);
      }
      return;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [active, timeLeft]);

  const choose = (picked: "left" | "right") => {
    if (!active) return;
    const correct = left === right ? picked : (left > right ? "left" : "right");
    if (picked === correct) {
      setScore((prev) => prev + 1);
    }
    nextRound();
  };

  return (
    <div className="text-center">
      <h3 className="text-sm font-bold text-white mb-3">📊 Больше число</h3>
      {!active && score === 0 && (
        <button onClick={start} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl text-sm font-semibold">
          20 секунд!
        </button>
      )}
      {active && (
        <>
          <p className="text-xs text-gray-500 mb-3">Нажмите на большее число</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => choose("left")} className="rounded-xl bg-white/8 hover:bg-white/12 px-4 py-6 text-2xl font-bold text-white">
              {left}
            </button>
            <button onClick={() => choose("right")} className="rounded-xl bg-white/8 hover:bg-white/12 px-4 py-6 text-2xl font-bold text-white">
              {right}
            </button>
          </div>
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <span>Очки: {score}</span>
            <span>⏱ {timeLeft}с</span>
          </div>
        </>
      )}
      {!active && score > 0 && (
        <div>
          <p className="text-lg font-bold text-white">{score} правильных ответов</p>
          <button onClick={start} className="mt-3 text-xs text-gray-400 hover:text-white">Ещё раз</button>
        </div>
      )}
    </div>
  );
}

function SequenceGame() {
  const [task, setTask] = useState(() => buildSequenceTask());
  const [score, setScore] = useState(0);

  const nextTask = useCallback(() => {
    setTask(buildSequenceTask());
  }, []);

  const choose = (value: number) => {
    if (value === task.answer) {
      setScore((prev) => prev + 1);
    } else {
      setScore(0);
    }
    nextTask();
  };

  return (
    <div className="text-center">
      <h3 className="text-sm font-bold text-white mb-3">🔺 Последовательность</h3>
      <p className="text-xl font-bold text-white tracking-wide">
        {task.sequence.join(" · ")} · ?
      </p>
      <p className="text-xs text-gray-500 mt-2">Выберите следующее число</p>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {task.options.map((option) => (
          <button
            key={option}
            onClick={() => choose(option)}
            className="rounded-xl bg-white/8 hover:bg-white/12 px-3 py-3 text-white font-semibold"
          >
            {option}
          </button>
        ))}
      </div>
      <p className="text-xs text-purple-400 mt-3">Серия: {score}</p>
    </div>
  );
}

function SymbolMatchGame() {
  const [task, setTask] = useState(() => buildSymbolTask());
  const [score, setScore] = useState(0);

  const nextTask = useCallback(() => {
    setTask(buildSymbolTask());
  }, []);

  const choose = (symbol: string) => {
    if (symbol === task.target) {
      setScore((prev) => prev + 1);
    } else {
      setScore((prev) => Math.max(0, prev - 1));
    }
    nextTask();
  };

  return (
    <div className="text-center">
      <h3 className="text-sm font-bold text-white mb-3">🎯 Найди символ</h3>
      <p className="text-xs text-gray-500 mb-2">Нажмите на такой же символ</p>
      <div className="text-4xl font-bold text-white mb-4">{task.target}</div>
      <div className="grid grid-cols-2 gap-2">
        {task.choices.map((symbol, index) => (
          <button
            key={`${symbol}-${index}`}
            onClick={() => choose(symbol)}
            className="rounded-xl bg-white/8 hover:bg-white/12 px-4 py-4 text-2xl text-white"
          >
            {symbol}
          </button>
        ))}
      </div>
      <p className="text-xs text-purple-400 mt-3">Точность: {score}</p>
    </div>
  );
}

// ── Main component ──
const GAMES = [
  { id: "reaction", label: "⚡ Реакция", component: ReactionGame },
  { id: "memory", label: "🧠 Память", component: MemoryGame },
  { id: "math", label: "🔢 Математика", component: MathGame },
  { id: "bigger", label: "📊 Больше", component: BiggerNumberGame },
  { id: "sequence", label: "🔺 Последовательность", component: SequenceGame },
  { id: "symbol", label: "🎯 Символ", component: SymbolMatchGame },
] as const;

export default function MiniGames() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [featuredGames] = useState(() => pickFeaturedGames());

  const GameComponent = GAMES.find((g) => g.id === activeGame)?.component;
  const featured = GAMES.filter((game) => featuredGames.includes(game.id));
  const remaining = GAMES.filter((game) => !featuredGames.includes(game.id));

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
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-purple-300/80 mb-2">
                  Сегодняшняя подборка
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {featured.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setActiveGame(g.id)}
                      className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-colors text-center"
                    >
                      <span className="text-lg">{g.label.split(" ")[0]}</span>
                      <p className="text-xs text-gray-300 mt-1">{g.label.split(" ").slice(1).join(" ")}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 mb-2">
                  Все мини-игры
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[...featured, ...remaining].map((g) => (
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
              </div>
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
