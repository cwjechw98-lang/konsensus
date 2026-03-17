"use client";

import type { RPGStats } from "@/lib/rpg";
import type { PublicReputationBadge } from "@/lib/reputation";
import PublicReputationBadges from "@/components/PublicReputationBadges";

interface RPGProfileCardProps {
  stats: RPGStats;
  displayName: string;
  bio?: string | null;
  compact?: boolean;
  reputationBadges?: PublicReputationBadge[];
}

function StatBar({ label, value }: { label: string; value: number }) {
  const filled = Math.round(value / 10);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-gray-400 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-3 rounded-sm ${
              i < filled ? "bg-purple-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <span className="text-gray-300 w-6 text-right">{value}</span>
    </div>
  );
}

export default function RPGProfileCard({
  stats,
  displayName,
  bio,
  compact,
  reputationBadges = [],
}: RPGProfileCardProps) {
  if (compact) {
    return (
      <div className="glass rounded-xl p-4 min-w-[260px] max-w-[300px] shadow-2xl border border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full">
            Профиль диалога
          </span>
          <span className="text-xs text-gray-500">Опыт: {stats.xp}</span>
        </div>
        <p className="text-sm font-semibold text-white mb-3 truncate">{displayName}</p>
        <div className="flex flex-col gap-1.5 mb-3">
          <StatBar label="Аргументация" value={stats.argumentation} />
          <StatBar label="Дипломатия" value={stats.diplomacy} />
          <StatBar label="Активность" value={stats.activity} />
          <StatBar label="Выдержка" value={stats.persistence} />
        </div>
        {bio && (
          <p className="text-xs text-gray-400 italic leading-tight border-t border-white/8 pt-2">
            ❝ {bio.slice(0, 80)}{bio.length > 80 ? "…" : ""} ❞
          </p>
        )}
        {reputationBadges.length > 0 && (
          <div className="mt-3 border-t border-white/8 pt-3">
            <PublicReputationBadges badges={reputationBadges} compact title="Стиль" />
          </div>
        )}
        <p className="text-xs text-gray-600 mt-2 text-center">
          Короткий срез по тому, как человек обычно ведёт диалог.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 border border-purple-500/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm font-bold text-purple-400 bg-purple-500/15 px-3 py-1 rounded-full">
            Профиль диалога
          </span>
          <p className="text-xs text-gray-500 mt-1">Спокойный срез сильных и слабых сторон в споре</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{stats.xp}</p>
          <p className="text-xs text-gray-500">Опыт диалога</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 mb-4">
        <StatBar label="Аргументация" value={stats.argumentation} />
        <StatBar label="Дипломатия" value={stats.diplomacy} />
        <StatBar label="Активность" value={stats.activity} />
        <StatBar label="Выдержка" value={stats.persistence} />
      </div>

      {bio && (
        <div className="border-t border-white/8 pt-4">
          <p className="text-sm text-gray-300 italic leading-relaxed">
            ❝ {bio} ❞
          </p>
        </div>
      )}

      {reputationBadges.length > 0 && (
        <div className="mt-4 border-t border-white/8 pt-4">
          <PublicReputationBadges badges={reputationBadges} />
        </div>
      )}
    </div>
  );
}
