import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any
})

const tiers = [
  { id: 'solo_none', name: 'e2go — Solo Individual', amount: 55000 },
  { id: 'solo_spouse', name: 'e2go — Solo + Spouse', amount: 69700 },
  { id: 'solo_family_small', name: 'e2go — Solo + Family (up to 2 kids)', amount: 75000 },
  { id: 'solo_family_large', name: 'e2go — Solo + Family (3-5 kids)', amount: 79700 },
  { id: 'partnership_none', name: 'e2go — Partnership', amount: 99700 },
  { id: 'partnership_couples', name: 'e2go — Partnership Two Couples', amount: 129700 },
  { id: 'partnership_families', name: 'e2go — Partnership Two Families', amount: 139700 },
  { id: 'simulator_3pack', name: 'e2go — Interview Simulator 3 Sessions', amount: 19700 },
  { id: 'renewal', name: 'e2go — Renewal Package', amount: 49700 },
  { id: 'child_surcharge', name: 'e2go — Additional Child', amount: 5000 },
]

async function setup() {
  console.log('Creating Stripe products and prices...\n')
  const priceIds: Record<string, string> = {}

  for (const tier of tiers) {
    const product = await stripe.products.create({
      name: tier.name,
      metadata: { tier_id: tier.id }
    })
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.amount,
      currency: 'usd',
      tax_behavior: 'exclusive',
      metadata: { tier_id: tier.id }
    })
    priceIds[tier.id] = price.id
    console.log(`✓ ${tier.name}: ${price.id}`)
  }

  const envLines = `
STRIPE_PRICE_SOLO=${priceIds['solo_none']}
STRIPE_PRICE_SOLO_SPOUSE=${priceIds['solo_spouse']}
STRIPE_PRICE_SOLO_FAMILY_2=${priceIds['solo_family_small']}
STRIPE_PRICE_SOLO_FAMILY_5=${priceIds['solo_family_large']}
STRIPE_PRICE_PARTNERSHIP=${priceIds['partnership_none']}
STRIPE_PRICE_PARTNERSHIP_COUPLES=${priceIds['partnership_couples']}
STRIPE_PRICE_PARTNERSHIP_FAMILIES=${priceIds['partnership_families']}
STRIPE_PRICE_SIMULATOR_3PACK=${priceIds['simulator_3pack']}
STRIPE_PRICE_RENEWAL=${priceIds['renewal']}
STRIPE_PRICE_CHILD_SURCHARGE=${priceIds['child_surcharge']}`

  fs.appendFileSync(path.join(__dirname, '../.env.local'), envLines)
  console.log('\n✓ Price IDs written to .env.local')
  console.log('\nSQL to update Supabase pricing table:')
  console.log(`
UPDATE pricing SET stripe_price_id = '${priceIds['solo_none']}' WHERE tier_id = 'solo_none';
UPDATE pricing SET stripe_price_id = '${priceIds['solo_spouse']}' WHERE tier_id = 'solo_spouse';
UPDATE pricing SET stripe_price_id = '${priceIds['solo_family_small']}' WHERE tier_id = 'solo_family_small';
UPDATE pricing SET stripe_price_id = '${priceIds['solo_family_large']}' WHERE tier_id = 'solo_family_large';
UPDATE pricing SET stripe_price_id = '${priceIds['partnership_none']}' WHERE tier_id = 'partnership_none';
UPDATE pricing SET stripe_price_id = '${priceIds['partnership_couples']}' WHERE tier_id = 'partnership_couples';
UPDATE pricing SET stripe_price_id = '${priceIds['partnership_families']}' WHERE tier_id = 'partnership_families';
UPDATE pricing SET stripe_price_id = '${priceIds['simulator_3pack']}' WHERE tier_id = 'simulator_3pack';
UPDATE pricing SET stripe_price_id = '${priceIds['renewal']}' WHERE tier_id = 'renewal';
INSERT INTO pricing (tier_id, name, amount_cents, stripe_price_id, active) VALUES ('child_surcharge', 'Additional Child', 5000, '${priceIds['child_surcharge']}', true);
  `)
}

setup().catch(console.error)
