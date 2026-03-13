"use client";

import { useEffect } from "react";

export default function RippleEffect() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      let target = e.target as HTMLElement | null;
      while (target && !target.classList.contains("btn-ripple")) {
        target = target.parentElement;
      }
      if (!target) return;

      const circle = document.createElement("span");
      const diameter = Math.max(target.clientWidth, target.clientHeight);
      const radius = diameter / 2;
      const rect = target.getBoundingClientRect();

      circle.style.cssText = [
        "position:absolute",
        "border-radius:50%",
        "pointer-events:none",
        `width:${diameter}px`,
        `height:${diameter}px`,
        `left:${e.clientX - rect.left - radius}px`,
        `top:${e.clientY - rect.top - radius}px`,
        "background:rgba(255,255,255,0.25)",
        "transform:scale(0)",
        "animation:rippleClick 0.6s linear",
      ].join(";");

      target.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
