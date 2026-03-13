"use client";

import { useState } from "react";

export default function EvidenceFields() {
  const [links, setLinks] = useState<string[]>([""]);

  const add = () => setLinks((prev) => [...prev, ""]);
  const remove = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));
  const update = (i: number, val: string) =>
    setLinks((prev) => prev.map((v, idx) => (idx === i ? val : v)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Доказательства{" "}
          <span className="text-gray-400 font-normal">(необязательно)</span>
        </span>
        <button
          type="button"
          onClick={add}
          className="text-xs border border-gray-300 dark:border-gray-700 px-2 py-0.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900"
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
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-transparent"
            placeholder="Ссылка, факт, источник..."
          />
          {links.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-400 hover:text-red-500 px-2"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
