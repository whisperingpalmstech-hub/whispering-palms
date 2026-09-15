/**
 * Build guard: refuse to build for production with the dev auth bypass enabled.
 *
 * lib/dev/enabled.ts already refuses to activate when NODE_ENV is production or
 * VERCEL_ENV is set, so this is defence in depth rather than the only line. It
 * exists because a build that even *carries* the flag is a mistake worth
 * catching at the point it happens, not at runtime in front of users.
 *
 * Wired into `npm run build`.
 */

const flags = {
  DEV_AUTH_BYPASS: process.env.DEV_AUTH_BYPASS,
  NEXT_PUBLIC_DEV_AUTH_BYPASS: process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS,
}

const set = Object.entries(flags).filter(([, v]) => v === 'true')

if (set.length === 0) {
  console.log('✅ Dev auth bypass is not set.')
  process.exit(0)
}

// A local `next build` for testing is legitimate; a deployment is not.
const isDeployment = !!process.env.VERCEL || !!process.env.VERCEL_ENV || !!process.env.CI

if (!isDeployment) {
  console.warn('')
  console.warn('⚠️  Building with the dev auth bypass set:')
  for (const [name] of set) console.warn(`     ${name}=true`)
  console.warn('')
  console.warn('   The bypass refuses to activate at runtime when NODE_ENV is')
  console.warn('   production, so this build is inert. Unset the flags before')
  console.warn('   producing anything you intend to deploy.')
  console.warn('')
  process.exit(0)
}

console.error('')
console.error('❌ REFUSING TO BUILD')
console.error('')
console.error('   The dev auth bypass is enabled in a deployment build:')
for (const [name] of set) console.error(`     ${name}=true`)
console.error('')
console.error('   This flag disables authentication entirely. Remove it from the')
console.error('   deployment environment and build again.')
console.error('')
process.exit(1)
