# SESSION — Landing Page Redesign: Premium Layout + Images
**Branch:** dev
**File touched:** src/app/HomeClient.tsx only
**Images:** Already copied to public/images/ — do not move or rename them

---

## MANDATORY FIRST STEPS

```bash
cd ~/E2-go
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
ls public/images/
cat src/app/HomeClient.tsx
```

Confirm these six files exist in public/images/ before touching anything:
- consulate.png
- document-binder.png
- franchise-exterior.png
- investor-woman.png
- couple-documents.png
- investor-man.png

If any are missing, stop and report. Do not proceed.

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

## CRITICAL RULE — DO NOT TOUCH THE FLAG

The hero section contains an SVG American flag. This is working
correctly and must not be modified in any way. The flag SVG code
stays exactly as it is. All changes in the hero section are
ADDITIONS only — a new portrait image div added alongside
the existing flag. Never edit the flag SVG.

---

## CHANGE 1 — HERO: ADD PORTRAIT IMAGE

The hero section currently has the flag SVG and the hero content div.
Add a third element — the investor portrait — between them.

Find the hero section. It has:
```tsx
{/* Flag SVG — behind content */}
<div style={{ position: 'absolute', top: 0, right: 0 ... }}>
  <svg ...>...</svg>
</div>

{/* Content — above flag */}
<div style={{ position: 'relative', zIndex: 10 }}>
```

INSERT this between the flag div and the content div:

```tsx
{/* Portrait — investor image */}
<div style={{
  position: 'absolute',
  bottom: 0,
  right: '60px',
  width: '300px',
  height: '440px',
  zIndex: 5,
  overflow: 'hidden',
  pointerEvents: 'none',
}}>
  <img
    src="/images/investor-man.png"
    alt="E-2 investor"
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'top center',
      opacity: 0.82,
      filter: 'grayscale(12%)',
      mixBlendMode: 'luminosity',
    }}
  />
  <div style={{
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '200px',
    background: 'linear-gradient(transparent, #0a0a0a)',
  }} />
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '130px',
    height: '100%',
    background: 'linear-gradient(90deg, #0a0a0a, transparent)',
  }} />
  <div style={{
    position: 'absolute',
    top: 0,
    right: 0,
    width: '60px',
    height: '100%',
    background: 'linear-gradient(270deg, #0a0a0a, transparent)',
  }} />
</div>
```

The hero section wrapper must have position: 'relative' and
overflow: 'hidden' — confirm these are already set. If not, add them.

FALLBACK INSTRUCTION: If after building and viewing on localhost
the portrait photo looks awkward or doesn't blend cleanly,
remove this entire portrait div. The hero flag must remain
untouched regardless.

---

## CHANGE 2 — MISTAKES SECTION: ROWS NOT CARDS

The current mistakes section uses a 2x2 grid of equal cards.
Replace it entirely with full-width horizontal rows.

Find the mistakes section JSX. Replace the entire
`<div className="grid grid-cols-1 md:grid-cols-2 ...">` block
with this row layout:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
  {[
    {
      n: '01',
      t: 'Rushing to invest before confirming fit',
      d: 'The costliest mistake in the E-2 process is committing capital to a business before confirming that the investment structure, the business model, and your qualifications will survive consular scrutiny. The right sequence is: assess first, invest second, document third. E2go is built around that sequence.',
    },
    {
      n: '02',
      t: 'Treating it like a checklist instead of a strategy',
      d: 'A checklist gets you organised. A strategy gets you approved. The documents E2go generates are not a checklist — they are a coordinated argument. Every document answers a specific question the officer will ask. Together, they tell one story.',
    },
    {
      n: '03',
      t: 'Getting legal help too early — or too late',
      d: 'Too early means paying fees to prepare documents before you know whether the business structure is E-2 compliant. Too late means arriving at the consulate hoping for the best. The right moment is after the strategy is confirmed and before the application is filed. E2go handles the strategy. A consultant reviews and signs off.',
    },
    {
      n: '04',
      t: 'Over-relying on free advice without context',
      d: "Facebook groups and Reddit threads cannot tell you whether your specific business, at your specific investment level, with your specific background, will survive scrutiny at your specific consulate. Context is everything. E2go's consulate intelligence covers 82 treaty country consulates and tracks adjudication patterns by post.",
    },
  ].map((m, i) => (
    <div key={i} style={{
      display: 'grid',
      gridTemplateColumns: '100px 1fr',
      gap: 0,
      borderTop: '1px solid rgba(201,168,76,0.1)',
      padding: '36px 0',
      position: 'relative',
      overflow: 'hidden',
    }}
    className="last:border-b last:border-[rgba(201,168,76,0.1)]"
    >
      {/* Watermark number */}
      <div style={{
        position: 'absolute',
        left: '-8px',
        top: '-10px',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '120px',
        fontWeight: 300,
        color: 'rgba(201,168,76,0.05)',
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
      }}>{m.n}</div>

      {/* Gold left accent bar */}
      <div style={{
        position: 'absolute',
        left: '96px',
        top: 0,
        bottom: 0,
        width: '1px',
        background: 'rgba(201,168,76,0.2)',
      }} />

      {/* Number */}
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '13px',
        fontWeight: 300,
        color: 'rgba(201,168,76,0.5)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        paddingTop: '4px',
        position: 'relative',
        zIndex: 1,
      }}>{m.n}</div>

      {/* Body */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '18px',
          fontWeight: 300,
          fontStyle: 'italic',
          color: 'rgba(201,168,76,0.88)',
          marginBottom: '10px',
          lineHeight: 1.3,
        }}>{m.t}</div>
        <p style={{
          fontSize: '13px',
          color: 'rgba(245,240,232,0.5)',
          lineHeight: 1.75,
          maxWidth: '680px',
        }}>{m.d}</p>
      </div>
    </div>
  ))}
</div>
```

---

## CHANGE 3 — HOW IT WORKS: CONNECTING THREAD

The current steps grid has no visual connection between steps.
Add a horizontal connecting line that runs through all four step dots.

Find the steps grid div. Add this BEFORE the step cards map:

```tsx
{/* Connecting thread */}
<div style={{
  position: 'absolute',
  top: '4px',
  left: '5%',
  right: '5%',
  height: '1px',
  background: 'rgba(201,168,76,0.12)',
  zIndex: 0,
}} />
```

The steps grid wrapper must have position: 'relative'.
Add that if it doesn't exist.

Then update each step card. Find the step number rendering
(the large faint number like "01", "02" etc) and increase its
size from text-4xl to a larger treatment:

```tsx
<div style={{
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '72px',
  fontWeight: 300,
  color: 'rgba(201,168,76,0.12)',
  lineHeight: 1,
  marginBottom: '12px',
}}>{s.n}</div>
```

Add a small dot above each number to connect to the thread:

```tsx
{/* Thread dot */}
<div style={{
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: i < 3 ? '#C9A84C' : '#0a0a0a',
  border: '1px solid rgba(201,168,76,0.5)',
  marginBottom: '12px',
  position: 'relative',
  zIndex: 1,
}} />
```

Steps 0, 1, 2 get filled gold dot. Step 3 gets empty dot.
Use the map index `i` to determine this.

---

## CHANGE 4 — WHAT'S INCLUDED: HERO FEATURE + BINDER IMAGE

The current features section has six equal cards in a 3-column grid.
Replace with a hero feature spanning full width + five cards below.

Find the features grid. Replace the entire features section content
(after the heading and sub) with:

```tsx
{/* Hero feature — Case analysis engine with binder image */}
<div style={{
  display: 'grid',
  gridTemplateColumns: '1fr 360px',
  border: '1px solid rgba(201,168,76,0.15)',
  marginBottom: '-1px',
  minHeight: '220px',
  overflow: 'hidden',
}}>
  <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <div style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: '64px',
      fontWeight: 300,
      color: 'rgba(201,168,76,0.12)',
      lineHeight: 1,
      marginBottom: '10px',
    }}>01</div>
    <div style={{ fontSize: '16px', fontWeight: 500, color: '#f5f0e8', marginBottom: '10px' }}>
      Case analysis engine
    </div>
    <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.5)', lineHeight: 1.7, maxWidth: '480px' }}>
      6 calculations. 15 denial pattern checks. Investment substantiality,
      source of funds strength, marginality risk, non-immigrant intent —
      all assessed and scored before a single word is written.
      You see exactly where you stand before you commit.
    </p>
  </div>
  <div style={{ position: 'relative', overflow: 'hidden' }}>
    <img
      src="/images/document-binder.png"
      alt="Application document binder"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        opacity: 0.65,
        filter: 'grayscale(15%)',
      }}
    />
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '120px',
      height: '100%',
      background: 'linear-gradient(90deg, #0a0a0a, transparent)',
    }} />
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: 'linear-gradient(#0a0a0a, transparent)',
    }} />
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: 'linear-gradient(transparent, #0a0a0a)',
    }} />
  </div>
</div>

{/* Remaining 5 features */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
  {[
    { n: '02', t: 'Sequential document generation', d: 'Cover letter first. Each document reviewed before the next begins. Inconsistencies caught before they compound. You approve every document.' },
    { n: '03', t: 'Writing style matching', d: 'Your documents read like you wrote them. A writing sample calibrates the engine. AI detection run on every document.' },
    { n: '04', t: 'Consulate intelligence', d: 'Processing times, approval patterns, known preferences — specific to your consulate.', note: 'Tracks adjudication patterns across all 82 treaty country posts.' },
    { n: '05', t: 'Interview simulator', d: 'The AI officer has read your package. Every weak point is probed before your real interview.', note: 'Included in all packages. Also available standalone — $197 for 3 sessions.' },
    { n: '06', t: 'Specialist referral network', d: 'Franchise brokers, accountants, LLC specialists — at the right moment, briefed on your situation.' },
  ].map((f, i) => (
    <div key={i} style={{
      padding: '20px 18px',
      border: '1px solid rgba(201,168,76,0.1)',
      marginRight: '-1px',
      marginTop: '-1px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '-6px',
        right: '10px',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '52px',
        fontWeight: 300,
        color: 'rgba(201,168,76,0.07)',
        lineHeight: 1,
        userSelect: 'none',
      }}>{f.n}</div>
      <div style={{ fontSize: '12px', fontWeight: 500, color: '#f5f0e8', marginBottom: '6px', position: 'relative', zIndex: 1 }}>{f.t}</div>
      <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.45)', lineHeight: 1.65, position: 'relative', zIndex: 1 }}>{f.d}</p>
      {f.note && (
        <p style={{
          fontSize: '10px',
          color: 'rgba(201,168,76,0.6)',
          fontStyle: 'italic',
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(201,168,76,0.1)',
          position: 'relative',
          zIndex: 1,
          lineHeight: 1.5,
        }}>{f.note}</p>
      )}
    </div>
  ))}
</div>
```

Also update the TypeScript type for the feature objects to include
the optional note field. Add a union type inline:

```tsx
const features: Array<{n:string; t:string; d:string; note?:string}> = [...]
```

---

## CHANGE 5 — TESTIMONIALS: QUOTE MARKS + PHOTO THUMBNAILS

The current testimonials have no visual anchoring.
Add large background quote marks and small portrait photos.

Find the testimonials grid map. Replace each testimonial card with:

```tsx
{[
  {
    q: "I had spoken to two consultants and walked away more confused than when I started. E2go was the first thing that actually explained what the consulate needed to see and why.",
    a: "Marco T.",
    c: "Italy",
    t: "Franchise applicant",
    img: "/images/investor-man.png",
  },
  {
    q: "The source of funds section alone would have taken days with a consultant. The engine asked me the right questions and built the narrative from my answers.",
    a: "Aisha K.",
    c: "United Kingdom",
    t: "Solo applicant",
    img: "/images/investor-woman.png",
  },
  {
    q: "I downloaded the package on a Friday. By Monday I had reviewed every document. My consultant said it was the cleanest first draft she had ever seen from a self-prepared applicant.",
    a: "David L.",
    c: "Canada",
    t: "Partnership applicant",
    img: "/images/couple-documents.png",
  },
].map((t, i) => (
  <div key={i} style={{
    padding: '28px 24px',
    border: '1px solid rgba(201,168,76,0.1)',
    marginRight: '-1px',
    marginTop: '-1px',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {/* Background quote mark */}
    <div style={{
      position: 'absolute',
      top: '-20px',
      left: '10px',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: '180px',
      fontWeight: 300,
      color: 'rgba(201,168,76,0.04)',
      lineHeight: 1,
      userSelect: 'none',
      pointerEvents: 'none',
    }}>"</div>

    {/* Portrait thumbnail */}
    <div style={{
      width: '40px',
      height: '40px',
      overflow: 'hidden',
      marginBottom: '16px',
      position: 'relative',
      zIndex: 1,
    }}>
      <img
        src={t.img}
        alt={t.a}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'top center',
          filter: 'grayscale(20%)',
        }}
      />
    </div>

    {/* Quote */}
    <p style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: '15px',
      fontStyle: 'italic',
      color: 'rgba(245,240,232,0.78)',
      lineHeight: 1.65,
      marginBottom: '16px',
      position: 'relative',
      zIndex: 1,
    }}>&ldquo;{t.q}&rdquo;</p>

    {/* Divider */}
    <div style={{
      width: '24px',
      height: '1px',
      background: 'rgba(201,168,76,0.4)',
      marginBottom: '10px',
    }} />

    {/* Attribution */}
    <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.5)', position: 'relative', zIndex: 1 }}>{t.a}</div>
    <div style={{ fontSize: '10px', color: 'rgba(201,168,76,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '3px', position: 'relative', zIndex: 1 }}>{t.c} · {t.t}</div>
  </div>
))}
```

---

## CHANGE 6 — CONSULATE INTELLIGENCE CARD: BUILDING IMAGE

Find the consulate intelligence feature card (feature n: '04').
This card already has a note field. No image change needed here —
the card is small and the image would be too cramped.
Leave this card as-is.

The consulate building image (consulate.png) is reserved for
the /learn page consulate intelligence section in a future session.

---

## BUILD CHECK

```bash
npm run build 2>&1 | grep -iE "error|✓ Compiled|Failed" | head -10
```

Fix ALL TypeScript errors before committing.

Common TypeScript issue to watch for: the features array with
optional `note` field. If TypeScript complains, add explicit type:
```tsx
const featureItems: Array<{n:string;t:string;d:string;note?:string}> = [...]
```

---

## VISUAL CHECK ON LOCALHOST

```bash
pkill -f "next dev" || true && sleep 2 && npm run dev &
sleep 8
```

Navigate to http://localhost:3000 and check:

1. Hero — flag still visible and unchanged. Portrait of
   investor-man.png visible on right side, fading into the
   dark background cleanly. If portrait looks bad or
   doesn't blend — remove the portrait div entirely.
   Flag must remain untouched regardless.

2. Mistakes — full width rows with watermark numbers,
   gold accent bar, italic titles in gold serif.

3. How it works — large faint step numbers, connecting
   thread with dots, gold filled dots on steps 1-3.

4. What's included — document binder image in hero feature
   row, five cards below with watermark numbers.

5. Testimonials — large background quote marks, portrait
   thumbnails, gold hairline divider before attribution.

Report what you see for each section.

---

## COMMIT

```bash
git add src/app/HomeClient.tsx
git add public/images/
git commit -m "feat: landing page redesign — portrait hero, row mistakes, connected steps, hero feature, testimonial photos"
git push origin dev
```

Update BUILD_TRACKER.md:
- Hero: investor portrait added alongside flag (fades cleanly)
- Mistakes: full-width rows with 120px watermark numbers
- How it works: connecting thread with dots, 72px step numbers
- What's included: document binder hero feature + 5 cards with watermark numbers
- Testimonials: 180px background quote marks + portrait thumbnails
- Images: 6 Gemini-generated images in public/images/

```bash
git add BUILD_TRACKER.md
git commit -m "docs: BUILD_TRACKER — landing page redesign complete"
git push origin dev
```

---

## COMPLETION REPORT

Report:
- Whether portrait in hero blends cleanly or was removed
- All 5 sections visually confirmed on localhost
- Build status: clean / errors
- Commit hash
- Any images that didn't render correctly
