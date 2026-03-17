# Роадмап Konsensus

## Принцип

Основной продуктовый курс только один:

- спокойная медиация;
- полезное ожидание;
- открытые диспуты вместо battle-подачи;
- нейтральный ИИ как помощник, а не судья;
- профессиональный интерфейс без игрового шума и без editorial/support-слоя на главных пользовательских экранах.

Всё, что относится к gamification, editorial ops и marketing/support, больше не считается частью основного пользовательского roadmap.

## Уже сделано по ядру

### Фаза 0–5: Основа продукта
- [x] Инициализация проекта, Supabase, auth, layout
- [x] Создание спора и invite-flow
- [x] Guest join и direct challenge
- [x] Раундовый dispute-flow
- [x] AI mediation core
- [x] Статусы спора и consensus-flow
- [x] Landing и deploy
- [x] Базовый rate limiting и error states

### Фаза 6: Спокойный UX-слой
- [x] Navigation + Onboarding v1.1
- [x] Contextual help на ключевых экранах
- [x] Perceived Performance v1
- [x] Activity Feed v1
- [x] Landing v2 как product-first вход

### Фаза 7: Надёжность и сопровождение спора
- [x] Персональный архив споров
- [x] Reminder flow для архивированных споров
- [x] Reminder bell для активного waiting-state
- [x] Trust Tiers v1
- [x] Appeals v1
- [x] Appeals v1.1
- [x] Unit tests for server actions

### Фаза 8: ИИ и полезное сопровождение
- [x] AI orchestration v1
- [x] Education Layer v1
- [ ] Waiting-layer v2 по финальной концепции
  Нужен новый спокойный слой ожидания:
  - мягкие AI-подсказки;
  - факты о коммуникации;
  - визуализация сближения;
  - `Теневой медиатор`;
  - простая текстовая микро-механика `Выбери одно из двух`

## Активный основной план

### Пакет 1. Concept realignment UI
- [x] Убрать battle/game/editorial/support drift из основных экранов
- [x] Убрать оставшиеся служебные и внутренние формулировки
- [x] Пересобрать подачу `События / Открытые / Арена / Профиль` в спокойной профессиональной рамке

### Пакет 2. Waiting layer reset
- [x] Убрать любые мини-игры из основного waiting-state
- [x] Собрать новый waiting-layer вокруг `Теневого медиатора`
- [x] Добавить текстовую микро-механику `Выбери одно из двух`
- [x] Добавить полезные факты о коммуникации и мягкие AI-советы

### Пакет 3. Public disputes reset
- [x] Переписать публичный слой как `открытые диспуты`, а не `арена боёв`
- [x] Убрать `battle`, `spectator`, `show` и похожую лексику из пользовательских экранов
- [x] Оставить наблюдение, ход раундов и медиацию как полезный публичный формат

### Пакет 4. Calm profile reset
- [x] Очистить профиль от game-first подачи
- [x] Сохранить полезные части AI-профиля, trust и appeals
- [x] Спрятать или переосмыслить RPG/XP/achievement слой как необязательный внутренний хвост

### Пакет 5. Calm mini-app polish
- [x] Упростить внутренние экраны Mini App по плотности текста
- [x] Сделать онбординг одноразовым и менее навязчивым
- [x] Добить визуальную иерархию на `Споры / События / Новый спор / Арена`

### Пакет 6. Residual terminology sweep
- [ ] Убрать остатки `battle/arena-show` и служебного языка из второстепенных экранов
- [ ] Привести loading/help/Telegram copy к одной спокойной рамке
- [ ] Дочистить promotional/support следы с пользовательских поверхностей

## Parked / internal backlog

Эти блоки не удаляются из репозитория, но больше не двигают основной пользовательский roadmap:

### Internal ops
- [ ] Editorial Ops дальнейших версий
- [ ] Delivery analytics / editorial tooling polishing
- [ ] Release workflow improvements

### Support / marketing
- [ ] Boosty контент
- [ ] Support marketing
- [ ] Telegram editorial campaigns

### Неосновная игровая ветка
- [ ] RPG-подача профиля
- [ ] XP / achievements как заметный главный слой
- [ ] Любые игровые waiting-механики
- [ ] Шоу-подача публичных диспутов

## Следующий шаг

Следующий пакет по плану:

**Residual terminology sweep**

Фокус:
- [C:\project21\konsensus\src\app\matchmaking\page.tsx](/C:/project21/konsensus/src/app/matchmaking/page.tsx)
- [C:\project21\konsensus\src\app\arena\loading.tsx](/C:/project21/konsensus/src/app/arena/loading.tsx)
- [C:\project21\konsensus\src\components\Footer.tsx](/C:/project21/konsensus/src/components/Footer.tsx)
- [C:\project21\konsensus\src\app\api\telegram\route.ts](/C:/project21/konsensus/src/app/api/telegram/route.ts)
- [C:\project21\konsensus\src\lib\telegram.ts](/C:/project21/konsensus/src/lib/telegram.ts)

Результат шага:
- пользовательские поверхности перестают смешивать спокойную медиацию с остаточным служебным и battle-языком;
- Telegram и Mini App говорят одним и тем же нейтральным языком.
