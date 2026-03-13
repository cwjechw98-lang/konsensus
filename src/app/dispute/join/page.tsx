import Link from "next/link";
import { joinDispute } from "@/lib/actions";

export default async function JoinDisputePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2 text-center">
        Присоединиться к спору
      </h1>
      {code && (
        <p className="text-sm text-gray-500 text-center mb-6">
          Вас пригласили. Нажмите «Присоединиться».
        </p>
      )}

      <form action={joinDispute} className="flex flex-col gap-4 mt-6">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Инвайт-код</span>
          <input
            name="code"
            type="text"
            required
            defaultValue={code ?? ""}
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
