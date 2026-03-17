import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import RippleEffect from "@/components/RippleEffect";
import { BrowserNotificationPermission } from "@/components/BrowserNotifications";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PageScrollProgress } from "@/components/PageScrollProgress";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const showMobileShell = Boolean(user);
  const isAdmin = isKonsensusAdminEmail(user?.email);

  return (
    <html lang="ru">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" defer />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
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
      </body>
    </html>
  );
}
