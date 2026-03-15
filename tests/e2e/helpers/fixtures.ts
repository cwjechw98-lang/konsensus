import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/types/database";
import { requireLocalEnv } from "./local-env";

type QaUser = {
  id: string;
  email: string;
  password: string;
  displayName: string;
};

export type ArenaLiveFixture = {
  challengeId: string;
  disputeId: string;
  topic: string;
  users: {
    author: QaUser;
    opponent: QaUser;
    watcher: QaUser;
  };
};

function createAdmin() {
  return createClient<Database>(
    requireLocalEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireLocalEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createQaUser(
  admin: ReturnType<typeof createAdmin>,
  prefix: string,
  telegramChatId?: number
): Promise<QaUser> {
  const marker = uid(prefix);
  const email = `${marker}@konsensus.test`;
  const password = `Konsensus!${Math.random().toString(36).slice(2, 8)}A1`;
  const displayName = `QA ${prefix}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create QA user ${prefix}: ${error?.message ?? "unknown"}`);
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    display_name: displayName,
    telegram_chat_id: telegramChatId ?? null,
  } as never);

  if (profileError) {
    throw new Error(`Failed to upsert profile for ${prefix}: ${profileError.message}`);
  }

  return {
    id: data.user.id,
    email,
    password,
    displayName,
  };
}

export async function createArenaLiveFixture(): Promise<ArenaLiveFixture> {
  const admin = createAdmin();
  const author = await createQaUser(admin, "author");
  const opponent = await createQaUser(admin, "opponent");
  const watcher = await createQaUser(admin, "watcher", 777000 + Math.floor(Math.random() * 1000));
  const topic = `QA Live Arena ${Date.now()}`;

  const { data: challenge, error: challengeError } = await admin
    .from("challenges")
    .insert({
      author_id: author.id,
      accepted_by: opponent.id,
      topic,
      position_hint: "Тестовый live battle для проверки spectator-режима и realtime-слоя.",
      category: "technology",
      status: "active",
      max_rounds: 3,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (challengeError || !challenge) {
    throw new Error(`Failed to create challenge fixture: ${challengeError?.message ?? "unknown"}`);
  }

  const { error: challengeMessagesError } = await admin.from("challenge_messages").insert([
    {
      challenge_id: challenge.id,
      author_id: author.id,
      content: "Я считаю, что продукту нужен живой spectator-layer, иначе арена ощущается пустой.",
      is_ai: false,
    },
  ] as never);

  if (challengeMessagesError) {
    throw new Error(`Failed to seed challenge messages: ${challengeMessagesError.message}`);
  }

  const { data: dispute, error: disputeError } = await admin
    .from("disputes")
    .insert({
      title: `QA Typing Dispute ${Date.now()}`,
      description: "Тестовый спор для проверки typing indicator в основном режиме.",
      creator_id: author.id,
      opponent_id: opponent.id,
      status: "in_progress",
      max_rounds: 3,
      is_public: false,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (disputeError || !dispute) {
    throw new Error(`Failed to create dispute fixture: ${disputeError?.message ?? "unknown"}`);
  }

  const { error: argsError } = await admin.from("arguments").insert([
    {
      dispute_id: dispute.id,
      author_id: author.id,
      round: 1,
      position: "Нужен live spectator mode",
      reasoning: "Если battle нельзя наблюдать без авторизации, арена теряет ощущение жизни и не вовлекает новых людей.",
      evidence: null,
    },
  ] as never);

  if (argsError) {
    throw new Error(`Failed to seed dispute arguments: ${argsError.message}`);
  }

  return {
    challengeId: challenge.id,
    disputeId: dispute.id,
    topic,
    users: { author, opponent, watcher },
  };
}

export async function cleanupArenaLiveFixture(fixture: ArenaLiveFixture) {
  const admin = createAdmin();

  await admin.from("challenge_watchers").delete().eq("challenge_id", fixture.challengeId);
  await admin.from("challenge_comments").delete().eq("challenge_id", fixture.challengeId);
  await admin.from("challenge_opinions").delete().eq("challenge_id", fixture.challengeId);
  await admin.from("challenge_observer_hints").delete().eq("challenge_id", fixture.challengeId);
  await admin.from("challenge_messages").delete().eq("challenge_id", fixture.challengeId);
  await admin.from("challenges").delete().eq("id", fixture.challengeId);

  await admin.from("arguments").delete().eq("dispute_id", fixture.disputeId);
  await admin.from("round_insights").delete().eq("dispute_id", fixture.disputeId);
  await admin.from("waiting_insights").delete().eq("dispute_id", fixture.disputeId);
  await admin.from("round_public_summaries").delete().eq("dispute_id", fixture.disputeId);
  await admin.from("dispute_analysis").delete().eq("dispute_id", fixture.disputeId);
  await admin.from("mediations").delete().eq("dispute_id", fixture.disputeId);
  await admin.from("resolutions").delete().eq("dispute_id", fixture.disputeId);
  await admin.from("disputes").delete().eq("id", fixture.disputeId);

  for (const user of Object.values(fixture.users)) {
    await admin.auth.admin.deleteUser(user.id);
  }
}
