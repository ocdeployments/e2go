# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 3 Continuation — Sections 7.9 & 7.10
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

## 7.9 Referral Engine Specification

### Purpose
The Referral Engine monetizes user intent at key decision points by
connecting users with relevant third-party professionals and services,
including franchise brokers, immigration attorneys, cross-border CPAs,
and banking specialists. Every referral must be consent-based,
legally compliant, and clearly disclosed to the user.

---

### Referral Categories

The app supports 4 initial referral categories:

1. FRANCHISE MATCHING
   Use case: User wants help identifying an E-2-compatible franchise
   Integration point: Module 2 (Business Type Advisor)
   Partner examples: FranNet, IFPG broker, franchise consultant

2. IMMIGRATION ATTORNEY
   Use case: User hits a legal complexity trigger beyond app scope
   Integration points: attorney referral flags in Modules 1, 3, 7.8
   Examples: prior denial, prior overstay, removal order, ownership issue,
   pending immigrant petition, complex partnership structure

3. CROSS-BORDER CPA / TAX ADVISOR
   Use case: Canadian departure tax, RRSP withdrawal, non-resident tax,
   U.S. filing complexity, FBAR, entity tax planning
   Integration points: Sections 6.8, 6.11, 7.7, 7.8

4. CROSS-BORDER BANKING / LENDING
   Use case: U.S. business bank account, cross-border wire transfers,
   SBA or franchise financing discussions, Canadian-to-U.S. banking setup
   Integration points: Module 3I, business funding workflow

Future expansion categories:
- Insurance brokers
- Payroll / HR providers
- Commercial real estate brokers
- Business acquisition marketplaces

---

### Core Legal Principle

No referral data is shared unless the user gives explicit,
category-specific consent.

Consent must be:
- Separate from Terms of Service acceptance
- Specific to the referral type
- Clear about what data will be shared
- Clear whether E2Pathway receives compensation
- Revocable by the user before transmission

This is required both for trust and for compliance with Canadian
anti-spam and privacy principles.

---

### Trigger Logic by Category

#### A. Franchise Referral Triggers

Trigger if ANY of the following are true:
- business_route = "franchise" AND business_status = "exploring"
- business_route = "franchise" AND specific_franchise_name is blank
- user clicks "Connect me with a franchise consultant"
- business compatibility engine ranks franchise as top recommendation

Do NOT trigger if:
- user already identified a specific franchise and selected
  "I'll find one myself"
- user dismissed franchise referral twice in the last 30 days

Display timing:
- First prompt appears after Module 2 shortlist is shown
- Second prompt can appear on dashboard if no action taken after 7 days

---

#### B. Attorney Referral Triggers

Automatic trigger if ANY of these flags are set:
- prior_visa_denial = true
- prior_overstay = true
- removal_order = true
- criminal_history = true
- pending_green_card_application = true
- partnership_ownership_not_exactly_50_50 = true
- change_in_ownership_on_renewal = true
- source_of_funds_incomplete AND amount > $100,000
- business_category = highly regulated medical business

Display style:
Attorney referrals must never appear salesy. They are shown as
protective guidance, not monetized upsell language.

Example:
"Your case includes factors that may require individualized legal advice.
This app can help you organize your materials, but it cannot provide legal
advice. Based on the information you entered, we strongly recommend speaking
with an experienced E-2 immigration attorney before submitting.

[Connect me with an attorney]  [I'll continue on my own]"

---

#### C. CPA Referral Triggers

Trigger if ANY of the following are true:
- source_type includes RRSP withdrawal
- canadian_departure_tax_status = unsure
- dependent child age-out planning intersects tax residency questions
- business_entity type requires U.S. tax elections
- user indicates no CPA engaged in Module 3I
- fbar_required = true
- user enters Canadian property sale + upcoming non-residency

Display timing:
- During tax-related modules
- In compliance calendar when tax deadlines approach
- Post-approval, 30 days after visa issuance if no CPA confirmed

---

#### D. Banking Referral Triggers

Trigger if ANY of the following are true:
- no_u.s._business_bank_account = true
- funds_not_yet_transferred = true
- user indicates difficulty opening U.S. account as a Canadian
- financing needed for acquisition / franchise route

Display example:
"Opening a U.S. business account as a Canadian founder can be slower
than expected. We work with cross-border banking specialists who help
Canadians set up U.S. accounts, manage wire transfers, and coordinate
cross-border banking.

[Connect me with a banking specialist]"

---

### Consent Screen Specification

Each referral category uses the same consent framework with category-
specific text.

#### Franchise Consent Screen Example

```
CONSENT TO SHARE YOUR INFORMATION

You are requesting to be connected with a franchise consultant.
To make the introduction, we would share the following information:

• Your name
• Your email address
• Your phone number
• Your investment budget range
• Your preferred business categories
• Your target U.S. state(s)
• Whether you are applying for an E-2 visa

The consultant will use this information only to contact you about
franchise opportunities relevant to your stated preferences.

Important:
• E2Pathway may receive a referral fee if you ultimately acquire
  a franchise through this partner.
• You are under no obligation to work with the referred consultant.
• Your information will not be shared unless you tap "I Consent" below.

[ ] I understand what information will be shared.
[ ] I understand E2Pathway may receive compensation from this referral.
[ ] I consent to share my information for this introduction.

[I Consent — Send Referral]   [Cancel]
```

All 3 checkboxes must be checked before the CTA becomes active.

---

### Referral Data Payloads

#### Franchise Payload

```json
{
  "referral_type": "franchise",
  "user_id": "uuid",
  "timestamp": "ISO8601",
  "name": "Applicant Name",
  "email": "user@email.com",
  "phone": "+1-xxx-xxx-xxxx",
  "investment_budget_usd": 150000,
  "business_categories": ["senior care", "childcare"],
  "target_states": ["Florida", "Texas"],
  "franchise_route": true,
  "e2_applicant": true,
  "notes": "Interested in recurring revenue model"
}
```

#### Attorney Payload

Only minimum necessary information is shared:

```json
{
  "referral_type": "attorney",
  "user_id": "uuid",
  "timestamp": "ISO8601",
  "name": "Applicant Name",
  "email": "user@email.com",
  "phone": "+1-xxx-xxx-xxxx",
  "issue_flags": ["prior_visa_denial", "pending_green_card_application"],
  "application_stage": "pre-submission"
}
```

Do NOT share full questionnaire responses, passport details,
criminal details, or source-of-funds documents automatically.
Attorney receives only issue labels; full case discussion happens
directly with the user after contact is established.

#### CPA Payload

```json
{
  "referral_type": "cpa",
  "user_id": "uuid",
  "timestamp": "ISO8601",
  "name": "Applicant Name",
  "email": "user@email.com",
  "phone": "+1-xxx-xxx-xxxx",
  "tax_flags": ["rrsp_withdrawal", "departure_tax", "fbar_likely"],
  "canadian_residency_status": "moving_to_non_resident",
  "business_state": "Florida"
}
```

#### Banking Payload

```json
{
  "referral_type": "banking",
  "user_id": "uuid",
  "timestamp": "ISO8601",
  "name": "Applicant Name",
  "email": "user@email.com",
  "phone": "+1-xxx-xxx-xxxx",
  "needs": ["u.s._business_account", "wire_transfer_support"],
  "entity_formed": true,
  "target_state": "Florida"
}
```

---

### Referral Transmission Methods

Supported methods by partner maturity level:

LEVEL 1 — Email Notification
- For early-stage partnerships
- Payload sent via secure templated email to partner contact
- BCC internal referrals inbox for audit trail

LEVEL 2 — Webhook / API
- For established partners with CRM intake endpoints
- POST JSON payload to partner endpoint
- Retry logic: 3 attempts on failure
- Log all responses in referral_events table

LEVEL 3 — Partner Portal
- Future state: partners log into a dashboard to view consented leads
- Role-based access; audit trail; status feedback loop

Initial implementation recommendation:
Start with Level 1 (email) for simplicity, then upgrade top partners
to webhook/API once volume justifies it.

---

### Referral Revenue Tracking

Every referral is recorded in a referral_events table:

Fields:
- referral_id
- user_id
- referral_type
- partner_id
- created_at
- consent_version
- payload_hash
- transmission_status (sent / failed / acknowledged)
- outcome_status (unknown / contacted / converted / closed)
- revenue_amount (if reported by partner)
- payout_date

Dashboard metrics:
- Referral prompts shown
- Referral consent rate by category
- Referral conversion rate by partner
- Revenue per referral category
- Revenue per active subscriber

---

### CASL / Privacy Compliance Notes

The referral engine must follow these principles:
- No partner outreach unless user explicitly requested introduction
- No pre-checked consent boxes
- No bundling referral consent into general marketing consent
- User receives confirmation email summarizing what was shared
- User can request deletion of referral record from E2Pathway system

Confirmation email example:
"You've asked E2Pathway to connect you with [Partner Name].
On [date], we shared the following information with them:
[name, email, phone, budget range, preferred categories].
If you did not intend this request, contact us immediately at [support email]."

---

### Dashboard Placement

Referrals are not a standalone primary nav item. They appear contextually:
- Dashboard card: "Need expert help?"
- Module 2: franchise matching
- Module 3 / renewal module: attorney and CPA triggers
- Compliance calendar: CPA, banking, renewal attorney prompts
- Outcome stage: banking / payroll / insurance follow-up partnerships

This keeps the referral engine feeling assistive rather than cluttered.

---

## 7.10 Outcome Capture & CEAC Verification Specification

### Purpose
This module captures what happened after the interview — approved,
221(g), refused, or unknown — and applies a verification framework so
published outcome statistics are credible. It is both a product
improvement loop and a trust-building feature for marketing.

---

### Why This Module Matters

Outcome capture serves 4 purposes:
1. Measures product effectiveness over time
2. Generates verified approval-rate statistics for marketing
3. Collects consulate interview question intelligence from real users
4. Feeds score calibration and simulator question updates

Without this module, E2Pathway cannot prove its value.
With this module, E2Pathway becomes a self-improving data asset.

---

### Outcome States

Each applicant record can have one of the following outcome states:

- approved
- refused
- administrative_processing
- 221g_document_request
- unknown
- withdrawn

Additional fields captured:
- interview_date
- outcome_date
- visa_received_date (if approved)
- family_approved (yes / no / mixed / unknown)
- spouse_approved
- children_approved_count
- denial_reason (if known)
- 221g_request_type (if applicable)
- questions_asked[]
- notes_free_text
- verification_level (1–4)

---

### Post-Interview Capture Sequence

#### Stage 1 — Pre-Interview Priming

3 days before interview date, send email + push:
"After your interview, we'd love to hear how it went.
It takes less than 2 minutes and helps future applicants
prepare more effectively."

Purpose: prime user expectation so the follow-up doesn't feel random.

#### Stage 2 — 24-Hour Outcome Prompt

24 hours after interview_date, trigger outcome prompt:

```
HOW DID YOUR INTERVIEW GO?

Your interview was yesterday. Whatever happened,
your experience helps future applicants prepare.

Choose one:
  ✅ My visa was approved
  ⚠️ I received a 221(g) or administrative processing
  ❌ My visa was refused
  ❓ I prefer not to say right now
```

Each button routes to a different intake flow.

---

### Approved Flow

Fields shown:
- "When did you receive your passport with visa?" (date)
- "Was your spouse approved as well?" (yes/no/not applicable)
- "How many children were approved?" (number)
- "About how long did the interview last?" (<5 min / 5–10 / 10–15 / 15+)
- "Which of these questions were you asked?" (multi-select + free text)
- "Did anything about the interview surprise you?" (optional text)
- "Would you like to leave a testimonial?" (yes/maybe later/no)

Outcome set:
- outcome_state = approved
- family_approved tracked
- questions_asked saved for simulator database

---

### 221(g) / Administrative Processing Flow

Fields shown:
- "Did the officer request additional documents?" (yes/no)
- "What type of documents were requested?" (multi-select)
  □ Source of funds documents
  □ Updated business plan
  □ Market research for city/state
  □ Lease or premises documents
  □ Proof business is operational
  □ Other: [text]
- "Did the officer explain why the case was placed in administrative processing?"
- "Have you submitted the requested documents yet?" (yes/no)
- "How many days later was the case resolved?" (optional later update)
- "Which interview questions do you remember being asked?"

Outcome set:
- outcome_state = 221g_document_request OR administrative_processing
- 221g_request_type[] saved
- 221(g) guide module surfaced immediately

---

### Refused Flow

Fields shown with empathetic copy:
"We're sorry this happened. If you're willing to share what occurred,
it helps us improve the app for future applicants."

Fields:
- "Did the officer mention a reason?" (multi-select)
  □ 214(b) immigrant intent
  □ Investment not substantial
  □ Business considered marginal
  □ Source of funds unclear
  □ Business plan concerns
  □ Ownership/control issue
  □ Other: [text]
- "Which interview questions do you remember being asked?"
- "Would you like to be contacted about next-step options?" (yes/no)

Outcome set:
- outcome_state = refused
- denial_reason stored
- attorney referral offered if requested

---

### Automatic Follow-Up Sequence for Non-Responders

If no response to the 24-hour prompt, run the following sequence:

Day 4 email/push:
"Just checking in — we'd still love to hear how your interview went.
Even a one-tap update helps us improve the app."

Day 10 email:
"This is a quick reminder to update your interview outcome.
Your feedback helps keep our preparation tools accurate."

Day 21 final reminder:
"Last reminder — if you've had your interview, please update your
outcome in the app. It takes less than 2 minutes."

Day 30:
- outcome_state remains "unknown"
- record marked follow_up_exhausted = true
- user can still update outcome at any time later from dashboard

---

### Verification Framework

Outcome verification is represented by a 4-level trust model.
This allows E2Pathway to distinguish self-reported outcomes from
higher-confidence outcomes before using them in marketing statistics.

#### Level 1 — Unverified Self-Report
Requirements:
- User manually reports an outcome
- No additional verification signal present

Used for:
- Internal trend analysis only
Not used for:
- Published approval-rate claims

#### Level 2 — Behaviourally Consistent Self-Report
Requirements:
- User reports outcome
- Post-outcome behavior aligns with that outcome pattern

Examples:
Approved pattern:
- enters visa issue date
- uses post-approval compliance calendar
- opens renewal module preview
- updates dependents / expiry dates

Refused / 221(g) pattern:
- opens 221(g) guide
- accesses attorney referral
- does not enter visa expiry date

Used for:
- Internal analytics
- Can be shown in aggregate if clearly labeled "verified by behavioral consistency"

#### Level 3 — User-Confirmed Official Status
Requirements:
- User reports outcome
- User completes CEAC confirmation flow in app and confirms official status
- Application ID consistency check passes against app record

Important note:
The app does not require visa upload. The app asks user to confirm
the official CEAC status shown on the U.S. State Department checker.

Stored fields:
- ceac_confirmation_status
- ceac_confirmed_at
- application_id_hash_match = true/false

Used for:
- Published statistics
- Verified testimonials badge

#### Level 4 — Dual-Confirmed
Requirements:
- Level 3 requirements met
- Additional independent confirmation signal present

Acceptable second signal examples:
- user enters visa issue and expiry data consistent with approval
- partner-confirmed outcome via attorney/franchise partner feedback
- automated status confirmation if lawful and technically feasible in future

Used for:
- Highest-trust statistics
- Case studies and testimonials prioritized for website

---

### CEAC Confirmation Flow (User-Initiated)

The app uses a user-initiated verification flow rather than requiring
visa upload. This minimizes privacy risk while still anchoring the
reported result to the official U.S. government status system.

In-app flow:

```
VERIFY YOUR OUTCOME

To add a verified badge to your result, confirm the official
status shown in the U.S. Department of State's CEAC system.

Step 1: Open the official status checker
[Open CEAC Status Checker]

Step 2: Enter your details:
• Visa type: Nonimmigrant
• Location: Toronto
• Application ID: [pre-filled hint from your DS-160 record]
• Passport number
• First 5 letters of surname

Step 3: Select what CEAC shows:
  ○ Issued
  ○ Refused
  ○ Administrative Processing
  ○ Other / Pending

[Confirm My CEAC Status]
```

Application ID consistency check:
- compare entered/confirmed application reference against DS-160 data
  already stored in the app
- if mismatch → block Level 3 verification and show support prompt

Important implementation note:
The app does not scrape CEAC as a core requirement. CAPTCHA and
terms-of-use concerns make user-initiated confirmation the primary model.

---

### Verification Display Rules

| Verification Level | Badge | Marketing Use |
|---|---|---|
| 1 | No badge | Internal only |
| 2 | "Self-Reported" | Internal / optional aggregate labeling |
| 3 | "CEAC Verified" | Yes — included in published approval stats |
| 4 | "Dual Verified" | Yes — preferred for testimonials / case studies |

Any public-facing statistics page must define the methodology:
"Verified outcomes are based on user-confirmed official case status,
application-record consistency checks, and, where available,
additional corroborating signals. Unverified self-reports are excluded
from published approval-rate claims."

---

### Outcome Database Fields

Suggested table: applicant_outcomes

Core fields:
- outcome_id
- user_id
- interview_date
- outcome_state
- outcome_reported_at
- visa_received_date
- spouse_approved
- children_approved_count
- family_approved
- denial_reason_codes[]
- 221g_request_codes[]
- questions_asked[]
- interview_duration_bucket
- testimonial_opt_in
- verification_level
- ceac_status_confirmed
- ceac_confirmed_at
- application_id_match
- follow_up_exhausted
- created_at
- updated_at

---

### Feedback Loop Into Product

Outcome data feeds 4 product systems:

1. INTERVIEW SIMULATOR
- questions_asked[] appended to community-sourced question bank
- business-type-specific surprise questions tagged by frequency

2. CONFIDENCE SCORE CALIBRATION
- compare submission score vs. verified outcome
- adjust weightings quarterly based on real patterns

3. KNOWLEDGE BASE UPDATES
- common 221(g) request types become new help articles
- common refusal reasons become new warnings and tooltips

4. MARKETING / TRUST PAGE
- verified approval rate
- average days from interview to visa in hand
- most common document requests
- most common interview questions by business type

---

### Dashboard Outcome Metrics (Internal Admin)

Admin dashboard should show:
- total interviews tracked
- response rate to outcome prompts
- verified outcome count by level
- approval rate (Level 3+ only)
- 221(g) rate
- refusal rate
- average days interview → visa received
- most common refusal reasons
- most common 221(g) requests
- most common interview questions by business category

This dashboard becomes one of the most valuable internal assets.

---

### User-Facing Stats Page (Future)

Once verified outcome volume is sufficient (recommended minimum: 100
Level 3+ outcomes), a public-facing stats page can be launched:

Example metrics displayed:
- Verified approval rate: 92%
- Average days from interview to visa in hand: 8.4
- Average submission score among approved applicants: 84
- Most common 221(g) request: updated source-of-funds documents
- Top interview questions for senior care applicants

All public metrics must be refreshed with a visible "Last updated"
timestamp and methodology note.

---

*End of Sections 7.9 and 7.10*
*Next: Section 8.1 — Terms of Service Draft*
*      Section 8.2 — Privacy Policy Draft*
