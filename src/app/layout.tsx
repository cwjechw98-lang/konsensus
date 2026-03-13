import type { Metadata } from "next";
import { Header } from "@/components/Header";
import CursorGlow from "@/components/CursorGlow";
import RippleEffect from "@/components/RippleEffect";
import "./globals.css";

export const metadata: Metadata = {
  title: "Konsensus — Разрешение споров с ИИ",
  description:
    "Платформа для конструктивного разрешения споров с помощью ИИ-медиатора",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased min-h-screen flex flex-col">
        <CursorGlow />
        <RippleEffect />
        <Header />
        <main className="flex-1 pt-14">{children}</main>
      </body>
    </html>
  );
}
