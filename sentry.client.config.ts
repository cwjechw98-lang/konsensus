import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Session replay: record 5% of sessions, 100% with errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Don't show Sentry dialog to users
  beforeSend(event) {
    if (event.exception) {
      // Filter out known non-critical navigation errors
      const message = event.exception.values?.[0]?.value ?? "";
      if (message.includes("ResizeObserver loop") || message.includes("Non-Error promise rejection")) {
        return null;
      }
    }
    return event;
  },
});
