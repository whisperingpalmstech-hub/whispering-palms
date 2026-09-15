/**
 * Email Scheduler Background Service
 * Automatically checks and sends pending emails every minute
 * Run this alongside your dev server: npm run dev:scheduler
 */

// Module scope (see email-cron-test.ts): keeps top-level consts out of the
// shared global scope that tsc checks across all scripts.
export {}

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

let isRunning = false
let checkCount = 0

async function checkAndSendEmails() {
  try {
    checkCount++
    const response = await fetch(`${API_URL}/api/email/cron`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (response.ok) {
      const result = await response.json()
      const sent = result.data?.sent || 0
      if (sent > 0) {
        console.log(`📧 [${new Date().toLocaleTimeString()}] Sent ${sent} email(s) automatically`)
      } else {
        // Only log every 5 checks to reduce noise
        if (checkCount % 5 === 0) {
          console.log(`⏰ [${new Date().toLocaleTimeString()}] Email scheduler running... (checked ${checkCount} times)`)
        }
      }
    } else {
      console.error(`❌ [${new Date().toLocaleTimeString()}] Failed to check emails:`, response.status)
    }
  } catch (error) {
    // Only log non-timeout errors
    if (error instanceof Error && !error.name.includes('Timeout') && !error.message.includes('ECONNREFUSED')) {
      console.error(`❌ [${new Date().toLocaleTimeString()}] Error:`, error.message)
    }
  }
}

// Start the scheduler
console.log('🚀 Starting automatic email scheduler...')
console.log(`📡 Checking: ${API_URL}/api/email/cron`)
console.log('⏰ Will check for pending emails every minute')
console.log('💡 Press Ctrl+C to stop\n')

isRunning = true

// Run immediately
checkAndSendEmails()

// Then run every minute
const interval = setInterval(() => {
  checkAndSendEmails()
}, 60 * 1000) // Every 60 seconds

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping email scheduler...')
  clearInterval(interval)
  isRunning = false
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping email scheduler...')
  clearInterval(interval)
  isRunning = false
  process.exit(0)
})
