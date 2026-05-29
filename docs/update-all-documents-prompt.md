# Knowledge Base Update Prompt
**File:** `kb/update-all-documents-prompt.md`
*Generated: May 29, 2026*

---

## Purpose

Use this prompt whenever you want another LLM (for example Claude) to audit,
refresh, and rewrite this entire knowledge base so every document reflects the
most current law, policy, government guidance, fees, timelines, and procedural
requirements.

This prompt is designed so the next model can:
1. Inventory every document.
2. Re-check the original source authorities.
3. Find newer primary or better secondary sources.
4. Identify what changed.
5. Rewrite the documents.
6. Produce an update log with full source lists.

---

## Master Prompt

```md
You are updating an existing U.S./Canada cross-border and E-2 visa knowledge base.

Your job is to audit every markdown file listed below, verify whether it is still
accurate, and then update it using current authoritative sources.

## Core Rules

1. Prefer **primary sources** whenever possible:
   - U.S. statutes, regulations, 8 CFR, INA, 9 FAM
   - USCIS.gov
   - IRS.gov
   - FinCEN.gov
   - Travel.State.Gov
   - CBP/DHS.gov
   - SBA.gov
   - FTC.gov
   - CRA / Canada.ca
   - Ontario.ca / ServiceOntario
   - State Secretary of State and state licensing agencies

2. Use **secondary sources only to interpret or operationalize** primary law:
   - Reputable immigration law firms
   - Reputable tax firms
   - Well-documented bank product pages
   - Wise, RBC, TD, Mercury official product pages

3. For every document:
   - Read the current markdown file.
   - Extract the source block at the top.
   - Re-check each cited source.
   - Search for newer versions, policy updates, fee changes, or procedural changes.
   - Preserve the structure and purpose of the file unless a better structure is clearly needed.
   - Update the “Last reviewed” date.
   - Keep the writing practical, specific, and implementation-focused.

4. When updating legal/procedural guidance:
   - Flag any rule that changed.
   - Replace outdated filing fees, phone numbers, fax numbers, URLs, processing times, or thresholds.
   - Verify whether citations still exist or moved.
   - If a source is dead, replace it with the best available current source.

5. Output requirements:
   - Rewrite the updated markdown files.
   - Create a separate file named `kb/update-log.md`.
   - In `kb/update-log.md`, include for each document:
     - filename
     - whether changes were required (yes/no)
     - summary of changes
     - old vs. new rule/fee/timeline if applicable
     - sources consulted (full list)
     - any unresolved uncertainty

6. Do not silently keep stale numbers.
   If a fee, threshold, or timing cannot be confirmed, explicitly mark it:
   `VERIFY BEFORE USE`.

7. Keep every document educational and practical.
   Do not add legal conclusions that are unsupported by primary authority.

## Documents To Audit

1. `business-plan-officer-guide.md` — Sources to re-check: 9 FAM 402.9-6(D)(c); 9 FAM 402.9-6(E); Shihab Immigration Firm; Joorney Business Plans; Tade Consulting; E2VisaLawyer.net
2. `canadian-departure-tax.md` — Sources to re-check: CRA; Income Tax Act (Canada); CRA departure tax guidance; Canada.ca
3. `canadian-property-sale-timing.md` — Sources to re-check: CRA; Income Tax Act (Canada); principal residence guidance; Canada.ca
4. `dependent-age-out.md` — Sources to re-check: INA §101(b)(1); Child Status Protection Act; USCIS CSPA guidance; 9 FAM 402.9; Boundless; VisaServe
5. `e2-renewal-guide.md` — Sources to re-check: 9 FAM 402.9-4; 9 FAM 402.9-11; U.S. Embassy Canada E-visa FAQs; E2VisaLawyer.net; Stelmakh Law; Try Alma; U.S. Immigration Advisor
6. `e2-to-green-card.md` — Sources to re-check: USCIS EB-5; USCIS EB-1C; USCIS EB-2 NIW; SRR Law Group; Ford Murray Law; Travel.State.Gov Visa Bulletin; 9 FAM 302.1-2(B)(4)
7. `e2-visa-221g-guide.md` — Sources to re-check: 9 FAM 403.2; Travel.State.Gov administrative processing guidance; practitioner analysis
8. `e2-visa-denial-recovery.md` — Sources to re-check: 9 FAM 402.9; Travel.State.Gov refusal guidance; practitioner analysis
9. `e2-visa-develop-and-direct.md` — Sources to re-check: 9 FAM 402.9-6(C); 9 FAM 402.9-7; practitioner analysis
10. `e2-visa-immigrant-intent.md` — Sources to re-check: 9 FAM 402.9; 9 FAM 302.1-2(B)(4); Travel.State.Gov; practitioner analysis
11. `e2-visa-marginality.md` — Sources to re-check: 9 FAM 402.9-6(E); federal poverty guideline references; practitioner analysis
12. `e2-visa-partnership-applications.md` — Sources to re-check: 9 FAM 402.9 treaty nationality and ownership rules; practitioner analysis
13. `e2-visa-source-of-funds.md` — Sources to re-check: 9 FAM 402.9-6(D); USCIS/State source-of-funds principles; practitioner analysis
14. `e2-visa-substantiality.md` — Sources to re-check: 9 FAM 402.9-6(D); proportionality test guidance; practitioner analysis
15. `e2-visa-travel-outside-us.md` — Sources to re-check: 8 CFR 214.2(e)(19)(i); CBP I-94 rules; automatic visa revalidation guidance; Travel.State.Gov; Boundless; Peter Chu; Legal Services Inc.; Jato & DeKirby; BIPC
16. `fbar-fatca-guide.md` — Sources to re-check: FinCEN FBAR guidance; IRS FATCA/Form 8938 guidance; BSA E-Filing
17. `franchise-e2-compatibility.md` — Sources to re-check: 9 FAM 402.9-6; FTC Franchise Rule 16 CFR Part 436; SBA Franchise Directory; E2VisaLawyer.net; Franchise Chatter; Pollak Immigration
18. `licensing-by-state.md` — Sources to re-check: SBA licenses and permits guide; FTC Franchise Rule; state Secretary of State websites; state licensing boards
19. `ohip-health-coverage-transition.md` — Sources to re-check: Ontario Health Insurance Act; ServiceOntario; Ontario.ca OHIP eligibility guidance
20. `rrsp-tfsa-crossborder.md` — Sources to re-check: CRA; IRS treaty guidance; Canada-U.S. tax treaty; IRS foreign trust/reporting rules
21. `us-bank-account-from-canada.md` — Sources to re-check: RBC Bank; RBC Royal Bank cross-border banking; TD Canada Trust; Wise; Mercury; Chase; Bank of America; user-reported Mercury nonresident outcomes
22. `us-business-entity-tax.md` — Sources to re-check: IRS entity classification; Form 8832; Form 5472; state tax authority guidance; practitioner analysis
23. `us-llc-formation-from-canada.md` — Sources to re-check: IRS Form SS-4; IRS SS-4 instructions; EasyFiling; LLC University; Globalization Guide; OFX; Wise EIN guide; practitioner references
24. `us-tax-obligations-e2.md` — Sources to re-check: IRS residency rules; substantial presence test; Form 1040/1040-NR guidance; treaty references; state tax authority guidance
25. `wise-account-setup-guide.md` — Sources to re-check: Wise business account requirements; Wise pricing; Wise U.S. account details guides; tutorial references

## Detailed Workflow

For each file, do the following in order:

### Step 1 — Read the existing file
- Read the full markdown file.
- Identify the current purpose of the document.
- Extract all explicit source references from the header and body.

### Step 2 — Re-check original authorities
- Visit the original primary authorities first.
- Confirm whether the cited rule still exists and whether the numbering changed.
- Confirm whether the government page was updated after the file’s last reviewed date.

### Step 3 — Find newer sources
- Search for newer primary sources first.
- Then search for newer official product/service pages if the file discusses banks, Wise, Mercury, RBC, TD, etc.
- Then search for strong practitioner guidance only if needed to interpret implementation details.

### Step 4 — Compare old content against current law/policy
Create a quick internal checklist:
- thresholds updated?
- filing fees changed?
- form numbers changed?
- phone/fax numbers changed?
- processing times materially changed?
- eligibility rules changed?
- post-specific consular process changed?
- any new warning, risk, or exception added by government guidance?

### Step 5 — Rewrite the file
- Keep the filename the same.
- Preserve useful examples and checklists if still accurate.
- Replace outdated data.
- Tighten ambiguous statements.
- Prefer precise rule statements over general commentary.

### Step 6 — Write to update log
For each updated document, append an entry to `kb/update-log.md` using this template:

#### `filename.md`
- Change required: Yes/No
- Last reviewed before update: [date from old file]
- New review date: [today’s date]
- What changed:
  - [bullet]
  - [bullet]
- Sources consulted:
  - [primary source]
  - [primary source]
  - [secondary source if used]
- Notes / unresolved issues:
  - [if none, say “None”]

## Special Instructions By Topic

### E-2 visa files
For all E-2 files, prioritize:
- 9 FAM 402.9
- 8 CFR 214.2(e)
- Travel.State.Gov
- U.S. Embassy / Consulate Canada E-visa pages
- CBP admission/I-94 guidance where travel or re-entry is discussed

### Tax files
For tax files, prioritize:
- IRS instructions and forms
- FinCEN guidance
- CRA and Canada.ca
- Treaty articles where relevant
- Current filing thresholds and reporting requirements

### Banking files
For banking files, prioritize:
- Official bank product pages
- Official fee schedules
- Official eligibility pages
- Official onboarding or compliance requirement pages
- Do not rely solely on blogs if the institution has an official page

### Licensing and business formation files
For LLC, licensing, franchise, and state compliance files, prioritize:
- State Secretary of State websites
- State Department of Revenue / Tax websites
- SBA.gov
- FTC Franchise Rule pages
- Official state licensing boards

## Deliverables

Create or update these files:
- all audited `.md` files listed above
- `kb/update-log.md`
- optionally `kb/source-index.md` summarizing all primary authorities used across the library

## Quality Standard

At the end of the run, every file should:
- have a current review date
- cite the strongest currently available authority
- avoid stale fee/timeline data
- remain practical for a Canadian planning U.S. business setup and E-2 immigration steps
```

---

## Notes for Future Use

- Best run every 3–6 months.
- Best run immediately after major policy changes at USCIS, DOS, IRS, FinCEN,
  CRA, OHIP, or when banking providers change onboarding rules.
- Especially important to re-check documents containing:
  - filing fees
  - phone/fax numbers
  - visa processing times
  - tax thresholds
  - banking account eligibility
  - state filing fees

---

## Document Inventory Snapshot

1. `business-plan-officer-guide.md` — Sources to re-check: 9 FAM 402.9-6(D)(c); 9 FAM 402.9-6(E); Shihab Immigration Firm; Joorney Business Plans; Tade Consulting; E2VisaLawyer.net
2. `canadian-departure-tax.md` — Sources to re-check: CRA; Income Tax Act (Canada); CRA departure tax guidance; Canada.ca
3. `canadian-property-sale-timing.md` — Sources to re-check: CRA; Income Tax Act (Canada); principal residence guidance; Canada.ca
4. `dependent-age-out.md` — Sources to re-check: INA §101(b)(1); Child Status Protection Act; USCIS CSPA guidance; 9 FAM 402.9; Boundless; VisaServe
5. `e2-renewal-guide.md` — Sources to re-check: 9 FAM 402.9-4; 9 FAM 402.9-11; U.S. Embassy Canada E-visa FAQs; E2VisaLawyer.net; Stelmakh Law; Try Alma; U.S. Immigration Advisor
6. `e2-to-green-card.md` — Sources to re-check: USCIS EB-5; USCIS EB-1C; USCIS EB-2 NIW; SRR Law Group; Ford Murray Law; Travel.State.Gov Visa Bulletin; 9 FAM 302.1-2(B)(4)
7. `e2-visa-221g-guide.md` — Sources to re-check: 9 FAM 403.2; Travel.State.Gov administrative processing guidance; practitioner analysis
8. `e2-visa-denial-recovery.md` — Sources to re-check: 9 FAM 402.9; Travel.State.Gov refusal guidance; practitioner analysis
9. `e2-visa-develop-and-direct.md` — Sources to re-check: 9 FAM 402.9-6(C); 9 FAM 402.9-7; practitioner analysis
10. `e2-visa-immigrant-intent.md` — Sources to re-check: 9 FAM 402.9; 9 FAM 302.1-2(B)(4); Travel.State.Gov; practitioner analysis
11. `e2-visa-marginality.md` — Sources to re-check: 9 FAM 402.9-6(E); federal poverty guideline references; practitioner analysis
12. `e2-visa-partnership-applications.md` — Sources to re-check: 9 FAM 402.9 treaty nationality and ownership rules; practitioner analysis
13. `e2-visa-source-of-funds.md` — Sources to re-check: 9 FAM 402.9-6(D); USCIS/State source-of-funds principles; practitioner analysis
14. `e2-visa-substantiality.md` — Sources to re-check: 9 FAM 402.9-6(D); proportionality test guidance; practitioner analysis
15. `e2-visa-travel-outside-us.md` — Sources to re-check: 8 CFR 214.2(e)(19)(i); CBP I-94 rules; automatic visa revalidation guidance; Travel.State.Gov; Boundless; Peter Chu; Legal Services Inc.; Jato & DeKirby; BIPC
16. `fbar-fatca-guide.md` — Sources to re-check: FinCEN FBAR guidance; IRS FATCA/Form 8938 guidance; BSA E-Filing
17. `franchise-e2-compatibility.md` — Sources to re-check: 9 FAM 402.9-6; FTC Franchise Rule 16 CFR Part 436; SBA Franchise Directory; E2VisaLawyer.net; Franchise Chatter; Pollak Immigration
18. `licensing-by-state.md` — Sources to re-check: SBA licenses and permits guide; FTC Franchise Rule; state Secretary of State websites; state licensing boards
19. `ohip-health-coverage-transition.md` — Sources to re-check: Ontario Health Insurance Act; ServiceOntario; Ontario.ca OHIP eligibility guidance
20. `rrsp-tfsa-crossborder.md` — Sources to re-check: CRA; IRS treaty guidance; Canada-U.S. tax treaty; IRS foreign trust/reporting rules
21. `us-bank-account-from-canada.md` — Sources to re-check: RBC Bank; RBC Royal Bank cross-border banking; TD Canada Trust; Wise; Mercury; Chase; Bank of America; user-reported Mercury nonresident outcomes
22. `us-business-entity-tax.md` — Sources to re-check: IRS entity classification; Form 8832; Form 5472; state tax authority guidance; practitioner analysis
23. `us-llc-formation-from-canada.md` — Sources to re-check: IRS Form SS-4; IRS SS-4 instructions; EasyFiling; LLC University; Globalization Guide; OFX; Wise EIN guide; practitioner references
24. `us-tax-obligations-e2.md` — Sources to re-check: IRS residency rules; substantial presence test; Form 1040/1040-NR guidance; treaty references; state tax authority guidance
25. `wise-account-setup-guide.md` — Sources to re-check: Wise business account requirements; Wise pricing; Wise U.S. account details guides; tutorial references

---

> This file is a reusable maintenance prompt for future LLM refresh cycles.
> It is not itself legal or tax guidance.
