# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 3 Final — Sections 10.3, 10.4 & 10.5
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

## 10.3 Referral Program

### Purpose
The referral program turns satisfied subscribers into a word-of-mouth
distribution channel. E-2 applicants talk to each other — in Facebook
groups, at franchise discovery days, at consulate waiting rooms, and
in Canadian expat communities. A well-designed referral program
amplifies this natural behaviour with a structured incentive.

---

### Referral Program Design Principles

1. The reward must feel meaningful relative to the product price
2. The referrer earns on action taken (purchase), not just click
3. The referred friend gets a real discount — not just the referrer
4. Tracking must be frictionless (unique link, no manual codes)
5. Payouts must be reliable and timely (nothing kills referrals faster
   than a reward that never arrives)

---

### Referral Mechanics

REFERRER (existing subscriber):
- Receives a unique referral link from the app dashboard
- Link is tied to their account via a UUID tracking token
- Dashboard shows: clicks / signups / conversions / earnings

REFERRED FRIEND (new user):
- Lands on a co-branded page: "You were referred by [Referrer first name]"
- Receives 15% discount on any plan at signup
- Discount applied automatically — no code entry required

REFERRER REWARD:
- $30 USD account credit per successful conversion (paid subscriber)
- Credit applied to: next renewal module purchase, compliance calendar
  subscription, or additional plan purchase
- If referrer has no upcoming purchase: credit paid out via PayPal or
  Stripe within 30 days of the referred user's 30-day refund window passing

---

### Referral Tiers (After First 3 Conversions)

| Conversions | Reward Per Conversion | Status Label |
|---|---|---|
| 1–2 | $30 account credit | Referrer |
| 3–9 | $40 account credit | Active Referrer |
| 10–24 | $50 account credit | Partner Referrer |
| 25+ | $60 account credit + affiliate dashboard | E2Pathway Affiliate |

At the Partner Referrer level, the referrer is contacted personally
to discuss whether a formal affiliate arrangement or content
partnership makes sense.

---

### Referral Dashboard UI

Accessible from main dashboard sidebar: "Refer a Friend — Earn $30"

```
YOUR REFERRAL DASHBOARD

Your referral link:
[https://e2pathway.com/r/abc123]        [Copy Link]

Share via:  [Email]  [WhatsApp]  [LinkedIn]  [Facebook]

Your stats:
  Link clicks:         47
  Signups:             12
  Paying subscribers:  8
  Total earned:        $240 credit

Your earnings:
  Available credit:    $97
  [Apply to renewal]  [Request payout via PayPal]

Leaderboard (optional, opt-in):
  This month's top referrers — see who's helping the most
  Canadians get their E-2 visa.
```

---

### Referral Prompt Placement

Referral prompts appear at 4 moments — the highest-engagement points:

1. POST-PURCHASE CONFIRMATION SCREEN:
   "You're in. Share E2Pathway with a fellow Canadian and earn $30
   when they subscribe."
   [Copy My Referral Link]

2. POST-PACKAGE-GENERATION:
   "Your package is ready. Know another Canadian thinking about an
   E-2 visa? They can get started with 15% off."
   [Share My Link]

3. POST-APPROVED OUTCOME:
   "Congratulations on your approval! You're in an exclusive group.
   Help another Canadian get here."
   [Share My Story + Referral Link]

4. COMPLIANCE CALENDAR YEAR 1 ANNIVERSARY:
   "It's been one year since your E-2 was approved. One of the best
   ways to celebrate? Help another Canadian get theirs."
   [Share My Referral Link]

---

### Referral Email (Auto-sent When Referral Link Is Used)

Triggered when a referred user clicks the link and lands on the site:

Subject to referrer: "Someone clicked your E2Pathway referral link"
"[Referrer first name], someone just visited E2Pathway using your
referral link. If they subscribe, you'll earn $30.
Nothing to do — we'll notify you if they complete their purchase."

Subject to referrer on conversion: "You earned $30 — [Name] just subscribed"
"Your referral converted. [Friend first name] just subscribed to
E2Pathway using your link. We've added $30 to your account.
Current balance: $[X]. [View your dashboard →]"

---

### CASL Note on Referral Emails

The referral program does NOT send emails to the referred friend
on the referrer's behalf. The referrer shares their own unique link
through their own channels. E2Pathway only sends emails to:
(a) the referrer (regarding their own account activity)
(b) the referred user after they have created an account and
    consented to communications

No "refer a friend by email" feature that sends from E2Pathway's
server on the referrer's behalf — this would require explicit CASL
consent from the recipient before sending.

---

## 10.4 SEO Content Strategy

### SEO Philosophy

The E2Pathway content strategy is built on one principle: become the
most authoritative English-language resource for Canadians researching
the E-2 visa. There are very few high-quality, Canada-specific E-2
resources online. Most E-2 content is written for a U.S. general audience.
The Canadian angle — Toronto consulate specifics, CAD/USD considerations,
OHIP, RRSP, departure tax, provincial health card timing — is almost
entirely uncovered. This is a content moat that a large competitor
cannot easily replicate.

---

### Keyword Architecture

TIER 1 — Primary Commercial Keywords (highest intent, direct to product)

| Keyword | Monthly Volume Est. | Difficulty |
|---|---|---|
| e2 visa canada | 1,200–2,400/mo | Medium |
| e2 visa for canadians | 800–1,500/mo | Low–Medium |
| e2 visa toronto consulate | 400–800/mo | Low |
| e2 visa business plan canada | 300–600/mo | Low |
| e2 visa requirements canada | 500–1,000/mo | Low–Medium |
| e2 visa application canada | 600–1,200/mo | Medium |

Strategy: These keywords should appear in the homepage, landing pages,
and in the first 100 words of at least 2 cornerstone blog posts.

TIER 2 — Informational Keywords (research phase, build trust)

| Keyword | Topic |
|---|---|
| how much to invest for e2 visa | Substantiality / proportionality |
| e2 visa denied canada | Denial reasons and prevention |
| e2 visa source of funds | Template 1 topic |
| e2 visa franchise canada | Franchise route |
| e2 visa marginal business | Marginality test |
| e2 visa vs eb5 canada | Pathway comparison |
| e2 visa 221g canada | Administrative processing |
| e2 visa renewal toronto | Renewal module |
| canadian moving to usa e2 visa | Broad entry |
| e2 visa dependent spouse | Family module |
| e2 visa business plan requirements | Business plan |
| e2 visa interview questions toronto | Interview simulator |
| e2 visa senior care canada | Business type |
| e2 visa franchise cost canada | Investment + franchise |

TIER 3 — Long-Tail Keywords (very specific, low competition, high intent)

| Keyword | Content Opportunity |
|---|---|
| e2 visa toronto consulate wait time | Wait time data page |
| e2 visa canada home sale timing | 214(b) / immigrant intent |
| e2 visa rrsp withdrawal canada | Tax module |
| e2 visa cleaning business canada | Commercial cleaning guide |
| e2 visa ontario 2025 | Year-specific guide |
| canadian buying franchise in usa e2 | Franchise + E-2 combined |
| e2 visa how long to get approved toronto | Timeline data |
| e2 visa business plan example canada | Template-adjacent |

---

### Content Calendar — First 6 Months (26 Posts)

MONTH 1 — Foundation (4 posts)
1. "E-2 Visa for Canadians: The Complete 2026 Guide"
   (cornerstone piece — 3,000+ words, targets Tier 1 keywords)
2. "How Much Do You Need to Invest for an E-2 Visa? The
   Proportionality Test Explained for Canadians"
3. "The 7 Most Common Reasons Canadians Get Denied an E-2 Visa"
4. "E-2 Visa vs. EB-5: Which Investment Visa Makes Sense
   for Canadians Moving to the U.S.?"

MONTH 2 — Business Type Series (4 posts)
5. "E-2 Visa and Senior Home Care: The Complete Guide for Canadians"
6. "E-2 Visa and Franchises: How to Choose an E-2-Compatible
   Franchise in the U.S."
7. "E-2 Visa and Commercial Cleaning: Why This Business Works
   for Canadian Investors"
8. "E-2 Visa and Childcare: Licensing, Investment, and
   What Officers Look For"

MONTH 3 — Application Deep Dives (5 posts)
9.  "E-2 Visa Source of Funds: How to Document Where Your
    Investment Money Came From"
10. "The E-2 Visa Business Plan: What Consular Officers
    Actually Look For"
11. "E-2 Visa Cover Letter: How to Write the Letter That
    Wins Your Toronto Interview"
12. "E-2 Visa 214(b) Denial: What It Means and How to Avoid It"
13. "Selling Your Canadian Home Before Your E-2 Visa:
    The Timing Risk Most Applicants Don't Know About"

MONTH 4 — Toronto Consulate Specific (4 posts)
14. "Toronto U.S. Consulate E-2 Interview: What to Expect
    (From People Who've Been Through It)"
15. "Toronto E-2 Interview Wait Times: Current Processing
    and Scheduling Guide [Updated 2026]"
16. "The 11-Tab E-2 Application Binder: What Goes in Each
    Section at the Toronto Consulate"
17. "E-2 Visa 221(g): What It Means, What to Do, and How
    Long It Takes to Resolve"

MONTH 5 — Financial & Tax Topics (5 posts)
18. "Canadian Departure Tax and the E-2 Visa: What You Need
    to Know Before You Move"
19. "RRSP and the E-2 Visa: Can You Use RRSP Funds to Invest?"
20. "OHIP Cancellation and U.S. Health Insurance: A Timeline
    for Canadians on the E-2 Visa"
21. "FBAR for E-2 Visa Holders: What It Is and When You Need It"
22. "CAD to USD: How Exchange Rate Timing Affects Your E-2
    Investment Threshold"

MONTH 6 — Renewal & Long-Term (4 posts)
23. "E-2 Visa Renewal at the Toronto Consulate: The Complete Guide"
24. "E-2 Visa Renewal vs. USCIS Extension: Which Path is Right
    for You?"
25. "The E-2 Visa and the Green Card: Your Pathway Options After
    You're Approved"
26. "E-2 Visa Dependent Children: What Happens When They Turn 21?"

---

### On-Page SEO Standards (Applied to Every Post)

Title tag: Primary keyword + Canadian angle + year
Example: "E-2 Visa Business Plan Requirements for Canadians (2026)"

Meta description: 150–160 characters, includes primary keyword,
clear value proposition, no clickbait.

H1: Same as or very close to title tag
H2s: Use Tier 2 and long-tail keywords naturally
URL slug: /e2-visa-business-plan-canada (clean, keyword-rich)

Internal linking:
- Every post links to at least 2 other E2Pathway posts
- Every post has one CTA linking to the app or email signup
- Cornerstone posts (Month 1, #1) receive links from every
  subsequent relevant post

Schema markup:
- Article schema on all blog posts
- FAQ schema on posts with Q&A sections
- HowTo schema on procedural guides

---

### Data-Driven Content Assets (Highest Link-Building Value)

These content types attract backlinks from other sites:

1. TORONTO CONSULATE WAIT TIME TRACKER
   A live page updated from community-reported data showing current
   scheduling availability and average interview-to-approval timelines.
   Updated monthly. Will attract links from immigration forums and blogs.

2. E-2 VISA INVESTMENT CALCULATOR
   An interactive tool: enter business cost → get proportionality
   assessment and substantiality guidance. Free, no signup required.
   Generates links from E-2 forums and lawyer blogs.

3. E-2 VISA APPROVAL RATE DATA PAGE
   Once outcome database has 100+ verified results, publish the data.
   "E2Pathway Verified Approval Rate: [X]% — Based on [N] Verified
   Canadian E-2 Applications — Last Updated [date]"
   This will be cited and linked by immigration attorneys and bloggers.

4. FRANCHISE COMPATIBILITY GUIDE
   "E-2 Compatible Franchises for Canadians: 50 Options Ranked
   by Investment Level and E-2 Strength"
   Franchise brands will sometimes share or link to content that
   presents them positively.

---

### Off-Page SEO & Link Building

Target link sources:
- Canadian immigration law firm blogs (offer to guest post or be quoted)
- Canadian expat news sites (e.g., Maple Life, The Local Canada)
- Franchise industry publications (Franchise Times, Entrepreneur)
- SCORE.org and SBA resource directories
- Canadian business magazines (MoneySense, Canadian Business)
- Reddit and Quora (no-follow links still drive traffic and awareness)

Guest post pitch angle:
"We've analyzed [N] verified Canadian E-2 applications and can share
data-backed insights on what makes Canadian applications succeed and
fail — exclusive data that no immigration firm has published."

---

## 10.5 Attorney & Franchise Broker Outreach Templates

### Purpose
The referral engine (Section 7.9) requires active partner relationships
with immigration attorneys and franchise brokers. These templates are
used for cold outreach to establish those relationships. The tone is
peer-to-peer and value-first — not a sales pitch.

---

### Template A — Immigration Attorney Outreach (Cold Email)

Subject: "E-2 preparation tool for your Canadian clients — would love your thoughts"

"Hi [Attorney first name],

I came across your firm while researching E-2 visa practitioners
in [city/state] — your work on [specific case type or content they've
published] stood out.

I'm the founder of E2Pathway, a preparation platform specifically
built for Canadians applying for E-2 visas at the Toronto consulate.
We help applicants organize their source of funds documentation,
generate business plans and cover letters from structured data,
and simulate their consulate interview — before they sit down
with an attorney.

I built it because I kept seeing a consistent problem: applicants
arriving at their first attorney consultation with nothing organized,
burning expensive legal time on basic prep work that software can handle.

I'm not trying to replace attorney relationships — quite the opposite.
E2Pathway users who then work with an attorney are better organized,
have clearer documentation, and can focus the legal consultation on
strategy rather than logistics.

I'd love to explore a simple arrangement: we refer applicants who
need legal guidance to attorneys like you, and you're welcome to
recommend E2Pathway to prospective clients as a preparation tool
before or alongside your engagement.

Would a 20-minute call make sense? Happy to show you the platform
and hear whether it fits how you work.

[Your name]
E2Pathway
[calendly or booking link]"

---

### Template B — Immigration Attorney Follow-Up (Day 7, No Reply)

Subject: "Quick follow-up — E2Pathway + [Firm Name]"

"Hi [Attorney first name],

Just following up on my note from last week. I know your inbox is
busy.

One thing I didn't mention: we currently route attorney referrals
to a short list of practitioners we trust. We'd like that list to
include someone with your specific expertise in E-2 matters.

If the timing isn't right, no pressure at all. But if a 20-minute
conversation makes sense, [booking link] has my availability.

[Your name]"

---

### Template C — Immigration Attorney Partnership Proposal (After Intro Call)

Subject: "E2Pathway + [Firm Name] — proposed partnership terms"

"Hi [Attorney first name],

Thanks for the conversation [day]. As discussed, here's a simple
proposal:

WHAT E2PATHWAY DOES FOR YOUR CLIENTS:
• Helps clients organize and document their source of funds
  before your consultation
• Generates a structured business plan draft from their inputs
• Prepares them for the interview so your time together focuses
  on legal strategy
• Provides a compliance calendar through the renewal window

REFERRAL ARRANGEMENT PROPOSED:
• When our users need legal guidance beyond the app's scope,
  we refer them to you directly via email introduction
• In return, you're welcome to recommend E2Pathway to your
  E-2 prospective clients as a preparation tool
• We can also create a co-branded landing page for your firm
  at no cost: e2pathway.com/[firmname]

ECONOMICS:
• E2Pathway does not charge attorneys for referrals
• We receive referral fees only from other categories (franchise,
  CPA, banking) — never from attorney referrals
• You receive warm, organized leads at no cost to you

No exclusivity required. Simple to start, simple to end.

Would you like to proceed? I can have the referral flow set up
within 48 hours of your confirmation.

[Your name]"

---

### Template D — Franchise Broker / Consultant Outreach (Cold Email)

Subject: "Canadian E-2 applicants looking for franchise matches — partnership idea"

"Hi [Broker first name],

I'm the founder of E2Pathway, a preparation platform for Canadians
applying for E-2 Treaty Investor visas at the Toronto consulate.

We have a specific problem you may be able to solve: a growing number
of our users arrive knowing they want to invest in a franchise but
don't know which one to choose. They have a budget, a target state,
and sometimes a background that suits certain categories — but they
need a franchise consultant to make the match.

We'd like to refer those users to you.

Our users are:
• Canadian citizens with $75,000–$500,000+ USD available to invest
• Actively pursuing a U.S. E-2 visa (high intent — not casual browsers)
• Already past the 'am I eligible?' phase — they're in active preparation
• Seeking an E-2-compatible franchise in a specific U.S. state

In return, we ask only that you:
• Prioritize E-2 compatibility when making recommendations
• Keep us informed of how referrals progress (basic status updates)

We disclose our referral relationship to users and receive a referral
fee structured between us. No cost to the referred client.

Would a quick call make sense? I can walk you through the platform
and the type of users we're sending your way.

[Your name]
E2Pathway
[booking link]"

---

### Template E — Franchise Broker Follow-Up (Day 7, No Reply)

Subject: "Canadian E-2 investors — following up"

"Hi [Broker first name],

Quick follow-up on my note from last week.

We have users asking specifically about E-2-compatible franchises
in Florida, Texas, and Arizona this month. Currently routing those
inquiries manually while we finalize our partner network.

If you work with Canadian clients pursuing E-2 visas, this could
be a clean source of warm, qualified leads for your pipeline.

Happy to keep this very simple — even a trial basis to start.
[Booking link] if a call works.

[Your name]"

---

### Template F — CPA / Tax Firm Outreach (Cold Email)

Subject: "Canadians becoming non-residents for E-2 visa — cross-border tax referrals"

"Hi [CPA first name],

I run E2Pathway, a platform that helps Canadians prepare their
E-2 Treaty Investor visa applications. We serve applicants who
are in the process of moving to the United States and establishing
businesses there.

A significant portion of our users arrive at a point where they
need specialized guidance we can't provide: Canadian departure tax,
deemed dispositions, RRSP decisions as non-residents, FBAR compliance,
and cross-border entity tax planning.

We flag these needs inside the app and refer users to cross-border
CPA firms at the right moment. We're building a short list of firms
we trust to send those referrals to.

Your firm's [specific relevant experience or publication] made me
want to reach out specifically.

Would you have 15 minutes to explore whether this makes sense?
Our referrals would come with a structured summary of the user's
specific tax flags — so your team isn't starting blind.

[Your name]
E2Pathway
[booking link]"

---

### Template G — Franchise Brand / Franchisor Outreach

A different type of outreach — targeting franchise brands directly
rather than brokers. The value proposition is different: E2Pathway
can promote their brand to Canadian investors actively seeking an
E-2-compatible franchise.

Subject: "Canadian E-2 investors actively looking at franchises — visibility opportunity"

"Hi [Development Contact name],

I run E2Pathway, a preparation platform for Canadians applying for
E-2 Treaty Investor visas. Our users are Canadians with $100,000–
$500,000+ USD available to invest, actively selecting a U.S. franchise.

We help users determine which franchise categories are E-2-compatible,
and we surface specific franchise brands to users whose budget and
background match.

[Brand name] is a strong fit for Canadian E-2 applicants because:
[specific reason — investment range, proven unit economics, licensing
simplicity, recurring revenue model].

I'd like to discuss two things:
1. Including [Brand name] as a recommended option for qualified
   Canadian applicants in our platform
2. Whether your franchise development team has Canadian applicants
   you'd like to refer to our preparation platform

Happy to connect. [Booking link]

[Your name]"

---

### Outreach Tracking System

Track all outreach in a simple CRM or spreadsheet:

Fields per contact:
- Contact name and firm
- Category (attorney / broker / CPA / franchisor)
- Outreach date
- Template used
- Response (reply / no reply / call booked / declined)
- Follow-up date
- Status (prospect / call completed / active partner / declined)
- Notes

Monthly targets (first 6 months):
- Outreach sent: 20–30 contacts per month
- Call completion rate target: 20–30%
- Active partnerships established: 2–3 per month
- Total active partners by Month 6: 12–18

---

## VOLUME 3 — COMPLETE

This document concludes Volume 3 of the E2Pathway Master Product Document.

Sections completed in Volume 3:

SECTION 6 — E-2 Visa Knowledge Base
  6.1  E-2 Visa Fundamentals
  6.2  Application Structure (11 Tabs, Toronto Consulate)
  6.3  Partnership Applications
  6.4  Common Denial Reasons
  6.5  Renewal / Extension Process
  6.6  Green Card Pathways
  6.7  Disqualifying Businesses
  6.8  Canadian Departure Tax & Financial Implications
  6.9  Business Type Advisor & Compatible Business Categories
  6.10 Licensed Industries Deep Dive
  6.11 Cross-Border Tax (U.S. Side) [covered in session]
  6.12 CAD/USD Investment Conversion [covered in session]

SECTION 7 — Product Modules Specification
  7.1  Eligibility Quiz — Module 1 [covered in session]
  7.2  Business Type Advisor — Module 2
  7.3  Interview Engine — Module 3 (Groups 3A–3I, all 131 questions)
  7.4  Template Specifications (Templates 1–5)
  7.5  Application Confidence Score Engine
  7.6  Interview Simulator Specification
  7.7  Compliance Calendar Specification
  7.8  Renewal Module Specification
  7.9  Referral Engine Specification
  7.10 Outcome Capture & CEAC Verification Specification

SECTION 8 — Legal & Compliance Layer
  8.1  Terms of Service (full draft)
  8.2  Privacy Policy (PIPEDA-compliant)
  8.3  In-App Disclaimer Language (7 variants)
  8.4  Business Plan Certification Flow
  8.5  CASL-Compliant Referral & Marketing Consent Language

SECTION 9 — Pricing, Tiers & Licensing
  9.1  Full Pricing Tier Matrix
  9.2  Anti-Sharing Architecture

SECTION 10 — Go-To-Market & Growth
  10.1 Launch Sequence (5 phases, 90 days)
  10.2 Email Nurture Sequence (10 emails, full copy)
  10.3 Referral Program
  10.4 SEO Content Strategy
  10.5 Attorney & Franchise Broker Outreach Templates (7 templates)

---

Volume 4 (if applicable) would cover:
  - Technical architecture specification (stack, database schema, API design)
  - UI/UX wireframe descriptions
  - Developer handoff documentation
  - QA testing checklist
  - Launch readiness checklist

---

*End of Volume 3 — E2Pathway Master Product Document*
