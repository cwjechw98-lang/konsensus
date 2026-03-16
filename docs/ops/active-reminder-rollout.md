# Active Reminder Rollout

## Цель

Довести reminder-механику до полного dispute-flow, а не оставлять её только продолжением архивного сценария.

## Статус блока

- Стадия: `implemented_v1`
- Ближайший релиз: `v1 active bell`
- Возвращаться к блоку через этот файл и синхронизировать `status/roadmap` после изменений

## Зачем это нужно

- сейчас пользователь уже видит кнопку напоминания в обычном waiting-state;
- без реального `bell`-эффекта она обещает больше, чем делает;
- нужен мягкий Telegram-пинг, когда спор активен, но оппонент затянул с ответом.

## Решение v1

- не вводить новую таблицу;
- использовать уже существующий `sendDisputeReminder`;
- если спор активен и у оппонента подключён Telegram:
  - отправлять отдельный dispute live reminder;
  - не переводить спор никуда дополнительно;
  - сохранить попытку в `dispute_reminders`.

## Пакет реализации v1

### Основные файлы

- [src/lib/actions.ts](/C:/project21/konsensus/src/lib/actions.ts)
- [src/components/RealtimeDisputeClient.tsx](/C:/project21/konsensus/src/components/RealtimeDisputeClient.tsx)

### Сервер

- ветка `recipient active` в `sendDisputeReminder` теперь реально шлёт Telegram reminder;
- при отсутствии Telegram у оппонента возвращается понятное сообщение, а не молчаливый успех.

### UI

- кнопка в waiting-state теперь честно называется `Напомнить в Telegram`.

## Критерий готовности v1

- waiting-state обычного активного спора умеет слать реальный Telegram-ping;
- пользователь получает понятный post-action message;
- archived reminder flow не ломается.

## Что пока не делать

- отдельный bell-счётчик в web UI;
- push вне Telegram;
- сложную mute/cooldown-модель поверх уже существующего лимитера.

## Что нужно добить после v1

### v1.1

- добавить явное отображение последнего обычного reminder в карточке спора;
- вынести `bell`-состояние в dashboard и/или профиль.

### v2

- объединить архивный и активный reminder flow в единый notification subsystem.

## Что уже выполнено

- обычный waiting-state теперь шлёт Telegram reminder и не ограничивается только архивным сценарием;
- archived flow остаётся прежним: auto-unarchive, pending reminders и quiet mode после повторной архивации;
- UI-кнопка переименована в более точное действие.

## Следующий практический шаг

- если возвращаться к reminder-подсистеме, следующий слой — видимость последнего bell-события в dashboard и карточке спора.
