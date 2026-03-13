"use client";

import { useEffect, useState } from "react";

const TOASTS = [
  "Спор решён за 8 минут — Москва",
  "Консенсус достигнут — Санкт-Петербург",
  "Новый спор создан — Алматы",
  "ИИ завершил анализ — Киев",
  "Оппонент принял приглашение — Минск",
  "Медиация запущена — Ташкент",
];

export default function FloatingToast() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Показываем первый тост через 2с после загрузки
    const initial = setTimeout(() => setVisible(true), 2000);

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % TOASTS.length);
        setVisible(true);
      }, 500);
    }, 9000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 max-w-xs transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="glass rounded-xl px-4 py-3 text-sm flex items-center gap-3 shadow-xl shadow-black/40">
        <span className="pulse-dot w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        <span className="text-gray-300">{TOASTS[index]}</span>
      </div>
    </div>
  );
}
