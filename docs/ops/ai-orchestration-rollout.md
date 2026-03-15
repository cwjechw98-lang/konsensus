# AI Orchestration Rollout

## Цель

Развить текущий AI-слой Konsensus до мягкой многоагентной архитектуры без переписывания всего dispute-flow.

Первый шаг — не настоящие независимые модели, а role-based orchestration внутри текущего слоя [ai.ts](/C:/project21/konsensus/src/lib/ai.ts).

## Статус блока

- Стадия: `planned`
- Ближайший релиз: `v1 role-based orchestration`
- Возвращаться к блоку через этот файл и обновлять в нём выполненные шаги до синхронизации `status/roadmap`

## Текущее состояние

Сейчас AI-слой уже разделён по feature-задачам:
- `categorizeTopicAI`
- `generateWaitingInsight`
- `generateRoundInsights`
- `generatePublicRoundSummary`
- финальная mediation частично живёт отдельно в server actions

Это уже хороший фундамент для следующего шага:
- feature-based routing уже есть
- structured output уже используется
- dispute context и profile context уже собираются

## Решение v1: Virtual Subagents

Вместо настоящей multi-model схемы вводятся виртуальные субагенты:
- `legal_lens`
- `empathy_lens`
- `mediation_lens`
- `fact_lens`

Каждый субагент:
- использует ту же модель/провайдера;
- получает отдельный role prompt;
- возвращает структурированный JSON;
- не показывается пользователю напрямую.

Пользователю показывается только агрегированный результат оркестратора.

## Оркестратор

Нужен orchestration layer в [ai.ts](/C:/project21/konsensus/src/lib/ai.ts):

- `selectAgentKeys(...)`
- `buildAgentPrompt(...)`
- `runAgent(...)`
- `aggregatePrivateRoundInsight(...)`
- `aggregatePublicRoundSummary(...)`
- `generateFinalMediation(...)`

Оркестратор решает:
- какие линзы включать;
- когда хватит 1-2 агентов;
- когда нужен расширенный анализ.

## Правила маршрутизации v1

Минимальная логика без ML:

- `plane=legal|business` -> `legal_lens + mediation_lens`
- `plane=family|religious` -> `empathy_lens + mediation_lens`
- `plane=scientific` -> `fact_lens + mediation_lens`
- `heat_level >= 4` -> обязательно добавить `empathy_lens`
- если в аргументах есть evidence -> добавить `fact_lens`

## Встраивание в текущий код

### 1. Waiting insight

Перевести [generateWaitingInsight](/C:/project21/konsensus/src/lib/ai.ts):
- базово вызывать `empathy_lens`
- для legal/business добавлять `legal_lens`
- на выходе сохранять тот же 3-строчный формат

### 2. Round private insight

Перевести [generateRoundInsights](/C:/project21/konsensus/src/lib/ai.ts):
- категоризация и heat остаются
- вместо одного монолитного prompt оркестратор вызывает 2-3 линзы
- агрегатор сохраняет тот же формат `round_insights`

### 3. Round public summary

Перевести [generatePublicRoundSummary](/C:/project21/konsensus/src/lib/ai.ts):
- использовать `mediation_lens`
- при необходимости `fact_lens`
- на выходе оставить ту же структуру: `content + convergence`

### 4. Final mediation

Вынести финальную mediation из [actions.ts](/C:/project21/konsensus/src/lib/actions.ts) в [ai.ts](/C:/project21/konsensus/src/lib/ai.ts):
- текущий prompt становится orchestration-backed функцией
- для финального анализа можно вызывать больше линз, чем в обычном раунде

## Пакет реализации v1

### Основные файлы

- [src/lib/ai.ts](/C:/project21/konsensus/src/lib/ai.ts)
- [src/lib/actions.ts](/C:/project21/konsensus/src/lib/actions.ts)
- [docs/ops/model-strategy.md](/C:/project21/konsensus/docs/ops/model-strategy.md)

### Что меняем в коде

- добавить типы `AgentKey`, `AgentPlan`, `AgentOutput`
- вынести role registry и routing rules в один конфиг внутри `ai.ts`
- перевести `generateWaitingInsight`, `generateRoundInsights`, `generatePublicRoundSummary`
- вынести финальную mediation в `generateFinalMediation`
- сохранить тот же внешний формат outputs, чтобы UI не переписывать

### UI-поверхности

- прямых новых экранов нет
- пользователь продолжает видеть текущие waiting/private/public AI-блоки
- изменение должно проявляться только в качестве и глубине AI-разбора

### Критерий готовности v1

- orchestration живёт в одном слое и не размазан по server actions
- waiting/private/public/final AI-функции идут через единый routing path
- существующий dispute UI не требует structural rewrite
- в docs зафиксировано, какие линзы вызываются в каких условиях

## Что пока не делаем

На первом этапе не делать:
- отдельные таблицы сырых agent-run результатов
- отдельные очереди на каждого агента
- отдельные модели под каждого агента
- UI, в котором пользователь видит ответы линз по отдельности

## Что нужно добить после v1

После базового orchestration-слоя останутся следующие шаги:

### v1.1
- вынести feature registry и model routing в конфиг
- закрепить причины выбора модели по каждой AI-фиче
- уменьшить дублирование prompt-логики

### v1.2
- добавить таблицу `ai_agent_runs` для отладки и оценки качества
- логировать какие линзы реально вызывались и что дали
- сравнивать качество outputs по конфликтным сценариям

### v1.3
- подключить AI-profile в выбор линз
- не только `plane` и `heat`, но и `user style` должен влиять на orchestration

### v2
- перейти от virtual subagents к реальному multi-provider / multi-model routing
- при необходимости вынести тяжёлую mediation в отдельный execution path

## Что отложено после v1

- feature registry как отдельная конфигурация
- таблица `ai_agent_runs`
- routing с учётом AI-профиля пользователя
- multi-provider / multi-model execution

## Почему это важно

Этот блок — не просто “ещё один AI-файл”.
Это переход от single-prompt продукта к системе, где:
- спор анализируется в нескольких плоскостях;
- AI может расти без переделки всей UX-модели;
- проект становится ближе к исходной концепции Konsensus, а не просто к набору AI-фич.
