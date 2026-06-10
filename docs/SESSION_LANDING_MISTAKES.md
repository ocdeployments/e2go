# SESSION — Landing Page: Mistakes Section + Pricing + Copy Fixes
**Branch:** dev
**File touched:** src/app/HomeClient.tsx only
**Estimated time:** 20 minutes

---

## MANDATORY FIRST STEPS

```bash
cd ~/E2-go
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat src/app/HomeClient.tsx
```

Read ALL fully before touching anything.

---

## DESIGN TOKENS — LOCKED

```
Background:    #0a0a0a
Gold:          #C9A84C
Text:          #f5f0e8
Muted:         rgba(245,240,232,0.45)
Card border:   1px solid rgba(201,168,76,0.12)
Heading font:  Cormorant Garamond — weight 300
Body font:     DM Sans
Radius:        0 — no rounded corners anywhere
FORBIDDEN:     glassmorphism, rounded corners, gradients,
               shadows, blur, teal, any blue accent
```

---

## COPY RULES — LOCKED

- Never use "attorney" or "lawyer" in marketing copy
- Always use "immigration consultant" or "traditional route"
- Never use "voice" — always "writing style"
- Brand name is E2go — capital E, lowercase go

---

## CHANGE 1 — FIX HERO HEADLINE PUNCTUATION

Find this line in HomeClient.tsx:
```
Your E-2 Investor Visa;<br />
```

Change the semicolon to an em dash:
```
Your E-2 Investor Visa —<br />
```

---

## CHANGE 2 — FIX STATS PRICING

Find this in the stats array:
```tsx
{ num: "From $297", label: "vs. $12,000+ traditional" },
```

Change to:
```tsx
{ num: "From $550", label: "vs. $12,000+ traditional" },
```

---

## CHANGE 3 — FIX FOOTER LOGO

Find in the footer section:
```tsx
e2go<span className="text-[rgba(245,240,232,0.5)]">.app</span>
```

Change to:
```tsx
E2go<span className="text-[rgba(245,240,232,0.5)]">.app</span>
```

---

## CHANGE 4 — FIX FOOTER NAV LINKS

Find the footer nav links array:
```tsx
{["How it works", "Pricing", "Quiz", "Learn", "Support"].map(l => (
```

Change to:
```tsx
{["How it works", "Learn", "Pricing", "Simulator", "Support"].map(l => (
```

And fix the href mapping — "Simulator" needs to go to /simulator not /simulator:
```tsx
href={`/${l.toLowerCase().replace(/ /g, "-")}`}
```
This already works correctly for all items.

---

## CHANGE 5 — ADD MISTAKES SECTION

This is the main addition. Insert a new section BETWEEN
the social proof bar and the "HOW IT WORKS" section.

Find this comment in HomeClient.tsx:
```tsx
{/* HOW IT WORKS */}
```

Insert the following IMMEDIATELY BEFORE that comment:

```tsx
{/* MISTAKES SECTION */}
<section className="px-4 md:px-10 lg:px-16 py-16 md:py-24
  bg-[rgba(201,168,76,0.02)] border-b
  border-[rgba(201,168,76,0.08)]">
  <p className="text-[10px] tracking-[0.18em] uppercase
    text-[rgba(201,168,76,0.6)] mb-3">
    What gets people denied
  </p>
  <h2 className="font-['Cormorant_Garamond'] text-3xl
    md:text-5xl font-light text-[#f5f0e8] mb-3">
    The four most common E-2 mistakes.
  </h2>
  <p className="text-sm text-[rgba(245,240,232,0.45)] mb-12
    max-w-lg leading-relaxed">
    Most denials are not caused by ineligibility. They are
    caused by preparation errors that a structured process
    would have caught.
  </p>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
    {[
      {
        n: "01",
        t: "Rushing to invest before confirming fit",
        d: "The costliest mistake in the E-2 process is committing capital to a business before confirming that the investment structure, the business model, and your qualifications will survive consular scrutiny. The right sequence is: assess first, invest second, document third. E2go is built around that sequence."
      },
      {
        n: "02",
        t: "Treating it like a checklist instead of a strategy",
        d: "A checklist gets you organised. A strategy gets you approved. The documents E2go generates are not a checklist — they are a coordinated argument. Every document answers a specific question the officer will ask. Together, they tell one story."
      },
      {
        n: "03",
        t: "Getting legal help too early — or too late",
        d: "Too early means paying fees to prepare documents before you know whether the business structure is E-2 compliant. Too late means arriving at the consulate hoping for the best. The right moment is after the strategy is confirmed and before the application is filed. E2go handles the strategy. A consultant reviews and signs off."
      },
      {
        n: "04",
        t: "Over-relying on free advice without context",
        d: "Facebook groups and Reddit threads cannot tell you whether your specific business, at your specific investment level, with your specific background, will survive scrutiny at your specific consulate. Context is everything. E2go's consulate intelligence covers 82 treaty country consulates and tracks adjudication patterns by post."
      },
    ].map((m, i) => (
      <div key={i} className="p-6 md:p-8 border
        border-[rgba(201,168,76,0.1)] -mt-px -ml-px
        hover:border-[rgba(201,168,76,0.25)]
        transition-colors">
        <div className="font-['Cormorant_Garamond'] text-4xl
          font-light text-[rgba(201,168,76,0.2)] mb-4">
          {m.n}
        </div>
        <div className="text-sm font-medium
          text-[rgba(201,168,76,0.85)] mb-3 leading-snug">
          {m.t}
        </div>
        <div className="text-xs text-[rgba(245,240,232,0.5)]
          leading-relaxed">
          {m.d}
        </div>
      </div>
    ))}
  </div>
</section>
```

---

## CHANGE 6 — UPDATE FEATURES SECTION HEADING

The "What's included" section heading and sub-headline
need to reflect Mistake 2 framing.

Find:
```tsx
<h2 className="font-['Cormorant_Garamond'] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-3">
  Everything a senior practitioner would prepare.
</h2>
<p className="text-sm text-[rgba(245,240,232,0.45)] mb-12 max-w-lg leading-relaxed">
  Not a template. Not a form filler. A system that thinks about
  your case and builds a narrative that holds up under scrutiny.
</p>
```

Replace with:
```tsx
<h2 className="font-['Cormorant_Garamond'] text-3xl md:text-5xl font-light text-[#f5f0e8] mb-3">
  A checklist gets you organised.<br />
  A strategy gets you approved.
</h2>
<p className="text-sm text-[rgba(245,240,232,0.45)] mb-12 max-w-lg leading-relaxed">
  Every document E2go generates is not a form — it is a
  coordinated argument. Each one answers a specific question
  the officer will ask. Together, they tell one story.
</p>
```

---

## CHANGE 7 — UPDATE CONSULATE INTELLIGENCE FEATURE CARD

Find the consulate intelligence feature card in the
features grid array:
```tsx
{ t: "Consulate intelligence", d: "Processing times, approval patterns, known preferences — specific to your consulate. Not generic advice." },
```

Replace with an object that includes a footnote field:
```tsx
{
  t: "Consulate intelligence",
  d: "Processing times, approval patterns, known preferences — specific to your consulate. Not generic advice.",
  note: "Generic advice cannot tell you what your specific consulate is looking for. We can — across all 82 treaty country posts."
},
```

Then update the features grid JSX to render the note
when it exists. Find the features map:
```tsx
{[...].map((f, i) => (
  <div key={i} className="p-6 md:p-8 border ...">
    <div className="text-[#C9A84C] text-2xl mb-3 ...">◈</div>
    <div className="text-sm font-medium text-[#f5f0e8] mb-2">{f.t}</div>
    <div className="text-xs text-[rgba(245,240,232,0.45)] leading-relaxed">{f.d}</div>
  </div>
))}
```

Add the note rendering after the description div:
```tsx
{f.note && (
  <div className="text-[10px] text-[rgba(201,168,76,0.6)]
    italic mt-3 pt-3
    border-t border-[rgba(201,168,76,0.1)]
    leading-relaxed">
    {f.note}
  </div>
)}
```

Also update the TypeScript type for the feature objects
at the top of the array to include the optional note:
The array items are inline objects so TypeScript infers
the type — no explicit type needed, just add the note
field to the consulate intelligence object only.

---

## CHANGE 8 — UPDATE INTERVIEW SIMULATOR FEATURE CARD

Find:
```tsx
{ t: "Interview simulator", d: "The AI officer has read your package. Questions are generated from your specific application. Every weak point is probed." },
```

Replace with:
```tsx
{ t: "Interview simulator", d: "The AI officer has read your package. Questions are generated from your specific application. Every weak point is probed before your real interview. Included in all packages — also available standalone for $197 (3 sessions)." },
```

---

## CHANGE 9 — ADD MISTAKE 3 TO FAQ

Find the faqs array. It currently has 6 items.
Insert a new item at position 2 (index 2) — after
"What if I am denied?" and before "How is this
different from hiring a consultant?":

```tsx
{
  q: "When should I bring in a consultant or attorney?",
  a: "Too early means paying fees to prepare documents before you know whether your business structure is E-2 compliant. Too late means arriving at the consulate with a weak application and hoping for the best. The right moment for legal involvement is after the strategy is confirmed and before the application is filed. E2go handles the strategy and the documents. A consultant reviews and signs off. That is the sequence.",
},
```

The FAQ will now have 7 items.

---

## BUILD CHECK

```bash
npm run build 2>&1 | grep -iE "error|✓ Compiled|Failed" | head -10
```

Zero errors required. Fix any TypeScript issues before
committing — the note field on features objects may need
the array typed explicitly if TypeScript complains.

If TypeScript complains about missing `note` on other
feature objects, add `note?: string` as an explicit type:

```tsx
const features: { t: string; d: string; note?: string }[] = [
  ...
];
```

---

## COMMIT

```bash
git add src/app/HomeClient.tsx
git commit -m "feat: mistakes section, pricing $550, copy fixes, FAQ item 7"
git push origin dev
```

Update BUILD_TRACKER.md:
- Mistakes section added (4 cards, between proof bar and how it works)
- Hero headline punctuation fixed (semicolon → em dash)
- Stats pricing updated: From $297 → From $550
- Footer logo: e2go → E2go
- Footer nav: correct items (How it works / Learn / Pricing / Simulator / Support)
- Features section heading updated with Mistake 2 framing
- Consulate intelligence card: Mistake 4 footnote added
- Interview simulator card: standalone $197 pricing noted
- FAQ: Mistake 3 added as item 3 (7 total FAQ items)

```bash
git add BUILD_TRACKER.md
git commit -m "docs: BUILD_TRACKER — landing page mistakes section complete"
git push origin dev
```

---

## COMPLETION REPORT

Report:
- Every change made with file and line reference
- Build status: clean / errors
- Confirm mistakes section is between proof bar and how it works
- Confirm FAQ now has 7 items
- Confirm stats show From $550
- Confirm footer shows E2go.app
- Commit hash
