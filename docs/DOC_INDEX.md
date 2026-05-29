| File | Owns | Never Contains |
|---|---|---|
| CLAUDE_CONTEXT.md | Standing rules, architecture decisions, routes, design system, env vars | Build status, session logs |
| BUILD_TRACKER.md | Build status, session logs, bugs, phase scope, known issues | Rules, product spec |
| soul.md | Brand voice, copy principles, tone | Tech decisions, build status |
| public/data/module0_questions.json | Quiz questions v2.1 — LOCKED | Scoring logic |
| public/data/module0_scoring_logic.json | Scoring engine v1.1 — LOCKED | Questions |
| docs/schema_complete.sql | Database schema — single source of truth | App logic |
| docs/spec/ (Vol 1–4) | Product specification — reference only | Live build status |
| docs/DOC_INDEX.md | This index — what every file owns | Anything else |

Rule: Before creating any new doc, add it to DOC_INDEX.md first and declare what it owns. Never let two files own the same topic.