import type { ReleaseTarget } from "@/lib/releases";

export type ScheduledReleaseRow = {
  slug: string;
  scheduled_publish_at: string | null;
  scheduled_target: ReleaseTarget | null;
  scheduled_published_at: string | null;
};

export function isScheduledReleaseDue(
  release: ScheduledReleaseRow,
  now = new Date()
) {
  if (!release.scheduled_publish_at || !release.scheduled_target) return false;
  if (release.scheduled_published_at) return false;
  return new Date(release.scheduled_publish_at).getTime() <= now.getTime();
}

export function isScheduledReleaseFulfilled(
  target: ReleaseTarget,
  result: {
    sentToBot: boolean;
    sentToChannel: boolean;
    skippedBot: boolean;
    skippedChannel: boolean;
  }
) {
  if (target === "bot") {
    return result.sentToBot || result.skippedBot;
  }

  if (target === "channel") {
    return result.sentToChannel || result.skippedChannel;
  }

  return (result.sentToBot || result.skippedBot) && (result.sentToChannel || result.skippedChannel);
}
