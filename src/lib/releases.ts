import { getAppBaseUrl } from "@/lib/site-config";

export type ReleaseTarget = "bot" | "channel" | "both";

export type ReleasePayload = {
  slug?: string;
  title: string;
  summary: string;
  features: string[];
  notes?: string;
  source_commits?: string[];
};

export function normalizeScheduledPublishAt(input: string) {
  const value = input.trim();
  if (!value) {
    throw new Error("Scheduled publish time is required");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Scheduled publish time must be a valid ISO date");
  }

  return parsed.toISOString();
}

export function slugifyRelease(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

export function normalizeReleasePayload(input: ReleasePayload): ReleasePayload & { slug: string } {
  const features = input.features
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!input.title.trim()) {
    throw new Error("Release title is required");
  }

  if (!input.summary.trim()) {
    throw new Error("Release summary is required");
  }

  if (features.length === 0) {
    throw new Error("At least one user-facing feature is required");
  }

  return {
    ...input,
    title: input.title.trim(),
    summary: input.summary.trim(),
    features,
    slug: slugifyRelease(input.slug?.trim() || input.title),
    notes: input.notes?.trim() || undefined,
    source_commits: (input.source_commits ?? []).map((item) => item.trim()).filter(Boolean),
  };
}

export function formatReleaseCaption(release: ReleasePayload & { slug: string }) {
  const bullets = release.features
    .slice(0, 5)
    .map((feature) => `• ${feature}`)
    .join("\n");

  return [
    "🚀 <b>Обновление Konsensus!</b>",
    "",
    `✨ <b>${release.title}</b>`,
    release.summary,
    "",
    "Что нового:",
    bullets,
    "",
    "💡 Попробуйте обновление в приложении.",
  ].join("\n");
}

export function formatReleaseTeaser(
  release: ReleasePayload & { slug: string }
) {
  return [
    "📢 <b>В канале Konsensus вышел новый пост</b>",
    "",
    `✨ <b>${release.title}</b>`,
    release.summary,
    "",
    "В боте приходит только короткий анонс. Полный пост открыт в канале.",
  ].join("\n");
}

export function getReleaseImageUrl(slug: string) {
  return `${getAppBaseUrl()}/api/releases/${slug}/image`;
}
