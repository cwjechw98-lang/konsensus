"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { createDispute } from "@/lib/actions";

// ─── Templates ────────────────────────────────────────────────────────────────
type Template = {
  emoji: string;
  category: string;
  title: string;
  description: string;
};

const TEMPLATES: Template[] = [
  {
    emoji: "💰",
    category: "Финансы",
    title: "Крупная покупка или трата",
    description: "Один из нас хочет потратить значительную сумму (техника, ремонт, машина, путешествие), другой считает это нецелесообразным сейчас. Нужно договориться о приоритетах.",
  },
  {
    emoji: "💳",
    category: "Финансы",
    title: "Как делить общие расходы",
    description: "Спор о том, как справедливо делить общие траты: поровну, пропорционально доходам или как-то иначе.",
  },
  {
    emoji: "📈",
    category: "Финансы",
    title: "Инвестировать или копить",
    description: "Разные взгляды на то, что делать со сбережениями: вложить в активы с риском или держать в надёжном месте.",
  },
  {
    emoji: "🧹",
    category: "Быт",
    title: "Распределение домашних обязанностей",
    description: "Не можем договориться о справедливом разделении домашних дел. Один считает, что делает больше, другой видит ситуацию иначе.",
  },
  {
    emoji: "🏠",
    category: "Быт",
    title: "Переезд: вместе или раздельно",
    description: "Обсуждаем переезд — жить вместе, в другой город, сменить жильё. Взгляды расходятся и нужно прийти к общему решению.",
  },
  {
    emoji: "🐾",
    category: "Быт",
    title: "Заводить ли питомца",
    description: "Один хочет завести животное дома, другой против — из-за аллергии, затрат, ответственности или образа жизни.",
  },
  {
    emoji: "💼",
    category: "Работа",
    title: "Работа vs личная жизнь",
    description: "Конфликт из-за того, что один партнёр или коллега уделяет работе слишком много времени в ущерб отношениям или совместным планам.",
  },
  {
    emoji: "🏢",
    category: "Работа",
    title: "Офис или удалёнка",
    description: "Разные взгляды на формат работы: один считает, что в офисе эффективнее, другой настаивает на удалённой работе.",
  },
  {
    emoji: "📋",
    category: "Работа",
    title: "Приоритеты в рабочих задачах",
    description: "Не можем договориться о том, какие задачи важнее и как расставить приоритеты. Конфликт затрагивает сроки и распределение нагрузки.",
  },
  {
    emoji: "👨‍👩‍👧",
    category: "Семья",
    title: "Подход к воспитанию детей",
    description: "Разные взгляды на воспитание: строгость vs свобода, гаджеты, секции, школа. Нужно выработать единый подход.",
  },
  {
    emoji: "⏰",
    category: "Семья",
    title: "Время с семьёй vs личное время",
    description: "Один считает, что нужно проводить больше времени вместе, другой настаивает на праве на личное пространство и время с друзьями.",
  },
  {
    emoji: "✈️",
    category: "Семья",
    title: "Как проводить отпуск",
    description: "Конфликт о формате отдыха: активный или пляжный, путешествие или дача, вместе или раздельно с друзьями.",
  },
  {
    emoji: "📱",
    category: "Отношения",
    title: "Телефон и соцсети в отношениях",
    description: "Один считает, что другой слишком много времени проводит в телефоне — за столом, в постели, в компании. Это стало источником конфликтов.",
  },
  {
    emoji: "🌱",
    category: "Взгляды",
    title: "Экология и образ жизни",
    description: "Разные взгляды на потребление, питание, отходы, транспорт. Один хочет изменить привычки ради экологии, другой не видит смысла.",
  },
  {
    emoji: "🎮",
    category: "Взгляды",
    title: "Хобби, которое мешает",
    description: "Хобби одного из нас (игры, спорт, коллекционирование, тусовки) занимает слишком много времени или денег по мнению другого.",
  },
];

const CATEGORIES = ["Все", ...Array.from(new Set(TEMPLATES.map((t) => t.category)))];

// ─── Rounds selector ──────────────────────────────────────────────────────────
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
              rounds === p ? "bg-purple-600 text-white" : "glass text-gray-400 hover:text-white"
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
          onChange={(e) => setRounds(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
          className="border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-purple-500/50 transition-colors"
        />
        <span className="text-xs text-gray-500">раунд(ов), макс. 20</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NewDisputePage() {
  const [showOpponentField, setShowOpponentField] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const filtered = activeCategory === "Все"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory);

  function applyTemplate(t: Template) {
    setTitle(t.title);
    setDescription(t.description);
    setSelectedTemplate(t.title);
    // Scroll to form
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function clearTemplate() {
    setSelectedTemplate(null);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
      >
        &larr; Мои споры
      </Link>

      <h1 className="text-2xl font-bold text-white mb-1">Новый спор</h1>
      <p className="text-sm text-gray-500 mb-8">Опишите суть — ИИ поможет найти решение</p>

      {/* ── Templates ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>✨</span>
          <span>Начать с шаблона</span>
        </p>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                  : "glass text-gray-500 hover:text-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((t) => {
            const isSelected = selectedTemplate === t.title;
            return (
              <button
                key={t.title}
                type="button"
                onClick={() => applyTemplate(t)}
                className={`text-left rounded-xl px-3 py-2.5 transition-all group ${
                  isSelected
                    ? "bg-purple-500/15 border border-purple-500/40"
                    : "glass hover:border-white/15 hover:bg-white/6"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg flex-shrink-0">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? "text-purple-200" : "text-gray-300 group-hover:text-white"}`}>
                      {t.title}
                    </p>
                    <p className="text-xs text-gray-600">{t.category}</p>
                  </div>
                  {isSelected && <span className="ml-auto text-purple-400 flex-shrink-0">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Form ── */}
      <div ref={formRef} className="glass rounded-2xl p-6 sm:p-8">
        {selectedTemplate && (
          <div className="flex items-center justify-between mb-4 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-xs text-purple-400 flex items-center gap-1.5">
              <span>✨</span>
              <span>Шаблон применён — отредактируйте под свою ситуацию</span>
            </p>
            <button
              type="button"
              onClick={clearTemplate}
              className="text-xs text-gray-600 hover:text-gray-400 ml-2 flex-shrink-0 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        <form action={createDispute} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">Название спора</span>
            <input
              name="title"
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSelectedTemplate(null); }}
              className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="Кратко опишите суть спора"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">Описание проблемы</span>
            <textarea
              name="description"
              required
              rows={5}
              value={description}
              onChange={(e) => { setDescription(e.target.value); setSelectedTemplate(null); }}
              className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-y"
              placeholder="Подробно опишите ситуацию и в чём заключается спор"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">Количество раундов</span>
            <RoundsSelector />
          </div>

          {/* Прямой вызов */}
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
