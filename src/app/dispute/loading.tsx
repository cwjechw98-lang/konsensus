import AppLoadingShell from "@/components/AppLoadingShell";

export default function DisputeLoading() {
  return (
    <AppLoadingShell
      title="Открываем спор"
      description="Показываем контур экрана, пока догружаются аргументы, статусы и AI-блоки."
      blocks={3}
    />
  );
}
