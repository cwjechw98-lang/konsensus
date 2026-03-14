// Random animal nicknames for anonymous chat observers
const NICKNAMES = [
  "Прозорливый Бобёр",
  "Смазливая Лиса",
  "Потрёпаный Выхухоль",
  "Тряпошный Волк",
  "Ватная Обезьяна",
  "Хитрый Барсук",
  "Мудрый Сурок",
  "Сонный Хомяк",
  "Дерзкий Ёж",
  "Пушистый Бурундук",
  "Хмурый Суслик",
  "Ехидная Выдра",
  "Бодрый Енот",
  "Занудный Кабан",
  "Весёлая Белка",
  "Облезлый Лось",
  "Задумчивый Бобёр",
  "Нервный Хорёк",
  "Гордый Ёж",
  "Вкрадчивая Лиса",
  "Загадочная Норка",
  "Рассеянный Бурундук",
  "Философский Енот",
  "Запыхавшийся Волк",
  "Ленивый Барсук",
  "Обидчивый Суслик",
  "Смелый Хомяк",
  "Брюзгливый Кабан",
  "Шустрая Белка",
  "Меланхоличный Бобёр",
];

export function getNickname(sessionId: string): string {
  // Simple hash of sessionId → consistent nickname per session
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return NICKNAMES[hash % NICKNAMES.length];
}

export function getOrCreateSession(): { sessionId: string; nickname: string } {
  if (typeof window === "undefined") return { sessionId: "", nickname: "Аноним" };

  let sessionId = localStorage.getItem("konsensus_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("konsensus_session_id", sessionId);
  }

  const nickname = getNickname(sessionId);
  return { sessionId, nickname };
}
