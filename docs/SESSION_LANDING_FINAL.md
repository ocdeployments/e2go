# SESSION — Landing Page: Flag Hero + Nav + FAQ + Learn Page
**Branch:** dev
**Files touched:**
- src/app/HomeClient.tsx
- src/components/landing/NavBar.tsx (if exists, otherwise inline)
- src/app/learn/page.tsx (new file)

---

## MANDATORY FIRST STEPS

```bash
cd ~/E2-go
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat docs/DESIGN_REFERENCE.html | head -80
cat src/app/HomeClient.tsx
```

Read ALL of them fully before touching anything.

---

## DESIGN TOKENS — LOCKED

```
Background:    #0a0a0a
Gold:          #C9A84C
Text:          #f5f0e8
Muted:         rgba(245,240,232,0.55)
Card border:   1px solid rgba(201,168,76,0.12)
Card bg:       rgba(201,168,76,0.02)
Heading font:  Cormorant Garamond — weight 300
Body font:     DM Sans
Radius:        0 everywhere — no rounded corners
FORBIDDEN:     glassmorphism, rounded corners, gradients,
               shadows, blur, teal, any blue
```

---

## TASK 1 — NAV FIX

Find the nav in HomeClient.tsx or NavBar.tsx.

Fix these three things:

1. Nav must have a solid dark background so it is always
   readable regardless of flag bleeding through:
   background: rgba(10,10,10,0.95)
   border-bottom: 1px solid rgba(201,168,76,0.1)

2. Nav link text must be clearly readable:
   color: rgba(245,240,232,0.75) default
   color: #f5f0e8 on hover

3. Nav links must be exactly these five items in this order:
   - How it works → /#how-it-works
   - Learn → /learn
   - Pricing → /pricing
   - Simulator → /simulator
   - Log in → /login (muted, not a link button)
   - Check eligibility → /quiz (gold border CTA button,
     small and sharp, NOT oversized)

   CTA button style:
   padding: 8px 18px
   border: 1px solid rgba(201,168,76,0.5)
   color: #C9A84C
   font-size: 11px
   letter-spacing: 0.08em
   text-transform: uppercase
   background: transparent
   border-radius: 0

   Remove "Support" and "Quiz" from nav links.
   "Simulator" links to /simulator.

4. Mobile hamburger menu must include all five links
   plus the CTA button at the bottom.

---

## TASK 2 — FLAG HERO BACKGROUND

Replace the current hero section background with an
American flag that is clearly visible on the right side
of the hero, fading to dark on the left so headline
text remains readable.

The flag must show:
- Deep blue canton (#002868) with white 5-pointed stars
  (use polygon points for stars — NOT circles)
- Bold red stripes (#BF0A30)
- Light grey/white stripes (#e6e6e6) — bright enough
  to be clearly visible on dark background
- Flag occupies right 75% of hero width
- Fades to #0a0a0a on the left 25-30%
- Fades slightly at bottom edge

Implementation — add this SVG as an absolutely positioned
div inside the hero section, behind the content (z-index 0),
content at z-index 10:

```jsx
<div style={{
  position: 'absolute',
  top: 0,
  right: 0,
  width: '75%',
  height: '100%',
  zIndex: 0,
  overflow: 'hidden'
}}>
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 660 520"
    preserveAspectRatio="xMinYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="flagFadeLeft" x1="0%" y1="0%"
        x2="100%" y2="0%">
        <stop offset="0%"
          style={{stopColor:'#0a0a0a',stopOpacity:1}}/>
        <stop offset="25%"
          style={{stopColor:'#0a0a0a',stopOpacity:0.7}}/>
        <stop offset="50%"
          style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
      </linearGradient>
      <linearGradient id="flagFadeBottom" x1="0%" y1="0%"
        x2="0%" y2="100%">
        <stop offset="85%"
          style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
        <stop offset="100%"
          style={{stopColor:'#0a0a0a',stopOpacity:0.85}}/>
      </linearGradient>
    </defs>

    {/* 13 stripes */}
    {[0,80,160,240,320,400,480].map((y,i) => (
      <rect key={i} width="660" height="40"
        y={y} fill="#BF0A30"/>
    ))}
    {[40,120,200,280,360,440].map((y,i) => (
      <rect key={i} width="660" height="40"
        y={y} fill="#e6e6e6"/>
    ))}

    {/* Blue canton */}
    <rect width="264" height="280" y="0" fill="#002868"/>

    {/* Stars — 5-pointed polygons */}
    {[
      [18,14],[50,14],[82,14],[114,14],[146,14],
      [178,14],[210,14],[242,14],
      [34,40],[66,40],[98,40],[130,40],[162,40],
      [194,40],[226,40],
      [18,66],[50,66],[82,66],[114,66],[146,66],
      [178,66],[210,66],[242,66],
      [34,92],[66,92],[98,92],[130,92],[162,92],
      [194,92],[226,92],
      [18,118],[50,118],[82,118],[114,118],[146,118],
      [178,118],[210,118],[242,118],
      [34,144],[66,144],[98,144],[130,144],[162,144],
      [194,144],[226,144],
      [18,170],[50,170],[82,170],[114,170],[146,170],
      [178,170],[210,170],[242,170],
      [34,196],[66,196],[98,196],[130,196],[162,196],
      [194,196],[226,196],
      [18,222],[50,222],[82,222],[114,222],[146,222],
      [178,222],[210,222],[242,222],
      [34,248],[66,248],[98,248],[130,248],[162,248],
      [194,248],[226,248],
    ].map(([cx,cy],i) => {
      const r=9, ir=4;
      const pts = Array.from({length:5},(_,k)=>{
        const a = (k*72-90)*Math.PI/180;
        const b = (k*72-90+36)*Math.PI/180;
        return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)} ${cx+ir*Math.cos(b)},${cy+ir*Math.sin(b)}`;
      }).join(' ');
      return <polygon key={i} points={pts} fill="#FFFFFF"/>;
    })}

    {/* Fade overlays */}
    <rect width="660" height="520"
      fill="url(#flagFadeLeft)"/>
    <rect width="660" height="520"
      fill="url(#flagFadeBottom)"/>
  </svg>
</div>
```

The hero section wrapper must have:
position: 'relative'
overflow: 'hidden'

Text content must have position: 'relative', zIndex: 10
to sit above the flag.

Headline text shadow to ensure readability over flag:
textShadow: '0 2px 20px rgba(0,0,0,0.9)'

Sub-headline text shadow:
textShadow: '0 1px 10px rgba(0,0,0,0.95)'

---

## TASK 3 — FAQ SECTION

Add a FAQ accordion section to HomeClient.tsx.
Position it BETWEEN the testimonials section and
the final CTA section.

The FAQ uses React useState to track which item is open.
Only one item open at a time — clicking a new one closes
the previous one.

Section structure:
- Eyebrow: "Common questions"
- Title: "Everything you need to know."
- 6 accordion items

Accordion item style:
- Border bottom: 1px solid rgba(201,168,76,0.1)
- Question row: flex, space-between, padding 20px 0
- Question text: 15px, color #f5f0e8, font-weight 500
- Toggle icon: + when closed, − when open, color #C9A84C
- Answer: 13px, color rgba(245,240,232,0.55),
  line-height 1.75, padding-bottom 20px
- No border-radius anywhere
- Answer hidden when closed, visible when open

The 6 questions and answers — copy EXACTLY:

Q1: "Is this a law firm?"
A1: "No. e2go prepares documents. What you do with your
finished package is entirely up to you. If you choose to
have an immigration consultant review it at this stage,
it is a 2-hour job — not a 20-hour one."

Q2: "What if I am denied?"
A2: "We test every document against 15 real denial patterns
before you ever see them. We cannot guarantee an outcome —
no one can. But we can make sure your preparation is not
the reason."

Q3: "How is this different from hiring a consultant?"
A3: "A consultant works on one case at a time, in their
own way. e2go applies the same preparation discipline to
every case, every time — tested against every denial
pattern in our knowledge base and reviewed by you before
a single document leaves the platform."

Q4: "Is my data secure?"
A4: "We never store your passports, bank statements, or
financial records. Only your answers. Your documents are
generated, reviewed by you, and downloaded. They belong
to you entirely."

Q5: "What countries are eligible?"
A5: "The E-2 visa is available to citizens of 82 treaty
countries. Our eligibility check confirms your specific
country and consulate in the first question — it takes
under a minute."

Q6: "How long does the whole process take?"
A6: "Your documents are typically ready within days of
completing your application profile. The overall timeline
— business formation, consulate appointment, visa
processing — depends on your starting point. Our journey
planner shows you a personalised timeline the moment you
complete the eligibility check."

Implementation:

```tsx
const [openFaq, setOpenFaq] = useState<number | null>(null);

const faqs = [
  { q: "Is this a law firm?", a: "No. e2go prepares documents..." },
  // ... all 6
];

// In JSX:
<section className="px-4 md:px-10 lg:px-16 py-16 md:py-24
  border-t border-[rgba(201,168,76,0.08)]">
  <p className="text-[10px] tracking-[0.18em] uppercase
    text-[rgba(201,168,76,0.6)] mb-3">Common questions</p>
  <h2 className="font-['Cormorant_Garamond'] text-3xl
    md:text-5xl font-light text-[#f5f0e8] mb-12">
    Everything you need to know.
  </h2>
  <div className="max-w-2xl">
    {faqs.map((faq, i) => (
      <div key={i} className="border-b
        border-[rgba(201,168,76,0.1)]">
        <button
          onClick={() => setOpenFaq(openFaq === i ? null : i)}
          className="w-full flex items-center justify-between
            py-5 text-left"
        >
          <span className="text-[15px] font-medium
            text-[#f5f0e8] pr-8">{faq.q}</span>
          <span className="text-[#C9A84C] text-xl
            flex-shrink-0 font-light">
            {openFaq === i ? '−' : '+'}
          </span>
        </button>
        {openFaq === i && (
          <div className="pb-5 text-[13px]
            text-[rgba(245,240,232,0.55)] leading-relaxed
            max-w-xl">
            {faq.a}
          </div>
        )}
      </div>
    ))}
  </div>
</section>
```

---

## TASK 4 — /learn HUB PAGE

Create src/app/learn/page.tsx

This is the information page for visitors who want to
understand E-2 before starting the quiz. Educational
tone — no sales pressure. Same Obsidian Gold design.

Structure:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What is the E-2 Visa? — e2go",
  description: "Everything you need to know about the
    U.S. E-2 Treaty Investor Visa. Requirements, investment
    amounts, eligible businesses, and timeline explained
    in plain English.",
};

export default function LearnPage() {
  return (
    <div className="bg-[#0a0a0a] text-[#f5f0e8] min-h-screen
      font-['DM_Sans',system-ui,sans-serif]">

      {/* HERO */}
      <section className="px-4 md:px-10 lg:px-16
        pt-16 md:pt-24 pb-16 border-b
        border-[rgba(201,168,76,0.08)]">
        <p className="text-[10px] tracking-[0.18em] uppercase
          text-[rgba(201,168,76,0.6)] mb-4">
          E-2 Visa Guide
        </p>
        <h1 className="font-['Cormorant_Garamond'] text-4xl
          md:text-6xl font-light text-[#f5f0e8] mb-6
          max-w-3xl leading-tight">
          What is the E-2 Treaty Investor Visa?
        </h1>
        <p className="text-base text-[rgba(245,240,232,0.55)]
          leading-relaxed max-w-2xl mb-8">
          The E-2 is a U.S. nonimmigrant visa that allows
          citizens of qualifying treaty countries to live and
          work in the United States by investing in and
          actively managing a U.S. business. It is one of the
          most accessible pathways to legal U.S. residency
          for investors and entrepreneurs.
        </p>
        <Link href="/quiz"
          className="inline-block px-8 py-4 bg-[#C9A84C]
            text-[#0a0a0a] text-sm font-medium
            tracking-widest uppercase hover:opacity-85
            transition-opacity">
          Check my eligibility →
        </Link>
      </section>

      {/* WHAT IS E-2 */}
      <section className="px-4 md:px-10 lg:px-16
        py-16 md:py-24 border-b
        border-[rgba(201,168,76,0.08)]">
        <div className="max-w-3xl">
          <p className="text-[10px] tracking-[0.18em] uppercase
            text-[rgba(201,168,76,0.6)] mb-3">The basics</p>
          <h2 className="font-['Cormorant_Garamond'] text-3xl
            md:text-4xl font-light text-[#f5f0e8] mb-6">
            Is E-2 right for me?
          </h2>
          <p className="text-[15px] text-[rgba(245,240,232,0.6)]
            leading-relaxed mb-4">
            The E-2 visa is designed for people who want to
            move to the U.S. by owning and running a business
            — not by finding an employer to sponsor them.
            You invest your own capital, you manage the
            business day-to-day, and you build something.
          </p>
          <p className="text-[15px] text-[rgba(245,240,232,0.6)]
            leading-relaxed mb-4">
            It is not a green card — it is a renewable
            nonimmigrant visa. But it is one of the fastest,
            most straightforward ways for an entrepreneur
            with capital to legally live and work in the U.S.
            without waiting years in a queue.
          </p>
          <p className="text-[15px] text-[rgba(245,240,232,0.6)]
            leading-relaxed">
            There is no annual cap, no lottery, and no
            employer required. If you qualify, you apply.
          </p>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="px-4 md:px-10 lg:px-16
        py-16 md:py-24 bg-[rgba(201,168,76,0.02)]
        border-b border-[rgba(201,168,76,0.08)]">
        <p className="text-[10px] tracking-[0.18em] uppercase
          text-[rgba(201,168,76,0.6)] mb-3">Benefits</p>
        <h2 className="font-['Cormorant_Garamond'] text-3xl
          md:text-4xl font-light text-[#f5f0e8] mb-12">
          What the E-2 visa gives you.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2
          lg:grid-cols-3 gap-0">
          {[
            {
              t: "Live and work in the U.S.",
              d: "You and your immediate family can legally live and work in the United States for the duration of your visa — no employer sponsorship required."
            },
            {
              t: "Your spouse can work anywhere",
              d: "Your spouse or partner receives work authorisation and can work for any U.S. employer in any role — not just your business."
            },
            {
              t: "Your children attend U.S. schools",
              d: "Unmarried children under 21 receive dependent status and can attend U.S. public and private schools as residents."
            },
            {
              t: "Renewable with no expiry",
              d: "The E-2 can be renewed indefinitely as long as your business continues to operate. There is no fixed end date on your time in the U.S."
            },
            {
              t: "No cap and no lottery",
              d: "Unlike the H-1B, there is no annual quota on E-2 visas. If you qualify, you apply. Your eligibility is not subject to chance."
            },
            {
              t: "82 treaty countries",
              d: "Citizens of 82 countries qualify. Canada, the UK, Germany, Australia, Japan, France, Italy, and many more. Check your country in the eligibility quiz."
            },
          ].map((b, i) => (
            <div key={i} className="p-6 md:p-8 border
              border-[rgba(201,168,76,0.1)] -mt-px -ml-px">
              <div className="text-[#C9A84C] text-xl mb-3">
                ◈
              </div>
              <div className="text-sm font-medium
                text-[#f5f0e8] mb-2">{b.t}</div>
              <div className="text-xs
                text-[rgba(245,240,232,0.45)]
                leading-relaxed">{b.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 5 REQUIREMENTS */}
      <section className="px-4 md:px-10 lg:px-16
        py-16 md:py-24 border-b
        border-[rgba(201,168,76,0.08)]">
        <p className="text-[10px] tracking-[0.18em] uppercase
          text-[rgba(201,168,76,0.6)] mb-3">Requirements</p>
        <h2 className="font-['Cormorant_Garamond'] text-3xl
          md:text-4xl font-light text-[#f5f0e8] mb-12">
          The five things you need to qualify.
        </h2>
        <div className="flex flex-col gap-0 max-w-3xl">
          {[
            {
              n: "01",
              t: "Treaty country citizenship",
              d: "You must be a citizen of one of the 82 E-2 treaty countries. Permanent residency alone does not qualify. Dual citizenship in any treaty country counts."
            },
            {
              n: "02",
              t: "Substantial investment",
              d: "You must invest a substantial amount of capital into a U.S. business. There is no fixed minimum, but the investment must be proportional to the total cost of the business. Most consulates expect $75,000–$150,000 or more."
            },
            {
              n: "03",
              t: "Capital at risk",
              d: "The investment must be irrevocably committed to the business — at risk of loss if the business fails. Funds sitting in a personal account do not qualify."
            },
            {
              n: "04",
              t: "Active management",
              d: "You must enter the U.S. to develop and direct the business. Passive investors do not qualify. You must have operational control — typically 50% ownership or a directing role."
            },
            {
              n: "05",
              t: "A real, operating business",
              d: "The business must be a bona fide commercial enterprise — not a marginal operation that only supports the investor and their family. It must have genuine economic activity and ideally create U.S. jobs."
            },
          ].map((r, i) => (
            <div key={i} className="flex gap-6 py-6 border-b
              border-[rgba(201,168,76,0.08)]
              last:border-b-0">
              <div className="font-['Cormorant_Garamond']
                text-3xl font-light
                text-[rgba(201,168,76,0.25)]
                flex-shrink-0 w-12">{r.n}</div>
              <div>
                <div className="text-sm font-medium
                  text-[#f5f0e8] mb-2">{r.t}</div>
                <div className="text-sm
                  text-[rgba(245,240,232,0.5)]
                  leading-relaxed">{r.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SOFT CTA */}
      <section className="px-4 md:px-10 lg:px-16
        py-16 md:py-24 text-center">
        <h2 className="font-['Cormorant_Garamond'] text-3xl
          md:text-4xl font-light text-[#f5f0e8] mb-4">
          Ready to check your eligibility?
        </h2>
        <p className="text-sm text-[rgba(245,240,232,0.45)]
          mb-8 max-w-md mx-auto leading-relaxed">
          14 questions. 4 minutes. Free. No account required.
          Get a score out of 100 and a personalised next-step
          summary.
        </p>
        <Link href="/quiz"
          className="inline-block px-10 py-4 bg-[#C9A84C]
            text-[#0a0a0a] text-sm font-medium
            tracking-widest uppercase hover:opacity-85
            transition-opacity">
          Check my eligibility →
        </Link>
        <p className="text-xs text-[rgba(245,240,232,0.2)]
          mt-4 tracking-wide">
          Lawyer-ready documents. Lawyer-optional price.
        </p>
      </section>

    </div>
  );
}
```

---

## STEP 5 — BUILD CHECK

```bash
npm run build 2>&1 | grep -iE "error|✓ Compiled|Failed" | head -10
```

Fix ALL errors. Zero tolerance.

---

## STEP 6 — COMMIT

```bash
git add src/app/HomeClient.tsx
git add src/components/landing/NavBar.tsx 2>/dev/null || true
git add src/app/learn/page.tsx
git commit -m "feat: flag hero, nav fix, FAQ accordion, /learn hub page"
git push origin dev
```

Update BUILD_TRACKER.md:
- Flag hero in landing page hero section
- Nav: correct items, solid background, readable text
- FAQ accordion: 6 questions, accordion pattern
- /learn hub page: what is E-2, benefits, 5 requirements, CTA

```bash
git add BUILD_TRACKER.md
git commit -m "docs: BUILD_TRACKER — landing page tasks complete"
git push origin dev
```

---

## COMPLETION REPORT

Report:
- Nav items confirmed correct
- Flag visible — red, white, blue all showing
- Stars are 5-pointed not circles
- Nav background solid — links readable
- FAQ section added with 6 questions
- /learn page created and accessible at /learn
- Build clean
- Commit hash
