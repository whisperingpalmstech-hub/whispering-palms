import { Resend } from 'resend'
import nodemailer from 'nodemailer'

type EmailProvider = 'resend' | 'zoho' | 'gmail'

export function getEmailProvider(): EmailProvider {
    const provider = process.env.EMAIL_PROVIDER?.toLowerCase()
    if (provider === 'gmail' || provider === 'smtp') {
        return 'gmail'
    }
    if (provider === 'zoho' || provider === 'zohomail') {
        return 'zoho'
    }
    return 'zoho' // Default to Zoho for professional emails
}

export function getResendClient() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        throw new Error('RESEND_API_KEY is not configured')
    }
    return new Resend(apiKey)
}

export function getZohoTransporter() {
    const zohoUser = process.env.ZOHO_MAIL_USER
    const zohoPassword = process.env.ZOHO_MAIL_PASSWORD
    const zohoHost = process.env.ZOHO_MAIL_HOST || 'smtp.zoho.com'

    if (!zohoUser || !zohoPassword) {
        throw new Error('Zoho Mail SMTP not configured')
    }

    return nodemailer.createTransport({
        host: zohoHost,
        port: 465,
        secure: true,
        auth: {
            user: zohoUser,
            pass: zohoPassword,
        },
        // Adding keepalive and timeout to prevent connection drops
        pool: true,
        maxConnections: 1,
        rateDelta: 1000,
        rateLimit: 1
    })
}

export function getGmailTransporter() {
    const gmailUser = process.env.GMAIL_USER
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

    if (!gmailUser || !gmailAppPassword) {
        throw new Error('Gmail SMTP not configured')
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
    })
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
    const provider = getEmailProvider()

    if (provider === 'zoho') {
        const transporter = getZohoTransporter()
        await transporter.sendMail({
            from: `"Whispering Palms" <${process.env.ZOHO_MAIL_USER}>`,
            to,
            subject,
            html,
        })
    } else if (provider === 'gmail') {
        const transporter = getGmailTransporter()
        await transporter.sendMail({
            from: `"Whispering Palms" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        })
    } else {
        const resend = getResendClient()
        const { error } = await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to,
            subject,
            html,
        })
        if (error) throw new Error(`Failed to send email: ${error.message}`)
    }
}
