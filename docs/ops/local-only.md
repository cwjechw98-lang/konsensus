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
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_RELEASE_CHANNEL_ID`
- `NEXT_PUBLIC_SUPPORT_BOOSTY_URL`
- `NEXT_PUBLIC_SUPPORT_CRYPTO_URL`
- `NEXT_PUBLIC_SUPPORT_ALT_URL`

## Внешние ручные настройки

### Telegram BotFather
- Menu Button должен открывать Mini App `/tg`
- webhook должен быть направлен на `/api/telegram`
- `TELEGRAM_BOT_USERNAME` в env должен совпадать с текущим username бота

### Telegram-канал релизов
- бот должен быть администратором канала
- `TELEGRAM_RELEASE_CHANNEL_ID` можно хранить как `@channel_username` или numeric id
- релиз-посты идут в канал отдельно от пользовательских bot-notifications

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
- support links заданы или намеренно оставлены пустыми
- последняя миграция применена в Supabase
