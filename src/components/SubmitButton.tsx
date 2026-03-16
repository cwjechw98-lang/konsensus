"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  pendingText = "Отправка...",
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={
        className ??
        "bg-foreground text-background px-5 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      }
    >
      <span className="inline-flex items-center gap-2">
        {pending ? (
          <>
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-current opacity-80 animate-pulse"
            />
            <span>{pendingText}</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
