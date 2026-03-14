const ADJECTIVES = [
  "Прозорливый", "Смазливый", "Потрёпаный", "Тряпошный", "Ватный",
  "Хитрый", "Мудрый", "Сонный", "Дерзкий", "Пушистый",
  "Хмурый", "Ехидный", "Бодрый", "Занудный", "Весёлый",
  "Облезлый", "Задумчивый", "Нервный", "Гордый", "Вкрадчивый",
  "Загадочный", "Рассеянный", "Философский", "Запыхавшийся", "Ленивый",
  "Обидчивый", "Смелый", "Брюзгливый", "Шустрый", "Меланхоличный",
  "Любопытный", "Подозрительный", "Восторженный", "Унылый", "Придирчивый",
  "Осторожный", "Безмятежный", "Вспыльчивый", "Капризный", "Серьёзный",
  "Наивный", "Скептичный", "Дремотный", "Непоседливый", "Обстоятельный",
  "Суетливый", "Угрюмый", "Мечтательный", "Бывалый", "Взъерошенный",
  "Ворчливый", "Тревожный", "Самодовольный", "Простодушный", "Деловитый",
];

const ANIMALS = [
  "Бобёр", "Лиса", "Выхухоль", "Волк", "Обезьяна",
  "Ёж", "Барсук", "Хомяк", "Суслик", "Енот",
  "Выдра", "Бурундук", "Кабан", "Норка", "Сурок",
  "Белка", "Лось", "Хорёк", "Ондатра", "Дикобраз",
  "Мангуст", "Нутрия", "Тушканчик", "Броненосец", "Капибара",
  "Коати", "Скунс", "Опоссум", "Ленивец", "Вомбат",
  "Утконос", "Тапир", "Бинтуронг", "Фосса", "Квокка",
];

// 55 × 35 = 1925 комбинаций

export function getNickname(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = Math.imul(hash * 31 + sessionId.charCodeAt(i), 1) >>> 0;
  }
  const adj = ADJECTIVES[hash % ADJECTIVES.length];
  // Second hash pass for animal
  let hash2 = hash;
  for (let i = 0; i < 3; i++) {
    hash2 = Math.imul(hash2 * 1664525 + 1013904223, 1) >>> 0;
  }
  const animal = ANIMALS[hash2 % ANIMALS.length];
  return `${adj} ${animal}`;
}

export function getOrCreateSession(): { sessionId: string; nickname: string } {
  if (typeof window === "undefined") return { sessionId: "", nickname: "Аноним" };

  let sessionId = localStorage.getItem("konsensus_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("konsensus_session_id", sessionId);
  }

  return { sessionId, nickname: getNickname(sessionId) };
}
