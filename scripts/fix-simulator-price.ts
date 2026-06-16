import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
})

async function fix() {
  console.log('Creating correct simulator additional-sessions price at $29.99...\n')

  const product = await stripe.products.create({
    name: 'e2go — Interview Simulator Additional Sessions',
    metadata: { tier_id: 'simulator_3pack' },
  })

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 2999,
    currency: 'usd',
    tax_behavior: 'exclusive',
    metadata: { tier_id: 'simulator_3pack' },
  })

  console.log(`✓ Stripe price created: ${price.id}  ($29.99)\n`)
  console.log('─────────────────────────────────────────────────')
  console.log('STEP 1 — Update .env.local:')
  console.log(`  Replace STRIPE_PRICE_SIMULATOR_3PACK with:\n  STRIPE_PRICE_SIMULATOR_3PACK=${price.id}\n`)
  console.log('STEP 2 — Run in Supabase SQL Editor:')
  console.log(`  UPDATE pricing`)
  console.log(`    SET stripe_price_id = '${price.id}', amount_cents = 2999`)
  console.log(`    WHERE tier_id = 'simulator_3pack';\n`)
  console.log('STEP 3 — Update Vercel env var STRIPE_PRICE_SIMULATOR_3PACK with the same value.')
  console.log('STEP 4 — Refund the $197 test charge in your Stripe dashboard.')
  console.log('─────────────────────────────────────────────────')
}

fix().catch(console.error)
