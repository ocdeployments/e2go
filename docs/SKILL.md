---
name: e2pathway-frontend-powerhouse
description: >
  Master skill file for E2Pathway landing page rebuild and all frontend/web
  design work. Activates on any request to build, design, animate, or improve
  web pages, UI components, landing pages, or frontend code. Bundles design
  philosophy, motion vocabulary, performance rules, accessibility standards,
  and component patterns into one always-on reference.
version: 2.0.0
author: E2Pathway Project
tags:
  - frontend
  - design
  - animation
  - react
  - landing-page
  - performance
  - accessibility
  - motion
  - framer-motion
  - three-js
---

# E2Pathway Frontend Powerhouse Skill

## Overview

This skill is the single source of truth for all frontend and web design work
on this project. It combines the best of Anthropic's official frontend-design
skill, Vercel's React Best Practices, the motion and animation reference built
for this project's hero animations, and additional cutting-edge patterns for
2026 web development.

When this skill activates, Claude must follow every section below before
writing a single line of code.

---

## SECTION 1 — DESIGN THINKING FIRST (Always run before coding)

Before touching code, answer all five of these out loud in the response:

1. **Purpose** — What problem does this interface solve? Who uses it?
2. **Tone** — Pick a clear aesthetic direction and name it. Options include:
   brutally minimal, editorial/magazine, cinematic/immersive, retro-futuristic,
   luxury/refined, American patriotic bold, high-trust institutional, warm
   premium, dark dramatic, light airy, brutalist/raw. Do NOT default to
   neutral. Every page should have a point of view.
3. **Differentiation** — What is the ONE thing a visitor will remember?
4. **Motion Intention** — Which 1–2 moments will have animation? Everything
   else stays still.
5. **Color Commitment** — Name a dominant color, an accent, and a neutral.
   State them as hex values before generating CSS.

**CRITICAL RULE:** Bold maximalism and refined minimalism are both valid.
Generic safe middle-ground is not. Make a choice and execute it with precision.

---

## SECTION 2 — WHAT IS ABSOLUTELY FORBIDDEN

Never use these under any circumstances:

### Forbidden Fonts
- Inter
- Roboto
- Arial
- System-UI as primary font
- Space Grotesk (overused in 2025–2026 AI output)
- DM Sans as the only font

### Forbidden Color Patterns
- Purple gradient on white background
- Default Tailwind blue (`#3B82F6`) as primary color
- Gray card on white background with subtle border
- Generic hero: centered heading + subheading + two buttons

### Forbidden Layout Patterns
- Symmetric 3-column card grid as the first layout choice
- Full-width colored banner with white text centered
- Stock photo hero background with overlay text
- Predictable top-nav → hero → features → CTA → footer with no surprises

### Forbidden Code Patterns
- Animating `top`, `left`, `width`, or `height` — use `transform` only
- Creating variant objects inside render functions
- Adding `initial` and `animate` to Framer Motion children when parent
  handles orchestration via `variants`
- `useMemo` or `React.memo` before fixing request waterfalls
- Barrel imports (`import { Icon } from 'lucide-react'` for single icons)
- Inline styles for anything that will be animated

---

## SECTION 3 — TYPOGRAPHY RULES

### Font Pairing Strategy
Always pair two fonts with strong contrast in personality:

| Role | Approach | Example Choices |
|------|----------|----------------|
| Display/Headline | Expressive, distinctive, high personality | Playfair Display, Cormorant Garamond, Bebas Neue, Clash Display, Cabinet Grotesk, Syne, Anton |
| Body/UI | Legible, refined, neutral but not generic | Lora, Source Serif 4, Plus Jakarta Sans, Figtree, Nunito Sans |

### Type Scale (use CSS variables, never hardcoded sizes)
```css
:root {
  --text-xs: clamp(0.75rem, 1.5vw, 0.875rem);
  --text-sm: clamp(0.875rem, 1.8vw, 1rem);
  --text-base: clamp(1rem, 2vw, 1.125rem);
  --text-lg: clamp(1.125rem, 2.5vw, 1.375rem);
  --text-xl: clamp(1.375rem, 3vw, 1.75rem);
  --text-2xl: clamp(1.75rem, 4vw, 2.5rem);
  --text-3xl: clamp(2.25rem, 6vw, 4rem);
  --text-hero: clamp(3rem, 10vw, 8rem);
}
```

### Typography Behavior
- Line height for headlines: 0.9–1.1 (tight, intentional)
- Line height for body: 1.6–1.75 (readable)
- Letter-spacing for headlines: -0.02em to -0.04em (tighter = more premium)
- Letter-spacing for all-caps labels: 0.08em–0.15em
- Never use `font-weight: 400` for headlines — 700 or 900

---

## SECTION 4 — COLOR SYSTEM

### Build Every Color System with CSS Variables
```css
:root {
  /* Always define these six roles */
  --color-bg:        /* Page background */;
  --color-surface:   /* Card/component background */;
  --color-border:    /* Subtle dividers */;
  --color-text:      /* Primary readable text */;
  --color-muted:     /* Secondary text, labels */;
  --color-accent:    /* Primary brand action color */;
  --color-accent-2:  /* Secondary accent or highlight */;
  --color-emphasis:  /* High-contrast call to attention */;
}
```

### Color Principles
- Dominant color takes 60–70% of the visual space
- Accent color takes 10–15% — use it *only* on things that matter
- Never distribute 5 colors equally — hierarchy requires imbalance
- Dark backgrounds: go very dark (not #333, but #0A0A0F or #0C0C0C)
- Light backgrounds: go very light (not #F5F5F5, but #FAFAF8 or warm white)
- Use `oklch()` color space for perceptual uniformity when targeting modern browsers

---

## SECTION 5 — MOTION & ANIMATION SYSTEM

### The Prime Directive of Motion
One well-orchestrated page load with staggered reveals creates more delight
than scattered micro-interactions across the page. Pick the moments. Earn
every animation.

### Framer Motion Core Patterns

**Scroll-Triggered (fires once on viewport entry):**
```jsx
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}
  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
/>
```

**Scroll-Linked (progress tied to scroll position):**
```jsx
const { scrollYProgress } = useScroll({ target: sectionRef });
const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
const y = useTransform(scrollYProgress, [0, 0.4], [60, 0]);
```

**Stagger (parent orchestrates children):**
```jsx
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};
const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};
// Children: only apply variants prop, NOT initial/animate
```

**Cinematic Entrance (hero-level drama):**
```jsx
transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
// Combine with: initial={{ opacity: 0, y: 80, scale: 0.95 }}
```

### Easing Reference
| Name | Cubic Bezier | Character |
|------|-------------|-----------|
| Snappy cinematic | `[0.16, 1, 0.3, 1]` | Fast to target, slight overshoot |
| Smooth reveal | `[0.25, 0.46, 0.45, 0.94]` | Gentle deceleration |
| easeOut | `"easeOut"` | Most readable general use |
| Spring (interactive) | `{ type: "spring", stiffness: 120, damping: 14 }` | Physical, bouncy |
| Fabric/cloth | `{ type: "spring", stiffness: 60, damping: 20, mass: 1.2 }` | Heavy, settling |

### This Project's Three Hero Animations

**Statue of Liberty — Scroll-Linked Reveal:**
```jsx
// Pin section with sticky, drive all values from scrollYProgress
const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
const scale = useTransform(scrollYProgress, [0, 0.4], [0.85, 1.0]);
const clipPath = useTransform(
  scrollYProgress,
  [0.05, 0.45],
  ["inset(80% 0 0 0)", "inset(0% 0 0 0)"]  // rises from bottom
);
```

**Star Field — 150+ Particles with Random Twinkle:**
```jsx
// Generate once outside component
const stars = Array.from({ length: 200 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 2 + 1,
  delay: Math.random() * 5, duration: Math.random() * 3 + 2,
}));
// Each star: animate opacity 0.15 → 1 → 0.15, repeat: Infinity, repeatType: "mirror"
// Use from: "random" stagger to avoid wave patterns
```

**Flag Unfurl + Wave:**
```jsx
// Stage 1: clip-path left-to-right unfurl
initial={{ clipPath: "inset(0 100% 0 0)" }}
animate={{ clipPath: "inset(0 0% 0 0)" }}
transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
// Stage 2: CSS keyframe wave (skewX + scaleX oscillation, 3s loop)
// Apply after unfurl completes via onAnimationComplete callback
```

### Accessibility Rule
Always include:
```jsx
const prefersReducedMotion = useReducedMotion();
// If true: skip entrance animations, disable loops, use instant transitions
```

---

## SECTION 6 — LAYOUT & SPATIAL COMPOSITION

### Break the Grid
- Asymmetry beats symmetry for memory and impact
- Overlapping elements create depth: use negative margin or absolute positioning
- Diagonal flow: use `clip-path: polygon()` or rotated containers to break horizontal planes
- Generous negative space OR controlled density — never undecided middle ground
- Grid-breaking hero elements: let the headline overflow its container intentionally

### Responsive Strategy (Mobile-First)
```css
/* Use container queries, not just media queries */
@container (min-width: 600px) { }

/* Fluid spacing with clamp() — never jump at breakpoints */
padding: clamp(1.5rem, 5vw, 4rem);
gap: clamp(1rem, 3vw, 2.5rem);
```

### Visual Depth Techniques
- Background grain texture: CSS `filter: url(#noise)` or SVG feTurbulence
- Gradient mesh backgrounds: multiple radial gradients layered
- Layered transparency with `backdrop-filter: blur()` for glass effects
- Box shadow depth: near shadow (2px 4px) + far shadow (20px 60px) together
- Decorative borders using `outline-offset` or pseudo-elements with gradients

---

## SECTION 7 — REACT & NEXT.JS PERFORMANCE RULES

Apply these in priority order (highest impact first):

### Priority 1 — Eliminate Request Waterfalls
- Use React Suspense boundaries to stream parallel data
- Never `await` inside a component render — hoist to server component or parallel
- Use `Promise.all()` for independent data fetches

### Priority 2 — Bundle Size
- Never barrel import icon libraries: use specific imports only
  - ✅ `import { ArrowRight } from 'lucide-react/dist/esm/icons/arrow-right'`
  - ❌ `import { ArrowRight } from 'lucide-react'`
- Use `next/dynamic` for components over 10kb that are below the fold
- Tree-shake animation libraries: import only what you use from Framer Motion

### Priority 3 — Server vs. Client Boundary
- Default to React Server Components — add `'use client'` only when needed
- Move `'use client'` as far down the tree as possible
- Keep data fetching in Server Components, interactivity in Client Components

### Priority 4 — Image & Media
- Always use `next/image` with explicit `width`, `height`, and `priority` for LCP images
- Serve hero images as WebP or AVIF
- Use `loading="lazy"` on all below-fold images
- Video: use `preload="none"` for background videos until user scrolls near them

### Priority 5 — Re-renders
- Never create objects or arrays in JSX props: extract to `useMemo` or module scope
- Framer Motion variants: always define outside component render
- Subscribe to only the state slice you need (Zustand: use selectors)

---

## SECTION 8 — ACCESSIBILITY NON-NEGOTIABLES

These are not optional. Every component must pass:

- [ ] All interactive elements reachable by keyboard (`Tab`, `Enter`, `Space`)
- [ ] Visible focus indicator — `focus-visible` pseudo-class, never remove outline entirely
- [ ] Color contrast ratio: 4.5:1 minimum for body text, 3:1 for large text
- [ ] All images have `alt` text (empty `alt=""` for decorative images)
- [ ] Form inputs have associated `<label>` elements
- [ ] Heading hierarchy logical: h1 → h2 → h3 (never skip)
- [ ] Motion: respect `prefers-reduced-motion` (see Section 5)
- [ ] ARIA labels on icon-only buttons: `aria-label="Close menu"`
- [ ] Touch targets: minimum 44×44px for interactive elements
- [ ] Semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`

---

## SECTION 9 — COMPONENT API DESIGN

### Use Compound Components (not boolean prop proliferation)
```tsx
// ❌ Never do this
<Alert isDestructive isCompact showIcon hasBorder />

// ✅ Do this instead
<Alert.Destructive size="compact">
  <Alert.Icon />
  <Alert.Content>...</Alert.Content>
</Alert.Destructive>
```

### Variant Pattern
```tsx
const alertVariants = cva("alert-base", {
  variants: {
    intent: { info: "...", success: "...", destructive: "..." },
    size: { default: "...", compact: "..." }
  }
});
```

### React 19 Patterns (use when available)
- Use `use()` hook instead of `useContext()` for context consumption
- Skip `forwardRef()` — refs are plain props in React 19
- Use `useOptimistic()` for instant UI feedback on mutations
- Server Actions over API routes for form submissions

---

## SECTION 10 — CSS ARCHITECTURE

### Custom Properties > Everything
```css
/* Define all tokens at :root — never hardcode values */
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
  --shadow-lg: 0 24px 64px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1);

  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;
}
```

### Tailwind Rules (when using Tailwind)
- Use `@layer components` for repeated patterns, not duplicated utility strings
- Avoid `!important` — redesign the cascade instead
- Use arbitrary values sparingly: if you use `w-[437px]`, it should be in a variable
- Enable JIT mode; use `content-visibility: auto` on long-scroll sections

---

## SECTION 11 — LATEST BROWSER CAPABILITIES (2025–2026)

Use these without a polyfill for modern browser targets:

| Feature | What It Does | Use For |
|---------|-------------|---------|
| `@starting-style` | Animates elements entering the DOM with pure CSS | Modal/sheet entrances without JS |
| `interpolate-size: allow-keywords` | Animates `height: auto` transitions in CSS | Accordion, expand/collapse |
| `anchor()` positioning | Tethers tooltips/popovers to their trigger element | Contextual UI without Popper.js |
| `View Transitions API` | Page-level animated navigation | SPA route transitions |
| `container queries` | Component responds to its own size, not viewport | Reusable responsive components |
| `color-mix()` | Blend colors natively in CSS | Dynamic tints without JS |
| `oklch()` colors | Perceptually uniform color space | Consistent color scales |
| `has()` selector | Style parent based on child state | Conditional layouts without JS |
| `scroll-driven animations` | Pure CSS scroll-linked animation | Parallax, progress bars, reveals |
| `field-sizing: content` | Input auto-grows as user types | Textarea UX improvement |

---

## SECTION 12 — THREE.JS & WEBGL (For star field and advanced effects)

### When to Use Three.js vs. Framer Motion
| Scenario | Use |
|----------|-----|
| < 300 particles | Framer Motion `motion.div` array |
| 300–2000 particles | Canvas 2D API |
| 2000+ particles | Three.js instanced mesh |
| Shader effects, cloth simulation | Three.js + GLSL or TSL |
| Page-level reveals, UI animation | Framer Motion |

### Three.js Performance Rules
- Use **instanced mesh** for any repeated geometry — never create individual meshes per particle
- Use **BufferGeometry** only — never legacy Geometry
- Dispose of geometries, materials, and textures on component unmount
- Use `requestAnimationFrame` cancel ref to stop the render loop on unmount
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — cap at 2x

### Star Field (Three.js Pattern)
```js
// Instanced Points — single draw call for 3000 stars
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(3000 * 3);
for (let i = 0; i < 3000; i++) {
  positions[i * 3]     = (Math.random() - 0.5) * 200;  // x
  positions[i * 3 + 1] = (Math.random() - 0.5) * 200;  // y
  positions[i * 3 + 2] = (Math.random() - 0.5) * 200;  // z
}
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
// Fly-through loop: in RAF, positions[i * 3 + 2] += speed; if > 100: reset to -100
```

---

## SECTION 13 — CODE QUALITY RULES (Karpathy Principles)

Before writing any code:

1. **Think First** — State assumptions explicitly. If ambiguous, present options before choosing.
2. **Minimum Code** — Write the simplest solution. No features beyond what was asked.
3. **Surgical Changes** — Touch only what is necessary. Do not improve adjacent code.
4. **Verify Intent** — Define what success looks like before starting.

After writing code:
- Run a self-audit: can this be 30% shorter without losing clarity?
- Check all forbidden patterns from Section 2
- Confirm accessibility checklist from Section 8
- Confirm no performance anti-patterns from Section 7

---

## SECTION 14 — OUTPUT FORMAT

For every frontend deliverable, provide in this order:

1. **Design Decision Summary** (3–5 bullet points) — font choice and why, color palette with hex values, motion strategy, one differentiating choice
2. **Complete, runnable code** — no placeholders, no `// TODO`, no `...rest of component`
3. **What to change for customization** — the 3 most likely things the user will want to adjust, with exact variable names

---

## SECTION 15 — INSTALL REFERENCES

These external skills extend this one. Install them separately for maximum capability:

| Skill | Install Command | What It Adds |
|-------|----------------|--------------|
| Anthropic Frontend Design | `/plugin install anthropics/skills@frontend-design` | Core design anti-slop rules |
| Vercel Web Design Guidelines | `/plugin install vercel-labs/agent-skills@web-design-guidelines` | 100+ accessibility/UX audit rules |
| Vercel React Best Practices | `/plugin install vercel-labs/agent-skills@react-best-practices` | 57 React/Next.js performance rules |
| Vercel Composition Patterns | `/plugin install vercel-labs/agent-skills@composition-patterns` | Compound component patterns |
| webapp-testing | `/plugin install anthropics/skills@webapp-testing` | Playwright browser testing |
| cinematic-sites | `/plugin marketplace add cinematic-sites` | GSAP + AI 4K asset landing pages |
| color-palette | `/plugin marketplace add color-palette` | Accessible color system generator |
| web-accessibility-website-audit | `/plugin marketplace add web-accessibility-website-audit` | WCAG JSX scanner |
| pretext-layout | `/plugin marketplace add pretext-layout` | Canvas-based text layout engine |

---

*This skill was built for the E2Pathway landing page rebuild.*
*It is compatible with Claude Code, Cursor, OpenAI Codex CLI, and Gemini CLI.*
*All sections activate together whenever a frontend or design task is detected.*
