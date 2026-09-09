import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia' as const,
})

interface TierSpec {
  tier_id: string
  name: string
  unit_amount: number // cents
}

const TIERS: TierSpec[] = [
  { tier_id: 'foundation', name: 'e2go — Foundation', unit_amount: 99000 },
  { tier_id: 'investor_ready', name: 'e2go — Investor Ready Add-on', unit_amount: 39000 },
  { tier_id: 'interview_prep', name: 'e2go — Interview Ready', unit_amount: 29000 },
  { tier_id: 'visa_ready', name: 'e2go — Visa Ready', unit_amount: 149000 },
  { tier_id: 'loyalty_upgrade', name: 'e2go — Loyalty Upgrade', unit_amount: 50000 },
  { tier_id: 'fdd_analysis_addon', name: 'e2go — Additional FDD Analysis', unit_amount: 9000 },
  { tier_id: 'market_analysis_addon', name: 'e2go — Additional Market Analysis', unit_amount: 9000 },
  { tier_id: 'fdd_market_bundle_addon', name: 'e2go — FDD + Market Analysis Bundle', unit_amount: 15000 },
  { tier_id: 'simulator_3pack', name: 'e2go — Interview Simulator Additional Sessions', unit_amount: 2999 },
]

async function run() {
  console.log('Creating Stage 2 Stripe Products/Prices on the new US account...\n')

  const results: { tier_id: string; price_id: string; amount: number }[] = []

  for (const tier of TIERS) {
    const product = await stripe.products.create({
      name: tier.name,
      metadata: { tier_id: tier.tier_id },
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.unit_amount,
      currency: 'usd',
      tax_behavior: 'exclusive',
      metadata: { tier_id: tier.tier_id },
    })

    console.log(`✓ ${tier.tier_id.padEnd(26)} ${price.id}  ($${(tier.unit_amount / 100).toFixed(2)})`)
    results.push({ tier_id: tier.tier_id, price_id: price.id, amount: tier.unit_amount })
  }

  console.log('\n─────────────────────────────────────────────────')
  console.log('STEP 1 — Replace these vars in .env.local (remove old STRIPE_PRICE_* vars for the old account):\n')
  for (const r of results) {
    console.log(`STRIPE_PRICE_${r.tier_id.toUpperCase()}=${r.price_id}`)
  }

  console.log('\nSTEP 2 — Run in Supabase SQL Editor (deactivates old tiers, inserts new ones):\n')
  console.log(`  UPDATE pricing SET active = false WHERE tier_id IN ('complete', 'complete_partnership');\n`)
  for (const r of results) {
    console.log(`  INSERT INTO pricing (tier_id, name, amount, stripe_price_id, active)`)
    console.log(`    VALUES ('${r.tier_id}', '${TIERS.find(t => t.tier_id === r.tier_id)!.name}', ${r.amount}, '${r.price_id}', true)`)
    console.log(`    ON CONFLICT (tier_id) DO UPDATE SET amount = EXCLUDED.amount, stripe_price_id = EXCLUDED.stripe_price_id, active = true;\n`)
  }

  console.log('STEP 3 — Update the same STRIPE_PRICE_* vars in Vercel env (Production + Preview).')
  console.log('STEP 4 — foundation_partnership and interview_prep_partnership Price objects were NOT created —')
  console.log('         their dollar amounts still need to be confirmed before creating those SKUs.')
  console.log('─────────────────────────────────────────────────')
}

run().catch(console.error)
