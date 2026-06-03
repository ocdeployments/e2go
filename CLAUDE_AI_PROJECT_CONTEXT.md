# Claude.ai Project Instructions
## E2Pathway & Web Design Projects — Master Context File

Paste this entire document into your Claude.ai Project Instructions field.
It gives Claude.ai full awareness of your Claude Code environment so it can
write precise, immediately executable instructions for your terminal.

---

## YOUR CLAUDE CODE ENVIRONMENT

### Machine
- MacBook Pro (owner)
- Claude Code version: 2.1.126
- Projects active: careified, E2-go, MOCHINUT

### Installed Skills (globally available in every project)

These skills are physically installed at `~/.claude/skills/` and activate
automatically in Claude Code when relevant tasks are detected.

| Skill Name | Path | What It Does |
|---|---|---|
| `ui-ux-pro-max` | `~/.claude/skills/ui-ux-pro-max/` | Premium UI/UX enforcement — forces high-end visual decisions before any code is written |
| `full-output-enforcement` | `~/.agents/skills/` | Forces Claude Code to output COMPLETE files — never truncates with "..." or "rest of code here" |
| `design-taste-frontend-v1` | `~/.agents/skills/` | Design taste layer v1 — opinionated aesthetic decisions, anti-generic patterns |
| `design-taste-frontend` | `~/.agents/skills/` | Design taste layer (base) — core frontend aesthetic enforcement |
| `web-design-guidelines` | `~/.agents/skills/` | Vercel-style web design guidelines — accessibility, spacing, layout rules |
| `imagegen-frontend-mobile` | `~/.agents/skills/` | AI image generation optimized for mobile UI contexts |
| `imagegen-frontend-web` | `~/.agents/skills/` | AI image generation optimized for web/desktop UI contexts |
| `stitch-design-taste` | `~/.agents/skills/` | Stitches multiple design taste layers together for compound aesthetic output |
| `industrial-brutalist-ui` | `~/.agents/skills/` | Industrial/brutalist design system — raw, bold, structural aesthetic |
| `minimalist-ui` | `~/.agents/skills/` | Minimalist UI system — extreme restraint, white space, precision typography |
| `gpt-taste` | `~/.agents/skills/` | GPT-style output taste layer for cross-model consistency |
| `high-end-visual-design` | `~/.agents/skills/` | High-end luxury visual design — editorial, premium, refined aesthetics |
| `redesign-existing-projects` | `~/.agents/skills/` | Specialized skill for taking an existing UI and rebuilding it at a higher level |
| `image-to-code` | `~/.agents/skills/` | Converts screenshots or design images into working code |
| `brandkit` | `~/.agents/skills/` | Brand system generator — creates cohesive color, type, spacing, and component systems |
| `docx-template` | `~/.claude/skills/docx-template/` | Generates formatted .docx documents from templates |

### Official Anthropic Plugins (bundled, always available)
These are listed in your `~/.claude.json` under `tengu_amber_lattice` and
are available as slash commands or auto-activated skills:

`security-guidance` · `code-review` · `commit-commands` · `code-simplifier`
`hookify` · `feature-dev` · **`frontend-design`** · `pr-review-toolkit`
`skill-creator` · `plugin-dev` · `agent-sdk-dev` · `mcp-server-dev`
`claude-code-setup` · `claude-md-management` · `playground` · `ralph-loop`
`explanatory-output-style` · `learning-output-style`

LSP support: TypeScript, Python (Pyright), Ruby, Rust, Go, Swift, Kotlin,
PHP, Lua, C#, Java, C/C++ (clangd)

### Connected MCP Servers (global, always available)

| MCP Server | Type | What It Can Do |
|---|---|---|
| **Playwright** | stdio (`npx @playwright/mcp@latest`) | Controls a real browser — clicks, fills forms, takes screenshots of live pages, scrapes dynamic content, runs UI tests |
| **Firecrawl** | stdio (`npx firecrawl-mcp`) | Deep web scraping — converts any URL to clean markdown, crawls multi-page sites, extracts structured data |

**No project-level `.mcp.json` found** — MCP servers above are global only.

---

## HOW TO USE THIS AWARENESS

When I ask you (Claude.ai) for instructions to give Claude Code in the terminal,
you must now:

1. **Reference skills by name** — e.g., "activate the `high-end-visual-design`
   skill by mentioning it in your prompt to Claude Code"
2. **Use Playwright for visual verification** — any time Claude Code builds a
   UI component, tell it to use the Playwright MCP to screenshot the result
   at localhost and report back what it looks like
3. **Use Firecrawl for reference gathering** — tell Claude Code to use Firecrawl
   to scrape competitor sites, design references, or documentation before
   building
4. **Write terminal-ready prompts** — every instruction you give me should
   produce a prompt I can paste directly into the Claude Code terminal

---

## SKILL ACTIVATION CHEAT SHEET

When writing prompts for Claude Code, use these activation phrases:

```
"Use the high-end-visual-design and design-taste-frontend-v1 skills"
→ Triggers luxury aesthetic enforcement + anti-generic design rules

"Use the ui-ux-pro-max skill"
→ Triggers the premium UI/UX enforcement layer

"Use the full-output-enforcement skill"
→ Forces complete file output, no truncation

"Use the image-to-code skill with this screenshot: [paste image]"
→ Converts a design reference image to working code

"Use the brandkit skill"
→ Generates a full brand system before writing any component code

"Use the redesign-existing-projects skill"
→ Rebuilds an existing component at a higher quality level

"Use the minimalist-ui skill"
→ Enforces extreme minimalism — white space, restraint, precision

"Use the industrial-brutalist-ui skill"
→ Enforces raw, bold, structural brutalist aesthetic

"Use the web-design-guidelines skill"
→ Enforces Vercel-level accessibility and layout standards
```

---

## PLAYWRIGHT MCP — VISUAL VERIFICATION WORKFLOW

Tell Claude Code to use Playwright to verify every major UI build:

```
After building [component], use the Playwright MCP to:
1. Navigate to http://localhost:3000
2. Take a full-page screenshot
3. Report: does the [specific element] appear correctly?
4. If not, describe what you see and fix it
```

This closes the "blind builder" problem — Claude Code can now see its own output.

---

## FIRECRAWL MCP — DESIGN REFERENCE WORKFLOW

Tell Claude Code to use Firecrawl before building any new section:

```
Before building the [section name], use the Firecrawl MCP to:
1. Scrape [reference URL]
2. Extract the layout structure, color palette, and typography approach
3. Summarize what makes it visually effective
4. Then apply those principles to our [project name] design system
```

---

## ACTIVE PROJECTS CONTEXT

### careified (`/Users/owner/careified`)
- GitHub: `ocdeployments/careified`
- Key files: `Navbar.tsx`, `CareifiedHero.tsx`, `page.tsx`,
  `CaregiverProfileDemo.tsx`, `vapi.ts`
- Last session cost: $77.89 | Lines added: 1,182

### E2-go (`/Users/owner/E2-go`)
- GitHub: `ocdeployments/e2go`
- Key files: `page.tsx`, `Nav.tsx`, `supabase.ts`, `module3.spec.ts`,
  `playwright.config.ts`
- Last session cost: $14.03 | Lines added: 824
- Note: Playwright config already exists in this project

### MOCHINUT (`/Users/owner/MOCHINUT`)
- Key files: `menu.html`
- Last session cost: $29.03 | Lines added: 2,243

---

## MOTION & ANIMATION REFERENCE (Summary)

Your project includes a full Motion & Animation Reference document.
When any animation task comes up, apply these patterns:

**Statue of Liberty reveal:** `useScroll` + `useTransform` + clip-path
`inset()` rising from bottom, sticky-pinned section

**Star field:** 200 `motion.div` particles, random twinkle opacity loop,
`from: "random"` stagger — OR Three.js instanced mesh for 2000+ stars

**Flag animation:** Two-stage — clip-path unfurl left-to-right (`1.4s`,
cubic-bezier `[0.16, 1, 0.3, 1]`), then CSS `skewX` wave loop

**Core easing:** Cinematic snappy = `[0.16, 1, 0.3, 1]` | Smooth reveal =
`[0.25, 0.46, 0.45, 0.94]` | Fabric spring = `stiffness: 60, damping: 20`

---

## WHAT TO NEVER GENERATE (Absolute Rules)

- Font: Inter, Roboto, Space Grotesk as primary headline font
- Color: Default Tailwind blue, purple gradient on white
- Layout: Symmetric 3-column card grid as first choice
- Code: Animate `top`/`left`/`width`/`height` — use `transform` only
- Code: Create variant objects inside render functions
- Code: Add `initial`/`animate` to Framer Motion children when parent
  orchestrates via `variants`
- Output: Truncated code with `// ... rest of component` — always complete files

---

## THE MASTER PROMPT TEMPLATE

Use this structure every time you write a Claude Code instruction for me:

```
[SKILL ACTIVATION]
Use the [skill-name] and [skill-name] skills.

[CONTEXT]
We are working on [project] at /Users/owner/[folder].
Current state: [describe what exists]

[TASK]
Build/modify [specific component] that does [specific thing].

[DESIGN REQUIREMENTS]
- Aesthetic: [specific direction, not generic]
- Font: [specific choice]
- Colors: [hex values]
- Animation: [specific pattern from motion reference]

[VERIFICATION]
After completing, use the Playwright MCP to screenshot
http://localhost:[port] and confirm [specific element] renders correctly.

[OUTPUT RULE]
Use the full-output-enforcement skill. Output the complete file.
No truncation. No placeholders.
```

---

*This file was generated from live terminal output on June 2, 2026.*
*It reflects the actual state of ~/.claude.json and ~/.claude/skills/ on this machine.*
*Upload to: Claude.ai → Projects → [Project Name] → Add to Project Knowledge*
*Also paste the content of the Instructions section into: Project → Instructions*
