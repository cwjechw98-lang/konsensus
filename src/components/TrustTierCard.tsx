import type { TrustTierState } from "@/lib/trust-tier";

const TIER_STYLES = {
  basic: {
    pill: "border-white/10 bg-white/5 text-gray-200",
    border: "border-white/10",
    bg: "bg-white/[0.03]",
  },
  linked: {
    pill: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/[0.04]",
  },
  trusted: {
    pill: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.04]",
  },
} as const;

export default function TrustTierCard({ state }: { state: TrustTierState }) {
  const styles = TIER_STYLES[state.tier];

  return (
    <div className={`glass rounded-2xl border ${styles.border} ${styles.bg} p-6`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Trust tier
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">{state.label}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">{state.description}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles.pill}`}>
          {state.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {state.unlocks.map((unlock) => (
          <div
            key={unlock}
            className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-gray-200"
          >
            {unlock}
          </div>
        ))}
      </div>

      {state.nextTier && state.nextStep && (
        <div className="mt-5 rounded-xl border border-white/8 bg-black/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Следующий уровень: {state.nextTierLabel}
          </p>
          <p className="mt-2 text-sm text-gray-300">{state.nextStep}</p>
        </div>
      )}
    </div>
  );
}
