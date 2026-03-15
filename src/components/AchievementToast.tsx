"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACHIEVEMENTS } from "@/lib/achievements";

type Toast =
  | { id: string; type: "standard"; achievement_id: string }
  | { id: string; type: "unique"; title: string; icon: string; points: number };

export default function AchievementToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      channelRef.current = supabase
        .channel(`ach-toast-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_achievements",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const achievementId = payload.new.achievement_id as string;
            const toastId = crypto.randomUUID();
            setToasts((prev) => [...prev, { id: toastId, type: "standard", achievement_id: achievementId }]);
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }, 5000);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_unique_achievements",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const toastId = crypto.randomUUID();
            setToasts((prev) => [
              ...prev,
              {
                id: toastId,
                type: "unique",
                title: payload.new.title as string,
                icon: payload.new.icon as string,
                points: Number(payload.new.points) || 0,
              },
            ]);
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }, 5000);
          }
        )
        .subscribe();
    });

    return () => {
      if (channelRef.current) {
        createClient().removeChannel(channelRef.current);
      }
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col-reverse gap-2 z-50 pointer-events-none">
      {toasts.map((toast) => {
        if (toast.type === "standard") {
          const ach = ACHIEVEMENTS[toast.achievement_id as keyof typeof ACHIEVEMENTS];
          if (!ach) return null;
          return (
            <div
              key={toast.id}
              className="achievement-toast glass border border-purple-500/40 rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-2xl shadow-purple-500/10 min-w-[260px]"
            >
              <span className="text-2xl flex-shrink-0">{ach.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide">
                  Достижение!
                </p>
                <p className="text-sm text-white font-semibold truncate">{ach.title}</p>
                <p className="text-xs text-gray-500">+{ach.points} очков опыта</p>
              </div>
              <span className="ml-auto text-lg flex-shrink-0">✨</span>
            </div>
          );
        }
        return (
          <div
            key={toast.id}
            className="achievement-toast glass border border-purple-500/40 rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-2xl shadow-purple-500/10 min-w-[260px]"
          >
            <span className="text-2xl flex-shrink-0">{toast.icon}</span>
            <div className="min-w-0">
              <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide">
                Уникальная награда!
              </p>
              <p className="text-sm text-white font-semibold truncate">{toast.title}</p>
              <p className="text-xs text-gray-500">+{toast.points} очков опыта</p>
            </div>
            <span className="ml-auto text-lg flex-shrink-0">✨</span>
          </div>
        );
      })}
    </div>
  );
}
