import AppLoadingShell from "@/components/AppLoadingShell";

export default function FeedLoading() {
  return (
    <AppLoadingShell
      title="Собираем события"
      description="Подтягиваем релизы, активность арены и публичные споры."
      blocks={4}
    />
  );
}
