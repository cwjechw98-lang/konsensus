import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  // Capture unhandled promise rejections and exceptions in server actions
  beforeSend(event) {
    // Don't send events if DSN is not configured (dev without Sentry)
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null;
    return event;
  },
});
