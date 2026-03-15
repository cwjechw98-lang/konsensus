# Ops Rollout Blocks

Этот каталог хранит возвращаемые rollout-блоки проекта Konsensus.

## Правило работы

Перед тем как возвращаться к стратегическому блоку, нужно:
- открыть соответствующий rollout-файл;
- сверить текущую реализацию с разделами `v1`, `не делать сразу`, `что добить дальше`;
- использовать секцию `Пакет реализации v1` как рабочую спецификацию по БД, серверу, UI и файлам;
- после изменений обновить сам rollout-файл, чтобы в нём было видно:
  - что уже выполнено;
  - что ещё не выполнено;
  - какой следующий практический шаг;
- затем синхронизировать изменения в [docs/status.md](/C:/project21/konsensus/docs/status.md) и [docs/roadmap.md](/C:/project21/konsensus/docs/roadmap.md).

## Активные rollout-блоки

- [ai-orchestration-rollout.md](/C:/project21/konsensus/docs/ops/ai-orchestration-rollout.md)
  Мягкий многоагентный ИИ: role-based orchestration, затем feature registry, `ai_agent_runs`, AI-profile-driven routing и real multi-model routing.
- [profile-quests-rollout.md](/C:/project21/konsensus/docs/ops/profile-quests-rollout.md)
  Игровое профилирование через короткие сценарии и постепенное формирование AI-профиля пользователя.
- [reputation-rollout.md](/C:/project21/konsensus/docs/ops/reputation-rollout.md)
  Репутация как история качества диалога, а не leaderboard победителей.
- [education-layer-rollout.md](/C:/project21/konsensus/docs/ops/education-layer-rollout.md)
  Образовательный слой, который опирается на AI-профиль и реальные dispute-сигналы.
- [appeals-rollout.md](/C:/project21/konsensus/docs/ops/appeals-rollout.md)
  Апелляции на автоматические AI-выводы и репутационные следствия.
- [trust-tiers-rollout.md](/C:/project21/konsensus/docs/ops/trust-tiers-rollout.md)
  Типы аккаунтов и trust tiers для публичного слоя без тяжёлой KYC-модели.

## Смежные ops-документы

- [model-strategy.md](/C:/project21/konsensus/docs/ops/model-strategy.md)
- [release-flow.md](/C:/project21/konsensus/docs/ops/release-flow.md)
- [local-only.md](/C:/project21/konsensus/docs/ops/local-only.md)
