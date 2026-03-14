"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileMenuProps {
  isLoggedIn: boolean;
}

export function MobileMenu({ isLoggedIn }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const linkClass = "block px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors";

  return (
    <div ref={menuRef} className="relative md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-white/8 transition-colors"
        aria-label="Меню"
      >
        <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-200 ${open ? "opacity-0" : ""}`} />
        <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-52 border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/60" style={{ background: "rgba(20, 16, 32, 0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <Link href="/feed" className={linkClass} onClick={() => setOpen(false)}>
            Лента
          </Link>

          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
                Мои споры
              </Link>
              <Link href="/arena" className={linkClass} onClick={() => setOpen(false)}>
                Арена ⚔️
              </Link>
              <Link href="/profile" className={linkClass} onClick={() => setOpen(false)}>
                Профиль
              </Link>
              <div className="border-t border-white/8 mt-1 pt-1">
                <form action="/auth/signout" method="post">
                  <button type="submit" className="w-full text-left px-4 py-3 text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                    Выйти
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass} onClick={() => setOpen(false)}>
                Войти
              </Link>
              <Link
                href="/register"
                className="block mx-2 mt-1 text-center text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                onClick={() => setOpen(false)}
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
