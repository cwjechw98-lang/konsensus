import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAIProfile } from "@/lib/ai-profile";

export type TrustTier = "basic" | "linked" | "trusted";

export type TrustTierState = {
  tier: TrustTier;
  label: string;
  description: string;
  unlocks: string[];
  nextTier: TrustTier | null;
  nextTierLabel: string | null;
  nextStep: string | null;
  signals: {
    hasLinkedIdentity: boolean;
    hasTelegram: boolean;
    accountAgeDays: number;
    disputeCount: number;
    resolvedCount: number;
    achievementsCount: number;
    consensusRate: number;
    empathyScore: number;
  };
};

export type AuthUserLike = {
  email?: string | null;
  is_anonymous?: boolean | null;
  created_at?: string;
  identities?: Array<{ provider?: string | null }> | null;
};

const TIER_ORDER: Record<TrustTier, number> = {
  basic: 0,
  linked: 1,
  trusted: 2,
};

const TIER_META: Record<
  TrustTier,
  { label: string; description: string; unlocks: string[] }
> = {
  basic: {
    label: "Базовый",
    description: "Можно вести приватные споры и смотреть открытые темы.",
    unlocks: [
      "Приватные споры",
      "Просмотр открытых тем",
      "Базовые лимиты безопасности",
    ],
  },
  linked: {
    label: "Подтверждённый",
    description: "Аккаунт уже выглядит надёжно, можно подключаться к открытым темам.",
    unlocks: [
      "Участие в открытых темах",
      "Мягче ограничения по доверию",
      "Больше действий в публичной части",
    ],
  },
  trusted: {
    label: "Надёжный",
    description: "Истории участия уже достаточно, чтобы самому открывать темы для всех.",
    unlocks: [
      "Создание открытых тем",
      "Больше доверия к аккаунту",
      "Меньше ограничений в публичной части",
    ],
  },
};

export function getLinkedIdentity(authUser: AuthUserLike | null) {
  if (!authUser || authUser.is_anonymous) return false;
  if (authUser.email) return true;
  const providers = (authUser.identities ?? []).map((item) => item.provider).filter(Boolean);
  return providers.length > 0 && !providers.every((provider) => provider === "anonymous");
}

export function differenceInDays(iso: string | undefined, fallbackIso: string | undefined) {
  const source = iso ?? fallbackIso;
  if (!source) return 0;
  const value = new Date(source).getTime();
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.floor((Date.now() - value) / (24 * 60 * 60 * 1000)));
}

export function calculateTrustTier(signals: TrustTierState["signals"]): TrustTier {
  const linked =
    signals.hasLinkedIdentity ||
    signals.hasTelegram ||
    signals.disputeCount >= 2 ||
    signals.achievementsCount >= 2;

  if (!linked) return "basic";

  const trusted =
    signals.accountAgeDays >= 7 &&
    signals.disputeCount >= 3 &&
    signals.resolvedCount >= 1 &&
    (
      signals.consensusRate >= 35 ||
      signals.achievementsCount >= 3 ||
      signals.empathyScore >= 55 ||
      signals.hasTelegram
    );

  return trusted ? "trusted" : "linked";
}

export function getTrustTierNextStep(
  tier: TrustTier,
  signals: TrustTierState["signals"]
) {
  if (tier === "basic") {
    if (!signals.hasLinkedIdentity && !signals.hasTelegram) {
      return "Подтвердите аккаунт через Telegram или устойчивый способ входа.";
    }
    return "Нужна первая история участия: хотя бы пара споров или несколько устойчивых сигналов активности.";
  }

  if (tier === "linked") {
    const missing: string[] = [];
    if (signals.accountAgeDays < 7) missing.push("возраст аккаунта 7+ дней");
    if (signals.disputeCount < 3) missing.push("минимум 3 спора");
    if (signals.resolvedCount < 1) missing.push("хотя бы 1 завершённый спор");
    if (
      signals.consensusRate < 35 &&
      signals.achievementsCount < 3 &&
      signals.empathyScore < 55 &&
      !signals.hasTelegram
    ) {
      missing.push("ещё один позитивный сигнал качества диалога");
    }

    return missing.length > 0
      ? `До уровня «Надёжный» осталось добрать: ${missing.join(", ")}.`
      : "Профиль уже близок к следующему уровню доверия.";
  }

  return null;
}

export function hasMinimumTrustTier(current: TrustTier, required: TrustTier) {
  return TIER_ORDER[current] >= TIER_ORDER[required];
}

export function getTrustTierGateMessage(required: TrustTier) {
  if (required === "linked") {
    return "Для участия в открытых темах сначала нужно немного истории участия и подтверждённый аккаунт.";
  }

  return "Чтобы открывать темы для всех, сначала нужно немного истории споров и сигналов доверия.";
}

export async function fetchTrustTierState(userId: string): Promise<TrustTierState> {
  const admin = createAdminClient();

  const [
    authResult,
    profileResult,
    disputesRes,
    resolvedRes,
    achievementsRes,
    aiProfile,
  ] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from("profiles")
      .select("created_at, telegram_chat_id, trust_tier")
      .eq("id", userId)
      .single<{ created_at: string; telegram_chat_id: number | null; trust_tier: TrustTier }>(),
    admin
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`),
    admin
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq("status", "resolved"),
    admin
      .from("user_achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    fetchAIProfile(userId).catch(() => null),
  ]);

  const authUser = authResult.data.user as AuthUserLike | null;
  const profile = profileResult.data;

  const signals: TrustTierState["signals"] = {
    hasLinkedIdentity: getLinkedIdentity(authUser),
    hasTelegram: Boolean(profile?.telegram_chat_id),
    accountAgeDays: differenceInDays(authUser?.created_at, profile?.created_at),
    disputeCount: disputesRes.count ?? 0,
    resolvedCount: resolvedRes.count ?? 0,
    achievementsCount: achievementsRes.count ?? 0,
    consensusRate: aiProfile?.consensus_rate ?? 0,
    empathyScore: aiProfile?.empathy_score ?? 0,
  };

  const tier = calculateTrustTier(signals);
  const nextTier = tier === "basic" ? "linked" : tier === "linked" ? "trusted" : null;

  if (profile?.trust_tier !== tier) {
    await admin
      .from("profiles")
      .update({ trust_tier: tier } as never)
      .eq("id", userId);
  }

  return {
    tier,
    label: TIER_META[tier].label,
    description: TIER_META[tier].description,
    unlocks: TIER_META[tier].unlocks,
    nextTier,
    nextTierLabel: nextTier ? TIER_META[nextTier].label : null,
    nextStep: getTrustTierNextStep(tier, signals),
    signals,
  };
}
