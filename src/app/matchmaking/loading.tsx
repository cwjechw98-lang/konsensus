import AppLoadingShell from "@/components/AppLoadingShell";

export default function MatchmakingLoading() {
  return (
    <AppLoadingShell
      title="Ищем открытые споры"
      description="Сначала показываем каркас списка, затем подтягиваем темы и вызовы."
      blocks={4}
    />
  );
}
