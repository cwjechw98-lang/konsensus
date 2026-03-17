import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import RippleEffect from "@/components/RippleEffect";
import { BrowserNotificationPermission } from "@/components/BrowserNotifications";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PageScrollProgress } from "@/components/PageScrollProgress";
import TelegramShellSync from "@/components/TelegramShellSync";
import { createClient } from "@/lib/supabase/server";
import { isKonsensusAdminEmail } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Konsensus — Разрешение споров с ИИ-медиатором",
  description:
    "Превращаем конфликты в конструктивный диалог. Структурированные раунды, нейтральный ИИ-медиатор, полезное ожидание и открытые диспуты.",
  keywords: [
    "разрешение споров",
    "медиация",
    "ИИ медиатор",
    "конфликт",
    "переговоры",
    "консенсус",
    "структурированный спор",
  ],
  openGraph: {
    title: "Konsensus — Спор это не война. Это возможность.",
    description:
      "Платформа для разрешения споров с ИИ-медиатором. Раундовая система, оценка аргументов, открытые диспуты и спокойная медиация.",
    type: "website",
    locale: "ru_RU",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const showMobileShell = Boolean(user);
  const isAdmin = isKonsensusAdminEmail(user?.email);
  const pathname = headerStore.get("x-konsensus-pathname") ?? "";
  const isTelegramShell =
    pathname.startsWith("/tg") ||
    cookieStore.get("konsensus_tg_shell")?.value === "1";

  return (
    <html lang="ru">
      <head>
        {isTelegramShell ? (
          <script
            src="https://telegram.org/js/telegram-web-app.js"
            data-telegram-web-app-sdk="1"
            defer
          />
        ) : null}
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <TelegramShellSync />
        {isTelegramShell ? (
          <>
            <main
              className={`flex-1 ${
                showMobileShell
                  ? "pt-[env(safe-area-inset-top)] pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
                  : "min-h-screen pt-[env(safe-area-inset-top)]"
              }`}
            >
              {children}
            </main>
            {showMobileShell ? <MobileBottomNav /> : null}
          </>
        ) : (
          <>
            <CursorGlow />
            <RippleEffect />
            <BrowserNotificationPermission />
            <Header isLoggedIn={Boolean(user)} isAdmin={isAdmin} />
            <PageScrollProgress />
            <main
              className={`flex-1 pt-14 ${
                showMobileShell
                  ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
                  : ""
              }`}
            >
              {children}
            </main>
            {showMobileShell && <MobileBottomNav />}
            <Footer />
          </>
        )}
      </body>
    </html>
  );
}
