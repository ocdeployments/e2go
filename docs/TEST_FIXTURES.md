# E2go — Test Fixtures
## Five complete applicant profiles for end-to-end testing
**Date:** June 10, 2026
**Purpose:** Pre-populated test data covering every major quiz path,
case file section, and results page scenario. Use these to test the
platform without filling out forms manually.

---

## How to use these fixtures

### Option A — Browser localStorage injection
Open the browser console on localhost:3000 and paste the
localStorage injection script for the profile you want to test.
Then navigate to /results to see the results page, or /apply
to see the case file with pre-filled data.

### Option B — Supabase SQL injection
Run the SQL insert scripts in the Supabase SQL editor to create
real database records. Then log in as the test user to see the
full authenticated experience including dashboard, case file,
and document generation.

### Option C — Seed script
Run: `npx tsx scripts/seed-test-fixtures.ts`
(Session file needed to build this script — see bottom of document)

---

## PROFILE 1 — Clean Solo Applicant with Family

**Name:** Michael James Chen
**Scenario:** Franchise investor, straightforward case, full family
**Expected outcome:** PROCEED
**Expected package:** Solo + Family (up to 2 kids) — $750
**Expected score:** 92/100

### Quiz answers (localStorage)

```javascript
// Paste in browser console at localhost:3000
localStorage.setItem("e2go_quiz_result", JSON.stringify({
  outcome: "PROCEED",
  score: 92,
  warnings: [],
  attorney_flags: [],
  franchise_interest: true,
  answers: {
    "Q0-01": "Canada",
    "Q0-02": "I am the sole applicant",
    "Q0-03": "Me, my spouse, and our children",
    "Q0-03a": "No — all my children are under 21",
    "Q0-04": "No — I am the only investor",
    "Q0-05": "From outside the US — consular processing",
    "Q0-06": ["Personal savings or accumulated wealth"],
    "Q0-07": "Over $150,000",
    "Q0-07-amount": "185000",
    "Q0-08": "I have a specific business or franchise identified",
    "Q0-08a": "A franchise — buying into an established brand",
    "Q0-08b": "Yes — please connect me",
    "Q0-09": "No — clean history",
    "Q0-10": [
      "Property I own and plan to keep",
      "Close family remaining in my home country",
      "Active financial accounts, pension, or investments"
    ]
  },
  country: "Canada",
  investment_range: "Over $150,000",
  investment_amount: 185000,
  cos_flag: false,
  principal_applicant: "self",
  application_type: "solo",
  partner_type: "none",
  dependents: "spouse_and_children",
  business_stage: "specific",
  business_type: "franchise",
  ties_categories: [
    "Property I own and plan to keep",
    "Close family remaining in my home country",
    "Active financial accounts, pension, or investments"
  ],
  ties_score: "strong",
  history_flags: []
}));
console.log("Profile 1 loaded — navigate to /results");
```

### Case file answers (Supabase SQL)

```sql
-- First create a user record (or use existing test user)
-- Then run this to insert application + answers

INSERT INTO applications (
  id, user_id, status, application_type, preparation_status,
  created_at, updated_at
) VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  auth.uid(), -- replace with actual user_id
  'in_progress',
  'solo',
  'scratch',
  now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Section 1 — Your Story
INSERT INTO answers (application_id, question_id, answer, source, created_at)
VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QA-01', 'Michael James Chen', 'quiz', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QA-02', '1978-03-15', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QA-03', 'Canadian', 'quiz', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QA-04', 'AB123456', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QA-05', '142 Maple Drive, Mississauga, Ontario, Canada', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QD-01', 'I have spent the past 18 years in corporate finance, most recently as a Senior Financial Analyst at RBC where I managed a portfolio of commercial real estate loans. Before that I worked in small business lending at TD Bank for six years. My background in financial analysis and business operations gives me the tools to assess business performance, manage cash flow, and build a team that executes consistently.', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QD-02', 'My wife and I have been planning this move for three years. We want our children to grow up in the United States and build our family business there. I chose the ServiceMaster Clean franchise because it operates in a recession-resistant industry, has strong unit economics, and the brand is well-established in the Tampa Bay area where we are relocating.', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QD-03', 'My financial background translates directly to running this business. I understand balance sheets, cash flow management, and how to evaluate whether a business is performing to its potential. The ServiceMaster Clean operations model is straightforward and well-supported by the franchisor. I will be on-site managing operations, hiring staff, and handling client relationships personally.', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QD-04', 'In year one my priority is establishing the business operationally — hiring two technicians, securing the equipment, and building a client base in the commercial cleaning segment. I have committed to attending the franchisors training programme in Memphis in April. By month six I expect to have 12 recurring commercial clients.', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QD-05', 'We own our home in Mississauga which we will keep as a rental property. My parents live in Brampton. I maintain my RRSP and Canadian investment accounts. My professional certifications are Canadian. All of these ties bring me back when my E-2 status expires.', 'user_entry', now()),

-- Section 2 — Your Business
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QA-51', 'ServiceMaster Clean of Tampa Bay', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QE-02', 'LLC', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QE-03', 'Florida', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QK-01', 'ServiceMaster Clean is a commercial and residential cleaning franchise. The business provides janitorial services, carpet cleaning, disaster restoration, and specialty cleaning to commercial clients including office buildings, medical facilities, and hospitality businesses in the Tampa Bay metropolitan area.', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QK-02', 'Primary customers are commercial property managers, facility directors at medical offices and corporate campuses, and hospitality businesses requiring recurring professional cleaning services.', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QF-09', 'ServiceMaster Clean', 'quiz', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QG-02', 'Entity formed, operations not yet started', 'user_entry', now()),

-- Section 3 — Your Investment
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QF-02', '185000', 'quiz', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QF-05', 'Personal savings', 'quiz', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QH-01', 'The $185,000 investment comes entirely from personal savings accumulated over 18 years of employment. I maintained a dedicated investment account at RBC Direct Investing which I began in 2008. The funds were transferred in two tranches: $100,000 in January 2026 directly to the ServiceMaster Clean franchise escrow account upon signing the Franchise Agreement, and $85,000 in March 2026 to the ServiceMaster Clean of Tampa Bay LLC operating account for equipment, initial supplies, and working capital.', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QI-05-Y1', '420000', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QI-05-Y2', '580000', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QI-05-Y3', '720000', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QI-06-Y1', '68000', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QI-06-Y2', '112000', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QI-06-Y3', '158000', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QI-04', '4', 'user_entry', now()),

-- Section 4 — Your Qualifications
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QJ-01', 'Bachelor of Commerce, University of Toronto, 1999. Chartered Financial Analyst (CFA) designation, 2004.', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QJ-03', 'Senior Financial Analyst, RBC Commercial Banking, 2012–present. Responsible for credit analysis, portfolio management, and client relationship management for commercial real estate loans totalling $240M. Small Business Lending Officer, TD Bank, 2006–2012. Assessed loan applications, managed client portfolios, and provided business advisory services to SMB clients.', 'user_entry', now()),

-- Section 5 — Your Family
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QF-SPOUSE-NAME', 'Jennifer Lynn Chen', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QF-SPOUSE-DOB', '1980-07-22', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QF-CHILD-1-NAME', 'Emma Chen', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QF-CHILD-1-DOB', '2012-04-10', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QF-CHILD-2-NAME', 'Lucas Chen', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QF-CHILD-2-DOB', '2015-09-03', 'user_entry', now()),

-- Section 6 — Your Ties
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QD-NI-PROPERTY', 'We own a 4-bedroom home at 142 Maple Drive, Mississauga, Ontario which we purchased in 2015 for $820,000. We will retain this property as a rental during our time in the US and intend to return to it when our E-2 status expires.', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QD-NI-FAMILY', 'My parents, James and Margaret Chen, reside in Brampton, Ontario. My wife''s parents, Robert and Susan Liu, reside in Richmond Hill, Ontario. Both sets of parents are permanent Canadian residents who will not be accompanying us to the US.', 'user_entry', now()),
  ('a1b2c3d4-0001-0001-0001-000000000001', 'QD-NI-FINANCIAL', 'I maintain an RRSP at RBC with a current value of approximately $340,000 which I will not be withdrawing or transferring. I also maintain a TFSA and a non-registered investment account at RBC Direct Investing. These accounts will remain active during my time in the US.', 'user_entry', now())
ON CONFLICT (application_id, question_id) DO UPDATE SET answer = EXCLUDED.answer;
```

---

## PROFILE 2 — Partnership Applicant with Prior Refusal

**Name:** David Paul Morrison
**Scenario:** 50/50 partnership with unrelated business partner, acquisition,
prior visa refusal 6 years ago
**Expected outcome:** ATTORNEY_RECOMMENDED
**Expected package:** Partnership — $997
**Expected score:** 67/100

### Quiz answers (localStorage)

```javascript
localStorage.setItem("e2go_quiz_result", JSON.stringify({
  outcome: "ATTORNEY_RECOMMENDED",
  score: 67,
  warnings: ["W-REFUSAL-OLD"],
  attorney_flags: [],
  franchise_interest: false,
  answers: {
    "Q0-01": "Canada",
    "Q0-02": "I have a business partner (not my spouse)",
    "Q0-03": "Just me — no spouse or children coming",
    "Q0-04": "Yes — one partner, 50/50 ownership",
    "Q0-04a": "Yes — we will both actively manage the business",
    "Q0-05": "From outside the US — consular processing",
    "Q0-06": ["Personal savings or accumulated wealth", "Proceeds from selling a business or investment"],
    "Q0-07": "Over $150,000",
    "Q0-07-amount": "310000",
    "Q0-08": "I have a specific business or franchise identified",
    "Q0-08a": "An existing independent business I am acquiring",
    "Q0-08b": "No thanks",
    "Q0-09": "Yes — I have something to disclose",
    "Q0-09a": "Yes, once — more than 5 years ago",
    "Q0-09b": "No",
    "Q0-09c": "No",
    "Q0-10": [
      "Property I own and plan to keep",
      "Active financial accounts, pension, or investments",
      "Professional licences or memberships"
    ]
  },
  country: "Canada",
  investment_range: "Over $150,000",
  investment_amount: 310000,
  cos_flag: false,
  principal_applicant: "self",
  application_type: "partnership",
  partner_type: "unrelated",
  dependents: "just_me",
  business_stage: "specific",
  business_type: "acquisition",
  ties_categories: [
    "Property I own and plan to keep",
    "Active financial accounts, pension, or investments",
    "Professional licences or memberships"
  ],
  ties_score: "strong",
  history_flags: ["W-REFUSAL-OLD"]
}));
console.log("Profile 2 loaded — navigate to /results");
```

### Case file answers (Supabase SQL)

```sql
INSERT INTO applications (
  id, user_id, status, application_type, preparation_status,
  created_at, updated_at
) VALUES (
  'a1b2c3d4-0002-0002-0002-000000000002',
  auth.uid(),
  'in_progress',
  'partnership',
  'scratch',
  now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (application_id, question_id, answer, source, created_at)
VALUES
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QA-01', 'David Paul Morrison', 'quiz', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QA-02', '1971-11-08', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QA-03', 'Canadian', 'quiz', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QD-01', 'I have 24 years of experience in the food service industry, having operated two restaurant locations in the Greater Toronto Area before selling them in 2022. I understand food service operations, labour management, supplier relationships, and the financial pressures of running a multi-location business. My business partner, Kevin Acharya, brings complementary expertise in marketing and customer acquisition.', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QD-02', 'Kevin and I identified a mid-sized catering and event services company in Phoenix, Arizona that has been operating successfully for 11 years. The owner is retiring and the business has strong client relationships, an established team, and consistent revenue. We are acquiring the business as equal partners and will divide management responsibilities between us.', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QA-51', 'Phoenix Premier Catering LLC', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QE-02', 'LLC', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QE-03', 'Arizona', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QF-02', '310000', 'quiz', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QF-05', 'Personal savings and proceeds from business sale', 'quiz', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QI-05-Y1', '890000', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QI-05-Y2', '1050000', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QI-06-Y1', '124000', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QI-06-Y2', '168000', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QI-04', '8', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QJ-01', 'Ontario Secondary School Diploma, 1989. Food Handler Certification. Restaurant Management Certificate, George Brown College, 1992.', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QJ-03', 'Owner-Operator, Morrison''s Bistro (2 locations), Toronto, 1999–2022. Founded and operated two full-service restaurant locations with combined revenue of $2.1M annually at peak. Managed staff of 28 across both locations. Sold both locations in 2022.', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QD-NI-PROPERTY', 'I own a condominium in downtown Toronto which I rent to a long-term tenant. I will retain this property during my time in the US.', 'user_entry', now()),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'QD-NI-FINANCIAL', 'I maintain an RRSP, a TFSA, and a Canadian investment account which will remain active.', 'user_entry', now())
ON CONFLICT (application_id, question_id) DO UPDATE SET answer = EXCLUDED.answer;
```

---

## PROFILE 3 — Spousal Co-Investor, COS Path, Low Investment Warning

**Name:** Sarah Anne Delacroix
**Scenario:** Applying with spouse as co-investor from inside US on TN visa,
funding from RRSP and property sale, investment in the warning range
**Expected outcome:** PROCEED_RISK
**Expected package:** Partnership Two Couples — $1,297
**Expected score:** 74/100

### Quiz answers (localStorage)

```javascript
localStorage.setItem("e2go_quiz_result", JSON.stringify({
  outcome: "PROCEED_RISK",
  score: 74,
  warnings: ["W-LOW-INVESTMENT"],
  attorney_flags: [],
  franchise_interest: false,
  answers: {
    "Q0-01": "Canada",
    "Q0-02": "My spouse and I are co-investing in this business together",
    "Q0-02a": "No children — just the two of us",
    "Q0-05": "From inside the US — I have a valid visa or immigration status",
    "Q0-06": [
      "Retirement account funds (RRSP, TFSA, pension withdrawal)",
      "Proceeds from selling property"
    ],
    "Q0-07": "$75,000 – $100,000",
    "Q0-07-amount": "88000",
    "Q0-08": "I have a specific business or franchise identified",
    "Q0-08a": "An existing independent business I am acquiring",
    "Q0-08b": "No thanks",
    "Q0-09": "No — clean history",
    "Q0-10": [
      "Property I own and plan to keep",
      "Close family remaining in my home country",
      "Active financial accounts, pension, or investments"
    ]
  },
  country: "Canada",
  investment_range: "$75,000 – $100,000",
  investment_amount: 88000,
  cos_flag: true,
  principal_applicant: "self",
  application_type: "spousal_partnership",
  partner_type: "spouse",
  dependents: "spouse_only",
  business_stage: "specific",
  business_type: "acquisition",
  ties_categories: [
    "Property I own and plan to keep",
    "Close family remaining in my home country",
    "Active financial accounts, pension, or investments"
  ],
  ties_score: "strong",
  history_flags: []
}));
console.log("Profile 3 loaded — navigate to /results");
```

### Case file answers (Supabase SQL)

```sql
INSERT INTO applications (
  id, user_id, status, application_type, preparation_status,
  created_at, updated_at
) VALUES (
  'a1b2c3d4-0003-0003-0003-000000000003',
  auth.uid(),
  'in_progress',
  'spousal_partnership',
  'scratch',
  now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (application_id, question_id, answer, source, created_at)
VALUES
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QA-01', 'Sarah Anne Delacroix', 'quiz', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QA-02', '1984-05-19', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QA-03', 'Canadian', 'quiz', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QD-01', 'I have worked as a certified personal trainer and fitness studio manager for 12 years, including five years as the operations manager of a mid-sized fitness studio in Ottawa with 400 active members. My husband Marc manages the business development and client retention side of the studio. Together we have operated a profitable fitness business and are ready to expand into the US market.', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QD-02', 'Marc and I are currently in Austin, Texas on TN visas. We have identified a boutique fitness studio that is for sale near our neighbourhood. The owner is retiring after 8 years. The business has 280 active members and a strong reputation. We want to acquire it, maintain operations, and grow the membership base.', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QA-51', 'Summit Fitness Austin LLC', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QE-02', 'LLC', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QE-03', 'Texas', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QF-02', '88000', 'quiz', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QF-05', 'RRSP withdrawal and property sale proceeds', 'quiz', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QI-05-Y1', '310000', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QI-05-Y2', '380000', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QI-06-Y1', '52000', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QI-06-Y2', '78000', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QI-04', '3', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QJ-01', 'Bachelor of Kinesiology, University of Ottawa, 2006. Certified Personal Trainer (CSEP-CPT), 2007. Fitness Business Management Certificate, Algonquin College, 2012.', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QJ-03', 'Operations Manager, FitLife Ottawa, 2014–2024. Managed daily studio operations, staff scheduling, membership sales, and equipment maintenance for a 400-member fitness facility. Certified Personal Trainer and Group Fitness Instructor, 2007–present.', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QD-NI-PROPERTY', 'We own a condominium in Gatineau, Quebec which we are retaining as a rental property. We do not plan to sell before our E-2 is approved.', 'user_entry', now()),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QD-NI-FAMILY', 'My parents live in Ottawa. Marc''s parents live in Montreal. Both sets of parents are Canadian citizens remaining in Canada.', 'user_entry', now())
ON CONFLICT (application_id, question_id) DO UPDATE SET answer = EXCLUDED.answer;
```

---

## PROFILE 4 — High Risk, Multiple Flags, Still Proceeds

**Name:** Robert Ivan Petrov
**Scenario:** Sole applicant, consulting business (marginality warning),
no dependents, deported from US 4 years ago (attorney flag), very weak
home ties
**Expected outcome:** ATTORNEY_RECOMMENDED
**Expected package:** Solo Individual — $550
**Expected score:** 38/100

### Quiz answers (localStorage)

```javascript
localStorage.setItem("e2go_quiz_result", JSON.stringify({
  outcome: "ATTORNEY_RECOMMENDED",
  score: 38,
  warnings: ["W-MARGINALITY", "W-NO-TIES"],
  attorney_flags: ["W-DEPORTED"],
  franchise_interest: false,
  answers: {
    "Q0-01": "Canada",
    "Q0-02": "I am the sole applicant",
    "Q0-03": "Just me — no spouse or children coming",
    "Q0-04": "No — I am the only investor",
    "Q0-05": "From outside the US — consular processing",
    "Q0-06": ["Personal savings or accumulated wealth"],
    "Q0-07": "$100,000 – $150,000",
    "Q0-07-amount": "125000",
    "Q0-08": "I have a specific business or franchise identified",
    "Q0-08a": "Professional services or consulting",
    "Q0-08b": "No thanks",
    "Q0-09": "Yes — I have something to disclose",
    "Q0-09a": "No",
    "Q0-09b": "Yes — deported or removed",
    "Q0-09c": "No",
    "Q0-10": ["None of these apply"]
  },
  country: "Canada",
  investment_range: "$100,000 – $150,000",
  investment_amount: 125000,
  cos_flag: false,
  principal_applicant: "self",
  application_type: "solo",
  partner_type: "none",
  dependents: "just_me",
  business_stage: "specific",
  business_type: "consulting",
  ties_categories: [],
  ties_score: "weak",
  history_flags: ["W-DEPORTED"]
}));
console.log("Profile 4 loaded — navigate to /results");
```

### Case file answers (Supabase SQL)

```sql
INSERT INTO applications (
  id, user_id, status, application_type, preparation_status,
  created_at, updated_at
) VALUES (
  'a1b2c3d4-0004-0004-0004-000000000004',
  auth.uid(),
  'in_progress',
  'solo',
  'scratch',
  now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (application_id, question_id, answer, source, created_at)
VALUES
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QA-01', 'Robert Ivan Petrov', 'quiz', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QA-02', '1969-02-27', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QA-03', 'Canadian', 'quiz', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QD-01', 'I am a management consultant specialising in supply chain optimisation with 22 years of experience. I have worked with clients in automotive, aerospace, and manufacturing sectors across North America and Europe. My client base is primarily in the US and I spend approximately 180 days per year working in the US on my TN visa which I have held since 2015.', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QD-02', 'My primary clients are in Michigan and Ohio. I want to establish my consulting practice as a US business entity to better serve them, hire a junior consultant to handle project delivery, and build a sustainable US-based practice. The E-2 is the right vehicle for this transition.', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QA-51', 'Petrov Supply Chain Consulting LLC', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QE-02', 'LLC', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QE-03', 'Michigan', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QF-02', '125000', 'quiz', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QF-05', 'Personal savings', 'quiz', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QI-05-Y1', '380000', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QI-05-Y2', '520000', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QI-06-Y1', '95000', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QI-06-Y2', '148000', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QI-04', '2', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QJ-01', 'Master of Business Administration, University of Alberta, 1994. Bachelor of Engineering (Industrial), University of Alberta, 1991. APICS Certified Supply Chain Professional (CSCP), 2003.', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QJ-03', 'Independent Management Consultant, 2002–present. Clients include Ford Motor Company, Boeing, and Magna International. Engagements focus on supply chain network design, inventory optimisation, and procurement strategy. Average 4-6 concurrent client engagements annually.', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QD-NI-PROPERTY', 'I rent an apartment in Toronto on a month-to-month lease and do not own Canadian real estate.', 'user_entry', now()),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'QD-NI-FINANCIAL', 'I maintain a Canadian chequing account and a small RRSP. I plan to transfer most of my financial assets to the US upon approval.', 'user_entry', now())
ON CONFLICT (application_id, question_id) DO UPDATE SET answer = EXCLUDED.answer;
```

---

## PROFILE 5 — Complex Family, Mixed Ties, Child Age Issue

**Name:** Priya Anita Sharma
**Scenario:** Sole applicant, large investment, new business from scratch,
spouse and three children coming (one is 22 — age advisory), mixed ties,
clean history
**Expected outcome:** PROCEED_RISK
**Expected package:** Solo + Family (3-5 kids) — $797
**Expected score:** 81/100

### Quiz answers (localStorage)

```javascript
localStorage.setItem("e2go_quiz_result", JSON.stringify({
  outcome: "PROCEED_RISK",
  score: 81,
  warnings: ["W-OVER-21"],
  attorney_flags: [],
  franchise_interest: false,
  answers: {
    "Q0-01": "Canada",
    "Q0-02": "I am the sole applicant",
    "Q0-03": "Me, my spouse, and our children",
    "Q0-03a": "Yes — one or more are 21 or older",
    "Q0-04": "No — I am the only investor",
    "Q0-05": "From outside the US — consular processing",
    "Q0-06": [
      "Personal savings or accumulated wealth",
      "Proceeds from selling a business or investment"
    ],
    "Q0-07": "Over $150,000",
    "Q0-07-amount": "240000",
    "Q0-08": "I want to start a new business from scratch",
    "Q0-08b": "No thanks",
    "Q0-09": "No — clean history",
    "Q0-10": [
      "Property I own and plan to keep",
      "Close family remaining in my home country",
      "Active financial accounts, pension, or investments",
      "An ongoing business or professional practice"
    ]
  },
  country: "Canada",
  investment_range: "Over $150,000",
  investment_amount: 240000,
  cos_flag: false,
  principal_applicant: "self",
  application_type: "solo",
  partner_type: "none",
  dependents: "spouse_and_children",
  business_stage: "scratch",
  business_type: "new",
  ties_categories: [
    "Property I own and plan to keep",
    "Close family remaining in my home country",
    "Active financial accounts, pension, or investments",
    "An ongoing business or professional practice"
  ],
  ties_score: "strong",
  history_flags: []
}));
console.log("Profile 5 loaded — navigate to /results");
```

### Case file answers (Supabase SQL)

```sql
INSERT INTO applications (
  id, user_id, status, application_type, preparation_status,
  created_at, updated_at
) VALUES (
  'a1b2c3d4-0005-0005-0005-000000000005',
  auth.uid(),
  'in_progress',
  'solo',
  'scratch',
  now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (application_id, question_id, answer, source, created_at)
VALUES
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QA-01', 'Priya Anita Sharma', 'quiz', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QA-02', '1975-09-14', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QA-03', 'Canadian', 'quiz', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QD-01', 'I have 20 years of experience in healthcare administration, most recently as the Director of Operations for a network of three physiotherapy clinics in the Greater Vancouver Area. I understand healthcare facility operations, regulatory compliance, staffing, and patient experience. I sold my ownership stake in the clinic group in 2024 and am using the proceeds to establish a new healthcare business in the United States.', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QD-02', 'I plan to open a paediatric occupational therapy practice in Scottsdale, Arizona. My market research shows strong demand driven by the area''s demographics and limited supply of specialist paediatric therapy providers. I have identified a suitable commercial space and have begun discussions with three licensed occupational therapists about joining the practice.', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QA-51', 'Bloom Paediatric Therapy LLC', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QE-02', 'LLC', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QE-03', 'Arizona', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QF-02', '240000', 'quiz', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QF-05', 'Personal savings and business sale proceeds', 'quiz', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QI-05-Y1', '520000', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QI-05-Y2', '780000', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QI-05-Y3', '940000', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QI-06-Y1', '82000', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QI-06-Y2', '148000', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QI-06-Y3', '198000', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QI-04', '5', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QJ-01', 'Master of Health Administration, University of British Columbia, 2000. Bachelor of Science (Kinesiology), University of British Columbia, 1997.', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QJ-03', 'Director of Operations, Pacific Physiotherapy Group, 2015–2024. Oversaw operations across three clinic locations with combined revenue of $3.8M annually. Responsible for 32 staff, regulatory compliance, facility management, and financial performance. Sold ownership stake for $840,000 in December 2024.', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QF-SPOUSE-NAME', 'Vikram Sharma', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QF-SPOUSE-DOB', '1973-04-30', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QF-CHILD-1-NAME', 'Arjun Sharma', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QF-CHILD-1-DOB', '2003-07-18', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QF-CHILD-2-NAME', 'Meera Sharma', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QF-CHILD-2-DOB', '2007-11-25', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QF-CHILD-3-NAME', 'Kavya Sharma', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QF-CHILD-3-DOB', '2012-03-09', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QD-NI-PROPERTY', 'We own our primary residence in Vancouver which we will retain during our time in the US. We also own a rental property in Burnaby which generates $2,800 per month in rental income.', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QD-NI-FAMILY', 'My parents, Ramesh and Usha Sharma, reside in Vancouver. My mother-in-law, Kamla Devi, resides in Surrey, BC. All three will remain in Canada.', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QD-NI-FINANCIAL', 'I maintain an RRSP with a current balance of approximately $280,000, a TFSA, and the rental income account. My husband maintains his own Canadian accounts. These will all remain active during our time in the US.', 'user_entry', now()),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'QD-NI-BUSINESS', 'I maintain a passive interest in a Canadian health consulting company through which I continue to provide occasional advisory services to Canadian healthcare clients. This ongoing Canadian business interest is a further tie to Canada.', 'user_entry', now())
ON CONFLICT (application_id, question_id) DO UPDATE SET answer = EXCLUDED.answer;
```

---

## Quick reference — all five profiles

| Profile | Name | Type | Outcome | Package | Score |
|---|---|---|---|---|---|
| 1 | Michael Chen | Solo + Family, franchise, clean | PROCEED | Solo + Family $750 | 92 |
| 2 | David Morrison | Partnership, acquisition, old refusal | ATTORNEY_RECOMMENDED | Partnership $997 | 67 |
| 3 | Sarah Delacroix | Spousal partnership, COS, low investment | PROCEED_RISK | Two Couples $1,297 | 74 |
| 4 | Robert Petrov | Solo, consulting, deported, no ties | ATTORNEY_RECOMMENDED | Solo $550 | 38 |
| 5 | Priya Sharma | Solo + large family, new business, child 22+ | PROCEED_RISK | Family 3-5 kids $797 | 81 |

---

## Coverage matrix — what each profile tests

| Feature tested | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| PROCEED outcome | ✓ | | | | |
| PROCEED_RISK outcome | | | ✓ | | ✓ |
| ATTORNEY_RECOMMENDED outcome | | ✓ | | ✓ | |
| Solo application type | ✓ | | | ✓ | ✓ |
| Partnership (unrelated) | | ✓ | | | |
| Spousal partnership | | | ✓ | | |
| Spouse as dependent | ✓ | | | | ✓ |
| Children as dependents | ✓ | | | | ✓ |
| Child 21+ advisory | | | | | ✓ |
| Franchise business | ✓ | | | | |
| Acquisition business | | ✓ | ✓ | | |
| New business scratch | | | | | ✓ |
| Consulting + marginality | | | | ✓ | |
| COS path (from inside US) | | | ✓ | | |
| Low investment warning | | | ✓ | | |
| Prior visa refusal | | ✓ | | | |
| Deportation history | | | | ✓ | |
| Clean history | ✓ | | | | ✓ |
| Strong ties | ✓ | ✓ | ✓ | | ✓ |
| Weak/no ties | | | | ✓ | |
| Multiple funding sources | | ✓ | ✓ | | ✓ |
| Broker referral consent | ✓ | | | | |
| Partnership pricing $997 | | ✓ | | | |
| Couples pricing $1,297 | | | ✓ | | |
| Family pricing $750 | ✓ | | | | |
| Large family pricing $797 | | | | | ✓ |
| Solo pricing $550 | | | | ✓ | |

---

## To load a profile in the browser

1. Open localhost:3000
2. Open browser developer tools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Paste the localStorage script for the profile you want
5. Navigate to /results to see the results page
6. Navigate to /apply to see the case file
7. Click through sections to see pre-filled answers

To clear and load a different profile:
```javascript
localStorage.removeItem("e2go_quiz_result");
localStorage.removeItem("e2go_quiz_draft");
// Then paste new profile script
```

---

## Notes for testing

**Profile 4 (Petrov)** will show the attorney acknowledgment gate on the
results page. The "proceed anyway" button should appear after the
acknowledgment checkbox is checked.

**Profile 3 (Delacroix)** will show the COS advisory on the results page
explaining the Change of Status pathway option.

**Profile 5 (Sharma)** will show the W-OVER-21 advisory about Arjun (born
2003, now 22) not qualifying as an E-2 dependent. The pricing should still
show Solo + Family 3-5 kids at $797 because Meera and Kavya are both under 21.

**Profile 2 (Morrison)** will show the W-REFUSAL-OLD warning flag on the
results page with the prior refusal handling guidance.

