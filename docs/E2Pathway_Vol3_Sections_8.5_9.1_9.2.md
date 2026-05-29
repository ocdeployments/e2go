# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 3 Continuation — Sections 8.5 & 9.1
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

## 8.5 CASL-Compliant Referral & Marketing Consent Language

### Overview
Canada's Anti-Spam Legislation (CASL) governs commercial electronic
messages sent to Canadian recipients. It also applies to the collection
of consent for referrals that involve third-party commercial contact.
All consent language in the App must comply with CASL and, where
applicable, PIPEDA. This section defines the exact language and
mechanics for every consent touchpoint.

---

### CASL Fundamentals That Govern E2Pathway

CASL applies when:
(a) The App sends commercial electronic messages (CEMs) to users
(b) The App facilitates third parties sending CEMs to users via referral

Key requirements for valid CASL consent:
1. Consent must be express (not implied for new contacts)
2. Consent must be clearly and simply requested
3. The identity of the sender(s) must be disclosed
4. The purpose of the message must be disclosed
5. An unsubscribe mechanism must be included in all CEMs
6. Consent cannot be bundled with ToS acceptance
7. Pre-checked boxes are NOT valid consent under CASL

---

### 8.5.1 E2Pathway Marketing Email Consent

Displayed at account registration — SEPARATE from ToS checkbox:

```
OPTIONAL: Stay informed about E-2 visa updates

[ ] I would like to receive occasional emails from E2Pathway
    about E-2 visa policy changes, consulate updates, and tips
    for maintaining my visa status.

    You can unsubscribe at any time. We send no more than
    2–4 emails per month. We will never share your email
    address for marketing purposes.

    Sender: E2Pathway Inc., [Address]
```

Consent record stored:
- marketing_consent = true/false
- consent_timestamp
- consent_method = "registration_form"
- consent_ip_address (hashed)
- consent_version (links to the exact text shown)

If user did not opt in at registration, a single re-prompt is
permitted after 90 days:

Re-prompt (in-app banner only, not email):
"Want to receive updates on E-2 visa policy changes?
We send 2–4 emails per month. [Yes, sign me up] [No thanks]"

After one re-prompt, if declined, no further marketing prompts shown.

---

### 8.5.2 Referral Consent — Franchise Consultant

Displayed when franchise referral is triggered:

```
CONNECT WITH A FRANCHISE CONSULTANT

You've asked to be connected with an E-2-compatible franchise consultant.

By tapping "I Consent" below, you authorize E2Pathway to share
your name, email address, phone number, investment budget, preferred
business categories, and target state(s) with our franchise consultant
partner.

The consultant may contact you by email or phone to discuss franchise
opportunities. Their messages will include an unsubscribe option.

Important disclosures:
• E2Pathway may receive a referral fee from this introduction.
• You are under no obligation to engage this consultant.
• Your information will NOT be shared unless you tap "I Consent."
• You can request deletion of this referral record at any time
  by contacting privacy@e2pathway.com.

Sender identity: [Partner Name], [Partner Address]

[ ] I have read the above and understand what I am consenting to.
[ ] I consent to E2Pathway sharing my information with this partner.
[ ] I consent to being contacted by this partner about franchise
    opportunities.

[I Consent — Send Introduction]   [Cancel]
```

Consent record stored:
- referral_consent_type = "franchise"
- partner_id
- consent_timestamp
- fields_shared[]
- compensation_disclosed = true
- consent_version
- all 3 boxes confirmed = true

---

### 8.5.3 Referral Consent — Immigration Attorney

```
CONNECT WITH AN E-2 IMMIGRATION ATTORNEY

Based on information in your application, we recommend speaking with
a licensed E-2 immigration attorney before proceeding.

By tapping "I Consent" below, you authorize E2Pathway to share
your name, email address, phone number, and a summary of the
specific issues flagged in your application (listed below) with
our attorney partner network.

Issues to be shared: [dynamic list from attorney referral flags,
e.g., "prior visa denial", "pending immigration application"]

Important disclosures:
• E2Pathway may receive a referral fee from this introduction.
• This referral does not create an attorney-client relationship.
• You are under no obligation to engage the referred attorney.
• Your detailed application data, passport information, or financial
  documents will NOT be shared — only the issue summary above.

Sender identity: [Attorney / Firm Name], [Address]

[ ] I understand what information will be shared.
[ ] I consent to being contacted by an immigration attorney about my case.

[I Consent — Connect Me]   [Cancel]
```

---

### 8.5.4 Referral Consent — Cross-Border CPA

```
CONNECT WITH A CROSS-BORDER TAX SPECIALIST

Based on your profile, you may benefit from speaking with a CPA
experienced in Canadian departure tax, non-resident tax obligations,
and U.S. business tax compliance.

By tapping "I Consent" below, you authorize E2Pathway to share
your name, email address, phone number, target U.S. state, and
a summary of your tax situation (listed below) with our CPA partner.

Tax flags to be shared: [dynamic list, e.g.,
"RRSP withdrawal", "Canadian departure tax not yet filed",
"FBAR compliance required"]

Important disclosures:
• E2Pathway may receive a referral fee from this introduction.
• You are under no obligation to engage the referred CPA.
• Your detailed financial data will NOT be shared.

[ ] I understand what information will be shared.
[ ] I consent to being contacted by a CPA about my tax situation.

[I Consent — Connect Me]   [Cancel]
```

---

### 8.5.5 Referral Consent — Banking Specialist

```
CONNECT WITH A CROSS-BORDER BANKING SPECIALIST

Opening a U.S. business account as a Canadian can be complex.
Our banking partners specialize in helping Canadians set up
U.S. business accounts and manage cross-border transfers.

By tapping "I Consent" below, you authorize E2Pathway to share
your name, email address, phone number, and business state with
our banking partner.

Important disclosures:
• E2Pathway may receive a referral fee from this introduction.
• You are under no obligation to use this banking partner.

[ ] I understand what information will be shared.
[ ] I consent to being contacted by a banking specialist.

[I Consent — Connect Me]   [Cancel]
```

---

### 8.5.6 Testimonial Consent

Displayed in the outcome capture flow when user opts to share a testimonial:

```
SHARE YOUR STORY

Would you like your experience to be featured on the E2Pathway
website or marketing materials to help future Canadian applicants?

If yes, your testimonial may include:
• Your first name (or initials — your choice)
• Your business type and U.S. state
• Your verified outcome
• The quote you provide below

Your testimonial will NOT include:
• Your last name (unless you request it)
• Your passport or application ID information
• Any financial details beyond what you choose to share

Your quote: [text field — minimum 20 words]
How would you like to be identified?
  ○ First name only (e.g., "David, Ontario")
  ○ Initials only (e.g., "D.M., Ontario")
  ○ Anonymous (e.g., "E2Pathway subscriber, Ontario")

[ ] I consent to E2Pathway publishing my testimonial quote and
    the identification I have chosen above on its website and
    promotional materials.
[ ] I understand I can withdraw this consent at any time by
    contacting support@e2pathway.com, and my testimonial will
    be removed within 7 business days.

[Submit Testimonial]   [Skip]
```

---

### 8.5.7 Unsubscribe Mechanics

All commercial emails sent by E2Pathway must include:

Footer required by CASL:
"You are receiving this email because you are a subscriber to
E2Pathway or have consented to receive communications from us.
To unsubscribe, click here: [unsubscribe link] or contact us at
support@e2pathway.com. E2Pathway Inc., [Address]."

Unsubscribe processing:
- One-click unsubscribe via tokenized link (no login required)
- Unsubscribe processed within 10 business days (CASL requirement)
- Unsubscribe confirmation email sent immediately
- Preference centre available for granular opt-out
  (e.g., unsubscribe from marketing but keep compliance reminders)

Preference categories:
  □ Compliance calendar reminders (cannot unsubscribe while active subscription)
  □ Visa policy update emails (marketing — can unsubscribe)
  □ Product feature announcements (marketing — can unsubscribe)
  □ Outcome follow-up messages (can opt out)
  □ Renewal reminders (cannot fully unsubscribe while in renewal window)

---

## 9.1 Pricing, Tiers & Licensing Matrix

### Pricing Philosophy

E2Pathway is priced at a fraction of immigration attorney fees
($5,000–$15,000 USD for a full E-2 package) while delivering
the organizational and preparation value of a structured legal process.
Pricing must:
- Feel accessible relative to the total cost of an E-2 application
- Reflect the genuine value delivered (not underpriced)
- Protect against account sharing and multi-user abuse
- Create a natural upgrade path from solo to family to partnership
- Generate recurring revenue through the renewal module

---

### Tier 1 — Solo Applicant

**Price: $197 USD**
For a single E-2 investor applying alone (no spouse, no dependents,
or dependents who do not require their own documentation).

Includes:
✓ Full Module 1–3 interview engine (131 questions)
✓ All 5 generated templates:
  - DS-160 Reference Sheet
  - Cover Letter (Tab D)
  - Source of Funds Chronology (Tab H / Template 1)
  - Business Plan (Tab K / Template 2)
  - Asset Register (Template 3)
  - Organizational Chart (Template 4)
  - Hiring Plan (Template 5)
✓ Application binder checklist (all 11 tabs)
✓ Application Confidence Score
✓ Interview Simulator (unlimited sessions)
✓ Compliance Calendar (pre-interview phase)
✓ PDF export of complete package
✓ 1 application only (not transferable)

Not included:
✗ Spouse/dependent documentation (upgrade to Tier 2)
✗ Partner application (upgrade to Tier 3)
✗ Renewal module (sold separately)

---

### Tier 2 — Extended Family

**Price: $297 USD**
For a single E-2 investor applying with a spouse and/or dependent children.

Includes everything in Tier 1, plus:
✓ Spouse DS-160 Reference Sheet
✓ Tab L (Dependent Information) generation for all covered dependents
✓ EAD (Employment Authorization Document) eligibility guide for spouse
✓ Dependent passport checklist (per child)
✓ Child age-out alert and tracking (compliance calendar)
✓ Post-approval compliance calendar (full 5-year cycle including
  dependent status reminders)
✓ Up to 4 dependents included (spouse + 3 children)

Add-on: Additional dependent beyond 4 — $15 USD each

---

### Tier 3 — Partnership

**Price: $397 USD**
For two Canadian co-investors in a 50/50 E-2 partnership.

Includes everything in Tier 2 for both applicants, plus:
✓ Two complete, independent application packages
✓ Shared business plan with dual-investor language
✓ Operating Agreement template (50/50 ownership, voting, management)
✓ Investment Allocation Narrative (per partner)
✓ Two cover letters (each independently proving management role)
✓ Two DS-160 Reference Sheets
✓ Two Interview Preparation Guides
✓ Dual interview simulation (each partner simulated independently)
✓ Partner role differentiation review (app flags if roles overlap)
✓ Up to 2 sets of dependents (one family per partner)

Note: Partnership pricing assumes both investors are Canadian citizens
applying at the Toronto consulate. If one partner is applying via COS,
additional COS module access is included.

---

### Tier 4 — Change of Status Add-On

**Price: $47 USD** (add-on to any tier)
For applicants already inside the United States applying via Form I-129
instead of the Toronto consulate.

Includes:
✓ I-129 reference sheet (pre-filled from Module 3 data)
✓ E Classification Supplement reference sheet
✓ COS-specific cover letter (narrative format, no tab structure)
✓ COS checklist (USCIS format — different from consular)
✓ COS-specific compliance calendar (no travel advisory, I-94 tracking)
✓ COS vs. consular comparison guide

---

### Renewal Pricing

#### Renewal — Consular (Toronto) or USCIS Path A/B

| User Type | Price |
|---|---|
| Existing E2Pathway user — Solo | $97 USD |
| Existing E2Pathway user — Family | $127 USD |
| Existing E2Pathway user — Partnership | $197 USD |
| New user (did not use app originally) — Solo | $147 USD |
| New user — Family | $177 USD |
| New user — Partnership | $297 USD |

Renewal includes:
✓ Template 6 — Actual vs. Projected Performance Table
✓ Updated Business Plan (full regeneration)
✓ Renewal Cover Letter
✓ Updated Application Confidence Score
✓ Renewal Interview Simulator (renewal-specific questions)
✓ Compliance Calendar reset (next 5-year cycle)
✓ Both Path A (consular) and Path B (USCIS) packages generated
  simultaneously — user selects which to submit

---

### Add-On Pricing

| Add-On | Price | Description |
|---|---|---|
| Additional dependent | $15 USD | Each dependent beyond included limit |
| Extra PDF export | $9 USD | Each export after first 3 (anti-sharing) |
| Attorney review referral | Free (referral fee earned) | Consent-based introduction |
| Franchise matching | Free (referral fee earned) | Consent-based introduction |
| CPA referral | Free (referral fee earned) | Consent-based introduction |
| Expedited compliance calendar | $19 USD | For users with < 60 days to interview |
| Interview simulation — premium | Included in all tiers | Unlimited sessions |

---

### Anti-Sharing Architecture

The primary commercial risk is a user purchasing one subscription and
sharing the login and generated PDFs with multiple applicants. The
following mechanisms deter and detect sharing:

#### Mechanism 1 — Device Fingerprinting

The app records:
- Browser fingerprint (UserAgent, screen resolution, timezone,
  installed fonts hash, WebGL renderer hash)
- IP address (hashed for privacy, used for pattern detection only)
- Device OS and version

Threshold: If the same account is accessed from 3+ distinct device
fingerprints within a 7-day period, a security alert is triggered:

In-app alert:
"Your account has been accessed from multiple devices recently.
If this was you, no action is needed. If you did not authorize
these sessions, please change your password immediately."

Internal flag: account_sharing_suspected = true
Action: Support team reviews. Second flag within 30 days triggers
account suspension pending review.

#### Mechanism 2 — Per-Application Slot Model

Rather than unlimited applications per account, each plan includes
exactly one application slot. A second application (different business
or different investor) requires a new purchase.

The application slot is defined by:
- Applicant legal name (set at Module 1 entry, locked after first PDF export)
- Business name (set at Module 2 entry, locked after first PDF export)

After first PDF export, name fields are locked and displayed as:
"Application for: [Name] — [Business Name]
[This application is locked. To start a new application, purchase
a new plan.]"

#### Mechanism 3 — PDF Watermarking

All exported PDFs are watermarked with:
- User's email address (light gray diagonal watermark, human-readable)
- Generation timestamp
- A unique document ID tied to the user account

The watermark serves two purposes:
(a) Deters sharing — users are aware their identity is embedded
(b) Enables tracing — if a shared PDF is discovered, the source can
    be identified

Watermark implementation:
- Inserted at PDF generation stage before download
- Watermark layer is embedded, not a simple overlay (harder to remove)
- Document ID stored in database for verification if needed

#### Mechanism 4 — Export Limit Per Plan

Each plan includes 3 PDF exports of the complete package.
(Users legitimately need to re-export after edits — 3 covers normal use.)

Additional exports: $9 USD each.

This limits the practical value of sharing a single account to
generate packages for multiple users, since each export costs money
after the first 3.

#### Mechanism 5 — Name Certification Lock

The business plan certification flow (Section 8.4) requires the user
to type their legal name to export. This name must match the account's
registered name. A different person cannot export the package without
changing the account name — which triggers a support review.

---

### Pricing Display Best Practices

Pricing page framing:
Always anchor against immigration attorney cost, not competitors.

Example:
"E-2 immigration attorneys typically charge $5,000–$15,000 USD
for a complete application package. E2Pathway gives you the same
organized, thorough preparation — in a guided app — for a fraction
of that cost. You direct. You control. You submit.

E2Pathway is not a replacement for an immigration attorney.
It is the preparation system that makes your attorney's time
— and your own — dramatically more efficient."

Pricing table guidance:
- Show Tier 2 (Family) as the highlighted / recommended tier
- Reason: it is the most common profile and the mid-price option
  appears most reasonable when anchored against Tier 3
- Use checkmarks (✓) for inclusions, not bullet points
- Show "most popular" badge on Tier 2

Annual vs. one-time:
The initial application plans are one-time purchases, not subscriptions.
Only the compliance calendar (post-approval) is an optional annual
subscription ($29 USD/year after the first year).

The renewal module is a separate one-time purchase when the user
is ready to renew (Year 4–5).

---

### Revenue Model Summary

| Revenue Stream | Price | Frequency |
|---|---|---|
| Tier 1 — Solo | $197 | One-time per application |
| Tier 2 — Family | $297 | One-time per application |
| Tier 3 — Partnership | $397 | One-time per application |
| Tier 4 — COS Add-On | $47 | One-time per application |
| Compliance Calendar (Year 2+) | $29 | Annual renewal |
| Renewal Module — Existing User | $97–$197 | Once per renewal cycle (every 5 years) |
| Renewal Module — New User | $147–$297 | Once per renewal cycle |
| Additional dependent | $15 | Per dependent beyond limit |
| Extra PDF export | $9 | Per export after first 3 |
| Referral fees | Variable | Per successful referral conversion |

---

### Projected Revenue Per User (Lifetime)

Assumption: average user is a family applicant (Tier 2)
who renews once and maintains compliance calendar.

| Event | Revenue |
|---|---|
| Initial application — Tier 2 | $297 |
| Compliance Calendar — Year 2, 3, 4 | $87 ($29 × 3) |
| Renewal Module — Year 5 (existing user) | $127 |
| 1 referral conversion (franchise) | ~$200–$500 est. |
| **Estimated LTV per subscriber** | **~$711–$1,011** |

This LTV figure does not include partnership upgrades, COS add-ons,
or CPA/attorney referral conversions — all of which increase LTV further.

---

## 9.2 Anti-Sharing Architecture Summary

(Full specification incorporated into Section 9.1 above.
This section serves as a cross-reference index.)

Anti-sharing mechanisms implemented:
1. Device fingerprinting — detects multi-device access anomalies
2. Per-application slot model — one applicant name locked per purchase
3. PDF watermarking — email + timestamp + document ID embedded in export
4. Export limit — 3 free exports per plan; $9 USD each thereafter
5. Name certification lock — legal name match required to export

These five mechanisms in combination make sharing impractical enough
that the incremental friction exceeds the cost of a second subscription
for most users.

---

*End of Sections 8.5 and 9.1 / 9.2*
*Next: Section 9.3 — Renewal Pricing (expanded)*
*      Section 10.1 — Go-To-Market Launch Sequence*
*      Section 10.2 — Email Nurture Sequence (10 emails)*
