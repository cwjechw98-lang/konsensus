# Статус проекта Konsensus

> Живой статус проекта. Обновляется после каждой согласованной итерации.
> Последнее обновление: 2026-03-17

## Последние изменения

- 2026-03-17 — проект заново сверен с исходной концепцией из `Konsensus_TZ_v0.1`, `vision-extended`, `concept` и `architecture`.
- 2026-03-17 — из основного курса разработки убраны игровая ветка, editorial/marketing-ветка и support-поверхности на пользовательских экранах.
- 2026-03-17 — `status` и `roadmap` пересобраны вокруг спокойной медиации, полезного ожидания и открытых диспутов.

## Текущий этап

**Фаза выравнивания продукта с исходной концепцией.**

Главный курс проекта снова сформулирован так:
- Konsensus — это не арена боёв и не игровая соцсеть.
- Konsensus — это спокойная, нейтральная, профессиональная среда для структурированного спора и медиации.
- ИИ не выбирает победителя, а помогает сторонам прояснить позиции, увидеть напряжение и дойти до решения.
- Ожидание ответа должно быть полезным: мягкие AI-подсказки, факты о коммуникации, визуализация сближения, `Теневой медиатор`, простая текстовая микро-механика `Выбери одно из двух`.
- Публичный слой — это открытые диспуты и наблюдение за ходом мысли, а не шоу и не battle-mode.

## Честный анализ дрейфа от ТЗ

### Где проект ушёл не туда

- Игровая рамка стала слишком заметной:
  - `RPG-профиль`, `XP`, классы, ачивки, battle-лексика, observer/game-панели.
- Editorial Ops стал частью основной продуктовой линии, хотя это внутренний операционный слой, а не ценность для пользователя.
- Boosty/crypto/support начали просачиваться в основные пользовательские поверхности.
- Арена и публичный слой начали подаваться как `battle`, `spectator`, `show`, хотя финальная концепция требует `открытые диспуты`, `наблюдение`, `публичная медиация`.
- Waiting-state в части документации и решений был переосмыслен как место для игр, а не для полезного и спокойного сопровождения.

### Где дрейф возник по нашей вине

- Пользовательская ветка и внутренняя ops-ветка долго велиcь как один и тот же roadmap.
- Дополнительные идеи из `vision-extended` были приняты как основной курс слишком рано.
- Мы закрепили в `status` и `roadmap` как основной прогресс то, что должно было остаться боковым backlog-слоем:
  - gamification;
  - editorial release tooling;
  - support marketing;
  - battle/framing language.

### Что остаётся валидным и не выкидывается

- базовый dispute-flow;
- AI orchestration v1;
- archive/reminder flow;
- trust tiers и appeals как защитный слой;
- education layer как мягкое продолжение AI-профиля;
- публичные открытые диспуты как наблюдаемый слой, но без battle-подачи;
- `/ops` и editorial tooling как внутренний admin-инструмент, а не как часть основной продуктовой оси.

## Что реально готово по ядру продукта

### Готово и остаётся в основном продукте

- аутентификация, профиль, базовый layout;
- создание спора, приглашение, invite-flow, direct challenge, guest join;
- раундовый dispute-flow и realtime-обмен аргументами;
- AI-сопровождение спора:
  - categorization;
  - waiting insight;
  - round insights;
  - mediation;
  - orchestration v1;
- архив и напоминания;
- trust/safety слой:
  - rate limiting;
  - anti-spam;
  - trust tiers v1;
  - appeals v1/v1.1;
- навигация и onboarding v1.1;
- perceived performance v1;
- activity feed v1;
- landing v2 как база для дальнейшей правки;
- educational layer v1;
- unit-тесты decision-логики.

### Готово, но выведено из основного курса

- editorial ops;
- scheduled editorial posting;
- telegram editorial reporting;
- boosty/support marketing пакет;
- release-automation как пользовательская тема;
- игровая подача профиля и battle-лексика;
- всё, что делает продукт похожим на шоу, а не на медиацию.

## Что теперь считается parked/internal

Следующие блоки не считаются ядром пользовательского продукта и не должны влиять на основные пользовательские экраны:

- `Editorial Ops` и весь release/editorial workflow;
- Boosty / crypto / support marketing, кроме отдельного `/support`;
- gamified profile layer:
  - XP;
  - RPG-классы;
  - игровые ачивки;
  - game-first copy;
- battle/spectator/show-формулировки;
- любые мини-игры, не помогающие медиации.

## Новый основной порядок выполнения

1. Переписать пользовательскую подачу под спокойную медиацию:
   - убрать battle/game/editorial лексику;
   - зачистить оставшиеся служебные термины.
2. Пересобрать waiting-layer:
   - полезное ожидание;
   - `Теневой медиатор`;
   - простая текстовая микро-механика `Выбери одно из двух`;
   - никаких игровых наборов и idle-игр.
3. Пересобрать публичный слой:
   - `открытые диспуты`, а не `бои`;
   - наблюдение и качество диалога, а не зрелищность.
4. Убрать support/promotional surfaces со всех основных экранов и оставить их только на `/support`.
5. Довести интерфейс до спокойной, нейтральной, профессиональной подачи:
   - меньше текста;
   - чище иерархия;
   - один onboarding, а не повторяющиеся обучалки.

## Следующий практический шаг

**UX/IA cleanup core screens**

Нужно пройти:
- [C:\project21\konsensus\src\app\page.tsx](/C:/project21/konsensus/src/app/page.tsx)
- [C:\project21\konsensus\src\app\dashboard\page.tsx](/C:/project21/konsensus/src/app/dashboard/page.tsx)
- [C:\project21\konsensus\src\app\feed\page.tsx](/C:/project21/konsensus/src/app/feed/page.tsx)
- [C:\project21\konsensus\src\app\arena\page.tsx](/C:/project21/konsensus/src/app/arena/page.tsx)
- [C:\project21\konsensus\src\app\profile\page.tsx](/C:/project21/konsensus/src/app/profile/page.tsx)
- [C:\project21\konsensus\src\app\dispute\new\page.tsx](/C:/project21/konsensus/src/app/dispute/new/page.tsx)
- [C:\project21\konsensus\src\components\SupportStrip.tsx](/C:/project21/konsensus/src/components/SupportStrip.tsx)
- [C:\project21\konsensus\src\components\WaitingAmbient.tsx](/C:/project21/konsensus/src/components/WaitingAmbient.tsx)

Цель следующего шага:
- убрать остатки battle/game/support/editorial drift из UI;
- закрепить calm-mediation framing в живом интерфейсе;
- подготовить новый waiting-layer без игровой ветки.
