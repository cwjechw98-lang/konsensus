import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Без верифицированного домена используем тестовый адрес Resend.
// После верификации домена заменить на: "Konsensus <noreply@YOUR_DOMAIN>"
const FROM = "Konsensus <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://konsensus-six.vercel.app";

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
        <p style="margin:0 0 8px;color:#9ca3af;font-size:14px;">Привет, <b style="color:#e2e2f0">${toName}</b>!</p>
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
        <p style="margin:0 0 8px;color:#9ca3af;font-size:14px;">Привет, <b style="color:#e2e2f0">${toName}</b>!</p>
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

export async function sendInviteEmail({
  toEmail,
  disputeTitle,
  creatorName,
  inviteUrl,
}: {

  toEmail: string;
  disputeTitle: string;
  creatorName: string;
  inviteUrl: string;
}) {
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `${creatorName} приглашает вас в спор — Konsensus`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d14;color:#e2e2f0;padding:32px;border-radius:16px;">
        <div style="margin-bottom:24px;">
          <h1 style="margin:0 0 4px;font-size:22px;color:#fff;">Вас приглашают в спор</h1>
          <p style="margin:0;color:#6b7280;font-size:13px;">Konsensus · ИИ-медиатор</p>
        </div>
        <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Тема спора</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#fff;">${disputeTitle}</p>
        </div>
        <p style="margin:0 0 8px;color:#d1d5db;font-size:14px;">
          <b style="color:#a78bfa">${creatorName}</b> хочет разрешить спор вместе с вами с помощью ИИ-медиатора.
        </p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">
          Перейдите по ссылке, чтобы принять участие. Каждый аргумент анализируется ИИ — финальное решение предложит нейтральный медиатор.
        </p>
        <a href="${inviteUrl}"
           style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.02em;">
          Принять участие →
        </a>
        <p style="margin:24px 0 0;color:#374151;font-size:11px;">
          Если вы не ожидали это письмо — просто проигнорируйте его.<br/>
          Konsensus · Платформа для разрешения споров с ИИ
        </p>
      </div>
    `,
  });
}

export async function sendDirectChallengeEmail({
  toEmail,
  toName,
  fromName,
  disputeTitle,
  disputeId,
}: {
  toEmail: string;
  toName: string;
  fromName: string;
  disputeTitle: string;
  disputeId: string;
}) {
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `${fromName} вызывает вас на спор — Konsensus`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d14;color:#e2e2f0;padding:32px;border-radius:16px;">
        <div style="margin-bottom:24px;">
          <h1 style="margin:0 0 4px;font-size:22px;color:#fff;">Прямой вызов</h1>
          <p style="margin:0;color:#6b7280;font-size:13px;">Konsensus · ИИ-медиатор</p>
        </div>
        <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Тема спора</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#fff;">${disputeTitle}</p>
        </div>
        <p style="margin:0 0 8px;color:#9ca3af;font-size:14px;">Привет, <b style="color:#e2e2f0">${toName}</b>!</p>
        <p style="margin:0 0 8px;color:#d1d5db;font-size:14px;">
          <b style="color:#a78bfa">${fromName}</b> выбрал вас оппонентом в споре.
        </p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">
          Спор уже начался — ваш ход. Войдите и подайте первый аргумент.
        </p>
        <a href="${APP_URL}/dispute/${disputeId}"
           style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.02em;">
          Открыть спор →
        </a>
        <p style="margin:24px 0 0;color:#374151;font-size:11px;">
          Konsensus · Платформа для разрешения споров с ИИ
        </p>
      </div>
    `,
  });
}
