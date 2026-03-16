import AppLoadingShell from "@/components/AppLoadingShell";

export default function ArenaLoading() {
  return (
    <AppLoadingShell
      title="Загружаем арену"
      description="Сначала появится каркас battle-экрана, затем — активные вызовы и live-состояние."
      blocks={4}
    />
  );
}
