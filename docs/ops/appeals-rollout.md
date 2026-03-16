# Appeals Rollout

## Цель

Добавить механизм апелляции для спорных автоматических выводов:
- репутационных сигналов;
- AI-классификаций;
- чувствительных profile interpretations.

## Статус блока

- Стадия: `implemented_v1`
- Ближайший релиз: `v1 appealable items`
- Возвращаться к блоку через этот файл и обновлять в нём выполненные шаги до синхронизации `status/roadmap`

## Зачем это нужно

- иначе AI-слой становится непрозрачным и потенциально несправедливым;
- апелляция повышает доверие к платформе;
- это необходимый контур перед усилением репутации и trust tiers.

## Решение v1

Первый слой апелляции:
- не апелляция на весь спор;
- а апелляция на конкретный автоматический вывод.

Подходящие объекты:
- спорный reputation badge
- спорный AI-profile summary
- спорная moderation / risk classification

## Встраивание в текущий код

### v1
- добавить `appealable items`
- дать пользователю кнопку `Оспорить`
- сохранить:
  - кто оспаривает
  - что именно
  - короткое текстовое объяснение

### Модель обработки
- на первом этапе апелляция не обязательно требует human moderation
- можно начать с:
  - повторной AI-проверки на другом prompt-path
  - если confidence низкая — скрыть спорный вывод

## Пакет реализации v1

### Основные файлы

- [src/app/profile/actions.ts](/C:/project21/konsensus/src/app/profile/actions.ts)
- [src/lib/ai.ts](/C:/project21/konsensus/src/lib/ai.ts)
- [src/lib/appeals.ts](/C:/project21/konsensus/src/lib/appeals.ts)
- [src/lib/appeal-helpers.ts](/C:/project21/konsensus/src/lib/appeal-helpers.ts)
- [src/types/database.ts](/C:/project21/konsensus/src/types/database.ts)
- [src/app/profile/page.tsx](/C:/project21/konsensus/src/app/profile/page.tsx)
- [src/components/AppealComposer.tsx](/C:/project21/konsensus/src/components/AppealComposer.tsx)
- новая миграция в [supabase/migrations](/C:/project21/konsensus/supabase/migrations)

### Данные и сервер

- ввести таблицу `appeals` или аналогичную lightweight-модель
- хранить тип объекта, ссылку на объект, текст апелляции, статус, результат пересмотра
- action-методы:
  - `submitAppeal`
  - `reviewAppeal`
  - `resolveAppeal`
- в `v1` авто-review идёт сразу после подачи апелляции и при низкой уверенности скрывает спорный вывод

### UI-поверхности

- кнопка `Оспорить` рядом с appealable AI-выводом
- компактная форма объяснения
- статус апелляции в профиле или в карточке соответствующего вывода
- `v1` вшит в `AI-профиль`: доступны `AI-резюме` и конкретные `reputation badges`

### Критерий готовности v1

- пользователь может оспорить конкретный AI-вывод, а не весь спор
- система сохраняет историю апелляции
- спорный вывод может быть скрыт или пересмотрен
- дальнейший ручной moderation layer можно добавить поверх той же модели

## Что уже выполнено

- добавлена SQL-модель `appeals` (`00023`) с RLS только на чтение/создание своих апелляций
- добавлен авто-review path в [src/lib/ai.ts](/C:/project21/konsensus/src/lib/ai.ts) для повторного пересмотра спорного автовывода
- реализованы `submitAppeal`, `reviewAppeal`, `resolveAppeal` в [src/app/profile/actions.ts](/C:/project21/konsensus/src/app/profile/actions.ts)
- в `AI-профиле` можно оспорить:
  - `AI-резюме профиля`
  - любой конкретный публичный `reputation badge`
- если auto-review считает вывод спорным или недостаточно уверенным, он скрывается:
  - `AI summary` скрывается в профиле
  - `reputation badge` убирается из публичного слоя, но остаётся видимым в своём профиле со статусом апелляции
- история апелляций сохраняется и показывается в профиле отдельным блоком

## Что пока не делать

- сложный арбитражный кабинет
- многоступенчатые апелляции
- публичные споры вокруг самой апелляции

## Что нужно добить после v1

### v1.1
- добавить moderation queue для ручного разбора спорных кейсов
- хранить результат апелляции и причину
- добавить ручной override поверх авто-review вместо только автоматического пути

### v1.2
- связать апелляции с reputation history
- показывать, что вывод был пересмотрен
- добавить апеллируемые `risk/escalation` выводы и другие automated classifications

### v2
- полноценный trust-and-appeals subsystem
- аналитика по ошибочным автоматическим выводам
- feedback loop для дообучения правил и prompts

## Что отложено после v1

- human moderation queue
- связь с reputation timeline
- аналитика качества AI-выводов
- полноценный trust-and-appeals subsystem

## Следующий практический шаг

- вынести `appeals v1.1` в отдельный пакет: moderation queue + manual override + расширение на другие automated classifications
