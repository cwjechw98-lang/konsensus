import Link from "next/link";
import { createDispute } from "@/lib/actions";

export default function NewDisputePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
      >
        &larr; Мои споры
      </Link>

      <h1 className="text-2xl font-bold text-white mb-1">Новый спор</h1>
      <p className="text-sm text-gray-500 mb-8">
        Опишите суть — ИИ поможет найти решение
      </p>

      <div className="glass rounded-2xl p-8">
        <form action={createDispute} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">
              Название спора
            </span>
            <input
              name="title"
              type="text"
              required
              maxLength={200}
              className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="Кратко опишите суть спора"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">
              Описание проблемы
            </span>
            <textarea
              name="description"
              required
              rows={5}
              className="border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-y"
              placeholder="Подробно опишите ситуацию и в чём заключается спор"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-300">
              Количество раундов
            </span>
            <select
              name="max_rounds"
              defaultValue="3"
              className="border border-white/10 bg-[#0d0d14] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
            >
              <option value="1">1 раунд</option>
              <option value="2">2 раунда</option>
              <option value="3">3 раунда</option>
              <option value="5">5 раундов</option>
            </select>
          </label>

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              Создать спор
            </button>
            <Link
              href="/dashboard"
              className="glass px-6 py-2.5 rounded-lg font-medium text-gray-300 hover:text-white transition-colors"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
