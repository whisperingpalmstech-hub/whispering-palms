# Deploying Whispering Palms to Vercel

## Why the current repo may not be importable

The repo lives at `whisperingpalmstech-hub/whispering-palms`, where this
account has **push but not admin**. Vercel's GitHub App must be installed on
the repository **owner** to import a project, and installing a GitHub App is
an owner/admin action. If you are not an owner of that org, Vercel will not
list the repo no matter what you click on the Vercel side.

Three ways out, cheapest first:

| Option | What it needs | Trade-off |
|---|---|---|
| **A. Org owner installs the Vercel App** | someone with org-owner rights, once | keeps one canonical repo |
| **B. Mirror to a repo you own** | nothing from anyone else | two remotes to keep in sync, or you switch over |
| **C. Deploy from the CLI** | `vercel login` on this machine | no auto-deploy on push until a repo is linked |

Option B is the script below. Option C is useful to get production live
*today* while the repo question is settled separately.

---

## Option B — mirror to your own GitHub

```bash
bash scripts/mirror-to-new-remote.sh adminforhtt/whispering-palms --private
```

Adds a second remote called `newremote`; `origin` is untouched and nothing is
rewritten. Then import at <https://vercel.com/new>.

To make the new repo the default afterwards:

```bash
git remote rename origin oldorigin
git remote rename newremote origin
```

---

## Option C — deploy straight from this machine

```bash
npx vercel login       # interactive, needs you
npx vercel link        # creates the project
npx vercel --prod      # deploys
```

---

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables. Values live
in `env.local` / `.env.production.local` locally; do not paste secrets into
chat or commit them.

### Required — the app will not work without these

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public key, safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** — bypasses RLS, never expose |
| `NEXT_PUBLIC_APP_URL` | `https://www.whispering-palms.org` — used to build email + checkout redirect links |
| `ANYTHINGLLM_API_URL` | `https://anythingllm.whispering-palms.org` |
| `ANYTHINGLLM_API_KEY` | |
| `DEEPSEEK_API_KEY` | powers readings **and** palm photo analysis |
| `CRON_SECRET` | authenticates the email cron |

### Payments (Stripe)

| Variable | Notes |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…`, must match the same account |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the **live** endpoint (below) |

### Email (Zoho)

| Variable | Notes |
|---|---|
| `EMAIL_PROVIDER` | `zoho` |
| `ZOHO_MAIL_HOST` | `smtp.zoho.eu` — region matters, `.com` will not authenticate an EU mailbox |
| `ZOHO_MAIL_USER` / `ZOHO_MAIL_PASSWORD` | |
| `EMAIL_FROM` | verified sender address |
| `SMTP_PORT` | `465` for implicit TLS, or `587` for STARTTLS. **TLS mode follows the port** — a mismatch produces a misleading "SSL wrong version number" |

### Optional

| Variable | Effect if unset |
|---|---|
| `OPENAI_API_KEY` | unused in v1 (image generation was removed) |
| `OPENROUTER_API_KEY` | fallback vision provider; DeepSeek is used when present |
| `TELEGRAM_BOT_TOKEN` | Telegram funnel disabled |
| `BASIC/SPARK/FLAME/SUPERFLAME_MAX_QUESTIONS` | defaults 2 / 6 / 12 / unlimited |

---

## After the first deploy

1. **Stripe live catalog** — the live account has no products yet:

   ```bash
   python3 scripts/stripe_catalog.py /path/to/live-key.txt --coupon
   ```

   Idempotent: products match on `metadata[plan]`, prices on `lookup_key`, so
   re-running never duplicates. Creates `FREEMONTH` too.

2. **Live webhook endpoint** — Stripe → Developers → Webhooks → add
   `https://www.whispering-palms.org/api/payments/webhook/stripe`, events:

   ```
   checkout.session.completed
   customer.subscription.updated
   customer.subscription.deleted
   invoice.payment_failed
   ```

   Copy the signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.

3. **Enable the Customer Portal** (Stripe → Settings → Billing) so users can
   cancel without emailing support.

4. **Verify**, do not assume:

   ```bash
   curl -s https://www.whispering-palms.org/api/health
   ```

   Expect `200` with `database.ok: true`. A `404` means the old build is still
   being served.

5. **Cron**: `vercel.json` schedules the reading emails. Confirm the job
   appears under Project → Settings → Cron Jobs after deploy.

---

## Known launch gaps

- **Rotate the Stripe keys** before going live if they have ever been pasted
  into a chat, a ticket, or a shared doc.
- The live Stripe account is **GB/GBP** while prices are **USD**. Stripe
  converts, but changing currency after customers subscribe is messy — decide
  first.
- Astrology claims are LLM-generated; there is no ephemeris engine. Palm
  findings come from a real vision analysis of the user's photo.
