"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs border border-gray-300 dark:border-gray-700 px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900"
    >
      {copied ? "Скопировано ✓" : "Копировать"}
    </button>
  );
}
