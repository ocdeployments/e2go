---
name: High-Contrast Slate
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
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
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
    letterSpacing: -0.01em
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
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is defined by high-contrast functionalism and a "utility-first" aesthetic. It targets power users and professionals who require speed, clarity, and uncompromising accessibility. The emotional response is one of efficiency, reliability, and precision.

The style is **Minimalist-Corporate**. It leverages heavy whitespace and a restricted color palette to reduce cognitive load. Visual hierarchy is established through extreme shifts in value (black against white) and the strategic use of a single high-chroma accent color. There are no decorative flourishes; every element serves a functional purpose within a structured, systematic framework.

## Colors

This design system utilizes a high-contrast grayscale foundation with a singular "Electric Blue" accent for primary intent.

- **Primary (#2563eb):** Reserved exclusively for primary call-to-actions, active states, and critical wayfinding.
- **Secondary (#0f172a):** A deep slate-black used for headings and high-emphasis text to ensure maximum readability.
- **Neutral (#64748b):** A cool slate-grey used for secondary text, icons, and borders.
- **Backgrounds:** The primary canvas is pure white (#ffffff). Secondary surfaces, such as sidebars or card backgrounds, use a very light cool grey (#f8fafc) to provide subtle separation without sacrificing contrast.

All color combinations must adhere to WCAG 2.1 Level AA standards at a minimum, aiming for AAA for text elements.

## Typography

The design system uses **Inter** across all levels to maintain a systematic, neutral, and highly legible appearance. 

Typographic hierarchy is achieved through significant weight changes and strict vertical rhythm. Headlines are set in Semi-Bold or Bold with tighter letter spacing to create a grounded, authoritative feel. Body text remains at 16px for optimal desktop readability, scaling down slightly for dense information displays. Labels utilize slightly increased letter spacing and, in the smallest tier, uppercase styling to differentiate them from body content.

## Layout & Spacing

This design system follows a strict **8px grid system**. All dimensions, padding, and margins must be increments of the 8px base unit to ensure visual consistency and vertical alignment.

- **Grid Model:** A 12-column fluid grid is used for desktop (1024px+), transitioning to an 8-column grid for tablets, and a 4-column grid for mobile devices.
- **Breakpoints:** Mobile (0-639px), Tablet (640px-1023px), Desktop (1024px+).
- **Reflow:** On mobile, horizontal margins are reduced to 16px, and multi-column card layouts collapse into a single vertical stack. Padding within components (like cards) remains consistent across devices to maintain the tactile "breathability" of the design.

## Elevation & Depth

To maintain high contrast and clarity, depth is communicated primarily through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Level 0 (Floor):** Pure white (#ffffff) background.
- **Level 1 (Surface):** Light slate (#f8fafc) used for container backgrounds or disabled states.
- **Borders:** Elements are defined by 1px solid borders in #e2e8f0 (subtle) or #cbd5e1 (defined). 
- **Active Elevation:** When an element requires focus (like a modal), a single, extremely diffused ambient shadow is used: `0px 10px 15px -3px rgba(0, 0, 0, 0.1)`. 

Avoid stacking multiple shadowed elements. Prefer using border-weight changes or background-color shifts to indicate interactivity.

## Shapes

The design system utilizes a **Rounded** shape language with a base corner radius of 8px (0.5rem). This softens the high-contrast aesthetic, making the interface feel modern and approachable without losing its professional edge.

- **Standard (8px):** Buttons, input fields, and small components.
- **Large (16px):** Cards and content containers.
- **Extra Large (24px):** Modals and featured hero sections.
- **Full:** Used exclusively for tags, badges, and circular icon buttons.

## Components

- **Buttons:** Primary buttons use the Electric Blue (#2563eb) background with white text. Secondary buttons use a slate-900 border and text. Buttons have a fixed height of 44px for accessibility (touch targets).
- **Input Fields:** Fields use a 1px border (#cbd5e1). Upon focus, the border shifts to the primary Electric Blue with a 2px thickness or a soft outer glow.
- **Cards:** Cards are styled with a white background and a 1px #e2e8f0 border. On hover, the border darkens to #cbd5e1 to indicate interactivity.
- **Chips/Badges:** Use a "pill" shape (full rounding). Neutral badges use a light grey fill, while status badges use highly saturated semantic colors (Success: Emerald, Warning: Amber, Error: Rose) but always with high-contrast text.
- **Lists:** List items are separated by subtle 1px dividers (#f1f5f9). Interactive list items use a #f8fafc background shift on hover.
- **Checkboxes/Radios:** When checked, these use the Electric Blue fill. The size is 20x20px to ensure they are easy to toggle on mobile devices.
- **Navigation:** Top navigation uses a solid white background with a subtle bottom border. Active links are indicated by a 2px Electric Blue bottom bar.