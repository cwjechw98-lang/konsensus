"use client";

import { useState } from "react";
import Link from "next/link";
import { createDispute } from "@/lib/actions";

const ROUND_PRESETS = [1, 3, 5, 10];

function RoundsSelector() {
  const [rounds, setRounds] = useState(3);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        {ROUND_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setRounds(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              rounds === p
                ? "bg-purple-600 text-white"
                : "glass text-gray-400 hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
        <span className="text-xs text-gray-600 self-center ml-1">или</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          name="max_rounds"
          type="number"
          min={1}
          max={20}
          value={rounds}
          onChange={(e) => {
            const v = Math.min(20, Math.max(1, parseInt(e.target.value) || 1));
            setRounds(v);
          }}
          className="border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-purple-500/50 transition-colors"
        />
        <span className="text-xs text-gray-500">раунд(ов), макс. 20</span>
      </div>
    </div>
  );
}

export default function NewDisputePage() {
  const [showOpponentField, setShowOpponentField] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
      >
        &larr; Мои споры
      </Link>

      <h1 className="text-2xl font-bold text-white mb-1">Новый спор</h1>
      <p className="text-sm text-gray-500 mb-8">
        Опишите суть — ИИ поможет найти решение
      </p>

      <div className="glass rounded-2xl p-8">
        <form action={createDispute} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">
              Название спора
            </span>
            <input
              name="title"
              type="text"
              required
              maxLength={200}
              className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="Кратко опишите суть спора"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">
              Описание проблемы
            </span>
            <textarea
              name="description"
              required
              rows={5}
              className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-y"
              placeholder="Подробно опишите ситуацию и в чём заключается спор"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">
              Количество раундов
            </span>
            <RoundsSelector />
          </div>

          {/* Прямой вызов: необязательное поле */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setShowOpponentField((v) => !v)}
              className="text-left text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5"
            >
              <span className={`transition-transform ${showOpponentField ? "rotate-90" : ""}`}>▶</span>
              {showOpponentField ? "Скрыть" : "Пригласить конкретного оппонента (необязательно)"}
            </button>
            {showOpponentField && (
              <div className="flex flex-col gap-1.5 mt-1">
                <input
                  name="opponent_email"
                  type="email"
                  className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="email оппонента (если уже зарегистрирован)"
                />
                <p className="text-xs text-gray-600">
                  Если пользователь найден — спор сразу начнётся для него. Иначе — создаётся обычная ссылка-приглашение.
                </p>
              </div>
            )}
          </div>

          {/* Публичный спор */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-300">Публичный спор</p>
              <p className="text-xs text-gray-600 mt-0.5">Виден всем в ленте без регистрации</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? "bg-purple-600" : "bg-white/10"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <input type="hidden" name="is_public" value={isPublic ? "true" : "false"} />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              Создать спор
            </button>
            <Link
              href="/dashboard"
              className="glass px-6 py-2.5 rounded-lg font-medium text-gray-300 hover:text-white transition-colors"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
