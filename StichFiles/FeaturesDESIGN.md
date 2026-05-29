---
name: E2GO Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#2a1700'
  on-tertiary-container: '#b87500'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  surface-soft: '#F8FAFC'
  border-subtle: '#E2E8F0'
  success-teal: '#0D9488'
  warning-amber: '#FBBF24'
  error-muted: '#F87171'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max-width: 640px
  gutter: 24px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
The design system is engineered to provide a sense of **quiet confidence** and **structured clarity**. Given the high stakes of immigration and investment, the visual language prioritizes a "human-centric professional" aesthetic. This is achieved through a **Corporate Modern** style that leans into **Minimalism** to reduce the cognitive load of complex legal requirements.

The interface must feel like a reliable guide: authoritative enough to trust with sensitive data, yet approachable enough to mitigate the stress of the application process. We avoid "disruptive" or flashy trends, focusing instead on timeless proportions, generous whitespace, and a high-contrast legible environment.

## Colors
This design system utilizes a foundation of **Slate Navy** (Primary) to establish authority and trust, paired with a **Deep Teal** (Secondary) to introduce a modern, human touch. 

- **Primary:** Reserved for headers, primary actions, and critical navigation.
- **Secondary:** Used for progress indicators, success states, and secondary interactive elements.
- **Accent (Amber):** A gentle, non-alarming amber is used for warnings and "needs attention" states, avoiding the panic often associated with bright red.
- **Neutral:** A range of soft slates and off-whites provides the necessary "breathing room" for the card-based layouts.

## Typography
We employ **Inter** exclusively for its systematic, utilitarian precision and high legibility at all sizes. 

- **Question Headers:** Use `headline-lg` for the primary question in the self-service flow.
- **Readability:** Body copy uses `body-lg` for initial instructions to ensure users don't miss key details.
- **Hierarchy:** Use semi-bold weights for labels to distinguish them clearly from input text.
- **Scale:** On mobile devices, headlines downscale to maintain focus without overwhelming the smaller viewport.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for the core application experience. By constraining the questionnaire to a maximum width of 640px, we focus the user's attention and prevent eye-strain on large displays.

- **One-Question-at-a-Time:** Each "step" is centered vertically and horizontally within the viewport.
- **Rhythm:** An 8px base unit is used for all internal component spacing.
- **Generous Gutters:** 48px to 64px of vertical spacing (`stack-lg`) between distinct content blocks (e.g., question text vs. input field) to reduce cognitive noise.
- **Mobile Reflow:** Margins reduce to 16px, and components like multi-choice cards transition from a grid to a vertical stack.

## Elevation & Depth
Depth is conveyed primarily through **Tonal Layers** rather than heavy shadows. This maintains a clean, modern look while defining interactive areas.

- **Background:** `surface-soft` (#F8FAFC) serves as the canvas.
- **Interactive Cards:** Use a single, extra-diffused shadow (0px 4px 20px rgba(15, 23, 42, 0.05)) to suggest "tap-ability."
- **Borders:** Active states are highlighted with a 2px `secondary-teal` border rather than an increase in elevation.
- **Tooltips/Overlays:** Utilize a backdrop blur (8px) and a low-contrast outline to separate helper text from the background without breaking the flow.

## Shapes
The shape language is **Rounded (0.5rem / 8px)**. This radius is applied consistently to buttons, cards, and input fields to strike a balance between professional geometry and approachable softness. 

- **Standard Elements:** 8px radius.
- **Large Container Cards:** 16px radius (`rounded-lg`).
- **Progress Bars:** Fully rounded (pill) to represent a continuous journey.

## Components

### Buttons & Targets
- **Primary Buttons:** Large (min height 56px) for high accessibility. Uses primary navy background with white text.
- **Secondary Buttons:** Ghost style with a subtle slate border.
- **Tap Targets:** All interactive elements must maintain a minimum 44x44px hit area.

### Guided Question Cards
- **Selection Cards:** For multiple-choice questions, use large cards with a 1px border. When selected, the border thickens to 2px in `secondary-teal` with a subtle teal tint on the background.
- **Focus State:** Use a high-contrast focus ring for keyboard navigation.

### Progress Indicators
- **Step Header:** A thin, horizontal bar at the top of the screen. The filled portion uses the secondary teal color.
- **Contextual Labeling:** Small `label-sm` text (e.g., "Step 3 of 12") placed directly above or below the progress bar.

### Input Fields
- **Floating Labels:** To maintain context even when the user is typing.
- **Helper Text:** Persistent `body-sm` text below inputs for legal clarifications, ensuring the user feels "guided" through each step.

### Tooltips
- Subtle "info" icons that expand on hover or tap to reveal `body-sm` text on a semi-transparent white card with a 1px border.