import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/display-name";
import ParticlesBackground from "@/components/ParticlesBackground";
import ScrollReveal from "@/components/ScrollReveal";
import TelegramAuthButton from "@/components/TelegramAuthButton";
import type { Database } from "@/types/database";

type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type LandingDispute = Pick<
  Dispute,
  "id" | "title" | "description" | "status" | "updated_at" | "max_rounds"
> & {
  creator_profile: Pick<Profile, "display_name"> | null;
};

type LandingChallenge = Pick<
  Challenge,
  "id" | "topic" | "status" | "created_at" | "max_rounds"
> & {
  author_profile: Pick<Profile, "display_name"> | null;
  accepted_profile: Pick<Profile, "display_name"> | null;
};

const STEPS = [
  {
    step: "01",
    icon: "🧩",
    title: "Запустите спор",
    description:
      "Коротко сформулируйте тему и задайте число раундов. Система сразу собирает разговор в понятную рамку.",
  },
  {
    step: "02",
    icon: "📨",
    title: "Пригласите человека",
    description:
      "По email, Telegram, invite-коду или через открытый публичный вход. Подключение к спору не должно быть сложным.",
  },
  {
    step: "03",
    icon: "🛰️",
    title: "Получите AI-медиацию",
    description:
      "После каждого раунда видно, куда движется спор. В конце ИИ собирает варианты решения, а не объявляет победителя.",
  },
];

const PROOF_BLOCKS = [
  {
    eyebrow: "Структурированный спор",
    title: "Каждый ход идёт по раундам, а не тонет в перебиваниях",
    description:
      "В каждом ходе видны тема, последний ответ оппонента и понятный следующий шаг. Не нужно собирать контекст по кускам.",
    chips: ["Раунды", "Контекст ответа", "Оценка аргумента"],
  },
  {
    eyebrow: "Подсказка после раунда",
    title: "ИИ помогает увидеть логику второй стороны, а не объявляет победителя",
    description:
      "После раунда видно, где вы сблизились, что лучше уточнить и какой следующий ход снизит напряжение.",
    chips: ["Общий итог", "Личный разбор", "Подсказка в ожидании"],
  },
  {
    eyebrow: "Открытые диспуты",
    title: "Публичный слой показывает ход мысли, а не превращает спор в шоу",
    description:
      "Есть открытые диспуты, наблюдение за ходом разговора и публичные темы, к которым можно присоединиться без лишнего шума.",
    chips: ["Открытые диспуты", "Наблюдение", "Публичные темы"],
  },
  {
    eyebrow: "Профиль и доверие",
    title: "Профиль помогает понять свой стиль спора и вернуться к важным темам",
    description:
      "В профиле собраны AI-профиль, архив, доверительный слой и история качества вашего диалога.",
    chips: ["AI-профиль", "Архив", "Качество диалога"],
  },
];

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTime(value: string) {
  return DATE_FORMATTER.format(new Date(value));
}

function SurfaceCard({
  eyebrow,
  title,
  description,
  chips,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description: string;
  chips: string[];
  className?: string;
}) {
  return (
    <div
      className={`glass rounded-3xl border border-white/10 bg-white/[0.03] p-6 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-300/80">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-300">{description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-gray-200"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroPreview({
  dispute,
  challenge,
}: {
  dispute: LandingDispute | null;
  challenge: LandingChallenge | null;
}) {
  const creatorName = dispute
    ? getDisplayName(dispute.creator_profile?.display_name, null, "Участник")
    : "Участник";
  const challengeAuthor = challenge
    ? getDisplayName(challenge.author_profile?.display_name, null, "Автор")
    : "Автор";
  const challengeOpponent = challenge
    ? getDisplayName(challenge.accepted_profile?.display_name, null, "Оппонент")
    : "Оппонент";

  return (
    <div className="grid gap-4">
      <div className="glass rounded-3xl border border-white/10 bg-[#140f23]/90 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-purple-200">
            спор
          </span>
          <span className="text-xs text-gray-500">Раунд 2 из 5</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">
          {dispute?.title ?? "Можно ли перевести конфликт в понятный формат?"}
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          {dispute?.description ??
            "Тема, контекст и рамка спора видны сразу, без расползания в чатовый хаос."}
        </p>
        <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
            Последний ответ оппонента
          </p>
          <p className="mt-2 text-sm text-gray-200">
            {dispute
              ? `${creatorName} уже в диалоге. Следующий ход строится от реального ответа, а не вслепую.`
              : "Следующий ход строится от последнего ответа, а не от вашего собственного старого вопроса."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-300">
            После раунда
          </p>
          <p className="mt-3 text-sm font-medium text-white">
            Сближение позиций: +1
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            ИИ отмечает, где стороны реально сходятся и какой следующий ход уменьшит напряжение.
          </p>
        </div>

        <div className="glass rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.05] p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">
            Открытый диспут
          </p>
          <p className="mt-3 text-sm font-medium text-white">
            {challenge
              ? `${challengeAuthor} и ${challengeOpponent}`
              : "Публичные темы и открытые входы"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            {challenge
              ? `${challenge.topic} · ${challenge.max_rounds} раундов`
              : "Публичный слой показывает живой диалог и даёт понятный вход в новые обсуждения."}
          </p>
        </div>
      </div>

      <div className="glass rounded-3xl border border-amber-500/15 bg-amber-500/[0.05] p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-amber-300">
          Доверие к процессу
        </p>
        <h4 className="mt-3 text-base font-semibold text-white">
          ИИ не судья, а помощник в спокойной медиации
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-gray-300">
          Платформа по умолчанию приватна, не выбирает победителя и удерживает спор в понятной рамке, а не в хаосе чата.
        </p>
      </div>
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ landing?: string }>;
}) {
  const { landing } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user && landing !== "1") {
    redirect("/dashboard");
  }

  const [{ data: disputes }, { data: challenges }] =
    await Promise.all([
      supabase
        .from("disputes")
        .select(`
          id,
          title,
          description,
          status,
          updated_at,
          max_rounds,
          creator_profile:profiles!disputes_creator_id_fkey(display_name)
        `)
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(2)
        .returns<LandingDispute[]>(),
      supabase
        .from("challenges")
        .select(`
          id,
          topic,
          status,
          created_at,
          max_rounds,
          author_profile:profiles!challenges_author_id_fkey(display_name),
          accepted_profile:profiles!challenges_accepted_by_fkey(display_name)
        `)
        .in("status", ["active", "open"])
        .order("created_at", { ascending: false })
        .limit(2)
        .returns<LandingChallenge[]>(),
    ]);

  const featuredDispute = disputes?.[0] ?? null;
  const featuredChallenge = challenges?.[0] ?? null;

  return (
    <>
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:pb-24 sm:pt-28">
        <ParticlesBackground />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.14),transparent_24%)]" />

        <div className="relative z-10 mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-300/80">
              Konsensus
            </p>
            <h1 className="mt-6 text-5xl font-bold leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Разногласие можно
              <br />
              <span className="gradient-text">довести до решения.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-300 sm:text-xl">
              Konsensus превращает конфликт в структурированный диалог: раунды,
              контекст, AI-сопровождение, медиация и понятный финальный выбор
              без бессмысленного шума.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="btn-ripple rounded-xl bg-purple-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-purple-900/30 transition-colors hover:bg-purple-500"
              >
                Создать первый спор
              </Link>
              <Link
                href="/feed"
                className="btn-ripple glass rounded-xl px-6 py-3.5 text-base font-semibold text-gray-200 transition-colors hover:text-white"
              >
                Смотреть события
              </Link>
              <TelegramAuthButton className="btn-ripple inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-6 py-3.5 text-base font-semibold text-sky-200 transition-colors hover:bg-sky-500/15" />
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {[ 
                "Раунды вместо хаоса",
                "ИИ без выбора победителя",
                "Приватность по умолчанию",
                "Открытые диспуты без шоу",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <HeroPreview
            dispute={featuredDispute}
            challenge={featuredChallenge}
          />
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="mb-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
              Три шага
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Не длинная инструкция, а короткий путь к первому результату
            </h2>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 lg:grid-cols-3">
            {STEPS.map((step, index) => (
              <ScrollReveal key={step.step} delay={index * 80}>
                <div className="glass rounded-3xl border border-white/10 p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">
                      {step.icon}
                    </span>
                    <p className="text-4xl font-bold text-white/15">{step.step}</p>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-300">
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Что уже работает
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                  Не обещания, а конкретные рабочие поверхности
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-gray-400">
                Ниже короткие карточки о том, что уже есть внутри Konsensus и зачем
                к этому реально возвращаться.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 lg:grid-cols-2">
            {PROOF_BLOCKS.map((block, index) => (
              <ScrollReveal key={block.title} delay={index * 70}>
                <SurfaceCard
                  eyebrow={block.eyebrow}
                  title={block.title}
                  description={block.description}
                  chips={block.chips}
                />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Активность
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                  Открытые темы и публичные диспуты должны быть видны сразу
                </h2>
              </div>
              <Link
                href="/feed"
                className="text-sm font-medium text-purple-300 transition-colors hover:text-purple-200"
              >
                Открыть события →
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <ScrollReveal>
              <div className="glass rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.05] p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                  Публичный слой
                </p>
                <h3 className="mt-4 text-2xl font-semibold text-white">
                  Движение платформы видно через открытые диспуты и темы, а не через рекламный шум
                </h3>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                      Споры
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {disputes?.length ?? 0}
                    </p>
                    <p className="mt-1 text-sm text-gray-300">
                      публичных историй попадают в поток событий
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                      Открытые темы
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {challenges?.length ?? 0}
                    </p>
                    <p className="mt-1 text-sm text-gray-300">
                      точек входа в публичный слой
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <div className="grid gap-4">
              <ScrollReveal delay={80}>
                <SurfaceCard
                  eyebrow="Открытый диспут"
                  title={
                    featuredDispute?.title ??
                    "Публичные диспуты видны как реальные истории, а не как абстракция"
                  }
                  description={
                    featuredDispute
                      ? `${featuredDispute.description} · Обновлён ${formatTime(
                          featuredDispute.updated_at
                        )}`
                      : "Когда спор становится публичным по согласию сторон, он становится понятной точкой входа для наблюдения и обсуждения."
                  }
                  chips={[
                    featuredDispute
                      ? getDisplayName(
                          featuredDispute.creator_profile?.display_name,
                          null,
                          "Участник"
                        )
                      : "Публичность по согласию",
                    "Спокойная подача",
                    "Наблюдение",
                  ]}
                />
              </ScrollReveal>

              <ScrollReveal delay={140}>
                <SurfaceCard
                  eyebrow="Нейтральный ИИ"
                  title={
                    "ИИ помогает понять, где спор сближается, а не выбирает победителя"
                  }
                  description={
                    "После каждого раунда система показывает, как меняется дистанция между позициями, где можно снизить напряжение и что уточнить в следующем ходе."
                  }
                  chips={["ИИ не судья", "Подсказки в ожидании", "Медиация"]}
                />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 pt-12 text-center sm:pb-28">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
              Финальный вход
            </p>
            <h2 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
              Если спор всё равно случится,
              <br />
              лучше вести его в системе, где можно дойти до решения.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
              Начните с первого спора, посмотрите события или откройте публичные диспуты.
              Вход должен быть быстрым. Глубина идеи раскроется уже в самом
              взаимодействии с продуктом.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="btn-ripple rounded-xl bg-purple-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-purple-500"
              >
                Начать бесплатно
              </Link>
              <Link
                href="/arena"
                className="btn-ripple glass rounded-xl px-7 py-4 text-lg font-semibold text-gray-200 transition-colors hover:text-white"
              >
                Открытые диспуты
              </Link>
              <Link
                href="/feed"
                className="btn-ripple glass rounded-xl px-7 py-4 text-lg font-semibold text-gray-200 transition-colors hover:text-white"
              >
                Смотреть события
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
