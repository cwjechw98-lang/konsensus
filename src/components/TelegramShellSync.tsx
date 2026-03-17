"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const COOKIE_NAME = "konsensus_tg_shell";
const RELOAD_GUARD = "konsensus_tg_shell_reload_guard";
const TELEGRAM_INIT_TIMEOUT_MS = 1200;

type TelegramWebApp = {
  initData?: string;
  close?: () => void;
  BackButton?: {
    show?: () => void;
    hide?: () => void;
    onClick?: (callback: () => void) => void;
    offClick?: (callback: () => void) => void;
  };
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

function setShellFlag() {
  localStorage.setItem(COOKIE_NAME, "1");
  sessionStorage.removeItem(RELOAD_GUARD);
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=2592000; samesite=lax`;
}

function clearShellFlag() {
  localStorage.removeItem(COOKIE_NAME);
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

function isTopLevelShellPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname === "/matchmaking" ||
    pathname === "/arena" ||
    pathname === "/feed" ||
    pathname === "/profile" ||
    pathname === "/support" ||
    pathname === "/ops"
  );
}

export default function TelegramShellSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let backHandler: (() => void) | null = null;

    const applyTelegramShell = () => {
      const tg = (window as TelegramWindow).Telegram?.WebApp;
      const hasTelegramInitData = Boolean(tg?.initData);

      if (hasTelegramInitData) {
        setShellFlag();

        backHandler = () => {
          if (pathname === "/tg") {
            tg?.close?.();
            return;
          }

          if (isTopLevelShellPath(pathname)) {
            tg?.close?.();
            return;
          }

          if (window.history.length > 1) {
            router.back();
            return;
          }

          tg?.close?.();
        };

        tg?.BackButton?.show?.();
        tg?.BackButton?.onClick?.(backHandler);
        return true;
      }

      tg?.BackButton?.hide?.();
      return false;
    };

    if (applyTelegramShell()) {
      return () => {
        const tg = (window as TelegramWindow).Telegram?.WebApp;
        if (backHandler) {
          tg?.BackButton?.offClick?.(backHandler);
        }
        tg?.BackButton?.hide?.();
      };
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      if (cancelled) return;

      if (applyTelegramShell()) {
        window.clearInterval(interval);
        return;
      }

      if (Date.now() - startedAt < TELEGRAM_INIT_TIMEOUT_MS) {
        return;
      }

      window.clearInterval(interval);

      const hadShellFlag =
        localStorage.getItem(COOKIE_NAME) === "1" ||
        document.cookie.includes(`${COOKIE_NAME}=1`);

      clearShellFlag();

      if (
        hadShellFlag &&
        pathname !== "/tg" &&
        sessionStorage.getItem(RELOAD_GUARD) !== "1"
      ) {
        sessionStorage.setItem(RELOAD_GUARD, "1");
        window.location.reload();
      } else {
        sessionStorage.removeItem(RELOAD_GUARD);
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      const tg = (window as TelegramWindow).Telegram?.WebApp;
      if (backHandler) {
        tg?.BackButton?.offClick?.(backHandler);
      }
      tg?.BackButton?.hide?.();
    };
  }, [pathname, router]);

  return null;
}
