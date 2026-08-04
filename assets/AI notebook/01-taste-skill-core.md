# Taste Skill Core — The Anti-Slop Frontend Framework

## The Fundamental Workflow

```
1. BRIEF INFERENCE — Read the room before touching code
2. Set the 3 DIALS — DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY
3. DESIGN SYSTEM MAP — Pick the right foundation
4. BUILD — Apply rules with discipline
5. PRE-FLIGHT CHECK — 40+ items, non-negotiable
```

---

## 0. Brief Inference (before anything else)

Always start with a one-line **"Design Read"** before generating code:

> *"Reading this as: B2B SaaS landing for technical buyers, with a Linear-style minimalist language, leaning toward Tailwind utilities + Geist + restrained motion."*

**Signals to read:**
1. Page kind (landing / portfolio / editorial / redesign)
2. Vibe words (minimalist, calm, Awwwards, brutalist, premium consumer, Apple-y, playful, serious B2B, editorial, agency-y, glassy, dark tech)
3. Reference signals (URLs, screenshots, competitor brands)
4. Audience (B2B procurement vs. design consumer vs. recruiter)
5. Existing brand assets (logo, colors, type, photography)
6. Quiet constraints (a11y, public-sector, regulated, trust-first)

**Anti-Default Discipline:** Never default to AI-purple gradients, centered hero over dark mesh, three equal feature cards, generic glassmorphism, Inter + slate-900.

---

## 1. The 3 Dials

| Dial | Baseline | 1 (low) | 10 (high) |
|------|----------|---------|-----------|
| `DESIGN_VARIANCE` | **8** | Perfect symmetry | Artsy chaos |
| `MOTION_INTENSITY` | **6** | Static | Cinematic / physics |
| `VISUAL_DENSITY` | **4** | Art gallery/airy | Cockpit/packed |

### Dial Inference from Brief

| Signal | VARIANCE | MOTION | DENSITY |
|--------|----------|--------|---------|
| Minimalist / calm / editorial / Linear-style | 5-6 | 3-4 | 2-3 |
| Premium consumer / Apple-y / luxury | 7-8 | 5-7 | 3-4 |
| Playful / Awwwards / experimental / agency | 9-10 | 8-10 | 3-4 |
| Landing page / portfolio (default) | 7-9 | 6-8 | 3-5 |
| Trust-first / public-sector / accessibility-critical | 3-4 | 2-3 | 4-5 |
| Redesign - preserve | match existing | +1 | match existing |
| Redesign - overhaul | +2 | +2 | match existing |

---

## 2. Design System Map

### Real design systems (use official packages)

| Brief reads as... | Reach for |
|-------------------|-----------|
| Microsoft / enterprise SaaS | `@fluentui/react-components` |
| Google-ish / Material-flavored | `@material/web` |
| IBM-style B2B / enterprise analytics | `@carbon/react` |
| Shopify app surfaces | Polaris web components |
| Atlassian / Jira-style | `@atlaskit/*` |
| GitHub-style devtool / community | `@primer/css` or `@primer/react-brand` |
| Public-sector UK | `govuk-frontend` |
| US public-sector / trust-first | `uswds` |
| Fast agency MVP | Bootstrap 5.3 |
| Modern accessible React | `@radix-ui/themes` |
| Modern SaaS, own components | shadcn/ui |
| Tailwind-based / indie SaaS | Tailwind v4 utilities |

**One system per project. Honesty rule: don't recreate CSS by hand if an official package exists.**

### Aesthetic families (no official package, build native)

Glassmorphism, Bento, Brutalism, Editorial/magazine, Dark tech/hacker, Aurora/mesh gradients, Kinetic typography, Apple Liquid Glass (web approximation only).

---

## 3. Default Stack (no design system picked)

- **Framework:** React/Next.js, RSC by default, isolate interactivity in `"use client"` leaves
- **Styling:** Tailwind v4 (NOT v3 syntax in v4 projects)
- **Animation:** Motion (`import { motion } from "motion/react"`), GSAP only for scrolltelling/scroll-hijack
- **Fonts:** `next/font` or self-hosted with `font-display: swap`. NEVER Google Fonts `<link>` in production
- **State:** Local useState/useReducer. Global only for deep prop-drilling (Zustand, Jotai). NEVER useState for continuous values — use `useMotionValue`
- **Icons (priority):** `@phosphor-icons/react`, `hugeicons-react`, `@radix-ui/react-icons`, `@tabler/icons-react`
- **Lucide:** discouraged, acceptable only if user asks or project already uses it
- **NEVER** hand-roll SVG icons or use emojis

---

## 4. Hard Layout Rules (failing these = broken work)

- **Hero must fit viewport**: headline ≤ 2 lines, subtext ≤ 20 words & ≤ 4 lines, CTA visible without scroll
- **Hero font-scale**: default `text-4xl md:text-5xl lg:text-6xl`. `text-7xl+` only for 3-5 word headlines
- **Hero top padding**: max `pt-24`. Content should not float halfway down
- **Hero stack**: max 4 text elements (eyebrow OR brand strip, headline, subtext, CTAs). NO taglines below CTAs, NO trust micro-strip, NO pricing teaser, NO bullet lists, NO avatar rows in hero
- **"Used by/Trusted by"** logo wall goes UNDER hero, never inside it
- **Navigation**: single line at desktop, max 80px height
- **Bento grids**: exact cell count (N items = N cells), varied backgrounds (not all white-on-white), rhythm (not 6x left-image/right-text)
- **Zigzag alternation cap**: max 2 consecutive image+text splits. 3rd is pre-flight fail
- **Section-layout repetition**: once you use a layout family, it can appear at most ONCE per page. 8 sections need ≥ 4 different families
- **Eyebrow restraint**: max 1 eyebrow per 3 sections. Count mechanically
- **Split-header ban**: "left headline + right explainer paragraph" is banned. Stack vertically
- **Mobile collapse**: explicit per section, `< 768px` fallback declared in same component
- **Viewport**: `min-h-[100dvh]`, NEVER `h-screen`
- **Grid over flex-math**: NEVER `w-[calc(33%-1rem)]`, always CSS Grid

---

## 5. Typography Rules

- **Sans default**: NOT Inter. Pick Geist, Outfit, Cabinet Grotesk, Satoshi, or brand-appropriate
- **Pairings**: Geist + Geist Mono, Satoshi + JetBrains Mono, Cabinet Grotesk + Inter Tight
- **Serif**: VERY discouraged as default. Only if brand brief names one, or editorial/luxury/publication. NEVER Fraunces or Instrument_Serif as default
- **Emphasis**: use italic/bold of SAME font. Never random serif word in sans headline
- **Italic descender clearance**: italic words with y/g/j/p/q need `leading-[1.1]` min + `pb-1`
- **Display**: `text-4xl md:text-6xl tracking-tighter leading-none`
- **Body**: `text-base text-gray-600 leading-relaxed max-w-[65ch]`

---

## 6. Color Rules

- Max 1 accent color, saturation < 80%
- **No AI purple/blue** as default. Use neutral bases (Zinc/Slate/Stone) with singular accent
- **Color consistency lock**: one accent across entire page. Warm grey page doesn't get blue CTA in section 7
- **Premium-consumer palette ban**: no beige (#f5f1ea) + brass (#b08947) + oxblood (#9a2436) + espresso (#1a1714) as default. Rotate through alternatives
- **Shape consistency**: pick ONE corner-radius scale. Sharp (0), soft (12-16px), or pill (full). Documented mixed systems OK
- **Tinted shadows**: never pure black drop shadows

---

## 7. Motion Rules

- **Motion must be motivated**: every animation answers hierarchy / storytelling / feedback / state transition. "It looked cool" is invalid
- **MOTION_INTENSITY > 4** means the page MUST actually move. If you can't ship working motion, drop dial to 3
- **MARQUEE**: max 1 per page
- **GSAP Sticky-Stack**: `start: "top top"`, `pin: true`, NOT `"top 80%"`
- **GSAP Horizontal-Pan**: `start: "top top"`, `pin: true`, `end: "+=${distance}"`, `scrub: 1`, `ease: "none"`
- **Banned**: `window.addEventListener("scroll")`, custom scroll progress in React state, `requestAnimationFrame` touching React state
- **Reduced motion**: mandatory for anything MOTION_INTENSITY > 3. Wrap in `useReducedMotion()` or `@media (prefers-reduced-motion: no-preference)`
- **Animation lib choice**: Motion for UI/Bento/state-change. GSAP for scrolltelling/scroll-hijack. Three.js for canvas/3D. Never mix GSAP + Motion in same component tree

---

## 8. AI Tells (banned unless brief asks for them)

- NO purple/blue neon glows
- NO pure black (#000000)
- NO oversaturated accents
- NO custom mouse cursors
- NO Inter as default
- NO em-dashes (`—`) ANYWHERE. Zero tolerance
- NO `·` (middle-dot) spam. Max 1 per line
- NO 3-column equal feature cards
- NO section-number eyebrows (`00 / INDEX`, `001 · Capabilities`)
- NO "Jane Doe" / "Acme Corp" / fake-perfect numbers
- NO startup-slop filler verbs ("Elevate", "Seamless", "Unleash")
- NO div-based fake screenshots
- NO scroll cues (`Scroll`, `↓ scroll`, `Scroll to explore`)
- NO locale/weather/city strips
- NO version labels/footers on marketing pages
- NO pills/labels overlaid on images
- NO scoring/progress bars with filled tracks
- NO `border-t` + `border-b` on every row of long lists
- NO logo wall with category labels under logos
- NO photo-credit captions as decoration
- NO generic step labels ("Stage 1", "Step 1", "Phase 01")
- NO decorative colored status dots
- NO `<br>`-broken-and-italicized headlines
- NO vertical rotated text ("INDEX OF WORK" at 90°)
- NO crosshair/hairline grid lines as decoration
- NO floating top-right sub-text in section headings
