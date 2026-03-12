import Link from "next/link";
import { createDispute } from "@/lib/actions";

export default function NewDisputePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Новый спор</h1>

      <form action={createDispute} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Название спора</span>
          <input
            name="title"
            type="text"
            required
            maxLength={200}
            className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-transparent"
            placeholder="Кратко опишите суть спора"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Описание проблемы</span>
          <textarea
            name="description"
            required
            rows={5}
            className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-transparent resize-y"
            placeholder="Подробно опишите ситуацию и в чём заключается спор"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Количество раундов</span>
          <select
            name="max_rounds"
            defaultValue="3"
            className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-transparent"
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
            className="bg-foreground text-background px-5 py-2 rounded-md font-medium hover:opacity-90"
          >
            Создать
          </button>
          <Link
            href="/dashboard"
            className="border border-gray-300 dark:border-gray-700 px-5 py-2 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
