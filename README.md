# Whispering Palms - AI Astrology Platform

Ancient Indian wisdom, modern AI guidance. A personalized astrology and palmistry platform powered by AI.

## 🌟 Features

- **Personalized Astrology Readings**: Get answers based on your birth details and palm analysis
- **Multi-language Support**: English, Hindi, Spanish, French, German
- **Subscription Plans**: Basic, Spark, Flame, SuperFlame with different delivery times
- **Palm Image Analysis**: Upload and analyze palm images for personalized insights
- **Payment Integration**: Stripe, Razorpay (UPI, Net Banking, Cards, Wallets), Bitcoin
- **Email Delivery**: Automated email delivery based on subscription plan
- **Voice Narration**: Flame and SuperFlame plans include voice narration with astrologer avatar

## 🚀 Tech Stack

- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database & Storage**: Supabase (PostgreSQL + Storage buckets)
- **Authentication**: Custom JWT with Supabase
- **Payment**: Stripe + Razorpay + Bitcoin
- **AI/RAG**: AnythingLLM (self-hosted)
- **Vector DB**: Qdrant
- **Email**: Resend / Gmail SMTP
- **TTS**: Voice RSS API
- **Vision**: Google Cloud Vision API

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Vercel account (for deployment)
- Payment gateway accounts (Stripe/Razorpay - optional)

## 🛠️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/Sujgaik2003/whispering-palms.git
cd whispering-palms
```

### 2. Install Dependencies

```bash
npm install
```

### Running locally without Supabase

No Supabase project needed:

```bash
npm run dev:local
```

Authentication and the database are replaced by an in-memory stub. See
[docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) — including why the bypass cannot
activate in production.

### 3. Environment Variables

Create `.env.local` file in root directory:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Email Configuration (Choose ONE)
# The same relay must also be set as Supabase Auth's Custom SMTP, or signup
# confirmation mail falls back to Supabase's ~2/hour built-in sender and new
# users hit "email rate limit exceeded". Full runbook: docs/EMAIL_SETUP.md

# Option A: ZeptoMail (Recommended for Production)
EMAIL_PROVIDER=zeptomail
SMTP_HOST=smtp.zeptomail.com
SMTP_PORT=587
SMTP_USER=emailapikey
SMTP_PASSWORD=your-zeptomail-send-mail-token
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Whispering Palms

# Option B: Any other SMTP relay (SES, Postal, mailcow, ...)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.your-relay.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com

# Option C: Zoho Mail mailbox SMTP (legacy, has a daily send cap)
EMAIL_PROVIDER=zoho
ZOHO_MAIL_USER=noreply@yourdomain.com
ZOHO_MAIL_PASSWORD=your-zoho-mail-password

# Option D: Resend
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# Option E: Gmail SMTP (Testing Only)
EMAIL_PROVIDER=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password

# Text-to-Speech (optional - readings are sent without audio if unset)
# Provider: google, voicerss, or none. Defaults to trying google then voicerss.
TTS_PROVIDER=google
TTS_SPEAKING_RATE=1.0
TTS_PITCH=0.0
TTS_VOICE_GENDER=FEMALE
# Voices come from lib/i18n/registry.ts. A language with no voice gets NO audio -
# it is never spoken in another language.

# Speech-to-Text for voice questions (optional - the mic button hides if unset)
# Provider: whisper, google, or none. Whisper detects the spoken language itself.
STT_PROVIDER=whisper
OPENAI_API_KEY=sk-your-openai-key
# Google STT reuses GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_APPLICATION_CREDENTIALS

# Machine endpoints — REQUIRED in production
# Without CRON_SECRET the email cron refuses to run rather than sitting open.
CRON_SECRET=long-random-string
ADMIN_API_TOKEN=another-long-random-string-16-plus
TELEGRAM_WEBHOOK_SECRET=telegram-webhook-secret

# Email Testing (set to false in production)
EMAIL_TEST_MODE=false


# Email Branding (Optional)
COMPANY_LOGO_URL=https://your-domain.com/logo.png
ASTROLOGER_AVATAR_URL=https://your-domain.com/astrologer-avatar.png

# Payment Gateways (Optional)
# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_BASIC_MONTHLY=price_xxxxx
STRIPE_PRICE_BASIC_YEARLY=price_xxxxx
STRIPE_PRICE_SPARK_MONTHLY=price_xxxxx
STRIPE_PRICE_SPARK_YEARLY=price_xxxxx
STRIPE_PRICE_FLAME_MONTHLY=price_xxxxx
STRIPE_PRICE_FLAME_YEARLY=price_xxxxx
STRIPE_PRICE_SUPERFLAME_MONTHLY=price_xxxxx
STRIPE_PRICE_SUPERFLAME_YEARLY=price_xxxxx

# Razorpay
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=rzp_live_your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Bitcoin (Optional)
BITCOIN_ENABLED=true
BITCOIN_API_URL=https://your-bitcoin-api.com
BITCOIN_API_KEY=your_bitcoin_api_key
BITCOIN_WEBHOOK_SECRET=your_webhook_secret

# AI Services
# AnythingLLM (Required for Q&A)
ANYTHINGLLM_API_URL=https://your-anythingllm-instance.com
ANYTHINGLLM_API_KEY=your_anythingllm_api_key

# Voice TTS (For Flame/SuperFlame plans - Multilingual)
# Primary: Google Cloud TTS (recommended - supports ALL languages)
# Uses same credentials as Vision API - no extra setup needed!
# Supports: Hindi, Arabic, Russian, Chinese, Korean, Japanese, and 70+ more languages
# Free tier: 1 million characters/month (WaveNet) or 4 million (Standard)

# Fallback: Voice RSS TTS (English only)
VOICE_RSS_API_KEY=your_voice_rss_api_key
VOICE_RSS_LANGUAGE=en-us


# Vision API (For Palm Image Analysis)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# LLM Service (For Translations/Additional AI)
# Option 1: OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini

# Option 2: Ollama (Self-hosted)
USE_OLLAMA=true
OLLAMA_API_URL=http://your-ollama-instance.com:11434
OLLAMA_MODEL=llama3.2

# Translation Service (Optional)
TRANSLATION_PROVIDER=llm
LIBRETRANSLATE_API_URL=https://your-libretranslate-instance.com
TRANSLATION_API_KEY=your_translation_api_key

# Quota Configuration (Optional - defaults provided)
# Prices for the paid plans live in lib/config/plans.ts, not here - keep both
# in sync with the plan cards in app/subscription/page.tsx.
BASIC_MAX_QUESTIONS=2
SPARK_MAX_QUESTIONS=6
FLAME_MAX_QUESTIONS=12
# "Unlimited" on Superflame is a generous soft cap, not a literal unbounded
# quota - protects against one account driving unbounded LLM/TTS cost.
SUPERFLAME_MAX_QUESTIONS=60
```

### 4. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your API keys (URL, anon key, service role key)
3. Run database migrations from `supabase/` directory in Supabase SQL Editor
4. Create storage bucket `palm-images` with RLS policies

### 5. Run Development Server

```bash
# Standard development
npm run dev

# With email scheduler (for local email testing)
npm run dev:with-scheduler
```

Visit `http://localhost:3000`

## 📦 Deployment to Vercel

### Branch Strategy

- **`main`** → Production deployment (auto-deploys to production)
- **`whispering-palms-dev`** → Development branch (for testing)

### Steps

1. **Push Code to GitHub**
   ```bash
   git push origin main
   git push origin whispering-palms-dev
   ```

2. **Connect Vercel to GitHub**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import repository: `Sujgaik2003/whispering-palms`
   - Select repository and click "Import"

3. **Configure Vercel Project**
   - Framework Preset: Next.js (auto-detected)
   - Production Branch: `main`
   - Preview Branches: `whispering-palms-dev`

4. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local` (see above)
   - Add to all environments: Production, Preview, Development

5. **Deploy**
   - Vercel will automatically deploy on push to `main`
   - Preview deployments created for `whispering-palms-dev` branch

### Cron Job Configuration

### Email Cron Job Setup

**Important**: Vercel Hobby plan only allows cron jobs to run once per day. For 5-minute email delivery, you need to use an external cron service.

#### Option 1: External Cron Service (Recommended for Hobby Plan)

Use a free external cron service to hit your email endpoint every minute:

1. **Sign up for cron-job.org** (free): https://cron-job.org
2. **Create a new cron job**:
   - **URL**: `https://your-app.vercel.app/api/email/cron`
   - **Schedule**: Every minute (`*/1 * * * *`)
   - **Request Method**: GET
   - **Status**: Active
3. **Save the cron job**

**Alternative Services**:
- **EasyCron**: https://www.easycron.com (free tier available)
- **UptimeRobot**: https://uptimerobot.com (free tier: 5-minute intervals)

#### Option 2: Vercel Pro Plan

If you upgrade to Vercel Pro ($20/month), you can use the built-in cron job:

```json
{
  "crons": [
    {
      "path": "/api/email/cron",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

**Current `vercel.json`** (set to daily for Hobby plan compatibility):
```json
{
  "crons": [
    {
      "path": "/api/email/cron",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Note**: The daily cron in `vercel.json` is a fallback. For proper email delivery, use an external cron service (Option 1) or upgrade to Pro (Option 2).

### Webhook Configuration

#### Stripe Webhook
- Endpoint: `https://your-app.vercel.app/api/payments/webhook/stripe`
- Events: `checkout.session.completed`, `payment_intent.succeeded`

#### Razorpay Webhook
- Endpoint: `https://your-app.vercel.app/api/payments/webhook/razorpay`
- Events: `payment.captured`, `payment.failed`

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── dashboard/        # Dashboard page
│   ├── chat/             # Chat/Q&A page
│   ├── subscription/     # Subscription page
│   └── ...
├── lib/                   # Utility functions
│   ├── services/           # Business logic services
│   ├── supabase/        # Supabase client setup
│   └── utils/           # Helper functions
├── types/                 # TypeScript type definitions
├── public/                # Static assets
├── scripts/               # Utility scripts
└── vercel.json           # Vercel configuration
```

## 🔑 Key Features

### Subscription Plans

- **Basic**: 2 questions/day, 24-hour email delivery
- **Spark**: 5 questions/day, 1-hour email delivery
- **Flame**: 8 questions/day, 5-minute email delivery, voice narration
- **SuperFlame**: Unlimited questions, 5-minute email delivery, voice narration

### Email Delivery

- **Flame/SuperFlame**: 5 minutes
- **Spark**: 1 hour
- **Basic**: 24 hours

Emails are automatically scheduled and sent via cron job.

### Payment Methods

- **Stripe**: Card payments
- **Razorpay**: UPI, Net Banking, Cards, Wallets (INR only)
- **Bitcoin**: Cryptocurrency payments

### Internationalization (i18n)

Supported languages (UI + Voice Narration):
- 🇺🇸 English
- 🇮🇳 Hindi (हिंदी)
- 🇸🇦 Arabic (العربية)
- 🇷🇺 Russian (Русский)
- 🇨🇳 Chinese (中文)
- 🇰🇷 Korean (한국어)
- 🇯🇵 Japanese (日本語)
- 🇪🇸 Spanish (Español)
- 🇫🇷 French (Français)
- 🇩🇪 German (Deutsch)
- 🇮🇹 Italian (Italiano)
- 🇧🇷 Portuguese (Português)

Language switcher available in header.

## 🧪 Testing

```bash
# Test Supabase connection
npm run test:supabase

# Test email cron job
npm run email:cron

# Type checking
npm run type-check
```

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run dev:with-scheduler` - Dev server with email scheduler
- `npm run email:cron` - Test email cron endpoint
- `npm run email:scheduler` - Start email scheduler (local)

## 🔒 Security

- Environment variables stored in Vercel (never commit `.env.local`)
- Supabase Row Level Security (RLS) enabled
- JWT authentication for API routes
- HTTPS enforced (automatic with Vercel)
- Webhook signature verification

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset

### Questions
- `POST /api/questions/answer` - Submit question and get answer
- `GET /api/questions` - Get user's questions

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/webhook/stripe` - Stripe webhook
- `POST /api/payments/webhook/razorpay` - Razorpay webhook

### Email
- `GET /api/email/test-env` - Test email configuration
- `GET /api/email/cron` - Cron job for email delivery

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel
- Verify all required environment variables are set
- Ensure Node.js version is compatible

### Email Not Sending
- Verify email provider credentials
- Check `EMAIL_TEST_MODE` setting
- Review cron job logs
- Test email endpoint: `/api/email/test-env`

### Payment Issues
- Verify payment gateway keys
- Check webhook endpoints are accessible
- Review payment logs in Stripe/Razorpay dashboards

### Cron Job Not Running
- Verify Vercel Pro plan (required for cron jobs)
- Check `vercel.json` configuration
- Review cron execution logs

## 📄 License

ISC

## 👥 Contributing

1. Create a feature branch from `whispering-palms-dev`
2. Make your changes
3. Test thoroughly
4. Submit a pull request to `whispering-palms-dev`

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, Supabase, and AI**
