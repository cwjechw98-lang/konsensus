import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ParticlesBackground from "@/components/ParticlesBackground";
import TypedText from "@/components/TypedText";
import AnimatedCounter from "@/components/AnimatedCounter";
import FloatingToast from "@/components/FloatingToast";
import ScrollReveal from "@/components/ScrollReveal";
import TiltCard from "@/components/TiltCard";
import TelegramAuthButton from "@/components/TelegramAuthButton";
import { SUPPORT_GOALS, SUPPORT_LINKS, hasSupportLinks } from "@/lib/site-config";

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
    desc: "Выберите готовый шаблон или сформулируйте предмет спора самостоятельно. 15+ тем: финансы, быт, работа, семья, отношения.",
  },
  {
    step: "02",
    label: "Пригласите оппонента",
    desc: "Одна ссылка — и вторая сторона в деле. Или бросьте открытый вызов на Арене — и примет тот, кто готов.",
  },
  {
    step: "03",
    label: "Изложите аргументы",
    desc: "По очереди, раунд за раундом. ИИ оценит силу аргумента до отправки, а после — даст нейтральный разбор и покажет сближение позиций.",
  },
  {
    step: "04",
    label: "Получите решение",
    desc: "ИИ-медиатор изучает все аргументы и предлагает 2–3 варианта консенсуса. Оба участника голосуют — и фиксируют договорённость.",
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
    title: "ИИ анализирует каждый раунд",
    desc: "Нейтральная карточка от ИИ после каждого раунда: наблюдение и показатель сближения позиций от −2 до +2. Динамика в реальном времени.",
  },
  {
    icon: "✨",
    title: "Оценка аргументов до отправки",
    desc: "ИИ оценит ваш аргумент по шкале 1–5, покажет сильные стороны и подсказку — отправьте лучшую версию себя.",
  },
  {
    icon: "⚔️",
    title: "Арена вызовов",
    desc: "Бросьте открытый вызов по любой теме. Наведите на оппонента — увидите его RPG-карточку: класс, статы, стиль. Примите вызов — и в бой.",
  },
  {
    icon: "🛡️",
    title: "RPG-профиль и прогресс",
    desc: "Аргументация, Дипломатия, Активность, Выдержка — 4 стата растут с каждым спором. Класс персонажа от Новобранца до Мастера.",
  },
  {
    icon: "👁️",
    title: "Публичная лента и зрители",
    desc: "Наблюдайте за спорами других. Реагируйте, комментируйте, читайте разбор ИИ. Всезнающий Сурок прокомментирует происходящее.",
  },
];

const USECASES = [
  { icon: "💰", label: "Финансовые споры" },
  { icon: "🧹", label: "Бытовые вопросы" },
  { icon: "💼", label: "Рабочие конфликты" },
  { icon: "👨‍👩‍👧", label: "Семейные решения" },
  { icon: "📱", label: "Отношения" },
  { icon: "🌱", label: "Разногласия во взглядах" },
];

// ─── Страница ────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ landing?: string }>;
}) {
  const { landing } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && landing !== "1") {
    redirect("/dashboard");
  }

  const supportVisible = hasSupportLinks();

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

            <h1 className="text-5xl sm:text-7xl font-bold mb-5 leading-none">
              <span className="shimmer-text">Спор — это</span>
              <br />
              <span className="hero-accent">не война.</span>
            </h1>

            <p className="text-2xl sm:text-3xl font-light mb-4 glow-pulse">
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
              href="/arena"
              className="btn-ripple glass text-gray-300 hover:text-white px-8 py-3.5 rounded-lg font-semibold transition-colors text-base"
            >
              Арена вызовов
            </Link>
            <TelegramAuthButton className="btn-ripple inline-flex items-center justify-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-8 py-3.5 text-base font-semibold text-sky-200 transition-colors hover:bg-sky-500/15" />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-gray-700" />
        </div>
      </section>

      {/* ════════════════════ STATS ════════════════════ */}
      <section className="py-14 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <ScrollReveal>
            <div className="text-3xl sm:text-4xl font-bold gradient-text stat-number">
              <AnimatedCounter target={15} suffix="+" />
            </div>
            <div className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
              Готовых шаблонов
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="text-3xl sm:text-4xl font-bold gradient-text stat-number">
              <AnimatedCounter target={3} suffix=" варианта" />
            </div>
            <div className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
              Решений от ИИ
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div className="text-3xl sm:text-4xl font-bold gradient-text stat-number">
              <AnimatedCounter target={6} />
            </div>
            <div className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
              Классов персонажей
            </div>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <div className="text-3xl sm:text-4xl font-bold gradient-text stat-number">
              <AnimatedCounter target={4} suffix=" стата" />
            </div>
            <div className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
              RPG-профиля
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
              Конфликт без <span className="underline-shimmer">структуры</span> —
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
              <br />к <span className="section-word-accent">консенсусу</span>
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
              Возможности
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-14">
              Не просто чат.
              <br />
              <span className="underline-shimmer">Система</span> для справедливого диалога.
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* ════════════════════ ARENA PROMO ════════════════════ */}
      <section className="py-10 px-4 pb-28 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(239,68,68,0.06) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-3xl mx-auto relative z-10">
          <ScrollReveal>
            <div className="glass rounded-2xl p-10 border border-red-500/15 text-center">
              <div className="text-5xl mb-6">⚔️</div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-4">
                Арена вызовов
              </p>
              <h2 className="text-2xl font-bold text-white mb-4 leading-snug">
                Бросьте вызов — или примите чужой.
              </h2>
              <p className="text-gray-400 leading-relaxed mb-3">
                Открытая доска дискуссий: выберите тему, заявите позицию — и ждите оппонента.
                Наведите на любого участника — увидите его RPG-карточку: класс, статы, стиль спора.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                Открытый вызов теперь идёт по раундам, как и основной диспут:
                инициатор открывает обмен, оппонент отвечает, а финальная медиация
                запускается автоматически после последнего раунда.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link
                  href="/arena"
                  className="btn-ripple inline-block bg-red-600/80 hover:bg-red-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Перейти на Арену
                </Link>
                <Link
                  href="/feed"
                  className="btn-ripple inline-block glass text-gray-300 hover:text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Смотреть споры
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {supportVisible && (
        <section className="py-10 px-4 pb-28">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="glass rounded-2xl p-8 border border-amber-500/15">
                <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-4">
                      Поддержка роста
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-snug">
                      Хотите ускорить развитие Konsensus?
                    </h2>
                    <p className="text-gray-400 leading-relaxed mb-5">
                      Поддержка помогает держать инфраструктуру, подключать
                      более сильные модели для сложных медиаций и быстрее
                      выпускать новые пользовательские фичи.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {SUPPORT_LINKS.boosty && (
                        <Link
                          href={SUPPORT_LINKS.boosty}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ripple inline-block bg-amber-500/90 hover:bg-amber-400 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                          Поддержать через Boosty
                        </Link>
                      )}
                      <Link
                        href="/support"
                        className="btn-ripple inline-block glass text-gray-300 hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Все способы поддержки
                      </Link>
                    </div>
                  </div>

                  <div className="lg:w-[320px]">
                    <p className="text-sm font-medium text-white mb-3">
                      На что идут средства
                    </p>
                    <div className="space-y-2.5">
                      {SUPPORT_GOALS.map((goal) => (
                        <div
                          key={goal}
                          className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-gray-300"
                        >
                          {goal}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

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
                Он ищет <span className="section-word-accent">мост</span>.
              </h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                После каждого раунда — нейтральная карточка с наблюдением и показателем
                сближения позиций. Вы видите динамику спора в реальном времени, а не только итог.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                По завершении всех раундов — подробная медиация: резюме позиции
                каждой стороны, что объединяет обоих, 2–3 конкретных варианта решения
                и рекомендация медиатора.
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
            и начать <span className="section-word-accent">договариваться</span>?
          </h2>
          <p className="text-gray-500 mb-10 max-w-md mx-auto leading-relaxed">
            Создайте первый спор за две минуты. Бесплатно, без скрытых
            условий — просто попробуйте.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/register"
              className="btn-ripple inline-block bg-purple-600 hover:bg-purple-500 text-white px-12 py-4 rounded-xl font-semibold transition-colors shadow-lg shadow-purple-900/40 text-lg"
            >
              Начать бесплатно
            </Link>
            <TelegramAuthButton className="btn-ripple inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-8 py-4 text-lg font-semibold text-sky-200 transition-colors hover:bg-sky-500/15" />
            <Link
              href="/feed"
              className="btn-ripple inline-block glass text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold transition-colors text-lg"
            >
              Посмотреть споры
            </Link>
          </div>
          <p className="text-xs text-gray-600 mt-4">
            Без кредитной карты · Без обязательств
          </p>
        </ScrollReveal>
      </section>
    </>
  );
}
