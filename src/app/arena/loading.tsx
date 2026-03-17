import AppLoadingShell from "@/components/AppLoadingShell";

export default function ArenaLoading() {
  return (
    <AppLoadingShell
      title="Загружаем открытые диспуты"
      description="Сначала появится каркас экрана, затем — активные обсуждения и открытые темы."
      blocks={4}
    />
  );
}
