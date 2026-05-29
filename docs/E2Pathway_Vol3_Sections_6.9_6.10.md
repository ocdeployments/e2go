# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 3 Continuation — Sections 6.9 & 6.10
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

## 6.9 Business Type Advisor & Compatible Business Categories

### Purpose of This Section
The Business Type Advisor is one of the most critical modules in the app. Many Canadians arrive with a business idea that either disqualifies them outright or creates unnecessary complications. This knowledge base section powers Module 2 — the advisor that steers users toward compatible, approvable business types based on their budget, skills, and target state.

---

### The Four Business Acquisition Models

**Model 1 — Buying a Franchise (New)**
The most common E-2 path for Canadians. A franchise provides:
- A proven business model (reduces marginality risk)
- Documented investment amount (franchise fee + buildout = clear "substantial" figure)
- Training and support (strengthens "investor will develop and direct" argument)
- Brand recognition (supports revenue projections)
- FDD (Franchise Disclosure Document) serves as built-in business plan evidence

*App handling:* Franchise route triggers franchise-specific questions — franchise name, FDD review status, territory agreement, training completion timeline. Cover letter language emphasizes franchisor support and proven unit economics.

**Model 2 — Buying an Existing Business**
Purchasing an operating business from a seller:
- Investment amount = purchase price (must be at-risk, not escrowed)
- Business already has revenue history (strongest non-marginality evidence)
- Must show buyer will actively manage (not just collect passive income)
- Seller financing can complicate "funds at risk" requirement — must be addressed

*App handling:* Existing business route requires purchase agreement as Tab F evidence, prior years' P&L from seller (last 3 years recommended), and a transition plan showing the investor's management takeover.

**Model 3 — Starting a New Business (Greenfield)**
Building a business from scratch:
- Highest scrutiny — no operating history, projections only
- Investment must already be partially deployed by interview date
- Business plan quality is the primary approval factor
- Must show lease signed, equipment purchased, licenses applied for — business "in process"

*App handling:* Greenfield route requires the strongest business plan inputs. The app will not generate a cover letter until at least 3 of these are confirmed: lease signed, EIN obtained, bank account opened, licenses applied for, equipment purchased/ordered.

**Model 4 — Investing in an Existing Partner's Business**
A Canadian invests capital into a business already run by a U.S. person:
- Canadian investor must own exactly 50% and have genuine management role
- The U.S. partner's existing ownership must be restructured to exactly 50/50
- High scrutiny — officer must be convinced the Canadian is not a passive investor
- Operating agreement restructuring required

*App handling:* Routes to partnership flow. Additional warning displayed: "This scenario receives heightened scrutiny. Your cover letter must demonstrate a clearly defined, active management role that is distinct from your U.S. partner's role."

---

### Business Category Compatibility Matrix

| Business Category | E-2 Compatible | Licensing Risk | Minimum Investment | Notes |
|---|---|---|---|---|
| Senior home care (non-medical) | ✅ Strong | Medium — state license required | $100K–$200K | Top Canadian choice; recurring revenue |
| Senior home care (medical/skilled nursing) | ✅ Strong | High — nursing regulations | $200K–$500K | Requires licensed staff |
| Childcare / daycare | ✅ Strong | High — state + local licensing | $150K–$350K | Strong job creation story |
| Commercial cleaning / janitorial | ✅ Strong | Low | $75K–$150K | Easy to scale, strong hiring plan |
| Tutoring / learning centre | ✅ Strong | Low–Medium | $100K–$250K | Franchise options available (Kumon, Sylvan) |
| Food franchise (QSR) | ✅ Strong | Medium — food service permits | $200K–$500K | Strong brand = strong plan |
| Staffing / recruitment agency | ✅ Strong | Low–Medium | $100K–$200K | Job creation is built into the model |
| Retail franchise | ✅ Strong | Low | $150K–$350K | Must show active management |
| IT / tech consulting (with staff) | ✅ Compatible | Low | $100K+ | Must have employees — not solo consulting |
| Real estate management company | ⚠️ Conditional | Medium | $150K+ | Active management only — not passive rental |
| Home-based service business | ⚠️ Conditional | Low | $75K+ | Must show client interaction, physical workspace |
| Online e-commerce (with operations) | ⚠️ Conditional | Low | $100K+ | Must show real operations, inventory, staff |
| Solo consulting (no staff) | ❌ Risky | Low | N/A | "Marginal" and "no job creation" flags |
| Passive rental portfolio | ❌ Disqualified | N/A | N/A | Not a real and operating enterprise |
| Cannabis business | ❌ Disqualified | N/A | N/A | Federally illegal |
| Nonprofit | ❌ Disqualified | N/A | N/A | Must be for-profit |

---

### Business Selection Logic in the App

**Step 1 — Budget Filter**
Question: "What is your available investment budget in USD?"
- $75,000–$100,000
- $100,000–$150,000
- $150,000–$250,000
- $250,000–$500,000
- $500,000+

Businesses below the user's minimum investment floor are hidden. Businesses requiring more than the user's budget are shown with a warning.

**Step 2 — Skills & Experience Filter**
Question: "Which of the following best describes your professional background?"
- Healthcare / caregiving
- Education / training
- Business management / operations
- Sales / marketing
- Trades / technical
- Technology / IT
- Finance / accounting
- Other

This filter weights compatible business types higher in the recommendation list.

**Step 3 — Target State Filter**
Question: "Which U.S. state are you targeting?"

State selection triggers licensing requirement alerts:
- Florida, Texas, California, Arizona — most common E-2 destination states
- Each state has different licensing requirements for senior care, childcare, food service
- App displays state-specific licensing alerts from kb/licensed-industries.md

**Step 4 — Business Model Preference**
Question: "Do you have a preference for how you acquire the business?"
- I want to buy a franchise (proven model, brand support)
- I want to buy an existing business (already operating)
- I want to start from scratch (my own concept)
- I want to invest in a partner's existing business
- I'm not sure yet — show me options

**Output — Business Shortlist (Top 3 Recommendations):**
The app generates a ranked list of compatible business types with:
- Star rating (compatibility score)
- Investment range
- Licensing complexity rating
- Personalized "Why this works for you" narrative referencing the user's background and target state
- Franchise referral integration point if franchise option selected without a specific brand identified

---

### Franchise Referral Integration Point
If user selects a franchise option and does not yet have a specific franchise identified:

Prompt: "Want help finding the right franchise for your E-2 application? Our partner franchise consultants work with Canadians specifically and can match you with vetted, E-2-compatible franchises in your target state — at no cost to you."

Options:
- [Connect me with a franchise consultant →] — triggers referral consent flow (Section 7.9)
- [I'll find one myself] — proceeds to Module 3

---

## 6.10 Licensed Industries Deep Dive

### Purpose of This Section
Licensed industries — particularly senior care, childcare, and healthcare-adjacent businesses — are among the most popular E-2 business choices for Canadians, especially those with healthcare or education backgrounds. They also carry the highest licensing complexity. This section powers the app's state-specific licensing alerts and the business-type-specific interview prep questions.

---

### Why Licensed Industries Require Special Treatment

**The timing problem:** A consular officer will ask whether licenses have been applied for. If the user is at the interview stage and has not begun the licensing process, this is a serious red flag. The officer may question whether the business is genuinely "in process" of operating.

**The investor qualification problem:** Some licensed industries (medical, nursing, childcare) require that key staff — and sometimes the investor personally — hold specific certifications or credentials. A Canadian investor without U.S.-recognized credentials cannot personally hold the required license in some states, meaning they must hire a licensed administrator or director of care from day one. This affects the business plan, the org chart, and the cover letter.

**The state variation problem:** Licensing requirements vary dramatically by state. A non-medical senior care business in Florida has different requirements than the same business in Texas or California. The app must surface the correct requirements for the user's target state.

---

### Senior Home Care (Non-Medical)

**What it is:** Providing companionship, personal care (bathing, grooming, meal prep), and homemaking services to seniors. Does NOT include skilled nursing, medication administration, or medical procedures.

**Why it works for E-2:**
- High demand in Florida, Arizona, Texas, and California (large retiree populations)
- Recurring revenue model (weekly/monthly service contracts)
- Immediate job creation (caregivers hired as W-2 employees or 1099 contractors)
- Franchise options widely available (Home Instead, Visiting Angels, Comfort Keepers, Right at Home, BrightSpring)
- Investment range well within E-2 substantiality thresholds

**Licensing by state:**

| State | License Required | Issuing Body | Processing Time | Investor Must Hold? |
|---|---|---|---|---|
| Florida | Home Health Agency License OR Companion/Homemaker Registration | AHCA (Agency for Health Care Administration) | 60–120 days | No — must hire licensed administrator |
| Texas | Home and Community Support Services Agency (HCSSA) License | HHSC (Health and Human Services Commission) | 90–150 days | No — must hire licensed administrator |
| California | Home Care Organization (HCO) License | CDSS (Dept of Social Services) | 6–12 months | No — designated administrator required |
| Arizona | No state license required for non-medical | N/A | N/A | N/A — county/city permits only |
| Georgia | No state license required for non-medical | N/A | N/A | N/A — county/city permits only |
| North Carolina | Home Care Agency License | DHHS | 90–120 days | No — administrator required |

**App alert triggered when user selects senior care + California:**
> "⚠️ Important: California's Home Care Organization license takes 6–12 months to process. You must begin the licensing application BEFORE your E-2 interview to demonstrate the business is genuinely in process. We recommend starting this process at least 8 months before your target interview date."

**Key interview questions specific to senior care:**
1. "What license have you applied for and what is the current status?"
2. "How will you staff the business — employees or contractors?"
3. "Do you have a Director of Care / Administrator identified?"
4. "How will you acquire your first clients?"
5. "What distinguishes your service from competitors in this market?"
6. "What is your caregiver training protocol?"

**Cover letter language specific to senior care:**
The cover letter must address:
- The investor's role as owner/operator/administrator (not just passive investor)
- The licensing status and application timeline
- The hiring plan (how many caregivers, timeline, W-2 vs. 1099 decision)
- Why the target market (specific city/county) supports the revenue projections
- The competitive landscape and how the business differentiates

---

### Senior Home Care (Medical / Skilled Nursing)

**What it is:** Providing skilled nursing care, physical therapy, occupational therapy, wound care, or medication administration in the home. Requires licensed medical staff.

**Licensing complexity:** HIGH in all states. Requires a Medicare/Medicaid-certified Home Health Agency (HHA) license in most states — one of the most complex and time-consuming licenses in the healthcare industry.

**Processing times:** 6 months to 2 years depending on state. Some states (California, New York) have moratoriums on new HHA licenses.

**App alert for medical senior care:**
> "⚠️ High Complexity: Medical home health agency licenses are among the most difficult and time-consuming to obtain in the U.S. Processing times range from 6 months to over 2 years. This business type is generally not recommended for first-time E-2 applicants due to the licensing timeline creating a mismatch with your interview schedule. Consider non-medical senior care as an alternative — it qualifies equally well for E-2 with lower licensing complexity."

---

### Childcare / Daycare

**What it is:** Operating a licensed childcare facility, daycare centre, or after-school program.

**Why it works for E-2:**
- Strong job creation (teachers, aides, administrators)
- High community demand
- Franchise options available (The Learning Experience, Primrose Schools, Kiddie Academy)
- Recurring revenue (monthly tuition model)

**Licensing by state:**

| State | License Required | Issuing Body | Processing Time | Key Requirements |
|---|---|---|---|---|
| Florida | Child Care Facility License | DCF (Dept of Children and Families) | 60–90 days | Background checks, facility inspection, staff ratios |
| Texas | Child-Care Center License | HHSC | 90–120 days | Director must have CDA credential or degree |
| California | Community Care Facility License | CDSS | 4–8 months | Extensive facility and staff requirements |
| Arizona | DHS Child Care License | ADHS | 60–90 days | Background checks, CPR certification |

**Key issue for Canadian investors:** The childcare director in most states must hold specific U.S. credentials (CDA — Child Development Associate, or an early childhood education degree). A Canadian investor without these credentials must hire a qualified director. The org chart and business plan must reflect this from day one.

**App alert for childcare:**
> "Note: Most states require the childcare facility director to hold U.S.-recognized credentials (CDA certification or equivalent degree). If you do not hold these credentials, you will need to hire a qualified director as part of your staffing plan. Your org chart and business plan should reflect this role and its associated salary from Year 1."

---

### Commercial Cleaning / Janitorial Services

**What it is:** Providing commercial cleaning services to offices, retail establishments, medical facilities, or other commercial clients.

**Why it works for E-2:**
- Low licensing complexity (business license + liability insurance in most states)
- Low investment threshold ($75K–$150K covers equipment, vehicle, initial working capital)
- Easy to demonstrate hiring plan (cleaners hired quickly as business grows)
- Franchise options available (Jan-Pro, Coverall, Anago, Stratus Building Solutions)
- Recurring revenue (contract-based cleaning schedules)

**Licensing:** No industry-specific state license required in most states. Standard requirements:
- Business entity formation (LLC)
- General business license (city/county)
- General liability insurance ($1M minimum)
- Workers' compensation insurance (once first employee hired)
- Bonding (many commercial clients require bonded cleaners)

**E-2 strength factors:**
- Low marginality risk — easy to scale with employees
- Immediate job creation story
- Tangible investment (equipment, vehicle, supplies)
- Contract-based clients provide revenue predictability for projections

**App alert:** None for licensing. Standard investment substantiality warning applies if budget is below $75K USD.

---

### IT / Technology Consulting (With Staff)

**What it is:** Providing technology consulting, software development, IT support, or managed services to business clients.

**Why it can work for E-2 — but with conditions:**
- The investor must not be the sole service provider
- Revenue must come from client work performed by employees — not just the investor's personal labor
- Must demonstrate a scalable business model with hiring projections
- Strong case when the investor has a management role and hires technical staff

**The solo consultant disqualifier:**
If the business model is: "I consult with clients and they pay me for my expertise" — this is a personal service business, not an enterprise. The investor IS the business. There is no job creation. This fails both the marginality test and the "real enterprise" test.

**What makes it work:**
- Hiring at least 2 FT employees in Year 1 (developers, analysts, support staff)
- Having existing client contracts or LOIs at interview time
- Demonstrating the business generates revenue from client work, not just the investor's billable hours
- Showing a management structure where the investor manages the team rather than performs all the work

**App warning for IT consulting:**
> "⚠️ IT consulting qualifies for E-2 only when structured as a genuine enterprise — not as a personal services business. Your business plan must show employees hired to deliver services, clients beyond your personal network, and a management structure where you direct the business rather than perform all the work yourself. We'll help you structure this correctly."

---

### Real Estate Management (Conditional)

**The distinction that matters:**
- ❌ Passive real estate investment (owning rental properties and collecting rent) = DOES NOT QUALIFY
- ✅ Active real estate management company (managing properties for third-party owners, providing maintenance, tenant management, renovations) = CAN QUALIFY

**What a qualifying real estate management company looks like:**
- The company provides management services to property owners (not just the investor's own properties)
- Employees are hired to perform maintenance, tenant relations, leasing
- Revenue comes from management fees — not passive rental income
- The investor actively directs the management operations

**App warning for real estate:**
> "⚠️ Passive real estate investment (buying rental properties and collecting rent) does not qualify for the E-2 visa. However, an active real estate management or property services company can qualify if structured correctly. Tell us more about your specific plans so we can assess whether your model qualifies."

---

### Cross-State Licensing Intelligence (App Logic)

When a user selects a licensed business type AND a target state, the app cross-references a licensing matrix and displays:

1. **License name and issuing body** for that state
2. **Estimated processing time**
3. **Whether the investor must personally hold the license** or can hire a licensed administrator
4. **Critical timing alert** — if processing time exceeds 3 months, the app calculates whether the user needs to begin licensing before their application is even submitted
5. **Key credential requirements** for staff (CDA, RN, administrator certifications)
6. **Link to the state agency's website** for official requirements

This licensing intelligence is stored in `kb/state-licensing-matrix.md` and updated quarterly as part of the app's maintenance cycle.

---

### Licensing Timeline Integration with Compliance Calendar

When a user selects a licensed business type, the compliance calendar automatically adds:

- **T-8 months:** Begin researching license requirements for [state]
- **T-6 months:** Submit license application to [state agency]
- **T-4 months:** Follow up on license application status
- **T-2 months:** Confirm license is in process (required for interview)
- **Interview date:** Bring license application confirmation number to interview
- **Post-approval:** Finalize license before beginning operations

These calendar entries are generated automatically based on the user's target interview date and the processing time for their specific state and business type.

---

*End of Sections 6.9 and 6.10*
*Next: Section 6.11 — Cross-Border Tax (U.S. Side) and Section 6.12 — CAD/USD Investment Conversion*
