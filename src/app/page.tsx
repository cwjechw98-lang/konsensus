import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="text-4xl font-bold mb-4">Konsensus</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Платформа для разрешения споров с ИИ-медиатором.
        <br />
        Создайте спор, обменяйтесь аргументами, получите объективный анализ.
      </p>

      <div className="flex gap-4 justify-center">
        <Link
          href="/register"
          className="bg-foreground text-background px-6 py-2.5 rounded-md font-medium hover:opacity-90"
        >
          Начать
        </Link>
        <Link
          href="/login"
          className="border border-gray-300 dark:border-gray-700 px-6 py-2.5 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          Войти
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <h3 className="font-semibold mb-2">Структурированный спор</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Опишите проблему, пригласите оппонента и обменяйтесь аргументами в
            раундовой системе.
          </p>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <h3 className="font-semibold mb-2">ИИ-медиатор</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Нейтральный ИИ анализирует позиции обеих сторон и предлагает
            варианты решения.
          </p>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <h3 className="font-semibold mb-2">Объективный анализ</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Сильные и слабые стороны каждой позиции, точки соприкосновения и
            расхождения.
          </p>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <h3 className="font-semibold mb-2">Варианты решений</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            2-3 варианта компромиссов — выберите то, что устроит обе стороны.
          </p>
        </div>
      </div>
    </div>
  );
}
