# Статус проекта Konsensus

> Этот файл — живой документ. ИИ обновляет его автоматически при завершении этапов.
> Последнее обновление: 2026-03-15

## Текущий этап

**Фаза 8–11 (Социальный слой + ИИ-углубление + профиль + release ops)** — расширена. Добавлены Arena Live с spectator-view, Telegram-подписки на battle, observer-layer и typing-индикаторы в арене и основном споре.

В работе: внешняя настройка Vercel env для support/release visibility и следующая итерация по тестам.

## Общий прогресс

### Фазы 0–7: Завершены ✅
Базовый проект, аутентификация, споры, аргументы, ИИ-медиатор, геймификация, UX-polish — всё готово и задеплоено.

### Фаза 8: Социальный слой (частично)
- [x] Публичные споры (is_public, тумблер при создании)
- [x] Лента /feed (без авторизации)
- [x] Emoji реакции (👍👎🤔🔥💯) с Realtime
- [x] Чат наблюдателей (анонимные никнеймы, 1925 комбинаций)
- [x] "Всезнающий Сурок" — AI-комментатор каждые 5 сообщений
- [x] Антиспам: блокировки 1 мин → 5 мин, DDoS-защита
- [x] Арена вызовов /arena (доска, hover RPG-тултипы, раундовая дискуссия, авто-медиация)
- [x] Arena Live: публичные active battle, spectator-view без логина, observer chat, delayed observer hints, Telegram watch
- [x] RPG-профиль (4 стата, 6 классов, bio, debate_stance)
- [x] Шаблоны тем споров
- [x] Поиск оппонента (матчинг по темам, фильтры, join open-спора)
- [x] Telegram-бот
- [x] Telegram-вход как видимый веб-путь (CTA на лендинге, логине и регистрации)

### Фаза 9: ИИ-углубление (частично)
- [x] Публичная карточка ИИ после раунда (convergence score -2..+2)
- [x] Оценка силы аргумента перед отправкой (score 1–5)
- [x] Пост-конфликтный момент (конфетти, common ground, инлайн-ачивка)
- [x] ИИ-генерируемые уникальные достижения (отдельное хранение, профиль, realtime-toast)
- [ ] Многоагентная архитектура — v2.0
- [ ] Профилирование участников — v2.0

### Фаза 10: Инфраструктура
- [ ] E2E тесты (Playwright)
- [ ] Error tracking (Sentry)
- [ ] Unit-тесты server actions
- [ ] Мониторинг запросов
- [x] Release automation для Telegram (структурированный payload, bot + channel, branded release image, publish script)
- [x] Ops-слой проекта (`local-only`, `release-flow`, `model-strategy`)
- [x] Support hub с env-конфигурируемыми ссылками
- [~] Production visibility для support/release env
  В коде и `.env.local` подготовлено, но production-применение ждёт авторизованный доступ к Vercel CLI / dashboard

## Стек технологий

| Технология | Версия | Статус |
|-----------|--------|--------|
| Next.js | 15 (App Router) | Активен |
| React | 19 | Активен |
| TypeScript | 5.x strict | Активен |
| Tailwind CSS | 4.x | Активен |
| Supabase (PostgreSQL + Auth + Realtime) | cloud | Активен |
| Groq API (llama-3.3-70b-versatile) | — | Активен |
| Resend (email) | — | Активен |
| Vercel | — | Деплой из main |
| Google OAuth | — | Настроен через Supabase |

## Схема БД (миграции)

| Файл | Содержимое |
|------|-----------|
| 00001_initial_schema.sql | profiles, disputes, arguments, mediations, resolutions, round_insights, waiting_insights, dispute_analysis, user_points, user_achievements |
| 00002_fix_rls_performance.sql | Оптимизация RLS политик |
| 00003_fix_join_and_mediation_policies.sql | Фикс политик join и mediation |
| 00004_fix_rls_service_role_policies.sql | Удаление избыточных политик |
| 00005_public_disputes.sql | is_public поле, RLS для анонимов |
| 00006_reactions_comments.sql | dispute_reactions, dispute_comments |
| 00007_round_public_summaries.sql | round_public_summaries (публичная карточка ИИ) |
| 00008_arena.sql | challenges, challenge_messages, RLS |
| 00009_telegram.sql | telegram_chat_id, telegram_link_token в profiles |
| 00010_topic_categories.sql | category в disputes/challenges, telegram_bot_messages в profiles |
| 00011_ai_profile_and_stats.sql | ai_profiles, counterparts, hint_logs |
| 00012_user_unique_achievements.sql | user_unique_achievements (AI-награды, отдельное хранение) |
| 00013_telegram_message_index.sql | telegram_message_index в profiles (дедупликация и обновление bot-уведомлений) |
| 00014_arena_rounds.sql | max_rounds в challenges (раундовая механика арены) |
| 00015_release_announcements.sql | release_announcements (структурированные релизы, bot + channel publish) |
| 00016_arena_live_spectators.sql | challenge_watchers, challenge_comments, challenge_opinions, challenge_observer_hints, RLS для live spectator-layer |

## Ключевые компоненты

| Компонент | Назначение |
|-----------|-----------|
| RealtimeDisputeClient | Чат аргументов + раунды + Realtime |
| MediationClient | Принятие решений + consensus |
| ConsensusCelebration | Пост-конфликтный момент (конфетти, ачивка) |
| ArgueFormClient | Форма аргумента с inline-оценкой ИИ |
| DisputeReactions | Emoji реакции с Realtime |
| DisputeChat | Чат наблюдателей + "Всезнающий Сурок" |
| AchievementToast | Глобальный тост разблокировки ачивки |
| AnimatedCounter | Анимированный счётчик очков |
| WaitingTips | Rotating советы дебатёра во время ожидания |
| ArenaLiveBoard | Блок активных battle на `/arena` |
| SpectatorPulseGame | Локальная idle-игра для зрителей battle |
| ChallengeChat | Раундовая арена + spectator mode + observer layer + Telegram watch |

## Git-ветки

| Ветка | Назначение | Статус |
|-------|-----------|--------|
| `main` | Основная ветка + продакшн | Активна |

## История изменений

| Дата | Что изменилось |
|------|---------------|
| 2026-03-12 | Инициализация: Next.js, Supabase, auth, layout, профиль |
| 2026-03-12 | Фазы 1–5: споры, аргументы, ИИ-медиатор, деплой |
| 2026-03-14 | Фаза 6: геймификация (очки, достижения, тосты) |
| 2026-03-14 | Фаза 7: UX-polish, Google OAuth, пагинация, mobile |
| 2026-03-14 | Фаза 8: публичные споры, лента, реакции, чат, антиспам |
| 2026-03-14 | Фаза 9: публичная карточка раунда, оценка аргумента, пост-конфликтный момент |
| 2026-03-14 | Telegram-бот: уведомления, привязка аккаунта, Mini App авто-вход через /tg |
| 2026-03-14 | Фикс: домен konsensus-six.vercel.app во всех fallback'ах |
| 2026-03-14 | Бот v2: убрана кнопка «Открыть приложение», автоочистка чата, AI-категоризация тем |
| 2026-03-14 | Новые уведомления: оппонент присоединился, спор завершён, новый вызов на арене |
| 2026-03-14 | Личный кабинет v2: 4 вкладки, контрагенты, ИИ-профиль, 35+ ачивок в 8 категориях |
| 2026-03-14 | Миграции: 00011 (ai_profiles, counterparts, hint_logs) |
| 2026-03-14 | Pre-submission: предупреждение об эскалации конфликта при оценке аргумента |
| 2026-03-14 | Мини-игры при ожидании: реакция, память, математика |
| 2026-03-14 | Интерактивный онбординг (tour с подсветкой элементов) |
| 2026-03-14 | Браузерные push-уведомления (Notification API) |
| 2026-03-14 | Бот: шутки/мудрости ИИ, broadcast API для changelog |
| 2026-03-15 | Матчинг по открытым спорам и вызовам: `/matchmaking`, фильтры категорий, безопасное вступление в open-спор |
| 2026-03-15 | ИИ-генерируемые уникальные достижения: отдельная таблица, показ в профиле и realtime-toast |
| 2026-03-15 | Уточнены правила в `AGENTS.md`: staging только адресно по согласованным файлам, без `git add -A` |
| 2026-03-15 | Фикс арены: принятие открытого вызова снова ведёт в отдельный challenge-room, CTA в matchmaking исправлен |
| 2026-03-15 | Старт E2E-итерации: добавлен Playwright-конфиг, npm scripts и public smoke tests |
| 2026-03-15 | Исправлен middleware для публичных маршрутов: `/feed`, `/arena`, invite-flow и public dispute view больше не редиректят гостя на login |
| 2026-03-15 | Telegram Mini App: `/tg` теперь автоматически создаёт Telegram-first аккаунт и логинит без Google/email-регистрации |
| 2026-03-15 | Telegram-бот: однотипные уведомления обновляются по dedupe-ключам вместо накопления дублей, добавлена миграция `00013` |
| 2026-03-15 | Арена переведена с чата на раундовую механику: `max_rounds`, прогресс, авто-медиация после финального раунда |
| 2026-03-15 | Усилено AI-сопровождение спора: персональные round-insights переписаны под концепцию “ИИ помогает именно вам”, последний инсайт теперь виден и на странице медиации |
| 2026-03-15 | Добавлен visual waiting-layer: анимированная ambient-сцена во время ожидания ответа в споре и на арене |
| 2026-03-15 | AI-инсайты и waiting-insights приведены к более стабильной 3-секционной форме: что оппонент защищает, почему реагирует, что можно учесть дальше |
| 2026-03-15 | UI AI-инсайтов переработан: 3 смысловых блока теперь визуально читаются как отдельные секции в споре и на странице медиации |
| 2026-03-15 | Раундовая подача спора собрана в единый AI-пакет: аргументы, публичный итог и личный разбор теперь читаются как завершённый цикл раунда |
| 2026-03-15 | Внутри AI-пакета раунда добавлена динамика обмена: видно, сблизились или разошлись позиции, усилился ли сдвиг к консенсусу и какая сейчас температура диалога |
| 2026-03-15 | Персональный AI-инсайт получил явный тактический блок `Вектор следующего хода`: это направление следующего ответа по теме, а не готовая шаблонная фраза |
| 2026-03-15 | Telegram-вход выведен в веб-интерфейс: кнопки входа через Telegram добавлены на лендинг, логин и регистрацию |
| 2026-03-15 | Добавлена витрина поддержки проекта: отдельная страница `/support`, footer и ссылки через env на Boosty/crypto/альтернативный способ |
| 2026-03-15 | Release subsystem расширен до структурированных релизов: таблица `release_announcements`, branded-image, publish в бот и канал, локальный `npm run release:telegram` |
| 2026-03-15 | Добавлен ops-слой документации: `docs/ops/local-only.md`, `docs/ops/release-flow.md`, `docs/ops/model-strategy.md` |
| 2026-03-15 | Arena Live: на `/arena` добавлен список активных battle, `/arena/[id]` теперь имеет participant/spectator mode, observer chat, delayed spectator opinions и локальную idle-игру |
| 2026-03-15 | Добавлены Telegram-подписки на battle и dedupe-уведомления для наблюдателей по завершению раунда, ответу и финалу |
| 2026-03-15 | Typing indicators добавлены и в основной dispute-flow, и в arena battle через Supabase Realtime broadcast |
| 2026-03-15 | Production visibility для support/release проверена: локальный env подготовлен, но Vercel CLI не авторизован, поэтому prod env и redeploy требуют внешнего ручного шага |
