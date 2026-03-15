# Правила работы с проектом Konsensus

## Обязательно после каждого изменения
1. **git add <только_согласованные_файлы> && git commit -m "описание" && git push** — пушить ВСЕГДА, но staging делать только адресно по файлам текущей согласованной итерации; `git add -A` и захват несогласованных/чужих изменений запрещён
   Все git-шаги выполнять только последовательно: сначала `git add`, дождаться результата staging; затем `git commit`, дождаться подтверждения коммита; затем `git push`, дождаться завершения push. Параллельный запуск `git add` / `git commit` / `git push` запрещён.
2. Обновить `docs/status.md` — история изменений, чек-листы
3. Обновить `docs/roadmap.md` — отметить выполненные задачи

## Telegram Release Notes (Changelog)
Когда накопится ~3-5 пользовательских фич (не технические фиксы), 
отправить всем привязанным пользователям красивое сообщение через бота:
- Эмодзи, форматирование, краткие описания
- Только то, что влияет на UX (новые функции, улучшения)
- Формат: "🚀 Обновление Konsensus!\n\n✨ Что нового:\n• фича 1\n• фича 2\n\n💡 Попробуйте!"
- Реализовать через API endpoint `/api/telegram/broadcast` или функцию в telegram.ts
- Трекать отправленные changelog'и чтобы не дублировать

## Домен
- Продакшн: `https://konsensus-six.vercel.app`
- Переменная: `NEXT_PUBLIC_APP_URL` на Vercel
- НЕ использовать `konsensus.app` — такого домена нет

## Supabase
- Миграции в `supabase/migrations/` — нумерация `00001_`, `00002_`, ...
- После добавления миграции: напомнить пользователю выполнить SQL в Supabase SQL Editor
- Типы обновлять в `src/types/database.ts`
- Service Role Key — используется для admin-операций

## Telegram-бот
- Webhook: `/api/telegram`
- Mini App: `/tg` (открывается через BotFather Menu Button)
- Уведомления: `src/lib/telegram.ts`
- Бот автоматически чистит старые сообщения (хранит последние 5)

## ИИ
- Groq API: `llama-3.3-70b-versatile`
- Все ИИ-функции в `src/lib/ai.ts`
- Категоризация тем при создании спора/вызова

## Ключевые файлы
- Концепция: `тз и концепция/Konsensus_TZ_v0.1.md` + `docs/concept.md`
- Архитектура: `docs/architecture.md`
- Статус: `docs/status.md`
- Роадмап: `docs/roadmap.md`
- Стратегические rollout-блоки: `docs/ops/README.md`

## Стратегические rollout-блоки
- Перед возвратом к стратегическому пласту (`ai orchestration`, `profile quests`, `reputation`, `education layer`, `appeals`, `trust tiers`) сначала открыть соответствующий rollout-файл из `docs/ops/README.md`
- После изменений в таком блоке обновить:
  - сам rollout-файл;
  - `docs/status.md`;
  - `docs/roadmap.md`
- В rollout-файле всегда фиксировать:
  - что уже выполнено;
  - что ещё не выполнено;
  - следующий практический шаг

## Стек
- Next.js 15 (App Router), React 19, TypeScript strict, Tailwind 4
- Supabase (PostgreSQL + Auth + Realtime), Groq API, Resend, Vercel
