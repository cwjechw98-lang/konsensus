import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import RippleEffect from "@/components/RippleEffect";
import AchievementToast from "@/components/AchievementToast";
import { BrowserNotificationPermission } from "@/components/BrowserNotifications";
import "./globals.css";

export const metadata: Metadata = {
  title: "Konsensus — Разрешение споров с ИИ-медиатором",
  description:
    "Превращаем конфликты в конструктивный диалог. Структурированные раунды, нейтральный ИИ-медиатор, арена вызовов, RPG-профиль — бесплатно.",
  keywords: [
    "разрешение споров",
    "медиация",
    "ИИ медиатор",
    "конфликт",
    "переговоры",
    "консенсус",
    "арена дискуссий",
  ],
  openGraph: {
    title: "Konsensus — Спор это не война. Это возможность.",
    description:
      "Платформа для разрешения споров с ИИ-медиатором. Раундовая система, оценка аргументов, арена вызовов и RPG-прогресс.",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" defer />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <CursorGlow />
        <RippleEffect />
        <AchievementToast />
        <BrowserNotificationPermission />
        <Header />
        <main className="flex-1 pt-14">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
