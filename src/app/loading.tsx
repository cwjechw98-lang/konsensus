import AppLoadingShell from "@/components/AppLoadingShell";

export default function RootLoading() {
  return (
    <AppLoadingShell
      title="Загружаем Konsensus"
      description="Показываем каркас следующего экрана, пока догружаются данные и действия."
      blocks={2}
    />
  );
}
