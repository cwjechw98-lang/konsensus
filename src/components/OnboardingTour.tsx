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
    { target: "[data-tour='create-dispute']", title: "Создать спор", description: "Нажмите сюда, чтобы начать новый спор. Придумайте тему и пригласите оппонента.", position: "bottom" },
    { target: "[data-tour='disputes-list']", title: "Ваши споры", description: "Здесь отображаются все ваши активные и завершённые споры.", position: "top" },
    { target: "[data-tour='filters']", title: "Фильтры", description: "Фильтруйте споры по статусу: открытые, в процессе, на медиации.", position: "bottom" },
  ],
  dispute_new: [
    { target: "[data-tour='title']", title: "Тема спора", description: "Сформулируйте тему коротко и чётко. Например: «Удалёнка vs офис»", position: "bottom" },
    { target: "[data-tour='description']", title: "Описание", description: "Опишите суть вашей позиции. Это поможет оппоненту понять контекст.", position: "bottom" },
    { target: "[data-tour='rounds']", title: "Количество раундов", description: "Выберите сколько раундов аргументов. 3 — для быстрых споров, 5+ — для серьёзных тем.", position: "bottom" },
  ],
  argue: [
    { target: "[data-tour='position']", title: "Ваша позиция", description: "Кратко сформулируйте свою точку зрения одним предложением.", position: "bottom" },
    { target: "[data-tour='reasoning']", title: "Обоснование", description: "Объясните, почему вы так думаете. Приведите аргументы и логику.", position: "bottom" },
    { target: "[data-tour='evaluate']", title: "Проверка ИИ", description: "Перед отправкой ИИ оценит силу вашего аргумента и даст советы.", position: "top" },
  ],
};

const STORAGE_PREFIX = "konsensus_tour_";

export function OnboardingTour({ page }: { page: string }) {
  const [step, setStep] = useState(-1);
  const [highlight, setHighlight] = useState<DOMRect | null>(null);

  const steps = TOUR_STEPS[page];
  if (!steps) return null;

  const storageKey = `${STORAGE_PREFIX}${page}`;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (!done) {
      // Delay to let page render
      setTimeout(() => setStep(0), 800);
    }
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

  const next = () => {
    if (step >= steps.length - 1) {
      finish();
    } else {
      setStep(step + 1);
    }
  };

  if (step < 0 || !steps[step]) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <>
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
