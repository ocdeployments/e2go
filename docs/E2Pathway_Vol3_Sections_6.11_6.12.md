# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 3 Continuation — Sections 6.11 & 6.12
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

## 6.11 Cross-Border Tax — The U.S. Side

### Purpose of This Section
Once a Canadian becomes an E-2 visa holder operating a U.S. business, they enter
a complex dual-tax environment. This section powers the app's cross-border tax
advisory content, pre-departure checklist items, and the compliance calendar tax
alerts. It does not constitute tax advice — all content is framed as educational
guidance with referrals to a cross-border CPA for individual situations.

---

### The Dual Tax Reality

Canada and the United States both tax on the basis of residency. Once a Canadian
establishes U.S. tax residency (which happens automatically under certain conditions),
they may owe tax in both countries on the same income. The Canada-U.S. Tax Treaty
(formally: the Convention Between Canada and the United States of America With Respect
to Taxes on Income and on Capital) exists specifically to prevent double taxation —
but navigating it requires professional guidance.

**App disclaimer displayed at start of tax section:**
> "The following information is educational only and reflects general tax principles
> for Canadians on E-2 visas. Tax situations are highly individual. We strongly
> recommend working with a cross-border CPA or tax attorney before making any
> tax-related decisions. Our partner network includes certified cross-border tax
> specialists who work with Canadian E-2 holders — [Connect with a tax specialist →]"

---

### U.S. Tax Residency — When Does It Apply?

E-2 visa holders are nonimmigrant visa holders. Under U.S. tax law, they are
classified as **Resident Aliens** for tax purposes if they meet the Substantial
Presence Test:

**Substantial Presence Test:**
- 31 days present in the U.S. in the current year, AND
- 183 days present over the current year + prior 2 years (weighted: current year
  counts 1x, prior year counts 1/3, year before that counts 1/6)

Most full-time E-2 operators will meet this test and are taxed as U.S. residents
on their worldwide income — the same as a U.S. citizen.

**The treaty exemption:** Under Article IV of the Canada-U.S. Tax Treaty, a person
can be deemed a resident of only one country even if they technically meet the
residency tests of both. A cross-border CPA can help the user establish their
treaty position to avoid being fully taxed in both countries.

---

### Key U.S. Tax Identifiers

**EIN — Employer Identification Number**
- Required for: LLC/corporation tax filing, hiring employees, opening business
  bank accounts, applying for business licenses
- Obtained from: IRS Form SS-4 (online application, free, immediate for U.S.-based
  applicants; takes 4–6 weeks by mail for international applicants)
- App alert: EIN must be obtained before the interview in most cases — it demonstrates
  the business is real and in process
- Canadian applicants can obtain an EIN without an SSN by calling the IRS
  International Line: +1 (267) 941-1099

**ITIN — Individual Taxpayer Identification Number**
- Required for: Personal U.S. tax filing if the investor does not yet have an SSN
- Who needs it: E-2 holders before they receive their SSN (SSN comes after
  entering the U.S. and applying at a Social Security Administration office)
- Obtained from: IRS Form W-7, requires a certified copy of passport
- Note: Once the investor has a valid SSN, the ITIN is no longer used

**SSN — Social Security Number**
- E-2 holders are eligible for an SSN
- Apply at a Social Security Administration office after arriving in the U.S.
  with the E-2 visa stamp
- Required for: employment, most banking, personal tax filing, credit building
- Processing time: 2–4 weeks after application

---

### U.S. Business Tax Structure

**LLC — Limited Liability Company (Most Common for E-2)**

*Single-member LLC (sole owner):*
- Treated as a "disregarded entity" for federal tax purposes
- Business income flows directly to the owner's personal return (Schedule C)
- Self-employment tax applies: 15.3% on net earnings up to $168,600 (2024),
  2.9% on earnings above that
- Simple — no separate business tax return required (federal level)
- Some states require a separate state return

*Multi-member LLC (partnership — relevant for 50/50 E-2):*
- Treated as a partnership for tax purposes
- Files Form 1065 (Partnership Return) — separate business return required
- Each partner receives a K-1 showing their share of income/loss
- Each partner reports K-1 income on their personal return
- Self-employment tax applies to each partner's share of active income

*LLC taxed as S-Corporation (common for reducing self-employment tax):*
- LLC elects S-Corp status by filing Form 2553
- Investor pays themselves a "reasonable salary" subject to payroll taxes
- Remaining profits distributed as dividends — NOT subject to self-employment tax
- Requires payroll setup, quarterly tax deposits, additional compliance
- Beneficial when net profits consistently exceed ~$50,000/year

**App recommendation logic:**
- Net profit < $50K/year projected → recommend single-member LLC (simpler)
- Net profit $50K–$100K/year → show both options, recommend cross-border CPA consult
- Net profit > $100K/year → strongly recommend S-Corp election discussion with CPA

---

### Key U.S. Tax Forms for E-2 Business Owners

| Form | Purpose | Due Date | Who Files |
|---|---|---|---|
| Schedule C (Form 1040) | Business profit/loss (single-member LLC) | April 15 | Individual |
| Form 1065 | Partnership return (multi-member LLC) | March 15 | Business |
| Schedule K-1 | Partner's share of income (from 1065) | March 15 | Business issues to each partner |
| Form 1120-S | S-Corporation return | March 15 | Business |
| Form 941 | Quarterly payroll tax deposit | Quarterly | Business with employees |
| Form 940 | Annual federal unemployment tax (FUTA) | January 31 | Business with employees |
| Form W-2 | Employee wage statement | January 31 | Business (issued to each employee) |
| Form 1099-NEC | Contractor payment reporting | January 31 | Business (issued to each contractor) |
| FinCEN Form 114 (FBAR) | Foreign bank account reporting | April 15 (auto-extend to Oct 15) | Individual |
| Form 8938 (FATCA) | Foreign financial asset statement | April 15 | Individual (if threshold met) |

---

### FBAR — The Most Commonly Missed Obligation

**What it is:** The Foreign Bank Account Report (FBAR) requires U.S. persons
(including resident aliens — E-2 holders who meet the Substantial Presence Test)
to report all foreign financial accounts if the aggregate value exceeded $10,000
at any point during the calendar year.

**What counts as a foreign account:**
- Canadian bank accounts (chequing, savings, investment)
- RRSP and RRIF accounts
- TFSA accounts
- Canadian brokerage accounts
- Beneficial interest in a Canadian corporation's accounts

**The penalty for non-filing:** Up to $10,000 per violation for non-willful
failure; up to $100,000 or 50% of account balance per violation for willful
failure. Criminal penalties possible for willful violations.

**App alert — FBAR:**
> "⚠️ Critical: As a U.S. tax resident, you are required to report your Canadian
> bank accounts annually if their combined value exceeded $10,000 USD at any point
> during the year. This includes your RRSP, TFSA, and any other Canadian financial
> accounts. Failure to file can result in penalties up to $10,000 per account per
> year. This is one of the most commonly overlooked obligations for Canadians on
> E-2 visas. File FinCEN Form 114 annually by April 15. [Learn more →]"

---

### FATCA — Form 8938

**What it is:** The Foreign Account Tax Compliance Act requires U.S. persons to
report specified foreign financial assets on Form 8938 (attached to Form 1040)
if aggregate value exceeds:
- $50,000 (single/MFS) or $100,000 (MFJ) on the last day of the tax year, OR
- $75,000 (single/MFS) or $150,000 (MFJ) at any point during the year

Note: FBAR and Form 8938 are separate requirements with different thresholds.
An account reported on the FBAR must also be reported on Form 8938 if the FATCA
threshold is met. A cross-border CPA handles both.

---

### State Income Tax Considerations

Most U.S. states impose income tax on residents. E-2 holders pay state tax in
the state where they live and operate their business.

**No income tax states (popular E-2 destinations):**
- Florida — NO state income tax ✅ (major reason Canadians choose Florida)
- Texas — NO state income tax ✅
- Nevada — NO state income tax ✅
- Washington — NO state income tax ✅ (but has B&O tax on business revenue)

**Income tax states (common E-2 destinations):**
- California — up to 13.3% state income tax (highest in U.S.)
- New York — up to 10.9% state income tax
- Illinois — 4.95% flat rate
- Georgia — 5.49% flat rate
- North Carolina — 4.5% flat rate

**App alert for state selection:**
When user selects California or New York as target state:
> "Note: [California/New York] has one of the highest state income tax rates in
> the U.S. A cross-border tax specialist can help you model the after-tax impact
> on your projected income. Many Canadian E-2 applicants choose Florida or Texas
> specifically because there is no state income tax, which meaningfully increases
> net take-home income."

---

### Quarterly Estimated Tax Payments

E-2 business owners who expect to owe $1,000+ in federal tax must make quarterly
estimated tax payments to avoid underpayment penalties:

| Quarter | Covers | Due Date |
|---|---|---|
| Q1 | January 1 – March 31 | April 15 |
| Q2 | April 1 – May 31 | June 15 |
| Q3 | June 1 – August 31 | September 15 |
| Q4 | September 1 – December 31 | January 15 (following year) |

**Compliance calendar entries generated automatically:**
The app adds all four quarterly tax payment reminders to the user's compliance
calendar once they have confirmed their U.S. business start date.

---

### The Cross-Border CPA Referral Trigger

The app triggers a cross-border CPA referral recommendation at three points:

1. **During business structure selection** — when user is deciding between
   LLC, S-Corp, or other entity types
2. **When FBAR alert is displayed** — high-stakes compliance obligation
3. **At the pre-departure checklist stage** — before the user leaves Canada,
   a CPA should model the full year-of-departure tax impact

Partner referral: Cross-border CPA firms specializing in Canadian E-2 holders
(e.g., Cardinal Point, Campbell & Haliburton, Keats Connelly) receive warm
referrals from the app. Referral fee: $100–$300 per engaged client.

---

## 6.12 CAD/USD Investment Conversion & Timing

### Purpose of This Section
Every Canadian E-2 applicant is converting Canadian dollars to U.S. dollars for
their investment. The exchange rate directly affects whether their investment meets
the "substantiality" threshold. This section powers the investment section of the
interview engine, the live rate display, and the substantiality warning logic.

---

### Why This Matters for E-2 Applications

The consulate evaluates the investment in USD. A Canadian investor who thinks they
are investing "enough" in CAD may be surprised to find their USD equivalent falls
below the practical threshold for their business type.

**Example at different exchange rates:**

| CAD Investment | Rate 0.68 | Rate 0.72 | Rate 0.76 | Rate 0.80 |
|---|---|---|---|---|
| $150,000 CAD | $102,000 USD | $108,000 USD | $114,000 USD | $120,000 USD |
| $175,000 CAD | $119,000 USD | $126,000 USD | $133,000 USD | $140,000 USD |
| $200,000 CAD | $136,000 USD | $144,000 USD | $152,000 USD | $160,000 USD |
| $250,000 CAD | $170,000 USD | $180,000 USD | $190,000 USD | $200,000 USD |

A $200,000 CAD investment at 0.68 yields only $136,000 USD. For a senior care
franchise with a $150,000 USD investment requirement, this applicant falls short
by $14,000 — a potentially approvable gap or a denial trigger depending on the
officer and the business plan quality.

---

### Live CAD/USD Rate Display in the App

**Implementation:**
The app integrates a free exchange rate API (Open Exchange Rates free tier or
ExchangeRate-API) to display the live CAD/USD rate on every screen where the
user enters investment amounts.

**Display format:**
```
Your Investment in CAD:    $200,000
Live CAD/USD Rate:         0.7234  (as of May 28, 2026 — 3:15 PM ET)
Equivalent in USD:         $144,680

For a senior care franchise in Florida:
Recommended minimum:       $120,000 USD  ✅ You exceed this threshold
Strong position minimum:   $150,000 USD  ⚠️ You are $5,320 below this
```

The rate refreshes every 15 minutes during an active session. If the API is
unavailable, the app displays the last known rate with a timestamp and a note
that the rate may be stale.

---

### Substantiality Thresholds by Business Type

These are practical thresholds observed from Toronto consulate approvals and
denials — not legally mandated minimums. The app uses these as warning triggers:

| Business Type | Minimum (USD) | Strong Position (USD) | Notes |
|---|---|---|---|
| Commercial cleaning | $75,000 | $100,000 | Low-cost business type |
| Home-based service | $75,000 | $100,000 | Must be justified by business costs |
| Staffing agency | $100,000 | $150,000 | Working capital heavy |
| Tutoring / learning centre | $100,000 | $150,000 | Location dependent |
| Senior care (non-medical) | $120,000 | $175,000 | Franchise fee drives minimum |
| IT consulting (with staff) | $100,000 | $150,000 | Working capital + equipment |
| Retail franchise | $150,000 | $250,000 | Build-out costs significant |
| Childcare / daycare | $150,000 | $250,000 | Facility requirements drive cost |
| Food franchise (QSR) | $200,000 | $350,000 | Equipment + build-out heavy |
| Senior care (medical) | $200,000 | $400,000 | Licensing + staff costs |

---

### The Proportionality Test Calculator

The E-2 substantiality test is not just about the dollar amount — it is about
the percentage of total business cost that the investor contributes:

**Proportionality formula:**
Substantiality % = Investor's Total Investment ÷ Total Business Start-Up Cost × 100

**Thresholds by total business cost:**
- Total cost under $100K → investor should contribute 90–100%
- Total cost $100K–$500K → investor should contribute 70–90%
- Total cost $500K–$1M → investor should contribute 50–70%
- Total cost over $1M → investor should contribute 25–50%

**In-app calculator:**

Input fields:
- Total business acquisition/start-up cost (USD): [field]
- Amount investor has personally invested (USD): [field]
- Amount from other sources (loans, seller financing, etc.): [field]

Output:
```
Your proportionality: 78%
Assessment: ✅ Strong — your personal investment represents 78% of 
total business cost, well within the substantiality threshold for 
a business of this size.

Note: Financed amounts (loans, seller financing) generally do NOT 
count toward the E-2 investment unless the investor is personally 
at risk for repayment. Funds held in escrow do NOT count — they 
must be irrevocably committed to the business.
```

---

### The "Funds At Risk" Requirement

This is the most misunderstood E-2 investment requirement. The investment
must be "at risk" — meaning:

**What qualifies as at-risk:**
- Funds already transferred to the U.S. business bank account
- Funds already spent on business assets (lease deposit, equipment, franchise fee)
- Funds irrevocably committed via signed contracts (franchise agreement, lease)
- Personal guarantees on business loans (puts personal assets at risk)

**What does NOT qualify as at-risk:**
- Funds still sitting in a Canadian personal bank account
- Funds in escrow pending visa approval
- Loans where a third party (not the investor) bears all repayment risk
- Funds committed only verbally or by letter of intent

**App warning when funds are not yet transferred:**
> "⚠️ Your investment funds must be 'at risk' in the business before your
> interview. Funds remaining in your Canadian account are not considered
> invested. To strengthen your application, consider: (1) transferring funds
> to a U.S. business bank account, (2) paying the franchise fee or lease
> deposit, or (3) executing binding contracts that irrevocably commit the funds."

---

### Wire Transfer Timing Strategy

The CAD/USD exchange rate fluctuates daily. A difference of 3–4 cents on a
$200,000 CAD transfer represents $6,000–$8,000 USD — potentially the difference
between a borderline and a clearly substantial investment.

**App advisory on wire transfer timing:**
> "Timing your wire transfer strategically can meaningfully increase your U.S.
> investment amount. Consider:
> - Monitor the CAD/USD rate for 2–4 weeks before transferring
> - Rate alerts are available through most Canadian banks and apps like Wise or
>   Knightsbridge Foreign Exchange
> - Specialist currency brokers (Wise, OFX, Knightsbridge) typically offer
>   0.5–1% better rates than Canadian banks on large transfers
> - On a $200,000 CAD transfer, a 1% rate improvement = $2,000 USD additional
>   investment — no additional money required
> - Transfer early enough that funds clear before your interview date (allow
>   7–10 business days for international wires)"

**Recommended currency transfer services for large E-2 investments:**
- **Wise (formerly TransferWise):** Competitive rates, transparent fees, fast
- **OFX:** Good for large transfers, personal account managers available
- **Knightsbridge Foreign Exchange:** Canadian-focused, often best rates for
  CAD/USD, specialists in large cross-border transfers
- **Canadian bank wire:** Convenient but typically 1–2% below specialist rates

App displays a projected savings comparison when user enters their transfer amount:

```
Your transfer: $200,000 CAD

Estimated USD received:
TD Bank wire:          $141,200  (rate: 0.706)
Wise:                  $143,800  (rate: 0.719)
Knightsbridge FX:      $144,400  (rate: 0.722)

Potential savings vs. bank wire: up to $3,200 USD
```

---

### Pre-Transfer Checklist (App-Generated)

Before wiring investment funds to the U.S., the app generates a personalized
pre-transfer checklist:

1. ☐ U.S. business bank account is open and account details confirmed
2. ☐ LLC or corporation is formed in the target state (account must be in
      the business name, not personal name)
3. ☐ EIN has been obtained (required to open most U.S. business accounts)
4. ☐ Wire transfer instructions confirmed with U.S. bank in writing
5. ☐ Source of funds documentation is complete — all steps in Template 1
      are documented BEFORE the wire (the wire itself becomes the final
      step in the chronology)
6. ☐ Canadian bank is notified of the international transfer (some banks
      flag large outgoing wires — notify your banker in advance)
7. ☐ Currency specialist account opened if using OFX or Knightsbridge
8. ☐ Transfer amount confirmed against live CAD/USD rate
9. ☐ Transfer executed with sufficient time before interview (10+ business days)
10. ☐ Wire confirmation receipt saved — this becomes Tab F evidence

---

### Compliance Calendar Entries for Investment Transfer

The app adds the following investment transfer milestones to the compliance
calendar based on the user's target interview date:

- **T-12 weeks:** Open U.S. business bank account
- **T-10 weeks:** Obtain EIN if not already done
- **T-8 weeks:** Monitor CAD/USD rate; set up rate alerts
- **T-6 weeks:** Execute wire transfer (allows buffer for delays)
- **T-5 weeks:** Confirm funds received in U.S. business account
- **T-5 weeks:** Save wire confirmation receipt for Tab F
- **T-4 weeks:** Confirm all investment funds are deployed (lease,
                  equipment, franchise fee) — funds in account alone
                  may not be sufficient at-risk evidence
- **Interview day:** Bring bank statement showing fund receipt + deployment

---

*End of Sections 6.11 and 6.12*
*Next: Section 6.13 — What the Consulate Officer Is Actually Looking For,
and Section 7.1 — Eligibility Quiz Module Specification*
