import Link from "next/link";
import { SUPPORT_GOALS, SUPPORT_LINKS } from "@/lib/site-config";

const SUPPORT_METHODS = [
  {
    key: "boosty",
    title: "Boosty",
    desc: "Основной способ поддержки проекта и будущих релизов.",
    href: SUPPORT_LINKS.boosty,
    accent: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  },
  {
    key: "crypto",
    title: "Crypto",
    desc: "Для тех, кому удобнее поддерживать напрямую криптой.",
    href: SUPPORT_LINKS.crypto,
    accent: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  },
  {
    key: "alternative",
    title: "Альтернативный способ",
    desc: "Резервный канал поддержки, если Boosty или crypto не подходят.",
    href: SUPPORT_LINKS.alternative,
    accent: "border-violet-500/20 bg-violet-500/10 text-violet-200",
  },
].filter((item) => item.href);

export default function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-400 mb-4">
          Поддержка проекта
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Помочь росту Konsensus
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Сейчас это ранний продукт, который уже тестируют живые люди. Поддержка
          помогает быстрее выпускать UX-улучшения, держать инфраструктуру и
          постепенно подключать более сильный ИИ для тяжёлых медиаций.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Как можно поддержать
          </h2>

          {SUPPORT_METHODS.length > 0 ? (
            <div className="grid gap-4">
              {SUPPORT_METHODS.map((method) => (
                <Link
                  key={method.key}
                  href={method.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-white font-medium">{method.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${method.accent}`}>
                      открыть
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {method.desc}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-gray-400">
              Ссылки поддержки ещё не заданы в окружении. Как только они будут
              добавлены, здесь появятся Boosty, crypto и резервный способ.
            </div>
          )}
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            На что идут средства
          </h2>
          <div className="space-y-3">
            {SUPPORT_GOALS.map((goal) => (
              <div
                key={goal}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-gray-300"
              >
                {goal}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
