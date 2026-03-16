"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Споры",
    icon: "⚖️",
    match: (pathname) =>
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/dispute"),
  },
  {
    href: "/matchmaking",
    label: "Открытые",
    icon: "🎯",
    match: (pathname) => pathname.startsWith("/matchmaking"),
  },
  {
    href: "/arena",
    label: "Арена",
    icon: "⚔️",
    match: (pathname) => pathname.startsWith("/arena"),
  },
  {
    href: "/feed",
    label: "События",
    icon: "✨",
    match: (pathname) => pathname.startsWith("/feed"),
  },
  {
    href: "/profile",
    label: "Профиль",
    icon: "👤",
    match: (pathname) => pathname.startsWith("/profile"),
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0814]/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-5xl grid-cols-5 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-purple-500/15 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
