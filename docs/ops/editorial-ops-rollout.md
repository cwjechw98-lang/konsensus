# Editorial Ops Rollout

## Цель

Собрать отдельный admin-only контур для релизов:
- видеть, что изменилось с последней опубликованной точки;
- генерировать AI-черновик поста по новым изменениям;
- редактировать черновик перед публикацией;
- публиковать сразу или планировать через текущий Telegram release flow;
- не дублировать уже выпущенные диапазоны изменений.

## Статус блока

- Стадия: `implemented_v1_2`
- Ближайший шаг: `v1.3 workflow polish`
- Возвращаться к блоку через этот файл и синхронизировать `status/roadmap` после изменений

## Решение v1

- не строить полноценную CMS;
- вынести editorial admin flow в `/ops/editorial`;
- хранить release cursor отдельно;
- хранить AI-черновики и их статусы в SQL;
- собирать диапазон изменений через GitHub compare API, а не через локальный `.git`, чтобы flow работал и на Vercel;
- использовать существующий Telegram publish/schedule subsystem как delivery layer.

## Пакет реализации v1

### Основные файлы

- [supabase/migrations/00028_editorial_ops.sql](/C:/project21/konsensus/supabase/migrations/00028_editorial_ops.sql)
- [src/types/database.ts](/C:/project21/konsensus/src/types/database.ts)
- [src/lib/editorial-git.ts](/C:/project21/konsensus/src/lib/editorial-git.ts)
- [src/lib/editorial-ops.ts](/C:/project21/konsensus/src/lib/editorial-ops.ts)
- [src/lib/ai.ts](/C:/project21/konsensus/src/lib/ai.ts)
- [src/app/ops/page.tsx](/C:/project21/konsensus/src/app/ops/page.tsx)
- [src/app/ops/editorial/page.tsx](/C:/project21/konsensus/src/app/ops/editorial/page.tsx)
- [src/app/ops/actions.ts](/C:/project21/konsensus/src/app/ops/actions.ts)
- [src/components/EditorialDraftBuilder.tsx](/C:/project21/konsensus/src/components/EditorialDraftBuilder.tsx)
- [src/components/EditorialDraftHistory.tsx](/C:/project21/konsensus/src/components/EditorialDraftHistory.tsx)

### Критерий готовности v1

- админ видит `/ops/editorial`;
- система показывает current head, baseline и количество новых commit’ов;
- можно сгенерировать AI draft по новым изменениям;
- можно отредактировать draft и сразу опубликовать или запланировать;
- повторный draft по тому же `to_commit` не создаётся;
- после публикации cursor двигается, а scheduled draft не даёт повторно собрать тот же диапазон.

## Что пока не делать

- auto-post без review;
- отдельный editorial calendar;
- multi-channel campaign manager;
- сложную классификацию изменений по AST или diff-intelligence.

## Что нужно добить после v1

## Что уже выполнено

- добавлены SQL-модели:
  - `editorial_release_cursor`
  - `editorial_release_drafts`
- собран GitHub-based source layer вместо локального `.git`, чтобы editorial flow работал и на Vercel runtime;
- добавлена AI-функция генерации release draft по диапазону commit’ов, changed files и последним строкам `status.md`;
- реализован admin-only маршрут `/ops/editorial`;
- админ может:
  - собрать draft;
  - отредактировать title/summary/features/notes;
  - опубликовать сразу;
  - запланировать через текущий Telegram release subsystem;
  - отменить draft;
- добавлена защита от дублей по `to_commit`;
- editorial delivery panel вынесена из профиля в ops-only экран;
- в desktop/mobile admin navigation добавлен вход в `Ops`.
- добавлен отдельный `/ops` landing с несколькими admin-поверхностями;
- editorial ops и appeals moderation теперь разведены по отдельным ops-страницам.
- source layer стал богаче:
  - вычисляются `featureSignals`
  - `releaseTypeHint`
  - `userFacingScore`
- AI draft generation теперь использует эти сигналы как дополнительный routing context;
- active draft можно rebased-ить на текущий `HEAD`, чтобы заново собрать текст и диапазон без ручного пересоздания draft.

### v1.2

- richer release prompt routing по типу фич;
- ручной rebase draft на новый commit range.

### v1.3

- фильтры и быстрая навигация внутри `/ops/editorial`;
- сравнение draft до/после rebase;
- явное разделение scheduled/published history в UI.

### v2

- unified ops console;
- ручной override suppress-policy для спецпостов;
- работа не только с Telegram, но и с другими каналами публикации.

## Следующий практический шаг

- если возвращаться к Editorial Ops, следующий слой — polish вокруг workflow: сравнение rebased draft, фильтры истории и более точная маршрутизация AI-generation по типу релиза.
