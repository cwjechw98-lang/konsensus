"use client";

import { useState, useRef } from "react";
import type { PublicReputationBadge } from "@/lib/reputation";
import PublicReputationBadges from "@/components/PublicReputationBadges";
import { acceptChallenge, createChallenge } from "@/lib/arena-actions";
import SubmitButton from "@/components/SubmitButton";

const CATEGORY_FILTERS: { value: string; label: string; icon: string }[] = [
  { value: "all", label: "Все", icon: "🌐" },
  { value: "politics", label: "Политика", icon: "🏛" },
  { value: "technology", label: "Технологии", icon: "💻" },
  { value: "philosophy", label: "Философия", icon: "🧠" },
  { value: "lifestyle", label: "Быт", icon: "🏠" },
  { value: "science", label: "Наука", icon: "🔬" },
  { value: "culture", label: "Культура", icon: "🎭" },
  { value: "economics", label: "Экономика", icon: "💰" },
  { value: "relationships", label: "Отношения", icon: "💬" },
  { value: "other", label: "Другое", icon: "📌" },
];

interface ChallengeWithAuthor {
  id: string;
  topic: string;
  position_hint: string;
  status: string;
  category: string;
  max_rounds: number;
  created_at: string;
  author: {
    id: string;
    display_name: string | null;
    bio: string | null;
  };
  reputationBadges: PublicReputationBadge[];
}

interface ChallengeBoardProps {
  challenges: ChallengeWithAuthor[];
  currentUserId: string | null;
  canCreatePublicChallenge: boolean;
  canJoinPublicChallenge: boolean;
}

function AuthorSummaryCard({
  displayName,
  bio,
  reputationBadges,
}: {
  displayName: string;
  bio: string | null;
  reputationBadges: PublicReputationBadge[];
}) {
  return (
    <div className="min-w-[260px] max-w-[320px] rounded-2xl border border-white/10 bg-[#171223]/95 p-4 shadow-2xl shadow-black/30">
      <p className="text-sm font-semibold text-white">{displayName}</p>
      {bio ? (
        <p className="mt-2 text-xs leading-relaxed text-gray-400">{bio}</p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          Короткое описание пока не заполнено.
        </p>
      )}
      {reputationBadges.length > 0 ? (
        <div className="mt-3 border-t border-white/8 pt-3">
          <PublicReputationBadges badges={reputationBadges} compact title="Стиль диалога" />
        </div>
      ) : null}
    </div>
  );
}

function CreateChallengeForm({ onClose }: { onClose: () => void }) {
  const [rounds, setRounds] = useState(3);

  return (
      <div className="glass rounded-2xl p-6 border border-purple-500/30 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Открыть публичный диспут</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
      </div>
      <form action={createChallenge} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-gray-300">Тема дискуссии</span>
          <input
            name="topic"
            required
            minLength={5}
            maxLength={200}
            placeholder="Например: Удалённая работа эффективнее офисной"
            className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-gray-300">Ваша позиция</span>
          <textarea
            name="position_hint"
            required
            minLength={10}
            maxLength={400}
            rows={3}
            placeholder="Кратко опишите свою позицию по этой теме..."
            className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors text-sm resize-none"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-gray-300">Количество раундов</span>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRounds(value)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  rounds === value
                    ? "bg-purple-600 text-white"
                    : "glass text-gray-400 hover:text-white"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <input type="hidden" name="max_rounds" value={rounds} />
        </div>
        <div className="flex gap-3">
          <SubmitButton
            pendingText="Публикуем вызов..."
            className="btn-ripple flex-1 rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Открыть диспут
          </SubmitButton>
          <button
            type="button"
            onClick={onClose}
            className="px-4 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

function ChallengeCard({
  challenge,
  currentUserId,
  canJoinPublicChallenge,
}: {
  challenge: ChallengeWithAuthor;
  currentUserId: string | null;
  canJoinPublicChallenge: boolean;
}) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isOwnChallenge = challenge.author.id === currentUserId;
  const canAccept = !!currentUserId && !isOwnChallenge && canJoinPublicChallenge;

  return (
    <div
      ref={cardRef}
      className="relative glass rounded-2xl p-5 border border-white/8 hover:border-purple-500/30 transition-all"
    >
      {/* Author hover area */}
      <div
        className="relative inline-block mb-3"
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <button className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors">
          <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs">
            {(challenge.author.display_name ?? "?")[0].toUpperCase()}
          </span>
          <span className="font-medium">{challenge.author.display_name ?? "Аноним"}</span>
          <span className="text-xs text-gray-600">▾</span>
        </button>

        {/* Tooltip */}
        {tooltipVisible && (
          <div className="absolute top-full left-0 mt-2 z-50 drop-shadow-2xl">
            <AuthorSummaryCard
              displayName={challenge.author.display_name ?? "Аноним"}
              bio={challenge.author.bio}
              reputationBadges={challenge.reputationBadges}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-base font-semibold text-white leading-snug flex-1">{challenge.topic}</h3>
        {(() => {
          const cat = CATEGORY_FILTERS.find((f) => f.value === challenge.category);
          return cat ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 flex-shrink-0">
              {cat.icon}
            </span>
          ) : null;
        })()}
      </div>
      <p className="text-sm text-gray-400 leading-relaxed mb-4">
        <span className="text-gray-600 text-xs uppercase tracking-wide">Позиция: </span>
        {challenge.position_hint}
      </p>
      <p className="text-xs text-gray-600 mb-4">
        {challenge.max_rounds} {challenge.max_rounds === 1 ? "раунд" : challenge.max_rounds < 5 ? "раунда" : "раундов"} · авто-медиация в финале
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">
          {new Date(challenge.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
        </span>
        {canAccept ? (
          <form action={acceptChallenge.bind(null, challenge.id)}>
            <SubmitButton
              pendingText="Входим..."
              className="btn-ripple rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Присоединиться
            </SubmitButton>
          </form>
        ) : isOwnChallenge ? (
          <span className="text-xs text-gray-600 italic">Ваша открытая тема</span>
        ) : currentUserId && !canJoinPublicChallenge ? (
          <span className="text-xs text-yellow-200">Нужен Linked</span>
        ) : (
          <span className="text-xs text-gray-600">Войдите чтобы принять</span>
        )}
      </div>
    </div>
  );
}

export default function ChallengeBoard({
  challenges,
  currentUserId,
  canCreatePublicChallenge,
  canJoinPublicChallenge,
}: ChallengeBoardProps) {
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = categoryFilter === "all"
    ? challenges
    : challenges.filter((c) => c.category === categoryFilter);

  // Only show categories that have challenges
  const activeCats = new Set(challenges.map((c) => c.category));

  return (
    <div>
      {/* Category filters */}
      {challenges.length > 0 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.filter((f) => f.value === "all" || activeCats.has(f.value)).map((f) => (
            <button
              key={f.value}
              onClick={() => setCategoryFilter(f.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === f.value
                  ? "bg-purple-600/25 text-purple-300 border border-purple-500/40"
                  : "glass text-gray-500 hover:text-gray-300"
              }`}
            >
              <span>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">
          {filtered.length > 0
            ? `${filtered.length} открытых тем`
            : "Нет открытых тем"}
        </p>
        {currentUserId && (
          canCreatePublicChallenge ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-ripple text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Открыть диспут
            </button>
          ) : (
            <span className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
              Для открытия публичной темы нужен Trusted
            </span>
          )
        )}
      </div>

      {/* Create form */}
      {showForm && <CreateChallengeForm onClose={() => setShowForm(false)} />}

      {/* Challenges grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-gray-400 text-sm">
            {challenges.length === 0 ? "Откройте первую публичную тему." : "В этой категории пока нет открытых тем"}
          </p>
          {!currentUserId && challenges.length === 0 && (
            <p className="text-gray-600 text-xs mt-2">
              <a href="/login" className="text-purple-400 hover:underline">Войдите</a>, чтобы открыть публичный диспут
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              currentUserId={currentUserId}
              canJoinPublicChallenge={canJoinPublicChallenge}
            />
          ))}
        </div>
      )}
    </div>
  );
}
