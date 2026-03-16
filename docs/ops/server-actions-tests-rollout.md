# Server Actions Unit Tests Rollout

## Цель

Добавить минимальный, но рабочий слой unit-тестов для серверной бизнес-логики, чтобы не проверять каждый регресс только вручную через UI и Telegram.

## Статус блока

- Стадия: `implemented_v1`
- Ближайший хвост: `v1.1 broader action coverage`
- Возвращаться к блоку через этот файл и синхронизировать `status/roadmap` после изменений

## Зачем это нужно

- серверные ruleset-ветки уже стали заметно сложнее;
- reminder / trust-tier / appeals влияют на пользовательский flow и легко ломаются незаметно;
- полный запуск Next server actions в unit-среде дорогой и хрупкий, поэтому нужен слой чистых policy tests.

## Решение v1

- поднять минимальный `Vitest` runner;
- не пытаться мокать весь Next runtime и Supabase;
- вынести и покрыть тестами чистые decision helpers, на которых держатся server actions.

## Пакет реализации v1

### Основные файлы

- [package.json](/C:/project21/konsensus/package.json)
- [vitest.config.ts](/C:/project21/konsensus/vitest.config.ts)
- [src/lib/dispute-reminder.ts](/C:/project21/konsensus/src/lib/dispute-reminder.ts)
- [src/lib/dispute-reminder.test.ts](/C:/project21/konsensus/src/lib/dispute-reminder.test.ts)
- [src/lib/trust-tier.test.ts](/C:/project21/konsensus/src/lib/trust-tier.test.ts)
- [src/lib/appeal-helpers.test.ts](/C:/project21/konsensus/src/lib/appeal-helpers.test.ts)

### Что покрывается

- reminder-политика:
  - eligibility;
  - rate limits;
  - итоговые user-facing сообщения;
  - cap для pending reminders;
- trust-tier policy:
  - linked identity;
  - account age;
  - `basic / linked / trusted`;
  - gating messages;
- appeals helpers:
  - latest appeal map;
  - hidden-state;
  - сортировка badge с учётом апелляций.

### Критерий готовности v1

- в проекте есть отдельный unit runner;
- тесты можно запускать отдельной командой;
- покрыты ключевые pure-policy ветки server-side логики без тяжёлого runtime mocking.

## Что уже выполнено

- добавлен `Vitest` и команды `test:unit`, `test:unit:watch`;
- reminder-ветки вынесены в чистый helper и покрыты unit-тестами;
- trust-tier decision logic покрыта unit-тестами;
- appeal visibility/sorting helpers покрыты unit-тестами.

## Что пока не делать

- мокать весь Supabase client и Next `redirect` для каждой action-функции;
- строить хрупкие интеграционные тесты на каждую server action без выделенного harness;
- тащить jsdom и RTL в пакет, который сейчас нужен для server-side policy logic.

## Что нужно добить после v1

### v1.1

- покрыть `profile-quests` и `education` rule-based selectors;
- добавить тесты на `reputation` rule derivation;
- отдельно проверить mapping release/reminder payloads.

### v2

- сделать integration harness для server actions с controllable Supabase mocks;
- добавить contract-тесты на redirect/message flows и side-effect orchestration.

## Следующий практический шаг

- расширить unit coverage на `profile-quests`, `education recommendations` и `reputation` без раздувания test harness.
