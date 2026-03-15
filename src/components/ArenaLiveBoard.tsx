"use client";

import Link from "next/link";

interface LiveChallenge {
  id: string;
  topic: string;
  max_rounds: number;
  message_count: number;
  author_name: string;
  opponent_name: string;
  status: string;
}

export default function ArenaLiveBoard({
  challenges,
}: {
  challenges: LiveChallenge[];
}) {
  if (challenges.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">👁️</span>
          <h2 className="text-lg font-semibold text-white">Идущие бои</h2>
        </div>
        <p className="text-sm text-gray-400">
          Прямо сейчас активных battle нет. Как только кто-то примет вызов, он появится здесь для наблюдения.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">👁️</span>
            <h2 className="text-lg font-semibold text-white">Идущие бои</h2>
          </div>
          <p className="text-sm text-gray-400">
            Смотреть можно без входа. Писать в сам battle могут только участники.
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          live
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {challenges.map((challenge) => {
          const completedRounds = Math.floor(challenge.message_count / 2);
          return (
            <Link
              key={challenge.id}
              href={`/arena/${challenge.id}`}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition-colors hover:border-emerald-500/30 hover:bg-white/[0.05]"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-300">
                  battle live
                </span>
                <span className="text-xs text-gray-500">
                  {completedRounds}/{challenge.max_rounds} раундов
                </span>
              </div>

              <h3 className="text-base font-semibold text-white mb-2 leading-snug">
                {challenge.topic}
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                {challenge.author_name} vs {challenge.opponent_name}
              </p>
              <p className="text-xs text-gray-600">
                Открыть live battle →
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
