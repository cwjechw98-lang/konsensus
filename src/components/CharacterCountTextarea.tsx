"use client";

import { useState } from "react";

export default function CharacterCountTextarea({
  name,
  required,
  rows,
  className,
  placeholder,
  autoFocus,
  maxLength = 2000,
}: {
  name: string;
  required?: boolean;
  rows?: number;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
}) {
  const [count, setCount] = useState(0);
  const near = count > maxLength * 0.8;
  const over = count >= maxLength;

  return (
    <div>
      <textarea
        name={name}
        required={required}
        rows={rows}
        maxLength={maxLength}
        className={className}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => setCount(e.target.value.length)}
      />
      <span
        className={`text-xs mt-1 block text-right tabular-nums ${
          over ? "text-red-400" : near ? "text-yellow-400" : "text-gray-600"
        }`}
      >
        {count}/{maxLength}
      </span>
    </div>
  );
}
