"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Аргументы. Раунды. Консенсус.",
  "15+ шаблонов для быстрого старта.",
  "ИИ оценит силу аргумента — до отправки.",
  "Структура вместо эмоций.",
  "ИИ отслеживает сближение после каждого раунда.",
];

export default function TypedText() {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const phrase = PHRASES[phraseIndex];

    if (deleting) {
      if (charIndex === 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDeleting(false);
        setPhraseIndex((i) => (i + 1) % PHRASES.length);
        return;
      }
      const t = setTimeout(() => {
        setText(phrase.slice(0, charIndex - 1));
        setCharIndex((i) => i - 1);
      }, 35);
      return () => clearTimeout(t);
    }

    if (charIndex === phrase.length) {
      setPaused(true);
      const t = setTimeout(() => {
        setPaused(false);
        setDeleting(true);
      }, 2200);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setText(phrase.slice(0, charIndex + 1));
      setCharIndex((i) => i + 1);
    }, 65);
    return () => clearTimeout(t);
  }, [charIndex, deleting, paused, phraseIndex]);

  return (
    <span className="text-gray-400">
      {text}
      <span className="animate-pulse text-purple-400">|</span>
    </span>
  );
}
