import Link from "next/link";
import { joinDispute } from "@/lib/actions";

export default async function JoinDisputePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-2xl font-bold text-white mb-2">
            Присоединиться к спору
          </h1>
          {code ? (
            <p className="text-sm text-green-400">
              Вас пригласили. Нажмите «Присоединиться».
            </p>
          ) : (
            <p className="text-sm text-gray-500">Введите инвайт-код</p>
          )}
        </div>

        <div className="glass rounded-2xl p-8">
          <form action={joinDispute} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-300">
                Инвайт-код
              </span>
              <input
                name="code"
                type="text"
                required
                defaultValue={code ?? ""}
                className="border border-white/10 bg-white/5 rounded-lg px-3 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors text-center font-mono text-lg tracking-widest"
                placeholder="abc123def456"
              />
            </label>

            <button
              type="submit"
              className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              Присоединиться
            </button>

            <Link
              href="/dashboard"
              className="text-sm text-center text-gray-500 hover:text-gray-300 transition-colors"
            >
              Назад к моим спорам
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
