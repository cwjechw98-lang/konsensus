# Release flow: Telegram bot + channel

## Что считаем релизом

Релиз — это пакет из 3–5 пользовательских изменений.
Технические фиксы, миграции без UX-эффекта и внутренние рефакторы в релиз-пост не входят.

## Как собирать релиз

1. Сверить последние UX-фичи по `docs/status.md`, `docs/roadmap.md` и `docs/log/*.md`
2. Отобрать только то, что реально увидит пользователь
3. Сформировать release payload:
   - `title`
   - `summary`
   - `features`
   - при желании `slug`, `notes`, `source_commits`
4. Проверить, что бот и канал настроены, а `NEXT_PUBLIC_APP_URL` указывает на прод
5. Опубликовать release через structured endpoint или локальный скрипт

## Формат данных

```json
{
  "title": "Telegram-вход и поддержка проекта",
  "summary": "Сделали вход через Telegram заметным, добавили поддержку проекта и оформили release flow.",
  "features": [
    "Кнопка входа через Telegram на лендинге, логине и регистрации",
    "Автоматизированные релиз-посты в бот и Telegram-канал",
    "Новая страница поддержки с Boosty и альтернативными способами"
  ],
  "source_commits": ["abc1234", "def5678"]
}
```

## Публикация

### Через локальный скрипт

```bash
npm run release:telegram -- ./docs/ops/release.example.json both
```

Где:
- `./release.json` — локальный JSON-файл с релизом
- `both` — публикация и в бот, и в канал

Вместо `both` можно передать `bot` или `channel`.

Для отложенной публикации:

```bash
npm run release:telegram -- ./docs/ops/release.example.json both 2026-03-17T09:00:00Z
```

Третий аргумент:
- `scheduleAtISO` — ISO-время будущей публикации в UTC
- вместо немедленной отправки релиз будет сохранён в `release_announcements` и опубликован cron-раннером

### Через API

`POST /api/telegram/broadcast`

Headers:
- `x-broadcast-secret: <TELEGRAM_WEBHOOK_SECRET>`

Body:

```json
{
  "target": "both",
  "release": {
    "title": "Новый релиз",
    "summary": "Короткое резюме релиза.",
    "features": ["Фича 1", "Фича 2", "Фича 3"]
  }
}
```

Для отложенной публикации можно добавить:

```json
{
  "target": "both",
  "scheduleAt": "2026-03-17T09:00:00Z",
  "release": {
    "title": "Новый релиз",
    "summary": "Короткое резюме релиза.",
    "features": ["Фича 1", "Фича 2", "Фича 3"]
  }
}
```

## Как теперь расходится доставка

- `channel` получает полный release card;
- `bot` получает короткий teaser;
- если бот видит, что пользователь уже подписан на целевой канал/группу, bot-teaser подавляется;
- для suppress-проверок нужен `TELEGRAM_RELEASE_CHANNEL_ID`, а для корректной CTA-ссылки в teaser нужен `NEXT_PUBLIC_TELEGRAM_RELEASE_CHANNEL_URL`.

## Scheduled posting

- планировщик использует ту же таблицу `release_announcements`;
- cron endpoint: `GET /api/telegram/editorial/run`
- защита:
  - `Authorization: Bearer <CRON_SECRET>` для Vercel Cron
  - либо `x-broadcast-secret: <TELEGRAM_WEBHOOK_SECRET>` для ручного вызова
- в текущей конфигурации [vercel.json](/C:/project21/konsensus/vercel.json) editorial sweep идёт `1` раз в день;
- если scheduled release уже был доставлен, повторный cron-run не должен дублировать публикацию.

## Как работает идемпотентность

- релиз идентифицируется по `slug`
- если тот же `slug` уже был отправлен в бот или канал, повторный вызов не должен дублировать этот канал доставки
- допускается дозавершение: например, релиз уже ушёл в бот, но не ушёл в канал

## Картинка релиза

- первая версия делает branded-card детерминированно
- без AI-генерации и без внешнего image API
- маршрут изображения строится из slug релиза
