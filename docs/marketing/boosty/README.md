# Boosty Content Pack

Этот каталог нужен для ручного заполнения Boosty-страницы Konsensus без импровизации каждый раз заново.

## Что уже подтверждено внутри проекта

- Telegram release-posting уже реализован:
  - [docs/ops/release-flow.md](/C:/project21/konsensus/docs/ops/release-flow.md)
  - [scripts/publish-release.mjs](/C:/project21/konsensus/scripts/publish-release.mjs)
  - [src/app/api/telegram/broadcast/route.ts](/C:/project21/konsensus/src/app/api/telegram/broadcast/route.ts)
  - [src/lib/telegram.ts](/C:/project21/konsensus/src/lib/telegram.ts)
- Release-пост можно собрать локально и отправить в бот или канал.
- Автоматизации публикации именно в Boosty в проекте нет. Для Boosty пока нужен ручной copy/paste workflow.

## Как пользоваться этим пакетом

1. Оформить визуал по [research.md](/C:/project21/konsensus/docs/marketing/boosty/research.md) и [prompts.md](/C:/project21/konsensus/docs/marketing/boosty/prompts.md).
2. Перенести тексты из:
   - [about.md](/C:/project21/konsensus/docs/marketing/boosty/about.md)
   - [tiers.md](/C:/project21/konsensus/docs/marketing/boosty/tiers.md)
   - [goals.md](/C:/project21/konsensus/docs/marketing/boosty/goals.md)
3. Наполнить ленту минимум тремя стартовыми постами из каталога [posts](/C:/project21/konsensus/docs/marketing/boosty/posts).
4. Чтобы витрина не была пустой, сначала завести один оплачиваемый или `разовый + подписка` пост по [vitrina.md](/C:/project21/konsensus/docs/marketing/boosty/vitrina.md).

## Состав пакета

- [research.md](/C:/project21/konsensus/docs/marketing/boosty/research.md)
  Актуальные наблюдения по Boosty, витрине, тизерам и Telegram collectible username.
- [about.md](/C:/project21/konsensus/docs/marketing/boosty/about.md)
  Короткое и длинное описание проекта для блока `Об авторе`.
- [tiers.md](/C:/project21/konsensus/docs/marketing/boosty/tiers.md)
  Переформатированные уровни поддержки с более понятной логикой и ценами.
- [goals.md](/C:/project21/konsensus/docs/marketing/boosty/goals.md)
  Цели, которые сейчас лучше ставить на Boosty.
- [vitrina.md](/C:/project21/konsensus/docs/marketing/boosty/vitrina.md)
  Первый витринный paid-пост и дальнейшие идеи без лишнего каталога.
- [prompts.md](/C:/project21/konsensus/docs/marketing/boosty/prompts.md)
  Промпты для обложки, карточек уровней, блока `О проекте` и обложек постов.
- [posts](/C:/project21/konsensus/docs/marketing/boosty/posts)
  Готовые драфты стартовых постов.

## Рекомендуемый порядок заполнения страницы

1. Верхняя обложка и аватар.
2. Блок `Об авторе`.
3. Уровни поддержки.
4. Цели.
5. Три публичных поста.
6. Один витринный оплачиваемый пост.
7. Позже добавить Telegram-группу для подписчиков, когда будет понятна модерация и формат.

## Как обновлять дальше

- После каждых 3-5 заметных UX-изменений готовить:
  - один Telegram release-пост через текущий release flow;
  - один короткий публичный Boosty devlog-пост по мотивам релиза.
- Если появится новый формат поддержки или benefit, сначала обновлять этот каталог, потом уже Boosty руками.
- Если позже в продукте появится страница благодарностей или supporter wall, синхронизировать формулировки уровней с [tiers.md](/C:/project21/konsensus/docs/marketing/boosty/tiers.md).
