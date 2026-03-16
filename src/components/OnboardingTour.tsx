"use client";

import { useState, useEffect, useCallback } from "react";

type TourStep = {
  target: string; // CSS selector
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
};

const TOUR_STEPS: Record<string, TourStep[]> = {
  dashboard: [
    { target: "[data-tour='create-dispute']", title: "Создать спор", description: "Создайте новый спор и пригласите человека в структурированный диалог.", position: "bottom" },
    { target: "[data-tour='join-code']", title: "Войти по коду", description: "Если вас пригласили, введите инвайт-код и подключитесь к уже созданному спору.", position: "bottom" },
    { target: "[data-tour='disputes-list']", title: "Ваш рабочий список", description: "Здесь собраны ваши активные, архивные и ожидающие внимания споры.", position: "top" },
    { target: "[data-tour='filters']", title: "Фильтры и режимы", description: "Переключайтесь между активными и архивом, а также фильтруйте споры по статусу.", position: "bottom" },
  ],
  feed: [
    { target: "[data-tour='events-intro']", title: "Смысл раздела", description: "События показывают жизнь проекта: публичные споры, заметную активность и со временем релизы и движения арены.", position: "bottom" },
    { target: "[data-tour='events-stream']", title: "Основной поток", description: "Здесь вы наблюдаете, а не вступаете автоматически. Это витрина происходящего, а не ваш рабочий список.", position: "top" },
  ],
  matchmaking: [
    { target: "[data-tour='open-intro']", title: "Где вступать в спор", description: "Открытые — это вход в уже созданные споры и вызовы, которые ждут второго участника.", position: "bottom" },
    { target: "[data-tour='open-filters']", title: "Фильтры по темам", description: "Сузьте поток до тех категорий, которые вам реально интересны.", position: "bottom" },
    { target: "[data-tour='open-list']", title: "Карточки входа", description: "Каждая карточка сразу показывает формат: обычный спор или вызов арены, тему и кнопку входа.", position: "top" },
  ],
  profile: [
    { target: "[data-tour='profile-intro']", title: "Зачем нужен профиль", description: "Профиль хранит ваш прогресс: XP, архив, ачивки, ИИ-профиль и настройки связки с Telegram.", position: "bottom" },
    { target: "[data-tour='profile-tabs']", title: "Переключение режимов", description: "Не всё смешано на одной странице: обзор, достижения, ИИ-профиль и настройки разделены по вкладкам.", position: "bottom" },
    { target: "[data-tour='profile-stats']", title: "Быстрый срез", description: "Сверху виден короткий summary по спорам, аргументам, консенсусу и ачивкам — без лишнего скролла.", position: "bottom" },
  ],
  dispute_new: [
    { target: "[data-tour='new-dispute-intro']", title: "Старт спора", description: "Здесь вы не просто создаёте чат, а задаёте рамку будущего структурированного диалога.", position: "bottom" },
    { target: "[data-tour='title']", title: "Тема спора", description: "Сформулируйте тему коротко и чётко. Например: «Удалёнка vs офис»", position: "bottom" },
    { target: "[data-tour='description']", title: "Описание", description: "Опишите контекст так, чтобы оппонент сразу понял суть разногласия.", position: "bottom" },
    { target: "[data-tour='rounds']", title: "Количество раундов", description: "3 подходит для быстрого спора, 5+ — для тем, где важно пройти несколько итераций.", position: "bottom" },
  ],
  argue: [
    { target: "[data-tour='argue-context']", title: "Контекст перед ходом", description: "Сверху всегда остаётся предмет спора, а в следующих раундах — и последний ответ оппонента.", position: "bottom" },
    { target: "[data-tour='reasoning']", title: "Ваш аргумент", description: "Это главный момент экрана: изложите позицию или ответ так, чтобы он был понятен без догадок.", position: "bottom" },
    { target: "[data-tour='evaluate']", title: "Проверка ИИ", description: "Перед отправкой ИИ оценит силу вашего аргумента и даст советы.", position: "top" },
  ],
};

const STORAGE_PREFIX = "konsensus_tour_";
const WELCOME_STORAGE_KEY = "konsensus_shell_welcome_done";

export function OnboardingTour({
  page,
  showReplayButton = false,
  buttonLabel = "Подсказки по экрану",
  className = "",
}: {
  page: string;
  showReplayButton?: boolean;
  buttonLabel?: string;
  className?: string;
}) {
  const [step, setStep] = useState(-1);
  const [highlight, setHighlight] = useState<DOMRect | null>(null);

  const steps = TOUR_STEPS[page];
  if (!steps) return null;

  const storageKey = `${STORAGE_PREFIX}${page}`;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (done) return;

    const startTour = () => window.setTimeout(() => setStep(0), 500);
    const welcomeDone = localStorage.getItem(WELCOME_STORAGE_KEY);

    if (welcomeDone) {
      startTour();
      return;
    }

    function handleWelcomeDone() {
      startTour();
    }

    window.addEventListener("konsensus:welcome-onboarding-done", handleWelcomeDone);
    return () =>
      window.removeEventListener("konsensus:welcome-onboarding-done", handleWelcomeDone);
  }, [storageKey]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const updateHighlight = useCallback(() => {
    if (step < 0 || step >= steps.length) return;
    const el = document.querySelector(steps[step].target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setHighlight(rect);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setHighlight(null);
    }
  }, [step, steps]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    return () => window.removeEventListener("resize", updateHighlight);
  }, [updateHighlight]);

  const finish = () => {
    setStep(-1);
    setHighlight(null);
    localStorage.setItem(storageKey, "1");
  };

  const replay = () => {
    setStep(0);
  };

  const next = () => {
    if (step >= steps.length - 1) {
      finish();
    } else {
      setStep(step + 1);
    }
  };

  const replayButton = showReplayButton ? (
    <button
      type="button"
      onClick={replay}
      className={`rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.07] hover:text-white ${className}`}
    >
      {buttonLabel}
    </button>
  ) : null;

  if (step < 0 || !steps[step]) return replayButton;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <>
      {replayButton}
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {/* Dark backdrop with cutout */}
        <div className="absolute inset-0 bg-black/60" onClick={finish} style={{ pointerEvents: "auto" }} />
        
        {/* Highlight cutout */}
        {highlight && (
          <div
            className="absolute border-2 border-purple-500 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-300"
            style={{
              top: highlight.top - 6,
              left: highlight.left - 6,
              width: highlight.width + 12,
              height: highlight.height + 12,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.6), 0 0 20px rgba(139,92,246,0.4)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      {highlight && (
        <div
          className="fixed z-[9999] w-72 p-4 rounded-2xl bg-[#1a1428] border border-purple-500/30 shadow-2xl shadow-purple-500/10"
          style={{
            top: current.position === "top" ? highlight.top - 140 : highlight.bottom + 16,
            left: Math.max(16, Math.min(highlight.left, window.innerWidth - 304)),
            pointerEvents: "auto",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-purple-400 font-semibold">
              {step + 1}/{steps.length}
            </span>
            <button onClick={finish} className="text-xs text-gray-500 hover:text-gray-300">
              Пропустить
            </button>
          </div>
          <h3 className="text-sm font-bold text-white mb-1">{current.title}</h3>
          <p className="text-xs text-gray-400 leading-relaxed">{current.description}</p>
          <button
            onClick={next}
            className="mt-3 w-full bg-purple-600 hover:bg-purple-500 text-white text-sm py-2 rounded-lg font-semibold transition-colors"
          >
            {isLast ? "Готово ✨" : "Далее →"}
          </button>
        </div>
      )}
    </>
  );
}
