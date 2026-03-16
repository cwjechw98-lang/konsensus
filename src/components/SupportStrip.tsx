import Link from "next/link";
import { SUPPORT_LINKS, hasSupportLinks } from "@/lib/site-config";

export function SupportStrip({ mobileOnly = false }: { mobileOnly?: boolean }) {
  if (!hasSupportLinks()) return null;

  return (
    <div
      className={`${mobileOnly ? "fixed inset-x-0 bottom-[72px] z-40 md:hidden" : ""}`}
      aria-label="Поддержка проекта"
    >
      <div className={`${mobileOnly ? "mx-auto max-w-5xl px-3" : ""}`}>
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#120d1e]/90 px-3 py-2 backdrop-blur-xl">
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/80 sm:inline">
            Поддержать
          </span>
          {SUPPORT_LINKS.boosty && (
            <Link
              href={SUPPORT_LINKS.boosty}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-amber-500/20 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/20"
            >
              Boosty
            </Link>
          )}
          {SUPPORT_LINKS.crypto && (
            <Link
              href={SUPPORT_LINKS.crypto}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-500/20"
            >
              Crypto
            </Link>
          )}
          {SUPPORT_LINKS.alternative && (
            <Link
              href={SUPPORT_LINKS.alternative}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-violet-500/20 bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-100 transition-colors hover:bg-violet-500/20"
            >
              Поддержка
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
