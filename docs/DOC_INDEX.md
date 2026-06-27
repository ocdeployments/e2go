| File | Owns | Never Contains |
|---|---|---|
| CLAUDE_CONTEXT.md | Standing rules, architecture decisions, routes, design system, env vars | Build status, session logs |
| BUILD_TRACKER.md | Build status, session logs, bugs, phase scope, known issues | Rules, product spec |
| soul.md | Brand voice, copy principles, tone, approved copy | Tech decisions, build status |
| public/data/module0_questions.json | Quiz questions v2.1 — LOCKED | Scoring logic |
| public/data/module0_scoring_logic.json | Scoring engine v1.1 — LOCKED | Questions |
| docs/schema_complete.sql | Database schema — single source of truth | App logic |
| docs/spec/ (Vol 1–4) | Product specification — reference only | Live build status |
| docs/DOC_INDEX.md | This index — what every file owns | Anything else |
| docs/Document_Generation_Standards.md | Visual format, tone, language rules, structure standards, consistency checker, repetition checker, quality gate, page limits, post-specific exceptions. This is the constitution for all document generation. Never deviate without explicit instruction. | Current app state |
| docs/Document_Conditionals.md | Trigger logic for every conditional document, dashboard display logic, generation gate prerequisites, document count by configuration, Frankfurt compression rules, banking sequence for checklist. | Current app state |
| docs/spec/E2_Franchise_Categories_Section5.md | Franchise category E-2 compatibility ratings, investment ranges, employee counts, experience requirements, example brands, Toronto patterns, tier assignments. Do not rebuild — read this file directly. | Current app state |
| docs/spec/E2_Platform_Logic_Rules.md | If/then rules engine for nationality gates, consulate routing, post-specific document rules, warning triggers. Read before building any routing logic. | Current app state |
| docs/spec/E2_Document_Builder_Spec.md | Per-post document generation logic, cover letter paragraph specifications, nationality-specific rules. Read before building document generation engine. | Current app state |
| docs/spec/E2_Attorney_Review_Register.md | Legal boundary definition. What platform can and cannot say or do. Read before writing any copy. | Current app state |
| docs/spec/E2_Community_Questions_Raw.md | 315 community questions, frequency ratings, top 10 misconceptions. Source for /learn knowledge base. | Current app state |
| docs/spec/E2_Answers_Part1_Eligibility_Investment.md | Verified answers categories 1-2. Official sources. | Current app state |
| docs/spec/E2_Answers_Part2_BusinessType_Partnership.md | Verified answers categories 3-4. Official sources. | Current app state |
| docs/spec/E2_Answers_Part3_Application_Interview.md | Verified answers categories 5-6. Official sources. | Current app state |
| docs/spec/E2_Answers_Part4_Family_Renewal_Denial.md | Verified answers categories 7-10. Official sources. | Current app state |
| docs/spec/E2_Answers_Part5_GreenCard_Tax.md | Verified answers categories 11-12. Official sources. | Current app state |
| docs/spec/E2_Answers_Part6_EdgeCases_Alternatives_AppLogic.md | Verified answers categories 13-16. Official sources. | Current app state |
| docs/spec/E2_Global_Consulate_Intelligence_Report_Part1.md | Master consulate table, 82 treaty countries, processing times, suspended posts, third-country policy. | Current app state |
| docs/spec/module3_denial_audit.md | 15 real denial categories with platform implications. Read before building any Module 3 question content. | Current app state |
| src/lib/treatyCountries.ts | Treaty country list, consulate profiles | (To be built) |
| src/lib/governmentFees.ts | Government fee schedule by country | (To be built) |

Rule: Before creating any new doc, add it to DOC_INDEX.md first and declare what it owns. Never let two files own the same topic.