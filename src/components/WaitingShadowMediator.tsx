"use client";

import { useMemo, useState } from "react";

type Variant = "dispute" | "arena";

type ChoiceOption = {
  id: "left" | "right";
  label: string;
  explanation: string;
};

type ChoiceScenario = {
  prompt: string;
  left: ChoiceOption;
  right: ChoiceOption;
  bridge: string;
};

const FALLBACK_NOTES: Record<
  Variant,
  Array<{
    focus: string;
    caution: string;
    vector: string;
  }>
> = {
  dispute: [
    {
      focus: "Сейчас полезнее удерживать один ясный тезис, а не пытаться ответить на всё сразу.",
      caution: "В ожидании легко начать спорить внутри себя и подготовить слишком жёсткий ответ.",
      vector: "Следующий ход лучше строить вокруг одного примера или одного критерия, а не вокруг общего недовольства.",
    },
    {
      focus: "Пауза даёт шанс заметить, что в споре защищается не только позиция, но и чувство справедливости.",
      caution: "Если отвечать только на формулировку, а не на скрытый мотив, дистанция обычно растёт.",
      vector: "Хороший следующий ход — назвать, что именно вы пытаетесь защитить, и спросить о том же вторую сторону.",
    },
    {
      focus: "Самые полезные ответы обычно не длиннее, а точнее предыдущих.",
      caution: "Чем больше заготовленных тезисов, тем выше риск пропустить реальный смысл ответа оппонента.",
      vector: "Следующий ход лучше начать с короткого признания точки соприкосновения и только потом усиливать свою мысль.",
    },
  ],
  arena: [
    {
      focus: "Даже в открытом диспуте сильнее работает ясность, а не эффектность следующего ответа.",
      caution: "Публичный формат подталкивает к резкости, но она редко помогает сблизить позиции.",
      vector: "Следующий ход лучше строить на одном проверяемом наблюдении, а не на попытке звучать громче.",
    },
    {
      focus: "Если разговор видят другие, особенно важно не спутать уверенность с нажимом.",
      caution: "Пауза полезна именно тем, что даёт возможность убрать лишний эмоциональный слой.",
      vector: "Следующий ход лучше сделать короче и конкретнее, чтобы публичный формат не утянул спор в шоу.",
    },
    {
      focus: "Открытый диспут лучше держится на спокойном темпе, чем на зрелищной эскалации.",
      caution: "Когда соблазн ответить резко становится сильнее, полезно сначала сузить предмет несогласия.",
      vector: "Следующий ход лучше направить в сторону уточнения критерия, по которому вы вообще сравниваете позиции.",
    },
  ],
};

const SCENARIOS: Record<Variant, ChoiceScenario[]> = {
  dispute: [
    {
      prompt: "Что полезнее подготовить для следующего ответа?",
      left: {
        id: "left",
        label: "Один конкретный пример",
        explanation:
          "Пример помогает заземлить спор и вернуть его к фактам, если разговор начал расплываться.",
      },
      right: {
        id: "right",
        label: "Один уточняющий вопрос",
        explanation:
          "Вопрос полезнее, если вы пока не уверены, что правильно поняли, что именно защищает оппонент.",
      },
      bridge:
        "Оба хода рабочие. Разница в том, нужен ли разговору сейчас факт или прояснение смысла.",
    },
    {
      prompt: "Как мягче войти в следующий ход?",
      left: {
        id: "left",
        label: "Признать часть позиции второго",
        explanation:
          "Это снижает оборону и показывает, что вы отвечаете не мимо человека, а по сути его аргумента.",
      },
      right: {
        id: "right",
        label: "Сразу назвать свой критерий",
        explanation:
          "Такой ход полезен, если спор буксует из-за разных мерок и нужно быстро обозначить рамку.",
      },
      bridge:
        "Выбор зависит от температуры разговора: при напряжении полезнее признание, при тумане — ясный критерий.",
    },
    {
      prompt: "Что важнее в следующем сообщении?",
      left: {
        id: "left",
        label: "Сузить тезис до одной мысли",
        explanation:
          "Это помогает не перегружать ответ и делает позицию проще для точного возражения или согласия.",
      },
      right: {
        id: "right",
        label: "Назвать риск, который вы защищаете",
        explanation:
          "Такой ход полезен, если спор выглядит как clash формулировок, а не как clash мотивов.",
      },
      bridge:
        "Один ход упрощает структуру, другой открывает мотив. Оба работают лучше длинной заготовки.",
    },
  ],
  arena: [
    {
      prompt: "Что лучше удержит открытый диспут в спокойной рамке?",
      left: {
        id: "left",
        label: "Один проверяемый факт",
        explanation:
          "Факт возвращает разговор к опоре и не даёт публичному формату утянуть спор в эффектность.",
      },
      right: {
        id: "right",
        label: "Один вопрос о критерии",
        explanation:
          "Вопрос полезнее, если спорят как будто об одном, но оценивают это по разным правилам.",
      },
      bridge:
        "Для открытого диспута особенно важно не распыляться: один факт или один критерий почти всегда сильнее широкого залпа.",
    },
    {
      prompt: "Какой следующий ход звучит спокойнее и точнее?",
      left: {
        id: "left",
        label: "Уточнить формулировку оппонента",
        explanation:
          "Это помогает не спорить с карикатурой на чужую позицию и снижает риск публичной эскалации.",
      },
      right: {
        id: "right",
        label: "Сделать ответ короче обычного",
        explanation:
          "Короткий ответ полезен, если тема уже перегрета и спору нужен чистый, нераздутый следующий шаг.",
      },
      bridge:
        "В открытом формате лучше выбирать шаг, который добавляет ясность, а не вес собственному эго.",
    },
  ],
};

function parseInsight(text: string | null | undefined) {
  if (!text?.trim()) return null;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const getValue = (prefix: string) =>
    lines.find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()))?.split(":").slice(1).join(":").trim() ?? null;

  const focus = getValue("Что он защищает");
  const caution = getValue("Почему он так реагирует");
  const vector = getValue("Вектор следующего хода");

  if (!focus && !caution && !vector) return null;

  return {
    focus: focus ?? "Сейчас важно удерживать суть разногласия, а не множить параллельные темы.",
    caution: caution ?? "Пауза полезна тем, что позволяет не отвечать на автомате.",
    vector: vector ?? "Следующий ход лучше строить короче и точнее предыдущего ответа.",
  };
}

function pickScenario(variant: Variant, round: number, maxRounds: number) {
  const bank = SCENARIOS[variant];
  return bank[(round + maxRounds) % bank.length];
}

function pickFallbackNote(variant: Variant, round: number, maxRounds: number) {
  const bank = FALLBACK_NOTES[variant];
  return bank[(round + maxRounds) % bank.length];
}

export default function WaitingShadowMediator({
  variant = "dispute",
  round,
  maxRounds,
  insight,
}: {
  variant?: Variant;
  round: number;
  maxRounds: number;
  insight?: string | null;
}) {
  const [selectedState, setSelectedState] = useState<{
    key: string;
    value: ChoiceOption["id"] | null;
  }>({
    key: "",
    value: null,
  });

  const scenarioKey = `${variant}:${round}:${maxRounds}:${insight ?? ""}`;

  const scenario = useMemo(
    () => pickScenario(variant, round, maxRounds),
    [variant, round, maxRounds]
  );
  const note = useMemo(
    () => parseInsight(insight) ?? pickFallbackNote(variant, round, maxRounds),
    [insight, variant, round, maxRounds]
  );

  const selected =
    selectedState.key === scenarioKey ? selectedState.value : null;
  const selectedOption =
    selected === "left" ? scenario.left : selected === "right" ? scenario.right : null;

  return (
    <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
      <div className="mb-4">
        <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-cyan-300/80">
          Теневой медиатор
        </p>
        <p className="text-sm leading-relaxed text-gray-300">
          Полезный слой ожидания: короткий разбор паузы и один спокойный выбор перед следующим ходом.
        </p>
      </div>

      <div className="grid gap-2.5 md:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">
            Что держать в фокусе
          </p>
          <p className="text-sm leading-relaxed text-gray-200">{note.focus}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">
            Где риск срыва
          </p>
          <p className="text-sm leading-relaxed text-gray-200">{note.caution}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">
            Куда двигаться дальше
          </p>
          <p className="text-sm leading-relaxed text-gray-200">{note.vector}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.05] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-violet-300/80">
              Выберите одно из двух
            </p>
            <p className="text-sm leading-relaxed text-gray-200">{scenario.prompt}</p>
          </div>
          <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400">
            Не тест и не оценка
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {[scenario.left, scenario.right].map((option) => {
            const isSelected = selected === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  setSelectedState({ key: scenarioKey, value: option.id })
                }
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-violet-400/30 bg-violet-500/12"
                    : "border-white/8 bg-white/[0.03] hover:border-violet-500/20 hover:bg-violet-500/[0.05]"
                }`}
              >
                <p className="text-sm font-medium text-white">{option.label}</p>
              </button>
            );
          })}
        </div>

        {selectedOption ? (
          <div className="mt-3 rounded-xl border border-violet-500/15 bg-black/10 p-3">
            <p className="text-sm leading-relaxed text-gray-200">
              {selectedOption.explanation}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              {scenario.bridge}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
