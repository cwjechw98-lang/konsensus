import { cache } from "react";
import { promises as fs } from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAIProfile } from "@/lib/ai-profile";
import type { Database } from "@/types/database";

export type EducationMaterial = {
  slug: string;
  title: string;
  summary: string;
  duration: string;
  focus: string;
  tags: string[];
  audience: string[];
  order: number;
  body: string;
};

export type EducationProgressRow =
  Database["public"]["Tables"]["user_learning_progress"]["Row"];

export type EducationRecommendation = {
  material: EducationMaterial;
  reason: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content", "education");

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { meta: {} as Record<string, string>, body: raw.trim() };
  }

  const meta = Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) return [line, ""];
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        return [key, value];
      })
  );

  return {
    meta,
    body: raw.slice(match[0].length).trim(),
  };
}

function parseListValue(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const loadEducationMaterials = cache(async (): Promise<EducationMaterial[]> => {
  const files = (await fs.readdir(CONTENT_DIR))
    .filter((file) => file.endsWith(".md"))
    .sort();

  const materials = await Promise.all(
    files.map(async (file) => {
      const absolutePath = path.join(CONTENT_DIR, file);
      const raw = await fs.readFile(absolutePath, "utf8");
      const { meta, body } = parseFrontmatter(raw);
      const fallbackSlug = file.replace(/^\d+_/, "").replace(/\.md$/, "");

      return {
        slug: meta.slug || fallbackSlug,
        title: meta.title || fallbackSlug,
        summary: meta.summary || "",
        duration: meta.duration || "4 минуты",
        focus: meta.focus || "Навык диалога",
        tags: parseListValue(meta.tags),
        audience: parseListValue(meta.audience),
        order: Number(meta.order || "999"),
        body,
      } satisfies EducationMaterial;
    })
  );

  return materials.sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.title.localeCompare(right.title, "ru");
  });
});

export async function listEducationMaterials() {
  return loadEducationMaterials();
}

export async function getEducationMaterial(slug: string) {
  const materials = await loadEducationMaterials();
  return materials.find((material) => material.slug === slug) ?? null;
}

export async function fetchLearningProgress(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_learning_progress")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .returns<EducationProgressRow[]>();

  return data ?? [];
}

export async function fetchEducationRecommendations(
  userId: string
): Promise<{
  recommendations: EducationRecommendation[];
  completedCount: number;
  totalCount: number;
}> {
  const admin = createAdminClient();
  const [materials, profile, progress, argsRes, evidenceRes] = await Promise.all([
    loadEducationMaterials(),
    fetchAIProfile(userId).catch(() => null),
    fetchLearningProgress(userId),
    admin
      .from("arguments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
    admin
      .from("arguments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .not("evidence", "is", null),
  ]);

  const completedSlugs = new Set(
    progress.filter((row) => row.completed_at).map((row) => row.material_slug)
  );
  const totalCount = materials.length;
  const completedCount = completedSlugs.size;

  if (!profile) {
    return {
      recommendations: materials.slice(0, 2).map((material) => ({
        material,
        reason: "Это базовый старт: материал помогает быстрее понять структуру спора в Konsensus.",
      })),
      completedCount,
      totalCount,
    };
  }

  const totalArgs = argsRes.count ?? 0;
  const evidenceArgs = evidenceRes.count ?? 0;
  const evidenceRatio = totalArgs > 0 ? evidenceArgs / totalArgs : 0;
  const hintAcceptanceRatio =
    profile.hints_total > 0 ? profile.hints_accepted / profile.hints_total : 0;

  const materialBySlug = new Map(materials.map((material) => [material.slug, material]));
  const ranked: { slug: string; weight: number; reason: string }[] = [];

  const pushRule = (slug: string, weight: number, reason: string) => {
    ranked.push({ slug, weight, reason });
  };

  if (profile.impulsivity >= 58) {
    pushRule(
      "deescalation-pause",
      100,
      "Сейчас вам особенно полезна деэскалация: профиль показывает повышенную импульсивность в напряжённых обменах."
    );
  }

  if (profile.empathy_score <= 55) {
    pushRule(
      "active-listening",
      95,
      "Материал поможет укрепить контакт с оппонентом: эмпатия пока проседает сильнее других метрик."
    );
  }

  if (evidenceRatio < 0.28 || profile.argumentation_style === "emotional") {
    pushRule(
      "evidence-ladder",
      92,
      "Есть запас для усиления аргументов фактами и проверяемой опорой, особенно в спорных раундах."
    );
  }

  if (profile.consensus_rate < 45 || profile.compromise_tendency < 55) {
    pushRule(
      "common-ground",
      90,
      "Этот материал полезен, если консенсус собирается тяжело и спор чаще уходит в жёсткое расхождение."
    );
  }

  if (
    (profile.hints_total >= 3 && hintAcceptanceRatio < 0.35) ||
    profile.typical_planes.includes("relationships")
  ) {
    pushRule(
      "fair-process",
      84,
      "Сигналы профиля показывают, что вам часто важна рамка разговора и ощущение справедливого процесса."
    );
  }

  if (totalArgs < 3 || ranked.length === 0) {
    pushRule(
      "disagreement-map",
      80,
      "Это базовый материал: он помогает быстрее разложить конфликт до ответа и не терять суть спора."
    );
  }

  const uniqueRanked = ranked
    .sort((left, right) => right.weight - left.weight)
    .filter(
      (item, index, list) =>
        list.findIndex((candidate) => candidate.slug === item.slug) === index
    );

  const recommendations: EducationRecommendation[] = [];

  for (const item of uniqueRanked) {
    const material = materialBySlug.get(item.slug);
    if (!material || completedSlugs.has(item.slug)) continue;
    recommendations.push({ material, reason: item.reason });
    if (recommendations.length === 2) break;
  }

  if (recommendations.length < 2) {
    for (const material of materials) {
      if (recommendations.some((item) => item.material.slug === material.slug)) continue;
      if (completedSlugs.has(material.slug)) continue;
      recommendations.push({
        material,
        reason: "Подойдёт как следующий короткий шаг для развития навыка диалога.",
      });
      if (recommendations.length === 2) break;
    }
  }

  if (recommendations.length === 0) {
    for (const material of materials.slice(0, 2)) {
      recommendations.push({
        material,
        reason: "Материал уже знаком, но его можно использовать как быструю повторную калибровку.",
      });
    }
  }

  return {
    recommendations,
    completedCount,
    totalCount,
  };
}
