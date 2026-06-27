# e2go.app — UI Build Process
## Standing Orders for Every UI Session in Claude Code

**This file is read before any UI component is built.**
**No exceptions. No shortcuts.**

---

## THE MANDATORY 5-STEP SEQUENCE

Every time a new UI component, page, or layout is being built:

### Step 1 — Lazyweb Research
Use `lazyweb-design-research` and `lazyweb-quick-references` to find
real production screenshots of the pattern being built.

Examples:
- Building a sidebar form nav → query "multi-step form sidebar dark theme"
- Building a completion ring → query "progress indicator step completion ring"
- Building a field input → query "form field dark glass input focus state"

Do not write any code until you have studied at least 5–8 real screens.
Extract: layout structure, visual hierarchy, spacing, interaction states.

### Step 2 — Firecrawl Reference Study
Use `firecrawl-website-design-clone` on a relevant reference product.

Recommended references by component type:
- Form layout / intake flow → https://www.deel.com or https://stripe.com/atlas
- Multi-step wizard with sidebar → https://www.turbotax.com
- Legal document intake → https://www.clerky.com
- Professional onboarding → https://www.brex.com/onboarding

Extract: section naming conventions, progress copy, save button microcopy,
how they handle required fields, error states, and completion feedback.

### Step 3 — Magic MCP for Complex Components
Use the Magic MCP (21st.dev) to generate any component with significant
interaction complexity:
- Repeating groups (work history, education entries)
- Conditional branch fields (show/hide sub-fields)
- Currency inputs with formatting
- Searchable selects with country/state data
- Multi-file reference checklists

Tell Magic exactly what the component does. Use its output as the base.
Then adapt to the e2go design system tokens below.

### Step 4 — Skills Active
Activate these skills before writing any component code:
- `ui-ux-pro-max` — 161 rules, premium UI/UX enforcement
- `full-output-enforcement` — complete files, no truncation ever
- `e2go-frontend` — e2go-specific design system rules

### Step 5 — Playwright Verification
After every component or page is built:
1. Navigate to http://localhost:3000 (or the specific route)
2. Take a full-page screenshot
3. Confirm the specific element renders correctly
4. If anything looks wrong — describe it and fix it before moving on

---

## e2go DESIGN SYSTEM TOKENS

| Token | Value |
|---|---|
| Background | #0a0a0a |
| Gold accent | #C9A84C |
| Text primary | #f5f0e8 |
| Heading font | Cormorant Garamond (light + italic weight contrast) |
| Body font | DM Sans |
| Aesthetic | Luxury legal, private wealth, authority |
| Texture | Grain overlay |
| Details | Gold line art, corner brackets |
| Glassmorphism | NEVER — this is forbidden |

Form field tokens:
- Input background: rgba(255,255,255,0.04)
- Input border: 1px solid rgba(201,168,76,0.2)
- Input focus border: 1px solid #C9A84C
- Label: DM Sans 12px, rgba(245,240,232,0.6), uppercase, tracked
- Required indicator: #C9A84C gold asterisk
- Privacy dot: red #EF4444 / amber #F59E0B / green #10B981
- Section header: Cormorant Garamond, light italic

---

## WHAT NEVER GOES IN A COMPONENT

- Font: Inter, Roboto, or Space Grotesk as headline font
- Color: Default Tailwind blue or purple gradient
- Layout: Symmetric 3-column card grid as first choice
- Animation: Never animate top/left/width/height — use transform only
- Output: Truncated code with "// ... rest of component"
- Style: Glassmorphism (rgba white blur cards) — forbidden in e2go

---

## MODULE 3 FORM ARCHITECTURE (decided June 3, 2026)

**Decision:** Replaced single-question-at-a-time pattern with
categorized section-based forms.

**Reason:** 220–270 questions across 12 tabs. One question per screen
is inappropriate for a professional visa application tool.

**New pattern:**
- Left sidebar shows all sections within a tab
- Each section shows: title, question count, completion ring
- Clicking a section scrolls to that section's form
- All questions in a section are visible simultaneously
- Save button per section triggers Supabase upsert
- 800ms debounce autosave per field preserved

**Components:**
- `TabPage.tsx` — two-column layout wrapper
- `TabSidebar.tsx` — left nav with section list + completion rings
- `SectionForm.tsx` — renders all fields in one section
- `FormField.tsx` — individual field, supports 10+ types

**Quiz (Module 0) stays one-question-at-a-time** — it is an eligibility
screener with branching logic, 26 questions only. Different use case.

---

*File location: ~/E2-go/docs/UI_BUILD_PROCESS.md*
*Also save a copy here after any process updates.*
*Last updated: June 3, 2026*
