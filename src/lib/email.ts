import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = "Konsensus <noreply@konsensus.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://konsensus.app";

export async function sendArgumentNotification({
  toEmail,
  toName,
  fromName,
  disputeTitle,
  round,
  disputeId,
}: {
  toEmail: string;
  toName: string;
  fromName: string;
  disputeTitle: string;
  round: number;
  disputeId: string;
}) {
  if (!resend) return; // нет ключа — пропускаем, не крашим

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `${fromName} ответил в споре «${disputeTitle}»`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d14;color:#e2e2f0;padding:32px;border-radius:16px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#fff;">Новый аргумент</h2>
        <p style="margin:0 0 16px;color:#9ca3af;font-size:14px;">
          <b style="color:#a78bfa">${fromName}</b> подал аргумент в раунде <b>${round}</b>
          спора «${disputeTitle}».
        </p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">
          Теперь ваша очередь. Войдите и ответьте.
        </p>
        <a href="${APP_URL}/dispute/${disputeId}"
           style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Открыть спор
        </a>
        <p style="margin:24px 0 0;color:#374151;font-size:11px;">
          Konsensus · Платформа для разрешения споров с ИИ
        </p>
      </div>
    `,
  });
}

export async function sendMediationReadyNotification({
  toEmail,
  toName,
  disputeTitle,
  disputeId,
}: {
  toEmail: string;
  toName: string;
  disputeTitle: string;
  disputeId: string;
}) {
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `ИИ-медиатор готов — «${disputeTitle}»`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d14;color:#e2e2f0;padding:32px;border-radius:16px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#fff;">Медиация готова</h2>
        <p style="margin:0 0 16px;color:#9ca3af;font-size:14px;">
          Все раунды завершены. ИИ-медиатор проанализировал спор
          «${disputeTitle}» и готов предложить решение.
        </p>
        <a href="${APP_URL}/dispute/${disputeId}/mediation"
           style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Посмотреть анализ
        </a>
        <p style="margin:24px 0 0;color:#374151;font-size:11px;">
          Konsensus · Платформа для разрешения споров с ИИ
        </p>
      </div>
    `,
  });
}
