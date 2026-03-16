import type { EditorialReleaseReport } from "@/lib/editorial-reporting";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTarget(target: "bot" | "channel" | "both" | null) {
  switch (target) {
    case "bot":
      return "Только бот";
    case "channel":
      return "Только канал";
    case "both":
      return "Бот + канал";
    default:
      return "—";
  }
}

function DeliveryRow({
  release,
}: {
  release: EditorialReleaseReport;
}) {
  const botSummary = release.sent_to_bot_at
    ? `${release.bot_delivered_count}/${release.bot_recipient_count} в бот, ${release.bot_suppressed_count} suppressed`
    : "Бот ещё не отправлен";
  const channelSummary = release.sent_to_channel_at
    ? `Канал отправлен${release.channel_message_id ? ` · msg ${release.channel_message_id}` : ""}`
    : "Канал ещё не отправлен";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{release.title}</p>
          <p className="mt-1 text-xs text-gray-500">{release.slug}</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p suppressHydrationWarning>{formatDateTime(release.created_at)}</p>
          {release.last_delivery_attempt_at ? (
            <p suppressHydrationWarning>
              Последняя попытка: {formatDateTime(release.last_delivery_attempt_at)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Доставка</p>
          <p className="mt-2 text-sm text-gray-300">{botSummary}</p>
          <p className="mt-1 text-sm text-gray-300">{channelSummary}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Schedule</p>
          <p className="mt-2 text-sm text-gray-300">
            Target: {formatTarget(release.scheduled_target)}
          </p>
          <p className="mt-1 text-sm text-gray-300" suppressHydrationWarning>
            Запланировано: {formatDateTime(release.scheduled_publish_at)}
          </p>
          <p className="mt-1 text-sm text-gray-300" suppressHydrationWarning>
            Опубликовано: {formatDateTime(release.scheduled_published_at)}
          </p>
          {release.last_schedule_error ? (
            <p className="mt-2 text-xs leading-relaxed text-red-200">
              Ошибка schedule: {release.last_schedule_error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function EditorialDeliveryPanel({
  queued,
  recent,
}: {
  queued: EditorialReleaseReport[];
  recent: EditorialReleaseReport[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Очередь scheduled releases</h3>
          <span className="text-xs text-gray-500">{queued.length}</span>
        </div>
        {queued.length > 0 ? (
          <div className="space-y-3">
            {queued.map((release) => (
              <div
                key={`queued-${release.id}`}
                className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{release.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{release.slug}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{formatTarget(release.scheduled_target)}</p>
                    <p suppressHydrationWarning>{formatDateTime(release.scheduled_publish_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
            В очереди нет будущих запланированных релизов.
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Последние delivery reports</h3>
          <span className="text-xs text-gray-500">{recent.length}</span>
        </div>
        {recent.length > 0 ? (
          <div className="space-y-3">
            {recent.map((release) => (
              <DeliveryRow key={release.id} release={release} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
            История editorial delivery пока пуста.
          </div>
        )}
      </div>
    </div>
  );
}
