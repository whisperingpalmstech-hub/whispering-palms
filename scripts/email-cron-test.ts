/**
 * Email Cron Test Script
 * Run this script to manually trigger the email cron endpoint
 * Usage: npm run email:cron or tsx scripts/email-cron-test.ts
 */

// This file is type-checked alongside the app (see tsconfig include), so it
// must be a module — otherwise its top-level consts collide with the other
// scripts' globals.
export {}

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function triggerEmailCron() {
  try {
    console.log('📧 Triggering email cron endpoint...')
    const response = await fetch(`${API_URL}/api/email/cron`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Email cron executed successfully')
      console.log(`   Sent: ${result.data?.sent || 0} email(s)`)
      if (result.data?.errors && result.data.errors.length > 0) {
        console.log('   Errors:', result.data.errors)
      }
    } else {
      console.error('❌ Email cron failed:', result)
    }
  } catch (error) {
    console.error('❌ Error triggering email cron:', error)
  }
}

// Run immediately
triggerEmailCron()

// For continuous testing, uncomment below to run every minute
// setInterval(triggerEmailCron, 60 * 1000)
// console.log('⏰ Email cron will run every minute. Press Ctrl+C to stop.')
