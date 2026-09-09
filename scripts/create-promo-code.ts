import { randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_DISCOUNTS = [25, 50, 75, 100]

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {}
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (match) args[match[1]] = match[2]
  }
  return args
}

function generateCode(prefix: string): string {
  const suffix = randomBytes(4).toString('hex').toUpperCase().slice(0, 6)
  return `${prefix}-${suffix}`
}

function usage(): never {
  console.log(`
Usage:
  Shared campaign code (one code, N total redemptions, one per account):
    npx tsx scripts/create-promo-code.ts --type=shared --discount=50 --code=SUMMER2026 [--max-redemptions=100] [--tiers=foundation,visa_ready] [--expires=2026-12-31] [--note="Summer campaign"]

  Single personal code (only the named email can redeem it):
    npx tsx scripts/create-promo-code.ts --type=personal --discount=100 --email=someone@example.com [--code=CUSTOM-CODE] [--tiers=foundation] [--expires=2026-12-31]

  Bulk personal codes (one per line in a text file of emails):
    npx tsx scripts/create-promo-code.ts --type=personal --discount=100 --emails-file=./emails.txt [--tiers=foundation]
`)
  process.exit(1)
}

async function insertCode(row: {
  code: string
  code_type: 'shared' | 'personal'
  assigned_email: string | null
  discount_percent: number
  applicable_tiers: string[] | null
  max_redemptions: number | null
  expires_at: string | null
  note: string | null
}) {
  const { error } = await supabase.from('promo_codes').insert(row)
  if (error) {
    console.error(`✗ ${row.code}: ${error.message}`)
    return false
  }
  console.log(`✓ ${row.code}${row.assigned_email ? ` -> ${row.assigned_email}` : ''} (${row.discount_percent}% off)`)
  return true
}

async function run() {
  const args = parseArgs()

  const type = args.type
  const discount = Number(args.discount)
  if (type !== 'shared' && type !== 'personal') usage()
  if (!VALID_DISCOUNTS.includes(discount)) {
    console.error(`--discount must be one of ${VALID_DISCOUNTS.join(', ')}`)
    usage()
  }

  const applicableTiers = args.tiers ? args.tiers.split(',').map((t) => t.trim()) : null
  const expiresAt = args.expires ? new Date(args.expires).toISOString() : null
  const note = args.note ?? null

  if (type === 'shared') {
    if (!args.code) {
      console.error('--code is required for a shared code')
      usage()
    }
    await insertCode({
      code: args.code.trim().toUpperCase(),
      code_type: 'shared',
      assigned_email: null,
      discount_percent: discount,
      applicable_tiers: applicableTiers,
      max_redemptions: args['max-redemptions'] ? Number(args['max-redemptions']) : null,
      expires_at: expiresAt,
      note,
    })
    return
  }

  // personal
  if (args['emails-file']) {
    const emails = readFileSync(path.resolve(args['emails-file']), 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    console.log(`Generating ${emails.length} personal codes...\n`)
    for (const email of emails) {
      await insertCode({
        code: generateCode('E2GO'),
        code_type: 'personal',
        assigned_email: email.toLowerCase(),
        discount_percent: discount,
        applicable_tiers: applicableTiers,
        max_redemptions: null,
        expires_at: expiresAt,
        note,
      })
    }
    return
  }

  if (!args.email) {
    console.error('--email or --emails-file is required for a personal code')
    usage()
  }

  await insertCode({
    code: (args.code ?? generateCode('E2GO')).trim().toUpperCase(),
    code_type: 'personal',
    assigned_email: args.email.toLowerCase(),
    discount_percent: discount,
    applicable_tiers: applicableTiers,
    max_redemptions: null,
    expires_at: expiresAt,
    note,
  })
}

run().catch(console.error)
