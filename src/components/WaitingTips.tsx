"use client";

import { useState, useEffect } from "react";

const TIPS = [
  { icon: "💡", text: "Конкретный пример убеждает сильнее абстрактного утверждения — ищите случай из жизни." },
  { icon: "🎯", text: "Найдите то, с чем вы согласны в позиции оппонента. Это снижает напряжение и открывает диалог." },
  { icon: "🧠", text: "Хороший аргумент отвечает на «почему», а не только «что». Объясните логику, а не только вывод." },
  { icon: "⚖️", text: "Доказательства из нескольких источников весомее одного, даже очень авторитетного." },
  { icon: "🤝", text: "Признать слабое место своей позиции — признак силы. Это повышает доверие к остальным аргументам." },
  { icon: "🔍", text: "Спросите себя: что могло бы изменить мою позицию? Если ответа нет — это уже не спор, а убеждение." },
  { icon: "🌊", text: "Спокойный тон заразителен. Ответьте на эмоциональный аргумент хладнокровно — это само по себе сильный ход." },
  { icon: "📐", text: "Разделите сложный тезис на части. Проще опровергнуть один большой аргумент, чем три маленьких." },
  { icon: "🪞", text: "Перефразируйте позицию оппонента своими словами — убедитесь, что правильно поняли. Часто это меняет всё." },
  { icon: "⏳", text: "Пауза перед ответом — это сила, а не слабость. Обдуманный ответ лучше быстрого и непродуманного." },
];

export default function WaitingTips() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % TIPS.length);
        setVisible(true);
      }, 350);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const tip = TIPS[idx];

  return (
    <div className="glass rounded-xl p-4">
      <p className="text-xs text-gray-600 uppercase tracking-wider mb-2.5">
        Совет дебатёра
      </p>
      <p
        className="text-sm text-gray-400 leading-relaxed transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <span className="mr-1.5">{tip.icon}</span>
        {tip.text}
      </p>
      <div className="flex gap-1 mt-3">
        {TIPS.map((_, i) => (
          <div
            key={i}
            className={`h-0.5 rounded-full transition-all duration-300 ${
              i === idx ? "bg-purple-500/60 w-4" : "bg-white/10 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
