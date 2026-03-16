import AppLoadingShell from "@/components/AppLoadingShell";

export default function ProfileLoading() {
  return (
    <AppLoadingShell
      title="Собираем профиль"
      description="Подтягиваем прогресс, ИИ-профиль, архив и настройки."
      blocks={3}
    />
  );
}
