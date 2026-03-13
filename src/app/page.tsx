import Link from "next/link";
import ParticlesBackground from "@/components/ParticlesBackground";
import TypedText from "@/components/TypedText";
import AnimatedCounter from "@/components/AnimatedCounter";
import FloatingToast from "@/components/FloatingToast";
import ScrollReveal from "@/components/ScrollReveal";
import TiltCard from "@/components/TiltCard";

// ─── Контент ────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    icon: "🔥",
    title: "Эмоции перекрывают смысл",
    desc: "Когда задеты чувства, аргументы превращаются в обвинения. Обсуждение тонет в тоне, а не в сути.",
  },
  {
    icon: "🔒",
    title: "Позиции окапываются",
    desc: "Чем дольше спор, тем сложнее уступить — уступка воспринимается как проигрыш. Тупик становится нормой.",
  },
  {
    icon: "🎭",
    title: "Нет нейтрального арбитра",
    desc: "Друзья принимают стороны. Юристы стоят дорого. Молчание — не решение. Конфликт остаётся подвешенным.",
  },
];

const HOW_STEPS = [
  {
    step: "01",
    label: "Опишите суть",
    desc: "Сформулируйте предмет спора — что именно не поделили, в чём расхождение. Ясность с самого начала задаёт тон всему диалогу.",
  },
  {
    step: "02",
    label: "Пригласите оппонента",
    desc: "Одна ссылка — и вторая сторона в деле. Никаких установок, регистраций по запросу, ничего лишнего между вами.",
  },
  {
    step: "03",
    label: "Изложите аргументы",
    desc: "По очереди, раунд за раундом. У каждого — пространство для позиции, обоснования и доказательств. Без перебиваний.",
  },
  {
    step: "04",
    label: "Получите решение",
    desc: "ИИ-медиатор изучает обе стороны и предлагает консенсус: что объединяет, где можно сойтись, каким путём.",
  },
];

const FEATURES = [
  {
    icon: "⚖️",
    title: "Структура вместо хаоса",
    desc: "Раундовая система даёт каждой стороне равное время и пространство. Никто не перебивает — все слышаны.",
  },
  {
    icon: "🧠",
    title: "Нейтральный ИИ-арбитр",
    desc: "Алгоритм не знает, кто прав. Он читает аргументы, взвешивает доказательства и ищет пересечения — без предвзятости.",
  },
  {
    icon: "📎",
    title: "Доказательства в деле",
    desc: "Прикладывайте ссылки, факты, источники. Аргумент с подтверждением весит иначе, чем просто слова.",
  },
  {
    icon: "🔐",
    title: "Приватно и безопасно",
    desc: "Спор виден только участникам. Никакой публичности, никакой утечки — только вы, оппонент и медиатор.",
  },
];

const USECASES = [
  { icon: "👥", label: "Партнёрские разногласия" },
  { icon: "👨‍👩‍👧", label: "Семейные вопросы" },
  { icon: "💼", label: "Рабочие конфликты" },
  { icon: "🏠", label: "Соседские споры" },
  { icon: "🤝", label: "Переговоры об условиях" },
  { icon: "📝", label: "Разногласия по договору" },
];

// ─── Страница ────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <FloatingToast />

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="relative min-h-[94vh] flex items-center justify-center overflow-hidden">
        <ParticlesBackground />

        {/* Morphing blob */}
        <div className="absolute top-1/2 left-1/2 pointer-events-none -translate-x-1/2 -translate-y-1/2">
          <div
            className="blob w-[580px] h-[580px]"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.20) 0%, rgba(37,99,235,0.12) 55%, transparent 75%)",
              filter: "blur(90px)",
            }}
          />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="fade-in-up">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-[0.25em] mb-6">
              Платформа для разрешения споров
            </p>

            <h1 className="text-5xl sm:text-7xl font-bold mb-5 shimmer-text leading-none">
              Спор — это
              <br />
              не война.
            </h1>

            <p className="text-2xl sm:text-3xl font-light text-gray-500 mb-4">
              Это возможность.
            </p>

            <p className="text-lg text-gray-400 mb-3 max-w-xl mx-auto leading-relaxed">
              Konsensus превращает конфликт в структурированный диалог.
              <br className="hidden sm:block" />
              Нейтральный ИИ ищет не победителя — а решение.
            </p>

            <p className="text-sm text-gray-600 mb-10 h-6">
              <TypedText />
            </p>
          </div>

          <div
            className="flex gap-4 justify-center flex-wrap fade-in-up"
            style={{ animationDelay: "0.35s", animationFillMode: "both" }}
          >
            <Link
              href="/register"
              className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-8 py-3.5 rounded-lg font-semibold transition-colors shadow-lg shadow-purple-900/40 text-base"
            >
              Начать бесплатно
            </Link>
            <Link
              href="/login"
              className="btn-ripple glass text-gray-300 hover:text-white px-8 py-3.5 rounded-lg font-semibold transition-colors text-base"
            >
              Войти
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-gray-700" />
        </div>
      </section>

      {/* ════════════════════ STATS ════════════════════ */}
      <section className="py-14 border-y border-white/5">
        <div className="max-w-3xl mx-auto px-4 grid grid-cols-3 gap-6 text-center">
          <ScrollReveal>
            <div className="text-3xl sm:text-4xl font-bold gradient-text">
              <AnimatedCounter target={1200} suffix="+" />
            </div>
            <div className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
              Споров решено
            </div>
          </ScrollReveal>
          <ScrollReveal delay={130}>
            <div className="text-3xl sm:text-4xl font-bold gradient-text">
              <AnimatedCounter target={95} suffix="%" />
            </div>
            <div className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
              Удовлетворённость
            </div>
          </ScrollReveal>
          <ScrollReveal delay={260}>
            <div className="text-3xl sm:text-4xl font-bold gradient-text">
              <AnimatedCounter target={12} suffix=" мин" />
            </div>
            <div className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
              Среднее время
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ════════════════════ PROBLEM ════════════════════ */}
      <section className="py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest text-center mb-4">
              Почему споры не решаются
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-4 leading-snug">
              Конфликт без структуры —
              <br />
              это разговор глухих
            </h2>
            <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto leading-relaxed">
              Большинство споров тонут не из-за нехватки аргументов, а из-за
              того, как они ведутся. Эмоции, давление, отсутствие третьей
              стороны — стандартный рецепт тупика.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PROBLEMS.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 100}>
                <div className="glass rounded-xl p-6 text-center">
                  <div className="text-3xl mb-4">{p.icon}</div>
                  <h3 className="font-semibold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ SOLUTION ════════════════════ */}
      <section className="py-10 px-4 pb-28 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(124,58,237,0.07) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <ScrollReveal>
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-widest mb-4">
              Решение
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-snug">
              Konsensus — нейтральная
              <br />
              территория для диалога
            </h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              Мы не решаем за вас. Мы создаём условия, в которых решение
              становится возможным: структуру, паузу, равное внимание к обеим
              сторонам.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Нейтральный ИИ-медиатор читает каждый аргумент, замечает
              пересечения и формулирует то, что обе стороны пока не могли
              сформулировать вместе.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS ════════════════════ */}
      <section className="py-10 px-4 pb-28">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest text-center mb-4">
              Как это работает
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-14">
              Четыре шага от конфликта
              <br />к консенсусу
            </h2>
          </ScrollReveal>

          <div className="flex flex-col gap-4">
            {HOW_STEPS.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 80}>
                <div className="glass rounded-xl p-6 flex gap-5 items-start">
                  <span className="text-4xl font-bold text-purple-600/30 leading-none flex-shrink-0 w-12 text-center">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white mb-1.5">
                      {s.label}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ FEATURES ════════════════════ */}
      <section className="py-10 px-4 pb-28">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest text-center mb-4">
              Почему Konsensus
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-14">
              Не просто чат.
              <br />
              Система для справедливого диалога.
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 80}>
                <TiltCard className="card-gradient-top glass rounded-xl p-6 h-full cursor-default">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {f.desc}
                  </p>
                </TiltCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ USE CASES ════════════════════ */}
      <section className="py-10 px-4 pb-28">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-center text-white mb-10">
              Где пригодится
            </h2>
          </ScrollReveal>
          <div className="flex flex-wrap gap-3 justify-center">
            {USECASES.map((u, i) => (
              <ScrollReveal key={u.label} delay={i * 50}>
                <div className="glass rounded-full px-5 py-2.5 flex items-center gap-2 text-sm text-gray-300">
                  <span>{u.icon}</span>
                  <span>{u.label}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ AI SECTION ════════════════════ */}
      <section className="py-10 px-4 pb-28 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(124,58,237,0.10) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-2xl mx-auto relative z-10">
          <ScrollReveal>
            <div className="glass rounded-2xl p-10 border border-purple-500/15 text-center">
              <div className="text-5xl mb-6">🤖</div>
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-4">
                ИИ-медиатор
              </p>
              <h2 className="text-2xl font-bold text-white mb-4 leading-snug">
                Он не выбирает сторону.
                <br />
                Он ищет мост.
              </h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                После завершения всех раундов Llama 3.3 70B — один из
                мощнейших публичных языковых моделей — анализирует все
                аргументы, выявляет общие точки и формирует медиационный разбор.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                Вы получаете: резюме позиции каждой стороны, что объединяет
                обоих, 2–3 конкретных варианта решения и рекомендацию медиатора.
              </p>
              <Link
                href="/register"
                className="btn-ripple inline-block bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Попробовать медиацию
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ════════════════════ CTA ════════════════════ */}
      <section className="py-28 px-4 text-center">
        <ScrollReveal>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-snug">
            Готовы перестать спорить
            <br />
            и начать договариваться?
          </h2>
          <p className="text-gray-500 mb-10 max-w-md mx-auto leading-relaxed">
            Создайте первый спор за две минуты. Бесплатно, без скрытых
            условий — просто попробуйте.
          </p>
          <Link
            href="/register"
            className="btn-ripple inline-block bg-purple-600 hover:bg-purple-500 text-white px-12 py-4 rounded-xl font-semibold transition-colors shadow-lg shadow-purple-900/40 text-lg"
          >
            Начать бесплатно
          </Link>
          <p className="text-xs text-gray-600 mt-4">
            Без кредитной карты · Без обязательств
          </p>
        </ScrollReveal>
      </section>
    </>
  );
}
