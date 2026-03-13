"use client";

import { useState } from "react";

export default function EvidenceFields({ compact }: { compact?: boolean }) {
  const [links, setLinks] = useState<string[]>([""]);
  const [open, setOpen] = useState(!compact);

  const add = () => setLinks((prev) => [...prev, ""]);
  const remove = (i: number) =>
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  const update = (i: number, val: string) =>
    setLinks((prev) => prev.map((v, idx) => (idx === i ? val : v)));

  // Компактный режим: просто кнопка + раскрывающееся поле
  if (compact && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors self-start mt-1"
      >
        📎 Прикрепить доказательство
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium text-gray-300 ${compact ? "text-xs" : ""}`}>
          {compact ? "📎 Доказательства" : "Доказательства"}{" "}
          <span className="text-gray-600 font-normal">(необязательно)</span>
        </span>
        <button
          type="button"
          onClick={add}
          className="text-xs border border-white/10 text-gray-400 hover:text-white hover:border-white/20 px-2 py-0.5 rounded-md transition-colors"
        >
          + добавить
        </button>
      </div>

      {links.map((link, i) => (
        <div key={i} className="flex gap-2">
          <input
            name="evidence"
            type="text"
            value={link}
            onChange={(e) => update(i, e.target.value)}
            className={`flex-1 border border-white/10 bg-white/5 rounded-lg px-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors ${compact ? "py-1.5 text-xs" : "py-2 text-sm"}`}
            placeholder="Ссылка, факт, источник..."
          />
          {links.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-600 hover:text-red-400 px-2 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
