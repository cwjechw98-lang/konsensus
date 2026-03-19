# Локальные и внешние настройки Konsensus

Этот файл хранится в git как карта ручных шагов и секретов-заглушек.
Сами секреты и реальные значения не коммитятся.

## Что не пушится

- `.env.local`
- реальные значения env на Vercel
- реальные значения env в локальной машине разработчика
- значения секретов Telegram / Supabase / Sentry / support-ссылок

## Что должно быть в окружении

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `CRON_SECRET`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_RELEASE_CHANNEL_ID`
- `NEXT_PUBLIC_TELEGRAM_RELEASE_CHANNEL_URL`
- `KONSENSUS_ADMIN_EMAILS`
- `KONSENSUS_GITHUB_REPO`
- `GITHUB_TOKEN` (опционально, чтобы editorial ops не упирался в rate limit GitHub API)
- `NEXT_PUBLIC_SUPPORT_BOOSTY_URL`
- `NEXT_PUBLIC_SUPPORT_CRYPTO_URL`
- `NEXT_PUBLIC_SUPPORT_ALT_URL`

## Внешние ручные настройки

### Telegram BotFather
- Menu Button должен открывать Mini App `/tg`
- webhook должен быть направлен на `/api/telegram`
- `TELEGRAM_BOT_USERNAME` в env должен совпадать с текущим username бота

### Scheduled editorial flow
- `CRON_SECRET` нужен для Vercel Cron и ручного вызова:
  - `/api/telegram/editorial/run`
  - `/api/keepalive/supabase`
- в текущей конфигурации [vercel.json](/C:/project21/konsensus/vercel.json) cron запускается раз в день
- на Hobby-плане Vercel cron ограничен одним daily вызовом; если нужен более частый editorial sweep, это уже следующий инфраструктурный шаг

### Supabase keepalive
- `/api/keepalive/supabase` делает лёгкий server-side read-запрос к `profiles`
- маршрут не публичный: он принимает только `Authorization: Bearer <CRON_SECRET>`
- это технический keepalive для free-проекта Supabase, а не пользовательский endpoint
- если Supabase снова пишет про low activity, сначала проверить, что Vercel Cron реально включён и `CRON_SECRET` задан в Project Settings

### Telegram-канал релизов
- бот должен быть администратором канала
- `TELEGRAM_RELEASE_CHANNEL_ID` для текущей membership/suppress логики должен быть numeric (`-100...`)
- `NEXT_PUBLIC_TELEGRAM_RELEASE_CHANNEL_URL` должен вести на публичную ссылку канала вида `https://t.me/<username>`
- релиз-посты идут в канал отдельно от пользовательских bot-notifications

### Appeals moderation
- `KONSENSUS_ADMIN_EMAILS` — список email через запятую для доступа к ручной очереди апелляций
- если env пустой, manual moderation queue не показывается

### Editorial Ops
- `KONSENSUS_GITHUB_REPO` должен указывать на репозиторий в формате `owner/name`
- если репозиторий публичный, `GITHUB_TOKEN` можно не задавать
- если нужен запас по rate limit или репозиторий станет приватным, `GITHUB_TOKEN` нужно добавить в окружение

### Supabase
- миграции из `supabase/migrations/` применяются вручную через SQL Editor, если нет отдельного deploy-flow миграций
- после каждой новой миграции нужно обновлять `src/types/database.ts`

### Vercel
- `NEXT_PUBLIC_APP_URL` должен указывать на `https://konsensus-six.vercel.app`
- support links и Telegram env должны быть продублированы в Vercel Project Settings

## Чек перед релизом

- Telegram bot webhook отвечает 200
- `/tg` работает внутри Telegram и корректно показывает fallback вне Telegram
- bot username и channel id заданы
- public channel URL и admin emails заданы там, где нужны
- support links заданы или намеренно оставлены пустыми
- последняя миграция применена в Supabase
