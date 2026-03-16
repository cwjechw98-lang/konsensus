"use client";

import { useState, useEffect } from "react";

type GuideStep = {
  eyebrow: string;
  title: string;
  desc: string;
  previewTitle: string;
  previewItems: string[];
  accent: string;
};

const STEPS: GuideStep[] = [
  {
    eyebrow: "Добро пожаловать",
    title: "Добро пожаловать в Konsensus!",
    desc: "Здесь конфликт переводится в управляемый диалог. Сейчас быстро покажем, где находятся основные разделы и что в них происходит.",
    previewTitle: "Как устроен интерфейс",
    previewItems: [
      "Споры — ваш рабочий экран",
      "Открытые — куда можно вступить",
      "Арена — бои и наблюдение",
      "События — публичная активность проекта",
      "Профиль — ачивки, архив, ИИ-профиль",
    ],
    accent: "from-purple-500/20 via-cyan-500/10 to-transparent",
  },
  {
    eyebrow: "Раздел 1",
    title: "Споры — главная рабочая точка",
    desc: "Именно сюда вы будете попадать по умолчанию после входа. Здесь создаются новые споры, видны активные, архивные и те, что ждут вашего следующего шага.",
    previewTitle: "Что здесь важно",
    previewItems: [
      "Создать новый спор",
      "Войти по инвайт-коду",
      "Отслеживать активные и архивные споры",
      "Видеть напоминания по архиву",
    ],
    accent: "from-purple-500/20 via-violet-500/10 to-transparent",
  },
  {
    eyebrow: "Раздел 2",
    title: "Открытые — всё, куда можно вступить",
    desc: "Здесь собраны открытые споры и вызовы, которые ждут оппонента. Это экран для поиска темы и быстрого входа в уже созданный конфликт.",
    previewTitle: "Что будет внутри",
    previewItems: [
      "Открытые споры",
      "Открытые вызовы арены",
      "Фильтры по категориям",
      "Быстрый вход в спор",
    ],
    accent: "from-cyan-500/20 via-sky-500/10 to-transparent",
  },
  {
    eyebrow: "Раздел 3",
    title: "Арена — открытые бои",
    desc: "Это отдельная публичная зона: вызовы, режим наблюдения, чат зрителей и живой ход спора. Арена не заменяет ваши личные споры, а дополняет их.",
    previewTitle: "Что будет внутри",
    previewItems: [
      "Открытые бои",
      "Режим наблюдения",
      "Чат зрителей",
      "Наблюдение за ходом спора",
    ],
    accent: "from-red-500/20 via-orange-500/10 to-transparent",
  },
  {
    eyebrow: "Раздел 4",
    title: "События — публичная активность проекта",
    desc: "Этот раздел не про вступление в спор, а про наблюдение за жизнью платформы: публичные дискуссии, обновления и заметные движения внутри проекта.",
    previewTitle: "Что будет внутри",
    previewItems: [
      "Публичные споры",
      "Релизы и обновления",
      "События арены",
      "Общая движуха проекта",
    ],
    accent: "from-emerald-500/20 via-cyan-500/10 to-transparent",
  },
  {
    eyebrow: "Раздел 5",
    title: "Профиль и поддержка проекта",
    desc: "В профиле хранятся ваши ачивки, архив, AI-профиль и история прогресса. Поддержка проекта вынесена отдельно и всегда остаётся заметной через Boosty и Crypto.",
    previewTitle: "Что будет внутри",
    previewItems: [
      "Ачивки и XP",
      "AI-профиль и стили",
      "Архив споров",
      "Boosty / Crypto для поддержки",
    ],
    accent: "from-amber-500/20 via-violet-500/10 to-transparent",
  },
];

const STORAGE_KEY = "konsensus_shell_welcome_done";

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
      window.dispatchEvent(new Event("konsensus:welcome-onboarding-done"));
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
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-350 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={dismiss}
      />

      <div
        className={`relative w-full max-w-4xl overflow-hidden rounded-3xl border border-purple-500/20 bg-[#130f20]/95 shadow-2xl shadow-black/50 transition-all duration-350 ${
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

        <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
          <div className="p-8 md:p-10">
            <div className="mb-6 flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === step
                      ? "bg-purple-500 w-8"
                      : i < step
                      ? "bg-purple-700 w-4"
                      : "bg-white/10 w-4"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300/80 mb-4">
              {current.eyebrow}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
              {current.title}
            </h2>
            <p className="max-w-xl text-sm md:text-base text-gray-300 leading-relaxed">
              {current.desc}
            </p>

            <div className="mt-8 flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-gray-300 transition-colors hover:text-white hover:bg-white/5"
                >
                  Назад
                </button>
              )}
              <button
                onClick={next}
                className="btn-ripple rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
              >
                {step === STEPS.length - 1 ? "Перейти к спорам" : "Далее →"}
              </button>
            </div>

            <p className="mt-5 text-xs text-gray-500">
              {step + 1} из {STEPS.length} · это показывается только один раз
            </p>
          </div>

          <div className={`relative overflow-hidden border-t border-white/8 md:border-t-0 md:border-l bg-gradient-to-br ${current.accent}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_45%)]" />
            <div className="relative p-6 md:p-8">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
                  Превью раздела
                </p>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {current.previewTitle}
                </h3>
                <div className="space-y-2.5">
                  {current.previewItems.map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-sm text-gray-200"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
