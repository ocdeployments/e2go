import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia' as const,
})

// One reusable Coupon per discount tier the promo system supports. Applied to
// a Checkout Session via `discounts: [{ coupon }]` — see src/lib/promo-codes.ts.
// duration: 'once' since every tier here is a one-time payment, never a
// subscription.
const PERCENTAGES = [25, 50, 75, 100] as const

async function run() {
  console.log('Creating promo-code Stripe Coupons...\n')

  const results: { percent: number; coupon_id: string }[] = []

  for (const percent of PERCENTAGES) {
    const coupon = await stripe.coupons.create({
      percent_off: percent,
      duration: 'once',
      name: `e2go Promo — ${percent}% off`,
      metadata: { discount_percent: String(percent) },
    })

    console.log(`✓ ${percent}% off  ${coupon.id}`)
    results.push({ percent, coupon_id: coupon.id })
  }

  console.log('\n─────────────────────────────────────────────────')
  console.log('Add these to .env.local (back up the file first — see')
  console.log('feedback_env_local_safety) and to Vercel Production + Preview:\n')
  for (const r of results) {
    console.log(`STRIPE_COUPON_${r.percent}=${r.coupon_id}`)
  }
  console.log('─────────────────────────────────────────────────')
}

run().catch(console.error)
