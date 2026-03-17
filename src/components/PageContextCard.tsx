import type { ReactNode } from "react";

type Tone = "purple" | "cyan" | "emerald" | "amber" | "red";

const TONE_STYLES: Record<
  Tone,
  { border: string; bg: string; eyebrow: string; bullet: string }
> = {
  purple: {
    border: "border-purple-500/20",
    bg: "bg-purple-500/[0.05]",
    eyebrow: "text-purple-300/80",
    bullet: "bg-purple-400/80",
  },
  cyan: {
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/[0.05]",
    eyebrow: "text-cyan-300/80",
    bullet: "bg-cyan-400/80",
  },
  emerald: {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.05]",
    eyebrow: "text-emerald-300/80",
    bullet: "bg-emerald-400/80",
  },
  amber: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.05]",
    eyebrow: "text-amber-300/80",
    bullet: "bg-amber-400/80",
  },
  red: {
    border: "border-red-500/20",
    bg: "bg-red-500/[0.05]",
    eyebrow: "text-red-300/80",
    bullet: "bg-red-400/80",
  },
};

type PageContextCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  tone?: Tone;
  actions?: ReactNode;
  dataTour?: string;
  compact?: boolean;
};

export default function PageContextCard({
  eyebrow,
  title,
  description,
  bullets,
  tone = "purple",
  actions,
  dataTour,
  compact = false,
}: PageContextCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      data-tour={dataTour}
      className={`glass rounded-2xl border ${styles.border} ${styles.bg} ${compact ? "p-4 sm:p-5" : "p-5 sm:p-6"}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p
            className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] ${styles.eyebrow}`}
          >
            {eyebrow}
          </p>
          <h2 className={`${compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"} font-bold text-white`}>{title}</h2>
          <p className={`mt-2 ${compact ? "text-sm" : "text-[15px]"} leading-relaxed text-gray-300`}>{description}</p>
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className={`mt-4 flex flex-wrap ${compact ? "gap-2" : "gap-2.5"}`}>
        {bullets.map((bullet) => (
          <div
            key={bullet}
            className={`flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] ${compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-[13px]"} text-gray-200`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${styles.bullet}`} />
            <span>{bullet}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
