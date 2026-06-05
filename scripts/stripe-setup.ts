import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any
})

const tiers = [
  { id: 'solo_none',            name: 'e2go — Solo Individual',               amount: 29700 },
  { id: 'solo_spouse',          name: 'e2go — Solo + Spouse',                 amount: 34700 },
  { id: 'solo_family_small',    name: 'e2go — Solo + Family (up to 2 kids)',  amount: 39700 },
  { id: 'solo_family_large',    name: 'e2go — Solo + Family (3-5 kids)',      amount: 44700 },
  { id: 'partnership_none',     name: 'e2go — Partnership',                   amount: 49700 },
  { id: 'partnership_couples',  name: 'e2go — Partnership Two Couples',       amount: 54700 },
  { id: 'partnership_families', name: 'e2go — Partnership Two Full Families', amount: 64700 },
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
STRIPE_PRICE_PARTNERSHIP_FAMILIES=${priceIds['partnership_families']}`

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
  `)
}

setup().catch(console.error)
