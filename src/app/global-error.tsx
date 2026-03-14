"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ background: "#0d0d14", color: "#e2e2f0", fontFamily: "Arial, sans-serif" }}>
        <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>⚠️</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Что-то пошло не так</h1>
          <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 32 }}>
            Ошибка зафиксирована. Попробуйте обновить страницу.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
