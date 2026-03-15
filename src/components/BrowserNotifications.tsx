"use client";

import { useEffect } from "react";

/**
 * Requests browser notification permission on mount (once).
 * Other components can call sendBrowserNotification() to show notifications.
 */
export function BrowserNotificationPermission() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      // Delay request to not interrupt user immediately
      const timer = setTimeout(() => {
        Notification.requestPermission();
      }, 10_000); // Ask after 10 seconds
      return () => clearTimeout(timer);
    }
  }, []);

  return null; // Invisible component
}

export function sendBrowserNotification(title: string, body: string, url?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.hasFocus()) return; // Don't show if user is on the tab

  const notification = new Notification(title, {
    body,
    icon: "/favicon.ico",
    tag: "konsensus",
  });

  if (url) {
    notification.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  }
}
