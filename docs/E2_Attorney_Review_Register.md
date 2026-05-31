# E-2 Pathway Platform — Attorney Review Flag Register
## Vol 3 Supplement: Items Requiring Licensed Immigration Attorney Verification

**Document:** `docs/spec/E2_Attorney_Review_Register.md`
**Version:** 1.0 — May 2026
**Purpose:** Comprehensive list of every data point, rule, and platform claim that must be reviewed
and verified by a licensed U.S. immigration attorney before the platform goes live with paying users.

> ⚠️ This platform provides document preparation assistance and general information.
> It does not provide legal advice. All platform content must be attorney-reviewed
> before being presented to users as guidance.

---

# PRIORITY 1 — Critical: Must Resolve Before Beta Launch

| # | Item | Current Status | Risk if Wrong | Attorney Action Required |
|---|------|---------------|--------------|--------------------------|
| 1 | Third-country national policy elimination (Sept 6, 2025) | Sourced from Sisu Legal; not State Dept primary | Users may attempt wrong post | Confirm current State Dept policy; get primary source citation |
| 2 | Pakistan immigrant visa pause — NIV E-2 unaffected | Sourced from secondary reporting | Users may incorrectly believe E-2 also paused | Confirm E-2 NIV category explicitly unaffected; provide State Dept citation |
| 3 | Toronto family attendance rule (2025) | Sourced from attorney publication | Users miss interview | Confirm rule is current and still in effect; get embassy source |
| 4 | Frankfurt 30-page / 5MB limit | Community/attorney sourced | Applications rejected | Verify current limits directly from de.usembassy.gov/frankfurt |
| 5 | London 20MB upload cap | Attorney sourced | Files rejected at upload | Verify current limit at uk.usembassy.gov |
| 6 | Sri Lanka DS-160 barcode match requirement | lk.usembassy.gov sourced | Applicants turned away | Confirm still current policy; verify exact wording |
| 7 | Ukraine NIV operational status | Known to be restricted; current status unclear | Applicants waste time/money | Check ua.usembassy.gov; confirm current NIV appointment availability |
| 8 | Nicaragua operational status | Known uncertain; not verified | Applicants waste time/money | Check ni.usembassy.gov; confirm or flag as unavailable |
| 9 | $205 USD MRV fee — E category | Standard fee; may have changed | Users underpay | Verify current fee at travel.state.gov/fees |
| 10 | All visa validity periods by nationality | Reciprocity table; may have changed | Users get wrong timeline | Spot-check 10 key nationalities against current travel.state.gov/reciprocity |

---

# PRIORITY 2 — Important: Resolve Before Public Launch

| # | Item | Current Status | Risk if Wrong | Attorney Action Required |
|---|------|---------------|--------------|--------------------------|
| 11 | Seoul SEO supplement — current version | Known to exist; current content unknown | Missing post-specific requirements | Download current SEO supplement; incorporate requirements into platform |
| 12 | Tokyo — physical vs. digital submission | Uncertain | Users bring wrong format to interview | Verify current Tokyo intake method at jp.usembassy.gov |
| 13 | Korea — apostille requirement for government docs | Marked 🔄 in platform | Missing required apostille | Confirm with Korean immigration attorney |
| 14 | Egypt — notarization requirement | Marked 🔄 in platform | Missing notarized translations | Confirm current requirement at eg.usembassy.gov or with local attorney |
| 15 | Italy — apostille requirement scope | Standard assumption | Missing apostilles on required docs | Confirm which Italian documents require apostille |
| 16 | Grenada CBI → E-2 scrutiny level | Community reported | Under/over-warning users | Confirm with attorney who handles Bridgetown post applications |
| 17 | Turkey CBI → E-2 admin processing rates | Community reported | Under/over-warning users | Confirm with attorney who handles Istanbul applications |
| 18 | Panama — offshore entity source of funds treatment | General knowledge | Missed issue in application | Confirm current officer practice at Panama City post |
| 19 | Argentina — ARS/USD conversion documentation standard | General knowledge | Source of funds docs incomplete | Confirm current standard with Buenos Aires-experienced attorney |
| 20 | Pakistan — admin processing (221g) rate | Community reported | Under-preparing users | Confirm realistic 221g rate from attorney with Pakistan experience |

---

# PRIORITY 3 — Ongoing: Review Cycle Items

| # | Item | Review Frequency | Attorney Role |
|---|------|-----------------|---------------|
| 21 | All wait time data | Quarterly | Spot-check against State Dept global wait times tool |
| 22 | Investment threshold informal guidance ($100K) | Annual | Confirm still current industry consensus |
| 23 | "Marginality" definition and current officer interpretation | Annual | Confirm with practitioners at high-volume posts |
| 24 | At-risk investment definition — escrow acceptability | Annual | Confirm current practice |
| 25 | Job creation standards — "U.S. workers" definition | Annual | Confirm regulatory and practice standard |
| 26 | Business plan content standards by post | Annual | Review sample approved plans by post if accessible |
| 27 | Source of funds — minimum documentation standard | Annual | Confirm current practice at high-volume posts |
| 28 | Franchise application standards (FDD requirements) | Annual | Confirm FDD version requirements |
| 29 | Interview attorney attendance policies | Annual | Confirm per-post policies |
| 30 | AIT Taipei appointment system URL and process | Per update | Confirm at ait.org.tw before each application cycle |

---

# SECTION 2 — Legal Disclaimer Language (Platform-Wide)

> The following disclaimer must appear on every platform page that provides guidance,
> checklists, or document templates. Attorney to review and approve exact language.

```
DRAFT DISCLAIMER — ATTORNEY REVIEW REQUIRED:

"E-2 Pathway provides document preparation tools and general informational content 
to assist in organizing your E-2 visa application materials. This platform does not 
provide legal advice, and use of this platform does not create an attorney-client 
relationship. 

Immigration law and consular practices change frequently. All information provided 
is for general guidance only and may not reflect the most current requirements at 
your specific U.S. Embassy or Consulate. 

You are strongly encouraged to consult with a qualified, licensed U.S. immigration 
attorney before submitting any visa application. E-2 Pathway is not responsible for 
visa denials, delays, or other outcomes resulting from your application."
```

---

# SECTION 3 — Specific Platform Claims Requiring Citation Sources

Every claim in the platform must have a citable source. The following claims currently
have secondary or unverified sourcing and need primary source confirmation:

| Claim | Current Source | Primary Source Needed |
|-------|---------------|----------------------|
| "Third-country national processing eliminated Sept 6, 2025" | Sisu Legal publication | State Dept official announcement or travel.state.gov page |
| "Toronto ~4 month wait Q4 2025" | Frear Law attorney publication | State Dept Global Wait Times tool screenshot |
| "Islamabad ~7 month wait 2026" | State Dept wait times tool | Direct screenshot with date |
| "Istanbul <0.5 month wait 2026" | State Dept wait times tool | Direct screenshot with date |
| "Toronto family attendance required 2025" | Attorney publication | ca.usembassy.gov page screenshot |
| "Frankfurt 30 pages / 5MB" | Attorney community | de.usembassy.gov/frankfurt page screenshot |
| "London 20MB cap" | Attorney community | uk.usembassy.gov page screenshot |
| "Sri Lanka DS-160 barcode match requirement" | lk.usembassy.gov | Archived screenshot of page |
| "Pakistan IV pause Jan 21 2026" | Multiple news sources | State Dept official announcement |
| "Grenada CBI → E-2 scrutiny" | Community reported | Attorney declaration or published attorney guidance |

---

# SECTION 4 — Platform Scope Boundaries (Attorney to Confirm)

The following practices are OUTSIDE platform scope and must never be presented as platform services:

1. ❌ Legal advice on whether a specific investment qualifies for E-2
2. ❌ Assessment of whether a specific source of funds is acceptable
3. ❌ Prediction of approval likelihood for a specific application
4. ❌ Legal representation at consular interviews
5. ❌ Communication with U.S. embassies or consulates on behalf of users
6. ❌ Review of specific user documents for legal sufficiency
7. ❌ Advice on responses to 221(g) requests for evidence
8. ❌ Guidance on immigration fraud or misrepresentation avoidance (beyond general accuracy reminders)

The following ARE within platform scope:
1. ✅ Document organization and checklist generation
2. ✅ Business plan template with prompts
3. ✅ Interview question preparation guides
4. ✅ Timeline estimation tools
5. ✅ Post-specific formatting requirements (page limits, file sizes, etc.)
6. ✅ Translation requirement identification
7. ✅ General informational content about E-2 process

---

*End of Attorney Review Flag Register*
*Save as: docs/spec/E2_Attorney_Review_Register.md*
