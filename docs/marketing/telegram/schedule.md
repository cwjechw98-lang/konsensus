# Telegram Schedule

## Почему не стоит постить всё сразу

Если выгрузить все тексты в один день, Telegram-поверхность будет выглядеть как искусственно надутый архив. Лучше создать ощущение живого проекта: один пост в день или один пост в два дня.

## Рекомендуемый стартовый ритм

### День 1

- канал/группа:
  [00_welcome.md](/C:/project21/konsensus/docs/marketing/telegram/channel/00_welcome.md)
- бот:
  [00_new_post_notice.md](/C:/project21/konsensus/docs/marketing/telegram/bot/00_new_post_notice.md)

### День 2

- канал/группа:
  [01_telegram_surface.md](/C:/project21/konsensus/docs/marketing/telegram/channel/01_telegram_surface.md)
- structured release payload:
  [01_telegram_surface_and_support.json](/C:/project21/konsensus/docs/marketing/telegram/payloads/01_telegram_surface_and_support.json)

### День 3

- канал/группа:
  [02_dispute_flow.md](/C:/project21/konsensus/docs/marketing/telegram/channel/02_dispute_flow.md)
- structured release payload:
  [02_dispute_flow_quality.json](/C:/project21/konsensus/docs/marketing/telegram/payloads/02_dispute_flow_quality.json)

### День 4

- канал/группа:
  [03_archive_and_reminders.md](/C:/project21/konsensus/docs/marketing/telegram/channel/03_archive_and_reminders.md)
- structured release payload:
  [03_archive_and_reminders.json](/C:/project21/konsensus/docs/marketing/telegram/payloads/03_archive_and_reminders.json)

## Важное ограничение

Текущий проектный flow умеет immediate release publish, но не даёт отдельного встроенного таймера публикации. Для расписания сейчас лучше использовать:
- ручную отложенную отправку в самом Telegram-клиенте;
- или позже добавить отдельный scheduler в проект.
