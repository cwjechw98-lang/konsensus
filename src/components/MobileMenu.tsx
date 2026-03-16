"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileMenuProps {
  isLoggedIn: boolean;
  isAdmin?: boolean;
  telegramLink?: string;
  logoHref?: string;
}

export function MobileMenu({ isLoggedIn, isAdmin = false, telegramLink = "", logoHref = "/" }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

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
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-white/8 transition-colors"
        aria-label="Дополнительные действия"
        aria-expanded={open}
      >
        <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-200 ${open ? "opacity-0" : ""}`} />
        <span className={`block w-5 h-0.5 bg-gray-300 transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-52 border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/60" style={{ background: "rgba(20, 16, 32, 0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <Link href={logoHref} className={linkClass} onClick={() => setOpen(false)}>
            О проекте
          </Link>
          <Link href="/support" className={linkClass} onClick={() => setOpen(false)}>
            Поддержать проект
          </Link>
          {isLoggedIn && isAdmin ? (
            <Link href="/ops" className={linkClass} onClick={() => setOpen(false)}>
              Ops
            </Link>
          ) : null}

          {isLoggedIn ? (
            <>
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
              {telegramLink && (
                <Link
                  href={telegramLink}
                  target="_blank"
                  rel="noreferrer"
                  className="block mx-2 text-center text-sm border border-sky-500/25 bg-sky-500/10 text-sky-200 px-4 py-2.5 rounded-lg font-medium transition-colors hover:bg-sky-500/15"
                  onClick={() => setOpen(false)}
                >
                  Войти через Telegram
                </Link>
              )}
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
