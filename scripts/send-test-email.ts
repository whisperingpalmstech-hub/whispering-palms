/**
 * Send one real reading email, to prove delivery end to end.
 *
 *   npx tsx scripts/send-test-email.ts you@example.com
 *
 * Uses the same mailer the cron uses, so a pass here means the cron path
 * works too. Refuses to run without real credentials rather than pretending.
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// env.local holds the real credentials (.env.local is the local stub).
config({ path: resolve(process.cwd(), 'env.local') })

async function main() {
  const to = process.argv[2]
  if (!to) {
    console.error('usage: npx tsx scripts/send-test-email.ts <recipient>')
    process.exit(1)
  }

  const { getMailerStatus, sendMail } = await import('../lib/services/mailer')
  const { generateAnswerEmail } = await import('../lib/services/email')

  const status = getMailerStatus()
  console.log('provider :', status.provider)
  console.log('configured:', status.configured)
  if (!status.configured) {
    console.error('NOT CONFIGURED —', (status as any).hint || 'missing credentials')
    process.exit(1)
  }

  const html = generateAnswerEmail({
    userName: 'Dhruv',
    userEmail: to,
    question: 'What does my palm say about the year ahead?',
    answer:
      'Your heart line runs long and clear, which speaks of steady, ' +
      'openhearted attachments rather than sudden ones. The head line ' +
      'stays close beside it, so feeling and judgement tend to move ' +
      'together for you. Around the thumb, the life line arcs wide and ' +
      'deep — energy is not your shortage this year. Direction is. ' +
      '(This is a delivery test from Whispering Palms.)',
    planType: 'basic',
    questionId: 'test-question',
    answerId: 'test-answer',
  })

  console.log(`sending to ${to} ...`)
  const t0 = Date.now()
  await sendMail({
    to,
    subject: 'Your Personal Reading from Whispering Palms (test)',
    html,
  })
  console.log(`SENT in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main().catch((e) => {
  console.error('FAILED:', e?.message || e)
  process.exit(1)
})
