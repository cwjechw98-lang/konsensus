# Telegram Editorial Pack

Этот каталог нужен для двух вещей:
- подготовить тексты постов для Telegram-канала или группы;
- подготовить structured release payloads для текущего bot/channel release-flow.

## Что уже умеет проект

Сейчас в проекте уже есть рабочий release-posting:
- [docs/ops/release-flow.md](/C:/project21/konsensus/docs/ops/release-flow.md)
- [src/app/api/telegram/broadcast/route.ts](/C:/project21/konsensus/src/app/api/telegram/broadcast/route.ts)
- [src/lib/telegram.ts](/C:/project21/konsensus/src/lib/telegram.ts)
- [scripts/publish-release.mjs](/C:/project21/konsensus/scripts/publish-release.mjs)

Текущая реализация умеет:
- отправлять обычный broadcast в бот;
- отправлять structured release в бот, канал или оба канала сразу;
- не дублировать релиз по тому же `slug`.

## Что уже появилось во втором слое

- раздельная логика `канал = полный пост`, `бот = короткий тизер`;
- suppress bot-уведомления для пользователей, которых бот видит как подписанных на целевой канал или группу;
- SQL-кэш membership-check в `telegram_channel_memberships`.

## Чего сейчас всё ещё нет

- штатного расписания публикаций внутри текущего кода;
- delivery analytics/reporting;
- richer branching по разным типам editorial posts.

## Состав пакета

- [schedule.md](/C:/project21/konsensus/docs/marketing/telegram/schedule.md)
  Предлагаемый ритм запуска постов.
- [delivery-model.md](/C:/project21/konsensus/docs/marketing/telegram/delivery-model.md)
  Как должна работать схема `канал/группа + бот` и что для этого нужно в коде.
- [channel](/C:/project21/konsensus/docs/marketing/telegram/channel)
  Длинные тексты для Telegram-канала или группы.
- [bot](/C:/project21/konsensus/docs/marketing/telegram/bot)
  Короткие bot-тизеры о выходе нового поста.
- [payloads](/C:/project21/konsensus/docs/marketing/telegram/payloads)
  Готовые JSON-файлы под текущий release-flow.

## Практический порядок использования

1. Открыть [schedule.md](/C:/project21/konsensus/docs/marketing/telegram/schedule.md).
2. Канальные посты публиковать вручную или через клиент Telegram с отложенной отправкой.
3. Если нужен structured release из проекта, использовать JSON из `payloads`.
4. Для текущей delivery-модели и её ограничений опираться на [delivery-model.md](/C:/project21/konsensus/docs/marketing/telegram/delivery-model.md).
