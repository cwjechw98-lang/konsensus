# Статус проекта Konsensus

> Этот файл — живой документ. ИИ обновляет его автоматически при завершении этапов.
> Последнее обновление: 2026-03-16

## Текущий этап

**Фаза 8–11 (Социальный слой + ИИ-углубление + профиль + release ops)** — расширена и закреплена QA-итерацией. Arena Live, spectator-layer, typing-индикаторы, Telegram surface/support/release-flow и обычный dispute-flow проверены Playwright-набором на desktop, wide и mobile.

В работе: ручная проверка связки `архив ↔ reminders ↔ Telegram`, а также последовательное внедрение стратегических rollout-блоков в код. Первым внедрён `AI orchestration v1`: waiting/private/public/final AI-пути теперь идут через role-based orchestration в `src/lib/ai.ts`, а дальнейший хвост развития отдельно зафиксирован в rollout-документации. Следом реализован shell-пакет `Navigation + Onboarding v1`: auth-aware default route, пересборка top-level IA, постоянный support-layer и более сильный first-run onboarding.

Текущий основной порядок выполнения на ближайший виток теперь зафиксирован так:
1. Завершён `AI orchestration v1`
2. Завершён `Navigation + Onboarding v1.1`, включая contextual help на ключевых внутренних экранах
3. Завершён `Perceived Performance v1`
4. Завершён `Activity Feed v1`
5. Завершён `Landing v2 implementation`
6. Завершён `Profile Quests v1`
7. Завершён `Reputation v1`
8. Завершён `Education Layer v1`
9. Завершён `Trust Tiers v1`
10. Завершён `Appeals v1`

Стратегическая последовательность rollout-блоков первого слоя завершена. Следующий пакет теперь нужно выбирать отдельно из оставшегося backlog-а: `appeals v1.1`, `reminder/bell для обычного спора`, `Telegram editorial layer v2` или `unit/server-action tests`.

Отдельно зафиксировано, что reminder flow для архивированных споров уже реализован, включая SQL `00019`, лимиты `3/час` и `15/сутки`, auto-unarchive и quiet mode после повторной архивации. Не реализован только отдельный reminder/bell для обычного неархивированного спора: это пока отдельная идея вне закрытого архивного reminder-пакета.

Для этих стратегических пластов теперь есть единая точка входа: [docs/ops/README.md](/C:/project21/konsensus/docs/ops/README.md). Через неё фиксируется правило: перед возвратом к блоку читать его rollout-файл и обновлять не только `status/roadmap`, но и сам staged-план.

Все rollout-файлы теперь доведены до рабочего формата: в каждом зафиксированы `статус блока`, `пакет реализации v1`, конкретные точки в коде/UI и отдельный список того, что осознанно отложено после первого внедрения.

Для product shell теперь тоже есть отдельный rollout-файл: [docs/ops/navigation-onboarding-rollout.md](/C:/project21/konsensus/docs/ops/navigation-onboarding-rollout.md). В нём зафиксированы утверждённые решения по default route, навигации, support-strip и двухслойному onboarding.

Этот shell-пакет уже внедрён в код: `/` теперь ведёт залогиненного пользователя в `Споры`, мобильная навигация переведена на fixed bottom nav, support вынесен в отдельный persistent strip, а dashboard встречает first-run overview до page-level подсказок.

Следом этот же блок был дотянут по принципу contextual help: помощь больше не ограничена одним стартовым туром, а вынесена в сами экраны. На `Спорах`, `Открытых`, `Событиях`, `Профиле`, `Новом споре` и на экране хода теперь есть собственные context-cards и повторный запуск подсказок прямо из места, где пользователь застрял.

Для следующей витрины продукта теперь отдельно зафиксирован и `Landing v2` как возвращаемый rollout-блок: [docs/ops/landing-v2-rollout.md](/C:/project21/konsensus/docs/ops/landing-v2-rollout.md). В нём закреплено, что текущий лендинг нужно перестраивать не как "ещё более длинную страницу", а как product-first вход с более коротким hero, proof-blocks, activity-подачей и живыми preview реального интерфейса.

Этот пакет теперь тоже закрыт: лендинг действительно перестроен в более короткий product-first вход с hero без длинного манифеста, 3-шаговым сценарием, proof-блоками, activity-переходом и support bridge. Главная страница теперь быстрее объясняет, что такое Konsensus и зачем в него входить, не требуя длинного обязательного скролла.

Следующий стратегический блок тоже уже переведён в код: `Profile Quests v1`. Внутри вкладки `AI-профиль` появились короткие сценарии выбора, которые обновляют `user_ai_profiles` без длинной анкеты и без narrative engine. Это даёт первый управляемый сигнал о стиле пользователя и готовит почву для будущей персонализации AI orchestration и образовательного слоя.

Теперь закрыт и `Reputation v1`: поверх приватного AI-профиля добавлен первый безопасный публичный слой. Вместо рейтингов силы и токсичных ярлыков пользователь получает ограниченный набор позитивных стилевых бейджей, которые уже видны и в профиле, и на публичной hover-карточке автора на арене.

Теперь закрыт и `Education Layer v1`: добавлены короткие Markdown-материалы, rule-based рекомендации по текущему AI-профилю, отдельный экран чтения `/learn` и server-side отметка прохождения. Это делает AI-профиль practically useful: после спора у пользователя теперь есть не только анализ, но и следующий конкретный шаг.

Теперь закрыт и `Trust Tiers v1`: введены уровни `basic / linked / trusted`, rule-based evaluator и реальные проверки публичных write-операций. Публичный слой больше не считается одинаково открытым для всех: создание публичных сценариев, observer-комментарии и arena participation теперь идут через объяснимый trust-gating без тяжёлой KYC-модели.

Теперь закрыт и `Appeals v1`: появился первый апелляционный слой для автоматических выводов. Пользователь может оспорить конкретный `AI summary` или `reputation badge`, система сохраняет историю обращения, запускает отдельный auto-review path и при недостаточной уверенности скрывает спорный вывод вместо того, чтобы оставлять его публично без пересмотра.

Следующий системный пакет тоже уже закреплён отдельным rollout-файлом: [docs/ops/perceived-performance-rollout.md](/C:/project21/konsensus/docs/ops/perceived-performance-rollout.md). На этом витке он уже внедрён: для основных экранов появились route-level `loading.tsx`, введён общий loading-shell, а ключевые server-action CTA получили мгновенный pending-state вместо визуально "мёртвого" ожидания ответа сервера.

Следующий связанный shell-пакет тоже уже закрыт: [docs/ops/activity-feed-rollout.md](/C:/project21/konsensus/docs/ops/activity-feed-rollout.md). Раздел `События` больше не сводится к одному списку публичных споров: теперь он собирает релизы через server-side admin read, показывает summary по движению проекта и объединяет в activity feed live battle, открытые вызовы арены и публичные dispute-события.

Дополнительно собран отдельный support/marketing-пакет для Boosty: структура страницы, уровни поддержки, цели, блок `О проекте`, стартовые посты, витринный paid-post и промпты для визуалов. Внутри него отдельно зафиксировано, что Telegram release-posting в проекте уже реализован, а Boosty пока ведётся ручным workflow без API-автоматизации.

Поверх этого подготовлен и отдельный редакционный пакет для Telegram: тексты канальных постов, bot-тизер, structured release payloads и отдельная схема желаемой доставки `канал = полный пост`, `бот = короткий анонс`. При этом в документе отдельно зафиксировано текущее ограничение: расписание публикаций и suppress-логика по подписке пользователя на канал/группу пока не реализованы в коде.

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
- [x] Мягкий orchestration-слой v1: virtual subagents (`legal/empathy/mediation/fact`) для waiting/private/public/final AI-path без смены dispute UI
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
| 00020_profile_quest_runs.sql | profile_quest_runs (история коротких профилирующих квестов, шаги и итоговые deltas AI-профиля) |
| 00021_user_learning_progress.sql | user_learning_progress (прохождение образовательных материалов, completion state и lightweight learning progress) |
| 00022_profile_trust_tier.sql | trust_tier в profiles (basic / linked / trusted как первый trust-layer публичного слоя) |
| 00023_appeals.sql | appeals (апелляции на автоматические выводы профиля, auto-review, результат пересмотра и история) |

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
| 2026-03-16 | Для стратегических rollout-блоков добавлен единый индекс `docs/ops/README.md`, а в `AGENTS.md` закреплено процессное правило: перед возвратом к такому пласту читать его rollout-файл и обновлять в нём статус выполнения, оставшийся хвост и следующий шаг |
| 2026-03-16 | Все rollout-блоки переведены из уровня концепта в рабочие implementation-пакеты: в каждом документе теперь есть `статус блока`, пакет v1 с конкретными файлами/данными/UI и отдельный список того, что сознательно остаётся на следующий виток |
| 2026-03-16 | Подготовлен отдельный контент-пакет для Boosty в `docs/marketing/boosty/`: исследование по форматам и витрине, готовые тексты уровней и целей, блок `О проекте`, стартовые посты, витринный paid-post и визуальные промпты. Отдельно зафиксировано, что Telegram release-posting уже работает через текущий release-flow, а Boosty пока заполняется вручную |
| 2026-03-16 | Подготовлен отдельный редакционный пакет для Telegram в `docs/marketing/telegram/`: welcome-пост и последующие канальные тексты, bot-тизер, ready-to-send release payloads и описание целевой логики `канал = полный пост`, `бот = короткий анонс`. Отдельно зафиксировано текущее ограничение: Bot API-расписание и suppress-логика по подписке пользователя на канал/группу пока не внедрены |
| 2026-03-16 | Реализован `AI orchestration v1`: в `src/lib/ai.ts` добавлены virtual subagents и routing rules по `plane/heat/evidence`, waiting/private/public AI-функции переведены на orchestration-first path с legacy fallback, а финальная mediation вынесена из `actions.ts` в единый AI-слой |
| 2026-03-16 | Утверждён и зафиксирован следующий shell-пакет `Navigation + Onboarding v1`: `/` для залогиненного пользователя должен вести в рабочий экран, мобильная навигация будет пересобрана вокруг постоянного bottom-level входа, `Поддержать` / `Boosty` / `Crypto` остаются постоянно заметными, а first-run onboarding разделяется на welcome-layer и page-level подсказки |
| 2026-03-16 | Реализован `Navigation + Onboarding v1`: `/` стал auth-aware, мобильная основная навигация вынесена в fixed bottom nav, support вынесен в отдельный persistent strip, top-level labels приведены к `События / Споры / Открытые / Арена / Профиль`, а first-run onboarding на dashboard разделён на welcome overview и page-level coach marks |
| 2026-03-16 | Зафиксирован новый стратегический блок `Landing v2`: для лендинга утверждён product-first narrative с быстрым hero, 3-шаговым входом, proof-blocks, activity-подачей и более современным темпом восприятия; блок оформлен отдельным rollout-файлом для последующей кодовой реализации |
| 2026-03-16 | `Navigation + Onboarding` усилен по принципу contextual help: ключевые внутренние экраны получили page-context cards и повторно запускаемые подсказки по экрану, чтобы помощь давалась в моменте, а не только в первом стартовом туре |
| 2026-03-16 | Восстановлена и жёстче зафиксирована линия выполнения: в `AGENTS.md` и `docs/ops/README.md` добавлено правило перед каждым новым пакетом кратко напоминать текущий основной план, уже закрытые шаги и активный следующий шаг; в `status.md` закреплён текущий execution order |
| 2026-03-16 | Реализован `Perceived Performance v1`: для основных экранов добавлены route-level loading-состояния, введён общий loading-shell, а ключевые server-action формы получили мгновенный pending-state, чтобы кнопки и переходы не выглядели зависшими до ответа сервера |
| 2026-03-16 | Реализован `Activity Feed v1`: `/feed` собран как событийная лента из release cards, live battle арены, открытых вызовов и публичных споров; экран получил summary-блок, более точные подсказки и больше не выглядит пустой витриной одного типа контента |
| 2026-03-16 | Реализован `Landing v2`: главная страница пересобрана из длинного объяснительного лендинга в product-first вход с быстрым hero, живыми preview-блоками, короткой 3-шаговой схемой, proof-секциями, activity bridge и отдельным support bridge |
| 2026-03-16 | Реализован `Profile Quests v1`: добавлены 3 коротких сценария выбора, lightweight-история прохождения `profile_quest_runs`, server actions для старта/шага/завершения и rule-based обновление `user_ai_profiles` с понятным итоговым summary для пользователя |
| 2026-03-16 | Реализован `Reputation v1`: добавлен safe public layer без leaderboard и негативных ярлыков; rule-based бейджи стиля считаются из текущих dispute signals и показываются в профиле и на публичной arena hover-card |
| 2026-03-16 | Реализован `Education Layer v1`: добавлены 6 коротких Markdown-материалов, rule-based рекомендации на dashboard/profile, страницы `/learn` и `/learn/[slug]`, а также SQL-таблица `user_learning_progress` для server-side отметки прохождения |
| 2026-03-16 | Реализован `Trust Tiers v1`: добавлен `trust_tier` в `profiles`, rule-based evaluator и реальные проверки публичных write-операций: public dispute / arena create требуют `Trusted`, а observer social layer и принятие arena-вызова требуют `Linked` |
| 2026-03-16 | Реализован `Appeals v1`: добавлена SQL-модель `appeals` (`00023`), auto-review path для оспаривания `AI summary` и `reputation badges`, inline-апелляции внутри `AI-профиля`, история апелляций и скрытие спорных автоматических выводов при низкой уверенности |
