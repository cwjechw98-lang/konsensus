"use client";

import { useMemo, useState } from "react";

type HumanMessage = {
  id: string;
  content: string;
  author_id: string | null;
  created_at: string;
};

type ChallengeCategory =
  | "politics"
  | "technology"
  | "philosophy"
  | "lifestyle"
  | "science"
  | "culture"
  | "economics"
  | "relationships"
  | "other"
  | null;

function normalizeCategory(value: string | null): Exclude<ChallengeCategory, null> {
  switch (value) {
    case "politics":
    case "technology":
    case "philosophy":
    case "lifestyle":
    case "science":
    case "culture":
    case "economics":
    case "relationships":
    case "other":
      return value;
    default:
      return "other";
  }
}

type PredictionOption = {
  id: "calm" | "push" | "pivot";
  label: string;
  description: string;
};

type CaseOption = {
  id: string;
  label: string;
  outcome: string;
  trait: string;
  points: number;
};

type Scenario = {
  title: string;
  prompt: string;
  options: CaseOption[];
};

type PendingPrediction = {
  anchorMessageId: string;
  expected: PredictionOption["id"];
};

const PREDICTION_OPTIONS: PredictionOption[] = [
  {
    id: "calm",
    label: "Смягчит тон",
    description: "Попробует ответить мягче и сузить конфликт.",
  },
  {
    id: "push",
    label: "Пойдёт в давление",
    description: "Усилит позицию, заострит несогласие или вспылит.",
  },
  {
    id: "pivot",
    label: "Сменит угол",
    description: "Уйдёт в пример, факт или новый ракурс вместо прямой атаки.",
  },
];

const SCENARIO_BANK: Record<Exclude<ChallengeCategory, null>, Scenario[]> = {
  politics: [
    {
      title: "Городской бюджет",
      prompt: "В вашем городе спорят: деньги пустить в дороги или в общественные пространства. Какой первый шаг помогает снизить накал?",
      options: [
        { id: "politics-1-a", label: "Попросить каждую сторону назвать один измеримый критерий пользы", outcome: "Вы переводите спор из лозунгов в проверяемые критерии и снижаете шум.", trait: "Аналитик", points: 3 },
        { id: "politics-1-b", label: "Жёстко указать, что одна сторона вообще не понимает город", outcome: "Эмоции растут, но общей точки пока не появляется.", trait: "Полемист", points: 1 },
        { id: "politics-1-c", label: "Предложить сначала признать, чего обе стороны реально боятся", outcome: "Вы вытаскиваете мотивы и создаёте основу для более честного разговора.", trait: "Эмпат", points: 3 },
      ],
    },
  ],
  technology: [
    {
      title: "Запуск продукта",
      prompt: "Команда спорит: выпускать сырой MVP сейчас или ждать стабильности ещё месяц. Какой ход конструктивнее?",
      options: [
        { id: "technology-1-a", label: "Разделить спор на риск для пользователя и риск для бизнеса", outcome: "Вы помогаете сторонам спорить о конкретных рисках, а не о темпераменте.", trait: "Системщик", points: 3 },
        { id: "technology-1-b", label: "Сразу встать на сторону тех, кто быстрее всех говорит", outcome: "Решение становится быстрее, но понимание между сторонами проседает.", trait: "Импульсивный", points: 1 },
        { id: "technology-1-c", label: "Попросить один минимальный критерий готовности, который примут обе стороны", outcome: "Появляется рабочая граница, где компромисс вообще возможен.", trait: "Медиатор", points: 3 },
      ],
    },
  ],
  philosophy: [
    {
      title: "Цена принципа",
      prompt: "Два человека спорят: быть честным до конца или смягчать правду ради мира. Что полезнее спросить первым?",
      options: [
        { id: "philosophy-1-a", label: "Что для каждого считается вредом в этой ситуации", outcome: "Спор уходит от абстракции к реальным последствиям.", trait: "Философ", points: 3 },
        { id: "philosophy-1-b", label: "Кто из них объективно моральнее", outcome: "Разговор быстро скатывается в меряние правильностью.", trait: "Судья", points: 1 },
        { id: "philosophy-1-c", label: "Когда правда помогает, а когда ранит без пользы", outcome: "Появляется пространство для нюанса, а не только для лозунгов.", trait: "Диалектик", points: 3 },
      ],
    },
  ],
  lifestyle: [
    {
      title: "Бытовой перекос",
      prompt: "Пара спорит о домашних делах. Какой первый ход уменьшит оборону собеседника?",
      options: [
        { id: "lifestyle-1-a", label: "Назвать один конкретный повторяющийся эпизод вместо общего упрёка", outcome: "Становится легче обсуждать ситуацию, не атакуя личность целиком.", trait: "Практик", points: 3 },
        { id: "lifestyle-1-b", label: "Сказать, что человек вечно всё делает не так", outcome: "Это усиливает оборону и почти не оставляет места для компромисса.", trait: "Обвинитель", points: 1 },
        { id: "lifestyle-1-c", label: "Сначала признать ту часть нагрузки, которую второй правда тянет", outcome: "Тон становится мягче, и разговор проще вернуть к фактам.", trait: "Эмпат", points: 3 },
      ],
    },
  ],
  science: [
    {
      title: "Спор о фактах",
      prompt: "Люди спорят о научной теме, но быстро переходят в уверенные заявления. Что полезнее сделать?",
      options: [
        { id: "science-1-a", label: "Развести личную уверенность и качество источников", outcome: "Вы возвращаете дискуссию к проверяемым основаниям.", trait: "Исследователь", points: 3 },
        { id: "science-1-b", label: "Высмеять слабый источник оппонента", outcome: "Формально приятно, но контакт между сторонами сгорает.", trait: "Снайпер", points: 1 },
        { id: "science-1-c", label: "Попросить обе стороны назвать, что могло бы изменить их мнение", outcome: "Появляется тест на открытость, а не только на упрямство.", trait: "Рационалист", points: 3 },
      ],
    },
  ],
  culture: [
    {
      title: "Вкус и ценность",
      prompt: "Спор о фильме перешёл в спор о том, у кого вообще есть вкус. Что может спасти разговор?",
      options: [
        { id: "culture-1-a", label: "Спросить, какой именно критерий оценки у каждого", outcome: "Вы разделяете вкус, опыт и ожидания, а не просто лобовое несогласие.", trait: "Куратор", points: 3 },
        { id: "culture-1-b", label: "Сказать, что хороший вкус бывает только один", outcome: "Это красиво звучит, но почти гарантированно взрывает диалог.", trait: "Элитарий", points: 1 },
        { id: "culture-1-c", label: "Попросить каждого назвать один сильный элемент в позиции другого", outcome: "Возникает редкий, но очень полезный жест взаимного признания.", trait: "Медиатор", points: 3 },
      ],
    },
  ],
  economics: [
    {
      title: "Деньги и справедливость",
      prompt: "Спор о расходах: одна сторона говорит про цифры, другая про ощущение несправедливости. Какой ход лучше?",
      options: [
        { id: "economics-1-a", label: "Сначала признать эмоцию, потом перейти к расчёту", outcome: "Вы не отрезаете человека от разговора и всё равно ведёте к цифрам.", trait: "Переговорщик", points: 3 },
        { id: "economics-1-b", label: "Сразу обнулить эмоции и требовать только факты", outcome: "Логично по форме, но риск эскалации сильно растёт.", trait: "Бухгалтер войны", points: 1 },
        { id: "economics-1-c", label: "Попросить обе стороны назвать минимально приемлемый результат", outcome: "Появляется пространство для торга и конкретики.", trait: "Стратег", points: 3 },
      ],
    },
  ],
  relationships: [
    {
      title: "Неуслышанный мотив",
      prompt: "В личном конфликте оба говорят о поступках, но спорят на самом деле о значимости. Что поможет?",
      options: [
        { id: "relationships-1-a", label: "Спросить, какое чувство стоит за претензией", outcome: "Вы выводите спор из списка обид к человеческому мотиву.", trait: "Эмпат", points: 3 },
        { id: "relationships-1-b", label: "Потребовать, чтобы один сразу признал вину", outcome: "Иногда это даёт быстрый выброс, но редко даёт понимание.", trait: "Давящий", points: 1 },
        { id: "relationships-1-c", label: "Попросить сформулировать просьбу без обвинения", outcome: "Возникает шанс перейти от атаки к диалогу.", trait: "Медиатор", points: 3 },
      ],
    },
  ],
  other: [
    {
      title: "Угол зрения",
      prompt: "Две стороны застряли в своей правоте. Какой ход обычно полезнее первым?",
      options: [
        { id: "other-1-a", label: "Сузить спор до одного конкретного эпизода", outcome: "Разговор становится менее туманным и более управляемым.", trait: "Практик", points: 3 },
        { id: "other-1-b", label: "Доказывать сразу всё и по максимуму", outcome: "Тактика давления даёт энергию, но редко даёт понимание.", trait: "Напор", points: 1 },
        { id: "other-1-c", label: "Сначала назвать, что в позиции другого можно понять", outcome: "Это не отменяет своей позиции, но резко повышает шанс на ответ без защиты.", trait: "Слышащий", points: 3 },
      ],
    },
  ],
};

function classifyReaction(content: string): PredictionOption["id"] {
  const text = content.toLowerCase();
  const aggressiveMarkers = ["!", "никогда", "абсурд", "бред", "вообще", "совсем", "неправ", "вина", "виноват"];
  const calmingMarkers = ["понимаю", "соглас", "может", "давай", "спокойно", "кажется", "возможно", "готов"];
  const pivotMarkers = ["например", "конкрет", "факт", "цифр", "данн", "пример", "сценар", "если", "допустим"];

  const aggressiveScore = aggressiveMarkers.reduce((sum, marker) => sum + (text.includes(marker) ? 1 : 0), 0);
  const calmingScore = calmingMarkers.reduce((sum, marker) => sum + (text.includes(marker) ? 1 : 0), 0);
  const pivotScore = pivotMarkers.reduce((sum, marker) => sum + (text.includes(marker) ? 1 : 0), 0);

  if (aggressiveScore >= 2 && aggressiveScore > calmingScore) return "push";
  if (calmingScore >= pivotScore && calmingScore > 0) return "calm";
  return "pivot";
}

function hashSeed(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export default function ShadowMediatorPanel({
  challengeId,
  topic,
  category,
  authorId,
  acceptedById,
  authorName,
  acceptedName,
  completedRounds,
  humanMessages,
}: {
  challengeId: string;
  topic: string;
  category: string | null;
  authorId: string;
  acceptedById: string | null;
  authorName: string;
  acceptedName: string;
  completedRounds: number;
  humanMessages: HumanMessage[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"forecast" | "case">("forecast");
  const [forecastPoints, setForecastPoints] = useState(0);
  const [pendingPrediction, setPendingPrediction] = useState<PendingPrediction | null>(null);
  const [lastForecastResult, setLastForecastResult] = useState<string>("");
  const [selectedCaseOption, setSelectedCaseOption] = useState<string | null>(null);

  const lastHumanMessage = humanMessages.at(-1) ?? null;

  const nextSpeakerName = useMemo(() => {
    if (!acceptedById) return acceptedName;
    if (!lastHumanMessage?.author_id) return authorName;
    return lastHumanMessage.author_id === authorId ? acceptedName : authorName;
  }, [acceptedById, acceptedName, authorId, authorName, lastHumanMessage?.author_id]);

  const normalizedCategory = normalizeCategory(category);
  const scenario = useMemo(() => {
    const bucket = SCENARIO_BANK[normalizedCategory];
    const scenarioIndex = hashSeed(`${challengeId}:${topic}:${completedRounds}`) % bucket.length;
    return bucket[scenarioIndex];
  }, [challengeId, completedRounds, normalizedCategory, topic]);

  const selectedScenarioOption = scenario.options.find((option) => option.id === selectedCaseOption) ?? null;

  const resolvedPrediction = useMemo(() => {
    if (!pendingPrediction || !lastHumanMessage) return null;
    if (lastHumanMessage.id === pendingPrediction.anchorMessageId) return null;

    const actual = classifyReaction(lastHumanMessage.content);
    const guessed = pendingPrediction.expected;

    return {
      isMatch: actual === guessed,
      text: actual === guessed
        ? "Прогноз совпал. Вы правильно считали динамику ответа и получаете +3 очка осознанности."
        : "Ход ушёл в другую сторону. Это тоже полезно: арена показывает, где наши ожидания о людях ломаются.",
    };
  }, [lastHumanMessage, pendingPrediction]);

  const awarenessPoints = forecastPoints + (selectedScenarioOption?.points ?? 0);

  const forecastQuestion = lastHumanMessage
    ? `Как, по-вашему, ${nextSpeakerName} отреагирует на следующий ход по теме «${topic}»?`
    : `Battle только разворачивается. Какой тон первым задаст ${authorName}?`;

  return (
    <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04]">
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80 mb-1">
            Теневой медиатор
          </p>
          <p className="text-sm text-gray-300">
            Панель зрителя: прогнозируйте реакцию и проходите параллельный кейс по теме battle.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-semibold text-cyan-200">{awarenessPoints}</p>
            <p className="text-xs text-cyan-300/70">очки осознанности</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/15"
          >
            {isOpen ? "Свернуть" : "Открыть"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-cyan-500/10 px-4 py-4">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("forecast")}
              className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                activeTab === "forecast"
                  ? "bg-cyan-500/15 text-cyan-100 border border-cyan-400/20"
                  : "bg-white/5 text-gray-400 border border-white/8 hover:text-gray-200"
              }`}
            >
              Прогноз
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("case")}
              className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                activeTab === "case"
                  ? "bg-violet-500/15 text-violet-100 border border-violet-400/20"
                  : "bg-white/5 text-gray-400 border border-white/8 hover:text-gray-200"
              }`}
            >
              Параллельный кейс
            </button>
          </div>

          {activeTab === "forecast" ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white mb-2">Прогноз и ставки</p>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">{forecastQuestion}</p>

              {lastHumanMessage && (
                <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-3 mb-4">
                  <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">Последний ход</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{lastHumanMessage.content}</p>
                </div>
              )}

              <div className="grid gap-2">
                {PREDICTION_OPTIONS.map((option) => {
                  const selected = pendingPrediction?.expected === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (!lastHumanMessage) return;
                        setPendingPrediction({ anchorMessageId: lastHumanMessage.id, expected: option.id });
                        setLastForecastResult("");
                      }}
                      disabled={!lastHumanMessage}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        selected
                          ? "border-cyan-400/30 bg-cyan-500/10"
                          : "border-white/8 bg-white/[0.03] hover:border-cyan-500/25 hover:bg-cyan-500/[0.05]"
                      } disabled:opacity-40`}
                    >
                      <p className="text-sm font-medium text-white">{option.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Очки начисляются локально в этой сессии, когда придёт следующий человеческий ответ и станет видна фактическая реакция.
              </p>

              {resolvedPrediction && (
                <div className="mt-4 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.06] px-4 py-3 text-sm text-cyan-100">
                  <p className="leading-relaxed">{resolvedPrediction.text}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (resolvedPrediction.isMatch) {
                        setForecastPoints((value) => value + 3);
                      }
                      setLastForecastResult(resolvedPrediction.text);
                      setPendingPrediction(null);
                    }}
                    className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100 transition-colors hover:bg-cyan-500/15"
                  >
                    Принять результат
                  </button>
                </div>
              )}

              {lastForecastResult && (
                <div className="mt-4 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.06] px-4 py-3 text-sm text-cyan-100">
                  {lastForecastResult}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-4">
              <p className="text-sm font-semibold text-white mb-2">{scenario.title}</p>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">{scenario.prompt}</p>

              <div className="grid gap-2">
                {scenario.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedCaseOption(option.id)}
                    disabled={selectedScenarioOption !== null}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      selectedCaseOption === option.id
                        ? "border-violet-400/30 bg-violet-500/10"
                        : "border-white/8 bg-white/[0.03] hover:border-violet-500/25 hover:bg-violet-500/[0.05]"
                    } disabled:opacity-70`}
                  >
                    <p className="text-sm font-medium text-white">{option.label}</p>
                  </button>
                ))}
              </div>

              {selectedScenarioOption && (
                <div className="mt-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.06] px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-violet-300/80 mb-2">Разбор Теневого медиатора</p>
                  <p className="text-sm text-gray-200 leading-relaxed mb-3">{selectedScenarioOption.outcome}</p>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-violet-100">
                      Профильный след: {selectedScenarioOption.trait}
                    </span>
                    <span className="text-violet-200/90">+{selectedScenarioOption.points} очка осознанности</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
