/**
 * Mailer
 * Single outbound email transport for the whole app.
 *
 * Supabase Auth is configured (dashboard -> Authentication -> Emails -> SMTP Settings)
 * to use the SAME relay these settings point at, so confirmation and password-reset
 * mail leaves through one host with one reputation. See docs/EMAIL_SETUP.md.
 */

import nodemailer, { type Transporter } from 'nodemailer'
import { Resend } from 'resend'

export type EmailProvider = 'zeptomail' | 'smtp' | 'zoho' | 'resend' | 'gmail'

export interface SendMailInput {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface SendMailResult {
  messageId: string
  provider: EmailProvider
}

/** Preset SMTP hosts. ZeptoMail is regional - override with SMTP_HOST for .eu / .in. */
const ZEPTOMAIL_DEFAULT_HOST = 'smtp.zeptomail.com'
const ZEPTOMAIL_DEFAULT_USER = 'emailapikey'

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase().trim()

  switch (provider) {
    case 'zeptomail':
    case 'zepto':
      return 'zeptomail'
    case 'smtp':
      return 'smtp'
    case 'zoho':
    case 'zohomail':
      return 'zoho'
    case 'resend':
      return 'resend'
    case 'gmail':
      return 'gmail'
    default:
      // Default to ZeptoMail: the relay Supabase Auth also sends through.
      return 'zeptomail'
  }
}

/**
 * Resolve SMTP connection settings for the active provider.
 * Generic SMTP_* vars win, so a relay swap is env-only - no code change.
 */
function resolveSmtpConfig(provider: EmailProvider) {
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  // Port 465 is implicit TLS; 587 upgrades via STARTTLS.
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465

  switch (provider) {
    case 'zeptomail':
      return {
        host: process.env.SMTP_HOST || ZEPTOMAIL_DEFAULT_HOST,
        port,
        secure,
        user: process.env.SMTP_USER || ZEPTOMAIL_DEFAULT_USER,
        pass: process.env.SMTP_PASSWORD || process.env.ZEPTOMAIL_TOKEN,
        missingHint:
          'Set SMTP_PASSWORD to your ZeptoMail Send Mail token (SMTP username is "emailapikey").',
      }
    case 'smtp':
      return {
        host: process.env.SMTP_HOST,
        port,
        secure,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
        missingHint: 'Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD.',
      }
    case 'zoho':
      return {
        host: process.env.SMTP_HOST || 'smtp.zoho.com',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
        user: process.env.SMTP_USER || process.env.ZOHO_MAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.ZOHO_MAIL_PASSWORD,
        missingHint: 'Set ZOHO_MAIL_USER and ZOHO_MAIL_PASSWORD.',
      }
    case 'gmail':
      return {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
        missingHint: 'Set GMAIL_USER and GMAIL_APP_PASSWORD.',
      }
    default:
      throw new Error(`${provider} is not an SMTP provider`)
  }
}

/**
 * Envelope sender. Must be an address verified on the relay, on a domain whose
 * SPF/DKIM name the relay is authorised by - otherwise Gmail/Outlook reject it.
 */
export function getFromAddress(): string {
  const address =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.ZOHO_MAIL_USER ||
    process.env.GMAIL_USER

  if (!address) {
    throw new Error(
      'EMAIL_FROM is not configured. Set it to the verified sender address on your relay.'
    )
  }

  // Already in "Name <addr>" form - pass through untouched.
  if (address.includes('<')) return address

  const name = process.env.EMAIL_FROM_NAME || 'Whispering Palms'
  return `"${name}" <${address}>`
}

let cachedTransporter: Transporter | null = null
let cachedTransporterKey: string | null = null

function getTransporter(provider: EmailProvider): Transporter {
  const config = resolveSmtpConfig(provider)

  if (!config.host || !config.user || !config.pass) {
    throw new Error(
      `SMTP is not configured for provider "${provider}". ${config.missingHint}`
    )
  }

  // Rebuild only when connection settings actually change.
  const key = `${provider}:${config.host}:${config.port}:${config.secure}:${config.user}`
  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    // Reuse connections across a batch send instead of reconnecting per message.
    pool: true,
    maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || '5', 10),
    maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES || '100', 10),
  })
  cachedTransporterKey = key

  return cachedTransporter
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.')
  }
  return new Resend(apiKey)
}

/**
 * Send one email through the configured provider.
 * Throws on failure so callers can record a per-recipient error.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const provider = getEmailProvider()

  // Resolve the transport first. A missing relay credential is the more urgent
  // failure and must not be masked by a missing EMAIL_FROM.
  const transporter = provider === 'resend' ? null : getTransporter(provider)
  const from = getFromAddress()

  if (provider === 'resend') {
    const { data, error } = await getResendClient().emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    })

    if (error) {
      throw new Error(`Resend API error: ${error.message}`)
    }

    return { messageId: data?.id || '', provider }
  }

  const info = await transporter!.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  })

  return { messageId: info.messageId, provider }
}

/**
 * Open a connection and authenticate without sending anything.
 * Used by scripts/test-email-setup.ts and the health check to prove credentials
 * work before a real signup depends on them.
 */
export async function verifyMailer(): Promise<{ provider: EmailProvider; host?: string }> {
  const provider = getEmailProvider()

  if (provider === 'resend') {
    // Resend has no connection handshake - presence of the key is all we can check.
    getResendClient()
    getFromAddress()
    return { provider }
  }

  const config = resolveSmtpConfig(provider)
  await getTransporter(provider).verify()
  getFromAddress()

  return { provider, host: config.host ?? undefined }
}

/** Non-secret config summary for logs and health endpoints. */
export function getMailerStatus() {
  const provider = getEmailProvider()

  if (provider === 'resend') {
    return {
      provider,
      configured: !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM,
      from: process.env.EMAIL_FROM || null,
    }
  }

  const config = resolveSmtpConfig(provider)
  return {
    provider,
    configured: !!(config.host && config.user && config.pass),
    host: config.host || null,
    port: config.port,
    secure: config.secure,
    user: config.user || null,
    from: process.env.EMAIL_FROM || null,
  }
}

/**
 * Tear down the pooled SMTP connections.
 * Pooled sockets keep the Node event loop alive, so any script that sends mail
 * and then expects to exit on its own must call this.
 */
export async function closeMailer(): Promise<void> {
  if (cachedTransporter) {
    cachedTransporter.close()
    cachedTransporter = null
    cachedTransporterKey = null
  }
}
