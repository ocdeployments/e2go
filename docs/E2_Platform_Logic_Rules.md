# E-2 Pathway Platform — Consulate Logic Rules
## Vol 3 Supplement: If/Then Rules Engine

**Document:** `docs/spec/E2_Platform_Logic_Rules.md`
**Version:** 1.0 — May 2026
**Purpose:** Translate consulate intelligence into executable platform logic for document generation, user warnings, and workflow routing.

---

# SECTION 1 — Nationality Eligibility Gate

> This is the first check. Run before anything else.

```
IF nationality == "Iranian":
    BLOCK application flow
    DISPLAY: "Iran is an E-2 treaty country, however the U.S. Embassy in Iran is closed.
              E-2 visas cannot currently be processed for Iranian nationals through normal channels.
              The third-country filing option was eliminated on September 6, 2025.
              Your best pathway is to obtain citizenship in an active E-2 treaty country
              (e.g., Turkey, Grenada, Montenegro) and apply from there."
    OFFER: "Learn about citizenship-by-investment pathways → E-2"
    STOP

IF nationality == "Russian":
    BLOCK application flow
    DISPLAY: "Russia does not have an E-2 treaty with the United States.
              Russian nationals are not eligible for E-2 visas."
    OFFER: "Learn about alternative U.S. investor visa pathways (EB-5, O-1, L-1)"
    STOP

IF nationality == "Belarusian":
    BLOCK application flow
    DISPLAY: "Belarus does not have an E-2 treaty with the United States."
    OFFER: "Learn about alternative U.S. investor visa pathways"
    STOP

IF nationality == "Indian":
    BLOCK application flow
    DISPLAY: "India does not have an E-2 treaty with the United States.
              Indian nationals are not currently eligible for E-2 visas."
    OFFER_PRIMARY: "Learn about EB-5 Immigrant Investor Program"
    OFFER_SECONDARY: "Learn about citizenship-by-investment → E-2 pathways
                      (Grenada, Turkey, and North Macedonia are popular options)"
    STOP

IF nationality == "Chinese_PRC":
    BLOCK application flow
    DISPLAY: "The People's Republic of China does not have an E-2 treaty with the United States.
              Note: Taiwan (Republic of China) nationals ARE eligible for E-2."
    OFFER: "Are you a Taiwan national? Start here →"
    STOP

IF nationality == "Nigerian" OR nationality == "Ghanaian" OR nationality == "Brazilian":
    BLOCK application flow
    DISPLAY: "[Country] does not have an E-2 treaty with the United States."
    OFFER: "Learn about EB-5 or citizenship-by-investment → E-2 pathways"
    STOP

IF nationality NOT IN e2_treaty_countries_list:
    BLOCK application flow
    DISPLAY: "Your country of nationality does not currently have an E-2 treaty with the United States."
    OFFER: "Explore alternative pathways"
    STOP

// Default: nationality IS in treaty list — continue to next check
```

---

# SECTION 2 — Ukraine Special Routing

```
IF nationality == "Ukrainian":
    DISPLAY WARNING: "⚠️ Important: The U.S. Embassy in Kyiv has severely reduced operations
                      since 2022 due to the ongoing conflict. NIV appointment availability
                      is extremely limited.

                      If you currently have legal residence in another country (Poland, Germany,
                      Czech Republic, etc.), you may be eligible to apply at that country's
                      U.S. Embassy or Consulate instead.

                      Please verify current Kyiv operations at ua.usembassy.gov before proceeding."

    ASK: "Do you currently have legal residence outside of Ukraine?"

    IF answer == YES:
        ROUTE to → post selection for country of legal residence
    IF answer == NO:
        ROUTE to → Kyiv post profile with ⚠️ backlog warning prominent
```

---

# SECTION 3 — Nicaragua Operational Flag

```
IF post_selected == "Managua" OR nationality == "Nicaraguan":
    DISPLAY WARNING: "⚠️ Important: U.S. Embassy Managua operations may be affected by
                      the current political situation in Nicaragua. Please verify that the
                      embassy is actively processing nonimmigrant visa appointments before
                      beginning your application.

                      Verify current status at: ni.usembassy.gov"

    REQUIRE user to confirm they have checked embassy status before proceeding
```

---

# SECTION 4 — Pakistan NIV Pause Clarification

```
IF nationality == "Pakistani":
    DISPLAY NOTICE (prominent, not a block): 
        "📋 Note for Pakistani Nationals: As of January 21, 2026, the U.S. government
         paused immigrant visa issuances for Pakistani nationals. 

         ✅ E-2 visas are NONIMMIGRANT visas and are NOT affected by this pause.
         Your E-2 application can proceed normally.

         This notice will be updated if the policy changes."

    DISPLAY WAIT TIME WARNING:
        "⏱️ Current appointment wait time at U.S. Embassy Islamabad is approximately
         7 months. Plan your timeline accordingly."

    CONTINUE to application flow
```

---

# SECTION 5 — Citizenship-by-Investment Pathway Flag (Grenada / Turkey)

```
IF nationality_of_birth != nationality_on_passport:
    ASK: "Is your current citizenship different from your birth nationality?"

    IF answer == YES:
        ASK: "Did you obtain your current citizenship through a citizenship-by-investment program?"

        IF answer == YES AND current_nationality == "Grenadian":
            DISPLAY WARNING:
                "⚠️ Grenada Citizenship-by-Investment Pathway: Officers at the U.S. Embassy
                 in Bridgetown (Barbados) are aware that Grenada's CBI program is frequently
                 used as an E-2 access pathway. Applications from recently naturalized Grenadian
                 citizens may receive additional scrutiny.

                 Ensure your application includes:
                 - Clear documentation of your naturalization timeline
                 - Strong source-of-funds paper trail
                 - Robust business plan with clear U.S. job creation"

        IF answer == YES AND current_nationality == "Turkish":
            DISPLAY WARNING:
                "⚠️ Turkish Citizenship-by-Investment Pathway: The U.S. Consulate in Istanbul
                 processes a high volume of E-2 applications, including from recently naturalized
                 Turkish citizens. Applicants from nationalities with restricted travel history
                 may experience administrative processing (221g) delays.

                 Ensure your application includes clear source-of-funds documentation and
                 full naturalization history."
```

---

# SECTION 6 — Post Selection Logic

```
// After nationality confirmed eligible:

IF nationality == "Canadian":
    DEFAULT_POST = "Toronto"
    ALSO_AVAILABLE = ["Vancouver", "Calgary", "Montreal", "Halifax"]
    DISPLAY: "Most Canadian E-2 applicants use U.S. Consulate Toronto. Select your preferred post."

IF nationality == "British" OR nationality == "UK":
    DEFAULT_POST = "London"

IF nationality == "German":
    DEFAULT_POST = "Frankfurt"
    DISPLAY_NOTE: "The U.S. Consulate General Frankfurt processes most German E-2 applications."

IF nationality == "Mexican":
    SHOW post selector with all Mexico options:
    ["Mexico City", "Monterrey", "Guadalajara", "Tijuana", "Ciudad Juárez",
     "Hermosillo", "Mérida", "Matamoros", "Nogales", "Nuevo Laredo"]
    DISPLAY: "Select the consulate closest to your place of residence or most convenient for you."

IF nationality == "Taiwanese":
    DEFAULT_POST = "Taipei (AIT)"
    DISPLAY_NOTE: "E-2 applications for Taiwan nationals are processed at the American Institute
                   in Taiwan (AIT), not a standard U.S. Embassy. The appointment system is
                   different — use ait.org.tw."

IF nationality == "Australian":
    DEFAULT_POST = "Sydney"
    ALSO_NOTE: "Australian nationals are also eligible for the E-3 visa (skilled worker).
                Would you like to learn more about E-3 as an alternative?"

// Default for all other nationalities:
    SHOW post selector defaulting to embassy/consulate in country of nationality
    IF user has legal residence elsewhere, offer to select that post instead
```

---

# SECTION 7 — Post-Specific Document Rules

## Frankfurt (Germany) — Hard Constraints
```
IF post == "Frankfurt":
    ENFORCE: total_document_pages <= 30
    ENFORCE: total_file_size_mb <= 5
    DISPLAY: "⚠️ Frankfurt Hard Limits: Your submission must not exceed 30 pages total
              and 5MB file size. This is a firm limit enforced by U.S. Consulate Frankfurt.
              Compress all PDFs before submission."

    BUSINESS_PLAN_FORMAT = "Executive Summary only — not full narrative business plan"
    DISPLAY: "Your business plan must be in executive summary format due to Frankfurt's
              30-page limit. The platform will generate a condensed Frankfurt-compliant version."
```

## London (UK) — Upload Cap
```
IF post == "London":
    ENFORCE: total_upload_size_mb <= 20
    DISPLAY: "⚠️ London Upload Limit: Total document upload must not exceed 20MB.
              Compress large PDFs before uploading to the Embassy portal."
```

## Toronto (Canada) — Family Attendance
```
IF post == "Toronto":
    DISPLAY PROMINENT WARNING:
        "⚠️ Required: Your spouse and ALL dependent children must attend the interview
         with you at U.S. Consulate Toronto. This is a 2025 requirement.
         Applications will be rescheduled if family members are absent.

         Please ensure all family members have valid passports and DS-160 forms completed."

    REQUIRE: confirmation checkbox — "I confirm my spouse and dependents will attend"
    GENERATE: DS-160 checklist for each family member
    FORMAT: Physical tabbed binder (verify if digital intake added — check ca.usembassy.gov)
```

## Seoul (South Korea) — State Dept Supplement
```
IF post == "Seoul":
    DISPLAY:
        "📋 Seoul Supplement Required: The U.S. Embassy Seoul uses a State Department
         post-specific visa supplement (SEO). Download the current version at
         travel.state.gov/Supplements/by_Post before finalizing your application.
         Requirements may change — always use the most current version."

    ADD to checklist: "Download and complete current Seoul (SEO) State Dept supplement"
```

## Colombo (Sri Lanka) — DS-160 Barcode Match
```
IF post == "Colombo":
    DISPLAY WARNING:
        "⚠️ Critical — Sri Lanka DS-160 Barcode Requirement: The U.S. Embassy Colombo
         requires that the DS-160 confirmation page barcode EXACTLY matches the barcode
         on your appointment confirmation. If they do not match, you will NOT be
         interviewed and will need to reschedule.

         Action: After booking your appointment, confirm that the DS-160 barcode
         matches your appointment record before your interview date."
```

## Bridgetown (Grenada applicants)
```
IF post == "Bridgetown" AND nationality == "Grenadian":
    DISPLAY NOTE:
        "Note: The U.S. Embassy Bridgetown (Barbados) covers Grenada.
         Your interview will take place in Bridgetown, Barbados — not in Grenada."
```

## AIT Taipei (Taiwan)
```
IF post == "Taipei_AIT":
    DISPLAY:
        "📋 Important: Taiwan E-2 applications are processed by the American Institute
         in Taiwan (AIT), which functions as the U.S. consular post for Taiwan.

         Appointment System: Use ait.org.tw — NOT the standard CGI Federal system
         used by most other countries. Verify the current booking URL at ait.org.tw
         as it may change."
```

---

# SECTION 8 — Document Generation Rules by Post

```
FUNCTION generate_document_checklist(nationality, post):

    // Universal documents — all posts
    base_checklist = [
        "DS-160 confirmation page (barcode must match appointment)",
        "MRV fee payment receipt ($205 USD)",
        "Valid passport (6 months validity beyond intended stay)",
        "Passport-style photos (per current State Dept specifications)",
        "Cover letter addressed to Nonimmigrant Visa Unit",
        "Business plan",
        "Investment evidence (wire transfers, purchase agreements, escrow)",
        "Source of funds documentation",
        "Organizational documents (articles of incorporation, operating agreement, ownership proof)",
        "Business lease or purchase agreement",
        "Financial projections (3-5 year pro forma)",
        "Evidence of treaty nationality",
    ]

    // Post-specific additions
    IF post == "Toronto":
        ADD: "DS-160 for spouse and each dependent child"
        ADD: "Passports for spouse and each dependent child"
        ADD: "Proof of family relationship (marriage certificate, birth certificates)"
        ADD: "Physical tabbed binder — organized with labeled dividers"
        FORMAT_NOTE: "Physical binder required — verify if digital intake added at ca.usembassy.gov"

    IF post == "Seoul":
        ADD: "Current Seoul (SEO) State Dept supplement — download from travel.state.gov"
        ADD: "Certified English translation of all Korean-language documents"

    IF post == "Frankfurt":
        ADD: "Certified English translation of all German-language documents"
        ADD: "Steuerbescheid (German tax assessment) with certified English translation"
        LIMIT: "Total package ≤ 30 pages, ≤ 5MB — compress all PDFs"
        FORMAT_NOTE: "Business plan must be executive summary format only"

    IF post == "London":
        ADD: "Companies House extract (if UK business involved)"
        LIMIT: "Total upload ≤ 20MB"

    IF post == "Tokyo":
        ADD: "Certified English translation of all Japanese-language documents"
        ADD: "Toukibo tohon (corporate registry extract) if Japanese entity involved"
        ADD: "Kakuteishinkoku (Japanese tax return) for source of funds"

    IF post == "Paris":
        ADD: "Certified English translation of all French-language documents"
        ADD: "Kbis extract (French corporate registration) if French entity involved"
        ADD: "Avis d'imposition (French tax assessment) for source of funds"

    IF post == "Rome" OR post == "Milan":
        ADD: "Certified English translation of all Italian-language documents"
        ADD: "Visura camerale (Italian business registry extract) if Italian entity involved"
        ADD: "Apostille on Italian government-issued documents"

    IF post == "Islamabad" OR post == "Karachi" OR post == "Lahore" OR post == "Peshawar":
        ADD: "Certified English translation of all Urdu-language documents"
        ADD: "SECP registration documents if Pakistani entity involved"
        ADD: "FBR (Federal Board of Revenue) tax records for source of funds"
        ADD: "Currency conversion documentation (PKR to USD)"
        ADD: "Pakistan NIV pause notice — E-2 is nonimmigrant and unaffected"

    IF post == "Colombo":
        ADD: "DS-160 confirmation page — VERIFY barcode matches appointment record"

    IF post == "Cairo":
        ADD: "Certified English translation of all Arabic-language documents"
        ADD: "Notarized translations where required (verify current requirement)"

    IF post == "Buenos Aires":
        ADD: "Certified English translation of all Spanish-language documents"
        ADD: "IGJ corporate inscription if Argentine entity involved"
        ADD: "AFIP tax records for source of funds"
        ADD: "Currency conversion documentation (ARS to USD)"

    IF post == "Panama_City":
        ADD: "Certified English translation of all Spanish-language documents"
        ADD: "Panamanian Public Registry extract"
        ADD_WARNING: "⚠️ Source of funds must clearly establish clean lawful origin —
                      Panama's offshore financial sector means this is scrutinized carefully"

    RETURN base_checklist + post_additions
```

---

# SECTION 9 — Investment Validation Rules

```
FUNCTION validate_investment(investment_amount_usd, business_type):

    IF investment_amount_usd < 50000:
        DISPLAY: "⚠️ Your stated investment amount of ${amount} is significantly below
                  the informal threshold most consular officers look for.
                  E-2 applications with investments under $80,000 receive heavy scrutiny
                  and face elevated denial risk. Consider whether your investment
                  amount will be sufficient."

    IF investment_amount_usd >= 50000 AND investment_amount_usd < 100000:
        DISPLAY: "⚠️ Your investment amount of ${amount} is below the informal $100,000
                  threshold. This is not an automatic disqualifier, but you should expect
                  additional scrutiny. Ensure your business plan and investment evidence
                  are exceptionally strong."

    IF investment_amount_usd >= 100000:
        // No warning — standard range
        CONTINUE

    IF business_type == "consulting" OR business_type == "coaching" OR business_type == "online_only":
        DISPLAY: "⚠️ High-Scrutiny Business Type: Consulting, coaching, and online-only
                  businesses receive elevated scrutiny at most E-2 posts due to concerns
                  about marginality (i.e., the business generates income primarily for
                  the applicant rather than making a real contribution to the U.S. economy).

                  Ensure your business plan demonstrates:
                  - Clear plan to hire U.S. workers (citizens or permanent residents)
                  - Investment beyond personal labor
                  - Genuine commercial operations beyond personal service"

    IF business_type == "real_estate_passive":
        DISPLAY: "⚠️ Passive real estate investment structures are frequently denied at
                  E-2 interviews. E-2 requires the investor to be actively managing
                  the enterprise, not passively collecting returns."
```

---

# SECTION 10 — Timeline Builder Rules

```
FUNCTION build_timeline(post, current_date):

    wait_times = {
        "Islamabad": 7,      // months — State Dept data 2026
        "Istanbul": 0.5,     // months — State Dept data 2026
        "Toronto": 4,        // months — Frear Law Q4 2025
        "London": 3,         // months — estimate
        "Frankfurt": 3,      // months — estimate
        "Seoul": 3,          // months — estimate
        "Tokyo": 3,          // months — estimate
        "Sydney": 3,         // months — estimate
        "Paris": 3,          // months — estimate
        "Amsterdam": 2,      // months — estimate
        "Mexico_City": 4,    // months — estimate
        "DEFAULT": 3,        // months — conservative estimate for unknown posts
    }

    post_wait = wait_times.get(post, wait_times["DEFAULT"])

    prep_time = 4  // weeks — document preparation
    processing_time = 2  // weeks — post-interview to visa issuance

    timeline = {
        "document_prep_start": current_date,
        "document_prep_complete": current_date + prep_time weeks,
        "appointment_booking": current_date + prep_time weeks,
        "estimated_interview": current_date + prep_time weeks + post_wait months,
        "estimated_visa_issuance": current_date + prep_time weeks + post_wait months + processing_time weeks,
    }

    IF post == "Islamabad":
        ADD WARNING: "⚠️ Islamabad has one of the longest appointment waits globally
                      (~7 months). In addition to appointment wait, allow additional time
                      for potential administrative processing after interview."

    IF post == "Istanbul":
        ADD NOTE: "✅ Istanbul currently has very short appointment waits (under 2 weeks
                   per State Dept data). This is one of the fastest E-2 posts globally."

    RETURN timeline
```

---

# SECTION 11 — Annual Review & Data Freshness Flags

```
// All date-sensitive data in platform must carry a freshness indicator

DATA_FRESHNESS_RULES = {
    "visa_validity_periods": {
        "review_frequency": "annual",
        "source": "travel.state.gov/reciprocity",
        "staleness_warning_after": 12,  // months
    },
    "mrv_fee": {
        "review_frequency": "annual",
        "current_value": "$205 USD",
        "source": "travel.state.gov/fees",
        "staleness_warning_after": 12,
    },
    "appointment_wait_times": {
        "review_frequency": "quarterly",
        "source": "travel.state.gov/waittimes",
        "staleness_warning_after": 3,  // months
    },
    "toronto_family_attendance_rule": {
        "review_frequency": "quarterly",
        "current_rule": "Spouse and dependents required at interview (2025)",
        "source": "ca.usembassy.gov",
        "staleness_warning_after": 3,
    },
    "frankfurt_page_limits": {
        "review_frequency": "annual",
        "current_rule": "30 pages / 5MB",
        "source": "de.usembassy.gov/frankfurt",
        "staleness_warning_after": 12,
    },
    "london_upload_cap": {
        "review_frequency": "annual",
        "current_rule": "20MB",
        "source": "uk.usembassy.gov",
        "staleness_warning_after": 12,
    },
    "pakistan_iv_pause": {
        "review_frequency": "monthly",
        "current_rule": "IV paused Jan 21 2026 — E-2 NIV unaffected",
        "source": "pk.usembassy.gov + State Dept",
        "staleness_warning_after": 1,  // month
    },
    "ukraine_embassy_status": {
        "review_frequency": "monthly",
        "source": "ua.usembassy.gov",
        "staleness_warning_after": 1,
    },
    "third_country_processing_policy": {
        "review_frequency": "annual",
        "current_rule": "Eliminated September 6, 2025",
        "source": "travel.state.gov + Sisu Legal",
        "staleness_warning_after": 12,
    },
    "seoul_supplement": {
        "review_frequency": "per_application",
        "note": "Download fresh copy from travel.state.gov/Supplements/by_Post for every application",
    },
}

// UI rule: display "Last verified: [date]" on every data point that carries a date
// UI rule: show yellow warning icon when data is within 30 days of staleness threshold
// UI rule: show red warning icon when data has exceeded staleness threshold
```

---

*End of Platform Logic Rules*
*Save as: docs/spec/E2_Platform_Logic_Rules.md*
