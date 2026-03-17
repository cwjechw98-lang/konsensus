"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const COOKIE_NAME = "konsensus_tg_shell";
const TELEGRAM_INIT_TIMEOUT_MS = 5000;
const TELEGRAM_SDK_SRC = "https://telegram.org/js/telegram-web-app.js";

type TelegramWebApp = {
  initData?: string;
  close?: () => void;
  isVersionAtLeast?: (version: string) => boolean;
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

function supportsBackButton(tg?: TelegramWebApp) {
  return Boolean(tg?.isVersionAtLeast?.("6.1"));
}

function ensureTelegramSdk() {
  const selector =
    'script[data-telegram-web-app-sdk="1"], script[src="https://telegram.org/js/telegram-web-app.js"]';
  const existingScript = document.querySelector(selector);

  if (existingScript) {
    return;
  }

  const script = document.createElement("script");
  script.src = TELEGRAM_SDK_SRC;
  script.dataset.telegramWebAppSdk = "1";
  script.defer = true;
  document.head.appendChild(script);
}

function getTelegramBackTarget(pathname: string) {
  if (/^\/arena\/[^/]+$/.test(pathname)) {
    return "/arena";
  }

  if (/^\/dispute\/[^/]+(\/argue|\/mediation)?$/.test(pathname)) {
    return "/dashboard";
  }

  if (/^\/learn\/[^/]+$/.test(pathname)) {
    return "/learn";
  }

  if (pathname.startsWith("/ops/")) {
    return "/ops";
  }

  return null;
}

export default function TelegramShellSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hadShellFlagAtStart =
      localStorage.getItem(COOKIE_NAME) === "1" ||
      document.cookie.includes(`${COOKIE_NAME}=1`) ||
      pathname === "/tg";

    if (hadShellFlagAtStart) {
      ensureTelegramSdk();
    }

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

          const backTarget = getTelegramBackTarget(pathname);
          if (backTarget) {
            router.push(backTarget);
            return;
          }

          if (window.history.length > 1) {
            router.back();
            return;
          }

          tg?.close?.();
        };

        if (supportsBackButton(tg)) {
          tg?.BackButton?.show?.();
          tg?.BackButton?.onClick?.(backHandler);
        }
        return true;
      }

      if (supportsBackButton(tg)) {
        tg?.BackButton?.hide?.();
      }
      return false;
    };

    if (applyTelegramShell()) {
      return () => {
        const tg = (window as TelegramWindow).Telegram?.WebApp;
        if (backHandler && supportsBackButton(tg)) {
          tg?.BackButton?.offClick?.(backHandler);
        }
        if (supportsBackButton(tg)) {
          tg?.BackButton?.hide?.();
        }
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
      const stillHasTelegramInitData = Boolean(
        (window as TelegramWindow).Telegram?.WebApp?.initData
      );

      if (!stillHasTelegramInitData && pathname !== "/tg") {
        clearShellFlag();
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      const tg = (window as TelegramWindow).Telegram?.WebApp;
      if (backHandler && supportsBackButton(tg)) {
        tg?.BackButton?.offClick?.(backHandler);
      }
      if (supportsBackButton(tg)) {
        tg?.BackButton?.hide?.();
      }
    };
  }, [pathname, router]);

  return null;
}
