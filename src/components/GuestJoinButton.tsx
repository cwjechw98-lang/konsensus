"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function GuestJoinButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInAnonymously();

    if (authError) {
      setError("Не удалось войти как гость. Попробуйте снова.");
      setLoading(false);
      return;
    }

    // После анонимного входа обновляем страницу —
    // сервер увидит новую сессию и покажет форму
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="btn-ripple glass w-full py-2.5 rounded-lg font-semibold text-gray-300 hover:text-white transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? "Загружаем..." : "Войти как гость →"}
      </button>
      <p className="text-xs text-gray-600 text-center">
        Без регистрации · Можно создать аккаунт позже
      </p>
    </div>
  );
}
