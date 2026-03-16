import {
  getBadgeToneClasses,
  type PublicReputationBadge,
} from "@/lib/reputation";

export default function PublicReputationBadges({
  badges,
  compact = false,
  title = "Публичные бейджи стиля",
}: {
  badges: PublicReputationBadge[];
  compact?: boolean;
  title?: string;
}) {
  if (badges.length === 0) return null;

  return (
    <div>
      <p
        className={`${
          compact ? "mb-2 text-[11px]" : "mb-3 text-xs"
        } font-semibold uppercase tracking-[0.16em] text-gray-500`}
      >
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => {
          const tone = getBadgeToneClasses(badge.tone);
          return (
            <div
              key={badge.key}
              className={`rounded-xl border px-3 py-2 ${tone.border} ${tone.bg}`}
              title={badge.description}
            >
              <p className={`text-xs font-semibold ${tone.text}`}>{badge.label}</p>
              {!compact && (
                <p className="mt-1 max-w-[18rem] text-[11px] leading-relaxed text-gray-300">
                  {badge.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
