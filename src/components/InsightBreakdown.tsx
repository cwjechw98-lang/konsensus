"use client";

const SECTION_DEFS = [
  {
    key: "protects",
    labels: ["что он защищает", "что он, вероятно, защищает"],
    title: "Что он защищает",
    icon: "🛡️",
    accent: "text-cyan-300",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/8",
  },
  {
    key: "reacts",
    labels: ["почему он так реагирует", "почему он может так ответить"],
    title: "Почему он так реагирует",
    icon: "🧠",
    accent: "text-violet-300",
    border: "border-violet-500/20",
    bg: "bg-violet-500/8",
  },
  {
    key: "next",
    labels: ["вектор следующего хода", "что можно учесть дальше", "что можно держать в уме"],
    title: "Вектор следующего хода",
    icon: "🧭",
    accent: "text-amber-300",
    border: "border-amber-500/20",
    bg: "bg-amber-500/8",
  },
] as const;

function parseInsight(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = SECTION_DEFS.map((section) => {
    const line = lines.find((candidate) =>
      section.labels.some((label) => candidate.toLowerCase().startsWith(`${label}:`))
    );

    if (!line) return null;

    const value = line.slice(line.indexOf(":") + 1).trim();
    if (!value) return null;

    return { ...section, value };
  }).filter((section): section is (typeof SECTION_DEFS)[number] & { value: string } => Boolean(section));

  return sections;
}

function getNextStepSection(text: string) {
  return parseInsight(text).find((section) => section.key === "next") ?? null;
}

export default function InsightBreakdown({
  text,
  eyebrow,
  note,
}: {
  text: string;
  eyebrow?: string;
  note?: string;
}) {
  const sections = parseInsight(text);
  const nextStep = getNextStepSection(text);
  const mainSections = sections.filter((section) => section.key !== "next");

  return (
    <div className="bg-violet-950/40 border border-violet-500/20 rounded-2xl px-4 py-3">
      {eyebrow && (
        <p className="text-xs text-violet-400 font-semibold mb-3 flex items-center gap-1.5">
          <span>🤖</span>
          <span>{eyebrow}</span>
        </p>
      )}

      {sections.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5">
          {mainSections.map((section) => (
            <div
              key={section.key}
              className={`rounded-xl border px-3 py-2.5 ${section.border} ${section.bg}`}
            >
              <p className={`text-[11px] uppercase tracking-[0.18em] mb-1.5 flex items-center gap-1.5 ${section.accent}`}>
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </p>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {section.value}
              </p>
            </div>
          ))}

          {nextStep && (
            <div className={`rounded-2xl border px-3.5 py-3 ${nextStep.border} ${nextStep.bg}`}>
              <p className={`text-[11px] uppercase tracking-[0.18em] mb-2 flex items-center gap-1.5 ${nextStep.accent}`}>
                <span>{nextStep.icon}</span>
                <span>{nextStep.title}</span>
              </p>
              <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                {nextStep.value}
              </p>
              <p className="text-xs text-white/55 mt-2">
                Не готовая реплика, а направление, в котором лучше строить следующий ответ.
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      )}

      {note && (
        <p className="text-xs text-gray-600 mt-3">
          {note}
        </p>
      )}
    </div>
  );
}
