"use client";

import { useState, useEffect } from "react";

const STEPS = [
  {
    emoji: "👋",
    title: "Добро пожаловать в Konsensus!",
    desc: "Здесь споры решаются цивилизованно — с помощью нейтрального ИИ-медиатора. Давайте быстро покажем, как всё работает.",
  },
  {
    emoji: "⚖️",
    title: "Создайте первый спор",
    desc: "Нажмите «+ Новый спор», опишите ситуацию и выберите количество раундов. Это займёт меньше минуты.",
  },
  {
    emoji: "🔗",
    title: "Пригласите оппонента",
    desc: "После создания вы получите уникальную ссылку. Отправьте её второй стороне — он войдёт прямо в ваш спор, без регистрации не нужно.",
  },
  {
    emoji: "💬",
    title: "Обменивайтесь аргументами",
    desc: "Вы и оппонент излагаете позиции по очереди, раунд за раундом. Как чат, но структурированно — каждый слышан.",
  },
  {
    emoji: "🤖",
    title: "ИИ подводит итог",
    desc: "После всех раундов нейтральный ИИ-медиатор анализирует аргументы и предлагает 2–3 варианта решения. Без победителей и побеждённых.",
  },
];

const STORAGE_KEY = "konsensus_onboarding_done";

export default function OnboardingGuide() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Небольшая задержка чтобы страница успела загрузиться
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, "1");
    }, 350);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-350 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={dismiss}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-md glass rounded-2xl p-8 shadow-2xl shadow-black/50 border border-purple-500/20 transition-all duration-350 ${
          closing
            ? "opacity-0 translate-y-8 scale-95"
            : "opacity-100 translate-y-0 scale-100"
        }`}
      >
        {/* Skip */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-400 text-sm transition-colors"
        >
          Пропустить ✕
        </button>

        {/* Step indicator */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step
                  ? "bg-purple-500 w-6"
                  : i < step
                  ? "bg-purple-700 w-3"
                  : "bg-white/10 w-3"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">{current.emoji}</div>
          <h2 className="text-xl font-bold text-white mb-3">{current.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{current.desc}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 glass py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Назад
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 btn-ripple bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {step === STEPS.length - 1 ? "Начать! 🚀" : "Далее →"}
          </button>
        </div>

        {/* Step counter */}
        <p className="text-center text-xs text-gray-600 mt-4">
          {step + 1} из {STEPS.length}
        </p>
      </div>
    </div>
  );
}
