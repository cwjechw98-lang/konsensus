# Telegram Editorial Layer Rollout

## Цель

Довести Telegram release-flow до редакционной модели:
- канал или группа получают полный пост;
- бот получает только короткий teaser;
- если пользователь уже подписан на целевой канал или группу, bot-teaser не дублируется.

## Статус блока

- Стадия: `implemented_v1`
- Ближайший хвост: `v1.1 scheduled editorial flow`
- Возвращаться к блоку через этот файл и синхронизировать `status/roadmap` после изменений

## Решение v1

- не строить отдельную CMS или очередь публикаций;
- использовать существующий `release_announcements` и `/api/telegram/broadcast`;
- разделить формат доставки:
  - `channel/group` → полный release card;
  - `bot` → teaser со ссылкой на канал;
- перед bot-teaser проверять membership через `getChatMember`;
- результат проверки сохранять в отдельную SQL-кэш-модель `telegram_channel_memberships`;
- webhook дополнительно обновляет этот кэш по `chat_member` / `my_chat_member`, если бот получает такие апдейты.

## Пакет реализации v1

### Основные файлы

- [supabase/migrations/00024_telegram_channel_memberships.sql](/C:/project21/konsensus/supabase/migrations/00024_telegram_channel_memberships.sql)
- [src/types/database.ts](/C:/project21/konsensus/src/types/database.ts)
- [src/lib/telegram.ts](/C:/project21/konsensus/src/lib/telegram.ts)
- [src/lib/telegram-editorial.ts](/C:/project21/konsensus/src/lib/telegram-editorial.ts)
- [src/lib/releases.ts](/C:/project21/konsensus/src/lib/releases.ts)
- [src/lib/site-config.ts](/C:/project21/konsensus/src/lib/site-config.ts)
- [src/app/api/telegram/route.ts](/C:/project21/konsensus/src/app/api/telegram/route.ts)

### Критерий готовности v1

- release-publish больше не шлёт один и тот же полный пост и в канал, и в бот;
- бот отправляет только teaser;
- подписанные на канал пользователи не получают bot-teaser;
- membership-check фиксируется в кэше.

## Что уже выполнено

- добавлена SQL-модель `telegram_channel_memberships` (`00024`);
- release-flow разделён на:
  - full release card в канал;
  - short teaser в бот;
- suppress bot-teaser работает через `getChatMember` и membership policy helper;
- membership-кэш обновляется:
  - при release-send через API-check;
  - через webhook по `chat_member` / `my_chat_member`, если приходит соответствующий апдейт;
- добавлен `NEXT_PUBLIC_TELEGRAM_RELEASE_CHANNEL_URL` как явный target для teaser CTA.
- для корректной работы пакета нужны:
  - `TELEGRAM_RELEASE_CHANNEL_ID`
  - `NEXT_PUBLIC_TELEGRAM_RELEASE_CHANNEL_URL`

## Что пока не делать

- внутреннее расписание публикаций;
- редакционный календарь в админке;
- многоканальные кампании и A/B delivery.

## Что нужно добить после v1

### v1.1

- scheduled editorial posting;
- richer teaser copy per release type;
- явный delivery report: сколько ушло в бот, сколько подавлено по membership.

### v2

- unified editorial console;
- очередь публикаций;
- ручной override suppress-логики для спецпостов.

## Следующий практический шаг

- если возвращаться к Telegram editorial subsystem, следующий слой — scheduled posting и более явный delivery analytics/reporting.
