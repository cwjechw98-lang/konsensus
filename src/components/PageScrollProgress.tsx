"use client";

import { useEffect, useState } from "react";

export function PageScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function updateProgress() {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = scrollHeight <= 0 ? 0 : Math.min(scrollTop / scrollHeight, 1);
      setProgress(nextProgress);
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-40 h-1 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 transition-[width] duration-150"
        style={{ width: `${Math.max(progress * 100, 0)}%` }}
      />
    </div>
  );
}
