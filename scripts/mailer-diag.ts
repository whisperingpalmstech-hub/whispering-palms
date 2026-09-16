/**
 * Run the REAL mailer source under the same env the server sees, and print
 * the resolved transport before attempting a connection.
 */
import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd(), false)

async function main() {
  const m = await import('../lib/services/mailer')
  console.log('status:', JSON.stringify(m.getMailerStatus()))
  try {
    console.log('verify:', JSON.stringify(await m.verifyMailer()))
  } catch (e: any) {
    console.log('verify FAIL:', e.code, (e.message || '').slice(0, 120))
  }
}
main()
