import { Injectable, Logger } from '@nestjs/common'
import nodemailer from 'nodemailer'

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)

  async sendPasswordResetCode(email: string, code: string, tenantName: string): Promise<void> {
    const smtpConfigured =
      process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD

    if (!smtpConfigured) {
      this.logger.warn(`[DEV] Código de redefinição para ${email}: ${code}`)
      return
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    const appUrl = (process.env.APP_PUBLIC_URL ?? 'https://operum.adm.br').replace(/\/$/, '')

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? `"Operum" <no-reply@mavellium.com.br>`,
        to: email,
        subject: `[${tenantName}] Código de redefinição de senha`,
        html: buildTemplate(code, tenantName, appUrl),
      })
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail de reset para ${email}: ${err instanceof Error ? err.message : err}`)
      // Falha de SMTP nunca vaza para o cliente — a resposta HTTP já foi retornada com sucesso.
    }
  }
}

function buildTemplate(code: string, tenantName: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Redefinição de senha</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:28px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Operum</span>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${tenantName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Redefinição de senha</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no Operum.
                Use o código abaixo para continuar. Ele é válido por <strong>15 minutos</strong>.
              </p>

              <!-- Code block -->
              <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;font-weight:600;">Seu código</p>
                <span style="font-size:34px;font-weight:700;letter-spacing:8px;color:#111827;font-family:ui-monospace,monospace;">${code}</span>
              </div>

              <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.6;">
                Digite esse código na tela de recuperação de senha em
                <a href="${appUrl}" style="color:#4f46e5;text-decoration:none;">${appUrl}</a>.
              </p>

              <!-- Warning -->
              <div style="background:#fefce8;border-left:4px solid #facc15;border-radius:4px;padding:12px 16px;">
                <p style="margin:0;font-size:13px;color:#713f12;line-height:1.5;">
                  <strong>Não solicitou isso?</strong> Ignore este e-mail. Sua senha permanece inalterada
                  e nenhuma ação é necessária.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                Enviado por Operum · Mavellium &nbsp;·&nbsp;
                <a href="${appUrl}" style="color:#9ca3af;">${new URL(appUrl).hostname}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
