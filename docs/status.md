# Статус проекта Konsensus

> Этот файл — живой документ. ИИ обновляет его автоматически при завершении этапов.
> Последнее обновление: 2026-03-16

## Текущий этап

**Фаза 8–11 (Социальный слой + ИИ-углубление + профиль + release ops)** — расширена и закреплена QA-итерацией. Arena Live, spectator-layer, typing-индикаторы, Telegram surface/support/release-flow и обычный dispute-flow проверены Playwright-набором на desktop, wide и mobile.

В работе: ручная проверка связки `архив ↔ reminders ↔ Telegram`, а также упаковка следующих стратегических пластов в отдельные staged-rollout блоки. Помимо AI orchestration, отдельно зафиксированы profile quests, reputation, education layer, appeals и trust tiers как возвращаемые продуктовые направления с v1-порогом входа и дальнейшим хвостом развития.

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
- [x] Shadow Mediator: скрытая игровая панель зрителя с прогнозом реакции и тематическим параллельным кейсом вместо пузырьковой idle-игры
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
  Существенный прогресс: стабилен multi-viewport контур на `desktop`, `desktop-wide`, `mobile`; полный текущий набор проходит `33/33`
- [ ] Error tracking (Sentry)
- [ ] Unit-тесты server actions
- [ ] Мониторинг запросов
- [x] Release automation для Telegram (структурированный payload, bot + channel, branded release image, publish script)
- [x] Ops-слой проекта (`local-only`, `release-flow`, `model-strategy`)
- [x] Support hub с env-конфигурируемыми ссылками
- [x] Production visibility для support/release env
  Vercel env добавлены вручную, redeploy выполнен, support links и release-channel конфиг выведены в production

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
| 00017_dispute_ai_insights.sql | dispute_analysis, round_insights, waiting_insights, RLS и индексы для обычного AI-сопровождения спора |
| 00018_dispute_user_state.sql | dispute_user_state (персональный архив споров), RLS и индексы для active/archive dashboard-фильтра и auto-unarchive |
| 00019_dispute_reminders.sql | dispute_reminders + расширение dispute_user_state (лимиты reminders, pending count, mute после повторной архивации, архивный приоритет) |

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
| ShadowMediatorPanel | Скрытая игровая панель зрителя: прогноз реакции, параллельный кейс, локальные очки осознанности |
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
| 2026-03-15 | Production visibility для support/release доведена до конца: Vercel env добавлены вручную через dashboard, выполнен redeploy production |
| 2026-03-15 | Bubble idle-game на арене заменена на `Теневого медиатора`: spectator-панель теперь открывается по кнопке, даёт прогноз следующей реакции и тематический параллельный кейс по теме battle |
| 2026-03-15 | Найден и исправлен разрыв в обычном AI-flow: реальные SQL-таблицы `round_insights` / `waiting_insights` / `dispute_analysis` оформлены в миграцию `00017`, Telegram Mini App auth усилен через `magiclink` verifyOtp + profile upsert, invite email теперь явно сообщает об ошибке и шлётся и для незарегистрированного email |
| 2026-03-15 | QA-итерация закрыта: Playwright переведён на стабильный локальный порт `3100`, добавлены проекты `desktop` / `desktop-wide` / `mobile`, public smoke и arena-live suites проходят полностью (`33/33`) |
| 2026-03-15 | По пути исправлены UX-мелочи, выявленные тестами: optimistic append для observer comments в Arena Live и детерминированный первый рендер `WaitingTips` без hydration-mismatch |
| 2026-03-15 | Direct challenge по email усилен: поиск существующего пользователя больше не упирается в первую страницу списка auth-пользователей, существующий аккаунт теперь получает мгновенный Telegram push с темой и описанием спора, а прямой email-вызов содержит контекст проблемы |
| 2026-03-15 | В `AGENTS.md` зафиксировано отдельное правило процесса: `git add` / `git commit` / `git push` выполнять только последовательно, с ожиданием результата каждого шага без параллельного запуска |
| 2026-03-16 | Собран пакет обычного dispute-flow: Google OAuth callback синхронизирует `display_name` в `profiles`, в споре и на странице ответа явнее разделены предмет спора и последний ответ оппонента, waiting-stage обозначен как приватная AI-подсказка, direct challenge / invite приведены к более целостным сообщениям, а блок мини-игр расширен до 6 локальных механик с случайной витриной |
| 2026-03-16 | Добавлен персональный архив споров: спор можно скрыть только у себя, Telegram live-message по нему удаляется из чата, на dashboard появились фильтры `Активные / Архив`, а при новом аргументе, join, переходе в mediation/resolved/closed или принятии решения спор автоматически возвращается в активные |
| 2026-03-16 | Reminder flow для архивированных споров: ожидание ответа теперь можно мягко напомнить кнопкой `Напомнить о споре`, действует лимит `3/час` и `15/сутки`, после повторной архивации Telegram больше не спамит, а попытки возобновления копятся как `pending reminders`, поднимают спор в архиве и сводятся в отдельный архивный бар на dashboard |
| 2026-03-16 | Концепт проекта переведён из `docx` в Markdown: основной source of truth теперь в `тз и концепция/Konsensus_TZ_v0.1.md`, а `docs/concept.md` сокращён до входной точки. В Markdown-концепт добавлен синтез исходных архивов идеи и выделены 4 стратегических продуктовых слоя: многоагентный ИИ, профилирование, репутация как качество диалога и образовательный контур |
| 2026-03-16 | Многоагентный AI-слой оформлен как возвращаемый блок развития: создан `docs/ops/ai-orchestration-rollout.md`, где зафиксирован v1-подход через virtual subagents (`legal/empathy/mediation/fact lenses`) внутри текущего `src/lib/ai.ts`, а также следующий хвост развития: feature registry, `ai_agent_runs`, AI-profile-driven routing и real multi-model routing |
| 2026-03-16 | Остальные стратегические продуктовые пласты тоже оформлены как отдельные rollout-блоки: `profile-quests-rollout.md`, `reputation-rollout.md`, `education-layer-rollout.md`, `appeals-rollout.md`, `trust-tiers-rollout.md`. Каждый блок зафиксирован как staged направление: что можно сделать уже сейчас в v1, что не делать сразу и что нужно будет добить позже |
