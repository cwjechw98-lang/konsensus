import Link from "next/link";
import ParticlesBackground from "@/components/ParticlesBackground";
import TypedText from "@/components/TypedText";
import AnimatedCounter from "@/components/AnimatedCounter";
import FloatingToast from "@/components/FloatingToast";
import ScrollReveal from "@/components/ScrollReveal";
import TiltCard from "@/components/TiltCard";

const FEATURES = [
  {
    icon: "⚖️",
    title: "Структурированный спор",
    desc: "Опишите проблему, пригласите оппонента и обменяйтесь аргументами в раундовой системе.",
  },
  {
    icon: "🤖",
    title: "ИИ-медиатор",
    desc: "Нейтральный ИИ анализирует позиции обеих сторон после каждого раунда и предлагает решения.",
  },
  {
    icon: "🔍",
    title: "Объективный анализ",
    desc: "Сильные и слабые стороны каждой позиции, точки соприкосновения и расхождения.",
  },
  {
    icon: "🤝",
    title: "Варианты компромиссов",
    desc: "2–3 варианта решений от ИИ — выберите то, что устроит обе стороны.",
  },
];

const HOW_STEPS = [
  { step: "01", label: "Создайте спор", desc: "Опишите суть разногласия и пригласите оппонента по ссылке." },
  { step: "02", label: "Обменяйтесь аргументами", desc: "Каждая сторона излагает позицию и доказательства по раундам." },
  { step: "03", label: "ИИ анализирует", desc: "Нейтральный ИИ-медиатор разбирает аргументы обеих сторон." },
  { step: "04", label: "Получите решение", desc: "Консенсус, варианты компромисса и рекомендации медиатора." },
];

export default function HomePage() {
  return (
    <>
      <FloatingToast />

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        <ParticlesBackground />

        {/* Morphing blob background */}
        <div className="absolute top-1/2 left-1/2 pointer-events-none -translate-x-1/2 -translate-y-1/2">
          <div
            className="blob w-[520px] h-[520px]"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.22) 0%, rgba(37,99,235,0.14) 50%, transparent 75%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="fade-in-up">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-[0.2em] mb-5">
              ИИ-медиация нового поколения
            </p>
            <h1 className="text-6xl sm:text-8xl font-bold mb-6 shimmer-text leading-none">
              Konsensus
            </h1>
            <p className="text-xl text-gray-400 mb-10 h-7">
              <TypedText />
            </p>
          </div>

          <div
            className="flex gap-4 justify-center flex-wrap fade-in-up"
            style={{ animationDelay: "0.3s", animationFillMode: "both" }}
          >
            <Link
              href="/register"
              className="btn-ripple bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-lg shadow-purple-900/40"
            >
              Начать бесплатно
            </Link>
            <Link
              href="/login"
              className="btn-ripple glass text-gray-300 hover:text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Войти
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-600 text-xs flex flex-col items-center gap-2 animate-bounce">
          <span>↓</span>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────── */}
      <section className="py-16 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-8 text-center">
          <ScrollReveal>
            <div className="text-4xl font-bold gradient-text">
              <AnimatedCounter target={1200} suffix="+" />
            </div>
            <div className="text-sm text-gray-500 mt-2">Споров решено</div>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <div className="text-4xl font-bold gradient-text">
              <AnimatedCounter target={95} suffix="%" />
            </div>
            <div className="text-sm text-gray-500 mt-2">Удовлетворённость</div>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <div className="text-4xl font-bold gradient-text">
              <AnimatedCounter target={12} suffix=" мин" />
            </div>
            <div className="text-sm text-gray-500 mt-2">Среднее время решения</div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-center mb-4 gradient-text">
              Как это работает
            </h2>
            <p className="text-center text-gray-500 mb-14 text-sm">
              4 простых шага от конфликта к консенсусу
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {HOW_STEPS.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 80}>
                <div className="glass rounded-xl p-6 flex gap-4 items-start">
                  <span className="text-3xl font-bold text-purple-600/40 leading-none flex-shrink-0">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{s.label}</h3>
                    <p className="text-sm text-gray-400">{s.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section className="py-10 px-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-center mb-14 gradient-text">
              Почему Konsensus
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 100}>
                <TiltCard className="card-gradient-top glass rounded-xl p-6 h-full cursor-default">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400">{f.desc}</p>
                </TiltCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI HIGHLIGHT ──────────────────────────────── */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "600px",
              height: "300px",
              background:
                "radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </div>
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <ScrollReveal>
            <div className="glass rounded-2xl p-10 border border-purple-500/20">
              <div className="text-5xl mb-6">🤖</div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Где работает ИИ?
              </h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                После завершения всех раундов аргументов нейтральный
                ИИ-медиатор (Llama 3.3 70B) анализирует позиции обеих сторон
                и формирует{" "}
                <span className="text-purple-400 font-medium">
                  объективный разбор
                </span>
                : резюме каждой стороны, общие точки, 2–3 варианта решений и
                рекомендацию.
              </p>
              <Link
                href="/register"
                className="btn-ripple inline-block bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Попробовать
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="py-24 px-4 text-center">
        <ScrollReveal>
          <h2 className="text-3xl font-bold mb-4 text-white">
            Готовы разрешить спор?
          </h2>
          <p className="text-gray-500 mb-8">
            Создайте первый спор за 2 минуты — бесплатно.
          </p>
          <Link
            href="/register"
            className="btn-ripple inline-block bg-purple-600 hover:bg-purple-500 text-white px-10 py-3 rounded-lg font-semibold transition-colors shadow-lg shadow-purple-900/40"
          >
            Попробовать бесплатно
          </Link>
        </ScrollReveal>
      </section>
    </>
  );
}
