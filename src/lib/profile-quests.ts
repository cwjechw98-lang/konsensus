import type { AIProfile } from "@/lib/ai-profile";

export type QuestMetricKey =
  | "compromise_tendency"
  | "impulsivity"
  | "empathy_score";

export type ArgumentationStyle = AIProfile["argumentation_style"];

export type QuestStyleVote = Partial<Record<ArgumentationStyle, number>>;

export type QuestChoiceEffect = Partial<Record<QuestMetricKey, number>> & {
  styleVotes?: QuestStyleVote;
};

export type ProfileQuestChoice = {
  id: string;
  label: string;
  description: string;
  effect: QuestChoiceEffect;
};

export type ProfileQuestStep = {
  id: string;
  prompt: string;
  choices: ProfileQuestChoice[];
};

export type ProfileQuestDefinition = {
  key: string;
  title: string;
  summary: string;
  duration: string;
  impactLabels: string[];
  steps: ProfileQuestStep[];
};

export type QuestResultDelta = {
  compromise_tendency: number;
  impulsivity: number;
  empathy_score: number;
  argumentation_style: ArgumentationStyle;
};

export type QuestResultMetric = {
  label: string;
  before: number | string;
  after: number | string;
};

export type QuestCompletionResult = {
  questKey: string;
  questTitle: string;
  changes: QuestResultMetric[];
  explanation: string[];
};

const METRIC_LABELS: Record<QuestMetricKey, string> = {
  compromise_tendency: "Готовность к компромиссу",
  impulsivity: "Импульсивность",
  empathy_score: "Эмпатия",
};

const STYLE_LABELS: Record<ArgumentationStyle, string> = {
  logical: "Логический",
  emotional: "Эмоциональный",
  mixed: "Смешанный",
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export const PROFILE_QUESTS: ProfileQuestDefinition[] = [
  {
    key: "pressure_response",
    title: "Реакция на давление",
    summary:
      "Как вы ведёте себя, когда разговор становится жёстким и вас подталкивают к мгновенному ответу.",
    duration: "2-3 минуты",
    impactLabels: ["Импульсивность", "Эмпатия", "Стиль аргументации"],
    steps: [
      {
        id: "public_push",
        prompt:
          "Коллега публично требует от вас немедленного ответа и пытается продавить решение до того, как вы увидели все детали. Что делаете первым?",
        choices: [
          {
            id: "counterattack",
            label: "Отвечаю сразу и жёстко, чтобы остановить давление",
            description: "Ставлю границу, но рискую поднять температуру разговора.",
            effect: {
              impulsivity: 12,
              empathy_score: -4,
              compromise_tendency: -6,
              styleVotes: { emotional: 2 },
            },
          },
          {
            id: "clarify",
            label: "Сначала уточняю, чего именно он хочет добиться",
            description: "Снимаю часть давления через вопрос и прояснение мотивов.",
            effect: {
              impulsivity: -6,
              empathy_score: 6,
              compromise_tendency: 4,
              styleVotes: { logical: 1, mixed: 1 },
            },
          },
          {
            id: "pause",
            label: "Беру паузу и обещаю вернуться с ответом после проверки фактов",
            description: "Не вхожу в ритм чужого давления и собираю контекст.",
            effect: {
              impulsivity: -10,
              compromise_tendency: 3,
              styleVotes: { logical: 2 },
            },
          },
        ],
      },
      {
        id: "second_wave",
        prompt:
          "Через несколько минут давление усиливается: вас обвиняют в затягивании. Как держите разговор дальше?",
        choices: [
          {
            id: "mirror_pressure",
            label: "Давлю в ответ и показываю, что со мной так нельзя",
            description: "Защищаюсь, но делаю диалог более жёстким.",
            effect: {
              impulsivity: 10,
              empathy_score: -3,
              compromise_tendency: -4,
              styleVotes: { emotional: 2 },
            },
          },
          {
            id: "boundary_and_reason",
            label: "Спокойно обозначаю границы и объясняю, что решение без данных будет слабым",
            description: "Не ухожу в нападение, но не отдаю контроль над темпом.",
            effect: {
              impulsivity: -4,
              empathy_score: 4,
              compromise_tendency: 2,
              styleVotes: { logical: 2 },
            },
          },
          {
            id: "shared_goal",
            label: "Возвращаю разговор к общей цели и предлагаю короткий план решения",
            description: "Снижаю давление через общий ориентир и следующий шаг.",
            effect: {
              impulsivity: -5,
              empathy_score: 5,
              compromise_tendency: 7,
              styleVotes: { mixed: 2 },
            },
          },
        ],
      },
      {
        id: "aftercare",
        prompt:
          "После конфликта у вас остаётся ощущение несправедливого давления. Что для вас важнее всего зафиксировать?",
        choices: [
          {
            id: "respect",
            label: "Чтобы меня больше не пытались продавить подобным способом",
            description: "Приоритет — защита границ и контроль над темпом.",
            effect: {
              impulsivity: 4,
              compromise_tendency: -2,
              styleVotes: { emotional: 1, mixed: 1 },
            },
          },
          {
            id: "clarity",
            label: "Чтобы в следующий раз у всех сразу были понятные критерии решения",
            description: "Приоритет — ясные правила вместо реактивного ответа.",
            effect: {
              impulsivity: -3,
              compromise_tendency: 3,
              styleVotes: { logical: 2 },
            },
          },
          {
            id: "relationship",
            label: "Чтобы конфликт не разрушил рабочие отношения после решения вопроса",
            description: "Приоритет — сохранить контакт, а не только выиграть момент.",
            effect: {
              empathy_score: 6,
              compromise_tendency: 5,
              styleVotes: { mixed: 2 },
            },
          },
        ],
      },
    ],
  },
  {
    key: "unfairness_signal",
    title: "Несправедливость",
    summary:
      "Как вы реагируете, когда считаете решение или оценку по отношению к себе необъективной.",
    duration: "2-4 минуты",
    impactLabels: ["Компромисс", "Эмпатия", "Стиль аргументации"],
    steps: [
      {
        id: "first_hit",
        prompt:
          "В групповом обсуждении решение принимают без вас, а потом просят просто согласиться. Что вы делаете сначала?",
        choices: [
          {
            id: "reject",
            label: "Сразу говорю, что это несправедливо и не принимаю решение",
            description: "Быстро обозначаю несогласие, но могу усилить напряжение.",
            effect: {
              compromise_tendency: -8,
              impulsivity: 6,
              styleVotes: { emotional: 2 },
            },
          },
          {
            id: "ask_process",
            label: "Прошу объяснить, как именно было принято решение",
            description: "Сначала вытаскиваю процесс, а уже потом оцениваю результат.",
            effect: {
              empathy_score: 3,
              compromise_tendency: 3,
              styleVotes: { logical: 2 },
            },
          },
          {
            id: "state_impact",
            label: "Спокойно описываю, как это решение влияет на меня, и предлагаю пересобрать обсуждение",
            description: "Сначала показываю последствия и перевожу спор к пересмотру.",
            effect: {
              empathy_score: 5,
              compromise_tendency: 6,
              styleVotes: { mixed: 2 },
            },
          },
        ],
      },
      {
        id: "escalation",
        prompt:
          "В ответ вам говорят: «Не драматизируй, все и так очевидно». Как продолжаете спор?",
        choices: [
          {
            id: "push_back",
            label: "Давлю в ответ и требую признать, что со мной поступили неправильно",
            description: "Фокусируюсь на признании ошибки здесь и сейчас.",
            effect: {
              impulsivity: 8,
              empathy_score: -2,
              compromise_tendency: -3,
              styleVotes: { emotional: 2 },
            },
          },
          {
            id: "reframe",
            label: "Переформулирую конфликт как проблему процесса, а не личной атаки",
            description: "Снижаю градус и возвращаю разговор в рабочий формат.",
            effect: {
              empathy_score: 4,
              compromise_tendency: 4,
              styleVotes: { logical: 1, mixed: 1 },
            },
          },
          {
            id: "protect_and_restore",
            label: "Говорю о границе уважения и предлагаю вернуться к вопросу после короткой паузы",
            description: "Не проглатываю укол, но и не раскручиваю его дальше.",
            effect: {
              impulsivity: -5,
              empathy_score: 4,
              compromise_tendency: 2,
              styleVotes: { mixed: 2 },
            },
          },
        ],
      },
      {
        id: "resolution_priority",
        prompt:
          "Если у вас есть один главный критерий «справедливого» исхода, какой он?",
        choices: [
          {
            id: "principle",
            label: "Важно, чтобы было признано нарушение принципа",
            description: "Справедливость для меня начинается с признания рамки.",
            effect: {
              compromise_tendency: -2,
              styleVotes: { logical: 1, emotional: 1 },
            },
          },
          {
            id: "repair",
            label: "Важно, чтобы последствия для меня были реально исправлены",
            description: "Смотрю на результат, а не только на символическое признание.",
            effect: {
              compromise_tendency: 5,
              empathy_score: 2,
              styleVotes: { mixed: 2 },
            },
          },
          {
            id: "future_rule",
            label: "Важно, чтобы правило на будущее стало понятным всем участникам",
            description: "Считаю справедливость устойчивой, когда она повторяема.",
            effect: {
              compromise_tendency: 4,
              empathy_score: 3,
              styleVotes: { logical: 2 },
            },
          },
        ],
      },
    ],
  },
  {
    key: "information_gap",
    title: "Дефицит информации",
    summary:
      "Как вы принимаете позицию, когда фактов мало, а другой человек уверен гораздо сильнее вас.",
    duration: "2-3 минуты",
    impactLabels: ["Стиль аргументации", "Компромисс", "Импульсивность"],
    steps: [
      {
        id: "uncertain_start",
        prompt:
          "Вы спорите о решении, но понимаете, что у вас неполная картина. Оппонент уверен и уже давит на выбор. Что делаете первым?",
        choices: [
          {
            id: "gut_feeling",
            label: "Опираюсь на интуицию и защищаю то, что мне кажется верным",
            description: "Заполняю пробелы уверенностью и личным ощущением.",
            effect: {
              impulsivity: 7,
              styleVotes: { emotional: 2 },
            },
          },
          {
            id: "list_unknowns",
            label: "Сначала фиксирую, каких данных не хватает, прежде чем спорить дальше",
            description: "Не делаю вид, что знаю больше, чем знаю.",
            effect: {
              impulsivity: -6,
              compromise_tendency: 2,
              styleVotes: { logical: 2 },
            },
          },
          {
            id: "temporary_position",
            label: "Даю временную позицию, но сразу оговариваю, на чём она держится",
            description: "Оставляю пространство для пересмотра по мере появления данных.",
            effect: {
              compromise_tendency: 5,
              empathy_score: 2,
              styleVotes: { mixed: 2 },
            },
          },
        ],
      },
      {
        id: "other_confidence",
        prompt:
          "Оппонент говорит: «Ты просто не разбираешься». Как лучше для вас удержать разговор?",
        choices: [
          {
            id: "attack_confidence",
            label: "Ставлю под сомнение его уверенность и авторитет",
            description: "Ломаю чужую позицию, чтобы выровнять поле.",
            effect: {
              impulsivity: 8,
              empathy_score: -2,
              styleVotes: { emotional: 1, mixed: 1 },
            },
          },
          {
            id: "ask_evidence",
            label: "Прошу показать, на чём основана его уверенность",
            description: "Перевожу разговор к проверяемым основаниям.",
            effect: {
              compromise_tendency: 2,
              styleVotes: { logical: 2 },
            },
          },
          {
            id: "shared_review",
            label: "Предлагаю вместе проверить данные и вернуться к решению после сверки",
            description: "Ставлю совместную проверку выше мгновенной победы.",
            effect: {
              compromise_tendency: 7,
              empathy_score: 4,
              impulsivity: -3,
              styleVotes: { mixed: 2 },
            },
          },
        ],
      },
      {
        id: "final_signal",
        prompt:
          "Когда информации мало, какой тип аргумента для вас самый убедительный?",
        choices: [
          {
            id: "personal_case",
            label: "Живой пример или личный кейс, который можно почувствовать",
            description: "Меня убеждает то, что похоже на реальную жизнь.",
            effect: {
              empathy_score: 3,
              styleVotes: { emotional: 2 },
            },
          },
          {
            id: "structured_logic",
            label: "Структурная логика и прозрачная цепочка рассуждений",
            description: "Мне важнее, чтобы вывод был собран шаг за шагом.",
            effect: {
              styleVotes: { logical: 2 },
            },
          },
          {
            id: "hybrid",
            label: "Комбинация ясной логики и ощущения, что решение жизнеспособно",
            description: "Мне важен и смысл, и то, как это будет работать на практике.",
            effect: {
              compromise_tendency: 3,
              styleVotes: { mixed: 2 },
            },
          },
        ],
      },
    ],
  },
];

export function getProfileQuest(questKey: string) {
  return PROFILE_QUESTS.find((quest) => quest.key === questKey) ?? null;
}

function resolveStyle(currentStyle: ArgumentationStyle, votes: QuestStyleVote) {
  const scoreMap: Record<ArgumentationStyle, number> = {
    logical: votes.logical ?? 0,
    emotional: votes.emotional ?? 0,
    mixed: votes.mixed ?? 0,
  };

  const best = (Object.entries(scoreMap) as [ArgumentationStyle, number][])
    .sort((left, right) => right[1] - left[1])[0];

  if (!best || best[1] === 0) return currentStyle;
  return best[0];
}

export function calculateQuestOutcome(
  profile: AIProfile,
  questKey: string,
  choiceIds: string[]
): {
  updatedProfile: AIProfile;
  delta: QuestResultDelta;
  completion: QuestCompletionResult;
} {
  const quest = getProfileQuest(questKey);
  if (!quest) {
    throw new Error("Quest not found");
  }

  const numericDelta: Record<QuestMetricKey, number> = {
    compromise_tendency: 0,
    impulsivity: 0,
    empathy_score: 0,
  };
  const styleVotes: QuestStyleVote = {};

  quest.steps.forEach((step, index) => {
    const choiceId = choiceIds[index];
    const choice = step.choices.find((item) => item.id === choiceId);
    if (!choice) {
      throw new Error("Quest choice is invalid for current step");
    }

    numericDelta.compromise_tendency += choice.effect.compromise_tendency ?? 0;
    numericDelta.impulsivity += choice.effect.impulsivity ?? 0;
    numericDelta.empathy_score += choice.effect.empathy_score ?? 0;

    for (const [style, value] of Object.entries(choice.effect.styleVotes ?? {})) {
      const typedStyle = style as ArgumentationStyle;
      styleVotes[typedStyle] = (styleVotes[typedStyle] ?? 0) + (value ?? 0);
    }
  });

  const nextStyle = resolveStyle(profile.argumentation_style, styleVotes);

  const updatedProfile: AIProfile = {
    ...profile,
    compromise_tendency: clampScore(
      profile.compromise_tendency + numericDelta.compromise_tendency
    ),
    impulsivity: clampScore(profile.impulsivity + numericDelta.impulsivity),
    empathy_score: clampScore(profile.empathy_score + numericDelta.empathy_score),
    argumentation_style: nextStyle,
  };

  const delta: QuestResultDelta = {
    compromise_tendency:
      updatedProfile.compromise_tendency - profile.compromise_tendency,
    impulsivity: updatedProfile.impulsivity - profile.impulsivity,
    empathy_score: updatedProfile.empathy_score - profile.empathy_score,
    argumentation_style: updatedProfile.argumentation_style,
  };

  const changes: QuestResultMetric[] = [
    {
      label: METRIC_LABELS.compromise_tendency,
      before: `${profile.compromise_tendency}%`,
      after: `${updatedProfile.compromise_tendency}%`,
    },
    {
      label: METRIC_LABELS.impulsivity,
      before: `${profile.impulsivity}%`,
      after: `${updatedProfile.impulsivity}%`,
    },
    {
      label: METRIC_LABELS.empathy_score,
      before: `${profile.empathy_score}%`,
      after: `${updatedProfile.empathy_score}%`,
    },
    {
      label: "Стиль аргументации",
      before: STYLE_LABELS[profile.argumentation_style],
      after: STYLE_LABELS[updatedProfile.argumentation_style],
    },
  ];

  const explanation = [
    delta.impulsivity < 0
      ? "Вы чаще снижаете темп и не входите в спор на чужом давлении."
      : delta.impulsivity > 0
        ? "Вы склонны быстро входить в жёсткий обмен и отвечать без длинной паузы."
        : "Ваш темп реакции в этом сценарии не сдвинулся резко в одну сторону.",
    delta.empathy_score > 0
      ? "В выбранных ходах заметна попытка учитывать логику и состояние второй стороны."
      : delta.empathy_score < 0
        ? "В этом сценарии вы чаще защищали собственную рамку, чем удерживали контакт."
        : "Сценарий не дал сильного сигнала по линии эмпатии.",
    nextStyle === "logical"
      ? "Сценарий усилил опору на структуру, факты и управляемый темп."
      : nextStyle === "emotional"
        ? "Сценарий усилил аргументацию через личное ощущение давления и справедливости."
        : "Сценарий подтвердил гибридный стиль: вы сочетаете рамку, чувства и практический баланс.",
  ];

  return {
    updatedProfile,
    delta,
    completion: {
      questKey,
      questTitle: quest.title,
      changes,
      explanation,
    },
  };
}
