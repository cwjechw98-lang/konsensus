import AppLoadingShell from "@/components/AppLoadingShell";

export default function DashboardLoading() {
  return (
    <AppLoadingShell
      title="Готовим ваши споры"
      description="Сначала появится каркас рабочего экрана, затем подтянутся карточки и статусы."
      blocks={4}
    />
  );
}
