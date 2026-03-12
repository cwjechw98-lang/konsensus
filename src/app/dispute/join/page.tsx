import Link from "next/link";
import { joinDispute } from "@/lib/actions";

export default function JoinDisputePage() {
  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Присоединиться к спору
      </h1>

      <form action={joinDispute} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Инвайт-код</span>
          <input
            name="code"
            type="text"
            required
            className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-transparent text-center font-mono text-lg tracking-widest"
            placeholder="abc123def456"
          />
        </label>

        <button
          type="submit"
          className="bg-foreground text-background px-5 py-2 rounded-md font-medium hover:opacity-90 mt-2"
        >
          Присоединиться
        </button>

        <Link
          href="/dashboard"
          className="text-sm text-center text-gray-500 hover:underline"
        >
          Назад к моим спорам
        </Link>
      </form>
    </div>
  );
}
