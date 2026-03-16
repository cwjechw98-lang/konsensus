import AppLoadingShell from "@/components/AppLoadingShell";

export default function FeedLoading() {
  return (
    <AppLoadingShell
      title="Собираем события"
      description="Подтягиваем публичные споры и заметную активность платформы."
      blocks={4}
    />
  );
}
