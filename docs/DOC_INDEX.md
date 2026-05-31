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
| docs/spec/E2_Community_Questions_Raw.md | Community question database, 315 questions | Current app state |
| docs/spec/E2_Answers_Part1_Eligibility_Investment.md | Verified answers categories 1-2 | Current app state |
| docs/spec/E2_Global_Consulate_Intelligence_Report_Part1.md | Global consulate intelligence, master table | Current app state |
| src/lib/treatyCountries.ts | Treaty country list, consulate profiles | (To be built) |
| src/lib/governmentFees.ts | Government fee schedule by country | (To be built) |

Rule: Before creating any new doc, add it to DOC_INDEX.md first and declare what it owns. Never let two files own the same topic.