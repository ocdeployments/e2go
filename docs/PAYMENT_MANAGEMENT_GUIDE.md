# e2go Payment Management Guide
## How to manage prices, products, and payments
**Written for:** Romy (and anyone else who needs to manage payments)
**Assumes:** No technical knowledge whatsoever
**Last updated:** June 5, 2026

---

## BEFORE YOU START — Important things to know

### What is Stripe?
Stripe is the company that handles all money in e2go. When a customer pays, the money goes to Stripe first, then Stripe sends it to your bank account. Think of Stripe as the cash register for e2go.

### What are Price IDs?
Every price in Stripe has a unique code called a Price ID. It looks like this: `price_1ABC123defgh`. This code is how the app knows how much to charge. You cannot change a Price ID — but you can create a new one and swap it in.

### Two places to log in
You will need access to two websites:
1. **Stripe Dashboard** → https://dashboard.stripe.com
   This is where your money lives and where you manage products and prices.
2. **Vercel Dashboard** → https://vercel.com
   This is where your app lives. Think of it as the building your app runs in.

### Your safe list of Price IDs
Keep this somewhere safe (a password manager, a secure note, printed paper in a drawer):
```
Run this command in Terminal to see your current Price IDs:
grep STRIPE_PRICE ~/E2-go/.env.local
```
Write them down. If you ever lose them, you can always find them in your Stripe Dashboard under Products.

---

## PART 1 — How to change a price

### Example: You want to change Solo Individual from $297 to $350

**Why you cannot just edit the old price:**
Stripe does not allow changing a price once it is created. This is like how you cannot change a receipt after it has been printed. Instead you create a new price and retire the old one.

**Step 1 — Go to your Stripe Dashboard**
1. Open your browser
2. Go to https://dashboard.stripe.com
3. Log in with your email and password

**Step 2 — Find the product you want to change**
1. In the left sidebar, click **Product catalog**
2. Find "e2go — Solo Individual" in the list
3. Click on it to open it

**Step 3 — Add a new price**
1. You will see a section called **Pricing**
2. Click the button that says **Add another price**
3. Type in the new amount — for $350 type `350`
4. Make sure it says **One time** (not recurring)
5. Make sure currency says **USD**
6. Click **Save price**

**Step 4 — Copy the new Price ID**
1. After saving, you will see the new price in the list
2. Next to it you will see a code starting with `price_`
3. Click the little copy icon next to it
4. Paste it somewhere temporarily (like a notes app)
   It will look like: `price_1NewABC123xyz`

**Step 5 — Archive the old price**
1. Find the old price in the same list (the $297 one)
2. Click the three dots `...` next to it
3. Click **Archive price**
4. Confirm — this hides it from new customers but keeps old payment records safe

**Step 6 — Update the app**
This is where the app learns about the new price.
Go to your Supabase database (https://supabase.com → your project → Table Editor → pricing table) and find the row for `solo_none`. Update the `stripe_price_id` column with your new Price ID and update the `amount` column to `35000` (Stripe uses cents — so $350 = 35000).

That is it. The new price is now live. No redeployment needed.

---

## PART 2 — How to add a completely new product or tier

### Example: You want to add a new "VIP Package" at $997

**Step 1 — Create the product in Stripe**
1. Go to https://dashboard.stripe.com
2. Click **Product catalog** in the left sidebar
3. Click the **Add product** button (top right)
4. Fill in:
   - **Name:** e2go — VIP Package
   - **Price:** 997
   - **Billing period:** One time
   - **Currency:** USD
5. Click **Save product**
6. Copy the Price ID that appears

**Step 2 — Add it to the database**
Go to Supabase → Table Editor → pricing table → Insert row:
- tier_id: `vip`
- name: `VIP Package`
- amount: `99700`
- stripe_price_id: (paste the Price ID you copied)
- active: `true`

**Step 3 — Tell your developer**
The pricing page and checkout flow need to be updated to show this new tier. This part requires a developer (or Claude Code). Show them this guide and tell them the tier_id is `vip`.

---

## PART 3 — How to give someone a refund

### Full refund

**Step 1 — Find the payment in Stripe**
1. Go to https://dashboard.stripe.com
2. Click **Payments** in the left sidebar
3. Find the customer's payment (search by email or amount)
4. Click on the payment to open it

**Step 2 — Issue the refund**
1. Click the **Refund** button (top right of the payment page)
2. Choose **Full refund**
3. Add a reason if you want (optional)
4. Click **Refund**

The money goes back to the customer's card within 5–10 business days. Stripe sends them an email automatically.

### Partial refund
Same steps as above, but in Step 2 choose **Partial refund** and type in the amount you want to refund.

**Important:** Remember the 14-day guarantee rule. Refunds are only available if the customer has NOT downloaded their documents. Once documents are downloaded, the app automatically marks the payment as non-refundable. You can override this manually in Stripe if you choose to make an exception.

---

## PART 4 — How to check if someone has paid

**Option 1 — Check in Stripe:**
1. Go to https://dashboard.stripe.com
2. Click **Customers** in the left sidebar
3. Search for the customer's email
4. You can see all their payments

**Option 2 — Check in Supabase:**
1. Go to https://supabase.com → your project
2. Click **Table Editor**
3. Click on the **payments** table
4. Search or scroll to find the customer
5. The `status` column shows: `completed`, `pending`, `refunded`, or `failed`

---

## PART 5 — How to see your revenue

**In Stripe:**
1. Go to https://dashboard.stripe.com
2. The home page shows your revenue at a glance
3. Click **Reports** in the left sidebar for detailed breakdowns
4. You can filter by date range, product, and more

**What the numbers mean:**
- **Gross volume:** Total money charged to customers
- **Net volume:** Money after Stripe fees
- **Stripe fee:** Stripe charges 2.9% + $0.30 per transaction

---

## PART 6 — How to handle a failed payment

When a payment fails, Stripe sends an email to the customer automatically. You do not need to do anything unless the customer contacts you.

If a customer says their payment failed:
1. Ask them to try again with a different card
2. Or go to their payment in Stripe and click **Resend receipt** or **Retry payment**
3. Common reasons payments fail:
   - Wrong card number
   - Insufficient funds
   - Card expired
   - Bank blocked the transaction (customer needs to call their bank)

---

## PART 7 — How to set up Stripe from scratch (if you ever need to start over)

### If you switch to a U.S. LLC and need a new Stripe account:

**Step 1 — Create a new Stripe account**
1. Go to https://stripe.com
2. Click **Start now**
3. Enter your email and create a password
4. Fill in your business details (U.S. LLC, Texas)
5. Add your U.S. bank account for payouts

**Step 2 — Get your new API keys**
1. Go to **Developers** → **API keys**
2. Copy your **Publishable key** (starts with `pk_`)
3. Copy your **Secret key** (starts with `sk_`)

**Step 3 — Run the product creation script**
In your Terminal:
```bash
cd ~/E2-go
```
Then update `.env.local` with your new keys and run:
```bash
npx ts-node --skip-project --compiler-options '{"module":"CommonJS"}' scripts/stripe-setup.ts
```
This creates all 7 products automatically in the new account.

**Step 4 — Update Vercel with new keys**
Go to https://vercel.com → your project → Settings → Environment Variables
Update:
- `STRIPE_PUBLISHABLE_KEY` — new value
- `STRIPE_SECRET_KEY` — new value
- All 7 `STRIPE_PRICE_*` values — new values from the script output

**Step 5 — Create a new webhook**
Follow Part 8 below.

**Step 6 — Enable Stripe Tax**
Go to Stripe Dashboard → Settings → Tax
Add your new tax registration details.

That is it. The app works identically. Only the keys changed.

---

## PART 8 — How to set up a Stripe webhook

A webhook is how Stripe tells your app "someone just paid." Without it the app does not know payments happened.

**Step 1 — Go to Stripe webhooks**
1. Go to https://dashboard.stripe.com
2. Click **Developers** → **Webhooks**
3. Click **Add endpoint**

**Step 2 — Fill in the details**
- **Endpoint URL:** `https://e2go.app/api/stripe/webhook`
  (use your actual domain — this must be your live URL, not a test URL)
- **Destination type:** Webhook endpoint
- **Events to listen to:** Select these four:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `charge.refunded`
  - `payment_intent.payment_failed`

**Step 3 — Copy the webhook secret**
1. After saving, click on the webhook you just created
2. Find **Signing secret**
3. Click **Reveal**
4. Copy the value (starts with `whsec_`)

**Step 4 — Add it to your app**
Run in Terminal:
```bash
cd ~/E2-go && sed -i '' 's/STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET=whsec_YOURVALUEHERE/' .env.local
```
Replace `whsec_YOURVALUEHERE` with your actual secret.

Then add it to Vercel:
Go to Vercel → Settings → Environment Variables → update `STRIPE_WEBHOOK_SECRET`

---

## PART 9 — Testing payments without real money

Stripe has a test mode that uses fake card numbers. Nothing real is charged.

**How to switch to test mode:**
In the Stripe Dashboard, look for the toggle at the top that says **Test mode**. Click it. Everything you see is now fake data.

**Test card numbers to use:**
- **Payment succeeds:** `4242 4242 4242 4242`
- **Payment fails:** `4000 0000 0000 0002`
- **Card declined:** `4000 0000 0000 9995`

For all test cards use:
- Any future expiry date (e.g. 12/30)
- Any 3-digit CVC (e.g. 123)
- Any billing postcode (e.g. 10001)

**How to tell if the app is in test mode:**
The pricing page shows a small banner saying "Test mode — no real payments" when the app is using test keys.

---

## PART 10 — Your key reference list

### Important URLs
| What | URL |
|---|---|
| Stripe Dashboard | https://dashboard.stripe.com |
| Stripe Test Dashboard | https://dashboard.stripe.com (toggle Test mode on) |
| Vercel Dashboard | https://vercel.com |
| Supabase Dashboard | https://supabase.com |
| Your live app | https://e2go.app |

### Important contacts
| Who | Why |
|---|---|
| Stripe Support | https://support.stripe.com — for payment disputes, account issues |
| Your accountant | For HST remittances and tax questions |
| Your developer | For any code changes needed |

### Your Stripe fees
- **Per transaction:** 2.9% + $0.30 USD
- **Example:** $297 sale → Stripe keeps $8.91 → you receive $288.09
- **Payouts:** Daily to your USD bank account

### HST remittance reminder
Stripe Tax collects HST automatically from Canadian customers.
You need to remit this to CRA quarterly.
Stripe provides a tax report under **Reports** → **Tax** to help with this.
Your accountant handles the actual remittance.

---

## PART 11 — Moving from Canada to the U.S. (Texas LLC transition)

This section covers exactly what to do with Stripe when you move to the U.S. and set up your Texas LLC. Read this before you make any changes.

---

### The big picture — what is actually happening

Right now e2go runs under your Canadian numbered company. Your Stripe account is Canadian. When you form a Texas LLC and move to the U.S., you need a new Stripe account registered to that LLC. The app code does not change at all — only three settings change. Everything else stays the same.

Think of it like moving your cash register from one store location to another. The products are the same. The prices are the same. You just plug the register into a new location.

---

### Do you need a brand new Stripe account?

Yes. You cannot convert a Canadian Stripe account into a U.S. one. They are different legal entities in different countries. You create a fresh Stripe account for the Texas LLC.

Your old Canadian account does not disappear. It stays open forever. You keep it for your records, for any refunds on Canadian-era payments, and for your tax filings. You just stop taking new payments through it.

---

### What happens to customers who paid under the Canadian account?

Nothing bad. They are completely unaffected. Their payment records live in the Canadian Stripe account. Their receipts are correct. If any of them ever need a refund, you log into the Canadian Stripe account and issue it from there. Both accounts are always accessible to you.

---

### What changes on taxes when you switch?

**Under the Canadian account (right now):**
Stripe Tax automatically collects HST from Canadian customers and tracks it for you. You remit it to CRA quarterly with your accountant's help.

**Under the U.S. account (after the move):**
HST collection through Stripe stops. You are now a U.S. business. However — and this is important — you may still owe GST/HST on sales to Canadian customers above $30,000 CAD per year. Canada does not care where your company is registered. If you are selling digital services to Canadians above that threshold, you register under Canada's simplified non-resident vendor program and remit directly to CRA yourself. Your cross-border accountant handles this setup.

For U.S. customers: Texas does not tax SaaS services, so you likely owe no sales tax in Texas. Other U.S. states may have different rules. Your accountant advises on this.

**The bottom line:** The tax obligation does not disappear when you move. It changes form. Get your accountant involved before and after the switch.

---

### Step-by-step instructions for switching to the U.S. account

Do these steps in order. Do not skip any.

**Before you start — things you need:**
- Your Texas LLC formation documents (you need the legal name and EIN)
- A U.S. business bank account (a U.S.-domiciled account, not just a USD account at a Canadian bank)
- Your new U.S. address

---

**Step 1 — Stop taking new payments on the Canadian account**

You do not need to do anything technical here. Simply do not launch e2go publicly until you have switched to the U.S. account. If you have already launched and have paying customers, you can continue taking payments on the Canadian account right up until the day you switch. There is no gap in service.

---

**Step 2 — Create a new Stripe account for the Texas LLC**

1. Go to https://stripe.com
2. Click **Sign up** — use a different email than your Canadian account, or use the same email and Stripe will ask you to create a new account
3. Fill in your Texas LLC details:
   - Business name: your LLC name
   - Business type: LLC
   - Country: United States
   - State: Texas
   - EIN: your Employer Identification Number
4. Add your U.S. business bank account for payouts
5. Complete Stripe's identity verification (they will ask for your ID)

---

**Step 3 — Get your new API keys**

1. In the new Stripe account go to **Developers** → **API keys**
2. Copy the **Publishable key** (starts with `pk_live_` for live mode or `pk_test_` for test mode)
3. Copy the **Secret key** (starts with `sk_live_` or `sk_test_`)
4. Keep these safe — you will need them in a moment

---

**Step 4 — Run the product creation script**

This creates all 7 e2go products in your new Stripe account automatically. You do not have to do this manually.

First update your `.env.local` file with the new keys:
```
STRIPE_SECRET_KEY=sk_live_xxxx (your new key)
STRIPE_PUBLISHABLE_KEY=pk_live_xxxx (your new key)
```

Then run in Terminal:
```bash
cd ~/E2-go && npx ts-node --skip-project --compiler-options '{"module":"CommonJS"}' scripts/stripe-setup.ts
```

The script will create all 7 products and print the new Price IDs. Write them down.

---

**Step 5 — Update Vercel with the new keys and Price IDs**

1. Go to https://vercel.com → your e2go project
2. Click **Settings** → **Environment Variables**
3. Update these values with your new ones:
   - `STRIPE_PUBLISHABLE_KEY` — new value
   - `STRIPE_SECRET_KEY` — new value
   - All 7 `STRIPE_PRICE_*` values — new values from the script

You are updating existing variables — not adding new ones. Click on each one and edit the value.

---

**Step 6 — Create a new webhook**

Your old webhook was pointing to the same URL but was connected to the Canadian Stripe account. The new account needs its own webhook.

1. In the new Stripe account go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://e2go.app/api/stripe/webhook`
4. Select the same 4 events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `charge.refunded`
   - `payment_intent.payment_failed`
5. Save it
6. Copy the new webhook secret (starts with `whsec_`)
7. Update `STRIPE_WEBHOOK_SECRET` in Vercel with the new value

---

**Step 7 — Configure Stripe Tax on the new account**

1. In the new Stripe account go to **Settings** → **Tax**
2. Click **Enable Stripe Tax**
3. Add a tax registration for any U.S. states where you have customers and tax obligations (your accountant advises on which states)
4. Do NOT add Canada here — that is now handled separately outside of Stripe

---

**Step 8 — Test everything**

Before going live with the new account, run a test payment:
1. Switch the new Stripe account to Test mode
2. Use test card `4242 4242 4242 4242`
3. Make sure the payment goes through
4. Make sure you land on the success page
5. Make sure the webhook fires (check Stripe → Developers → Webhooks → your endpoint → recent events)

If everything works, you are ready.

---

**Step 9 — Archive the old webhook on the Canadian account**

1. Log into your Canadian Stripe account
2. Go to **Developers** → **Webhooks**
3. Find the old webhook endpoint
4. Click on it and click **Disable** or **Delete**

This stops the Canadian account from sending duplicate webhook events to your app.

---

**Step 10 — Keep the Canadian account accessible**

Do not close or delete the Canadian Stripe account. Leave it open. You need it for:
- Historical payment records
- Any refunds for customers who paid under the Canadian entity
- Your Canadian tax filings
- CRA audit purposes (keep records for 7 years minimum)

Simply stop using it for new payments. It sits quietly in the background.

---

### Does any of this require code changes?

No. Zero code changes. The app does not know or care whether it is talking to a Canadian Stripe account or a U.S. one. It reads environment variables and calls the Stripe API. Swapping accounts is purely changing settings — not touching any code.

---

### What if something goes wrong during the switch?

If anything breaks during the transition, you can immediately revert by putting the old Canadian Stripe keys back into Vercel. The Canadian account is still there and still works. You are never without a working payment system.

---

### Timeline recommendation

Do not rush this. Here is a suggested timeline:

| When | What to do |
|---|---|
| Now (still in Canada) | Launch e2go under the Canadian entity. Take real payments. Build your customer base. |
| 2 weeks before moving | Form the Texas LLC. Get the EIN. Open the U.S. bank account. |
| 1 week before moving | Create the new Stripe account. Run the setup script. Test everything in test mode. |
| Moving day or after | Switch the Vercel environment variables to the new account. Go live on the U.S. account. |
| After moving | Talk to your cross-border accountant about GST/HST non-resident registration and U.S. tax obligations. |

---

### Summary — what changes vs. what stays the same

| What | Changes? |
|---|---|
| App code | No change |
| Product names and prices | No change (recreated identically) |
| Customer experience | No change |
| Vercel environment variables | Yes — 3 keys + 7 Price IDs |
| Webhook secret | Yes — new one from new account |
| Tax collection | Yes — HST stops, U.S. rules apply |
| Payout bank account | Yes — U.S. bank instead of Canadian |
| Canadian Stripe account | Stays open, just not used for new payments |

---

*Remember: always talk to your cross-border accountant before and after making this switch. The tax implications of moving from a Canadian corporation to a U.S. LLC are real and require professional guidance.*

---

## QUICK REFERENCE — Most common tasks

| Task | Where | Time |
|---|---|---|
| Change a price | Stripe Dashboard → Products | 5 minutes |
| Issue a refund | Stripe Dashboard → Payments | 2 minutes |
| Check if someone paid | Stripe Dashboard → Customers | 1 minute |
| See total revenue | Stripe Dashboard → Home | Instant |
| Add Stripe keys to app | Vercel Dashboard → Settings → Env Vars | 5 minutes |
| Run product setup script | Terminal → stripe-setup.ts | 2 minutes |
| Test a payment | Use card 4242 4242 4242 4242 | 2 minutes |

---

*This guide was written June 5, 2026.*
*Keep it updated whenever the payment setup changes.*
*File location: ~/E2-go/docs/PAYMENT_MANAGEMENT_GUIDE.md*
