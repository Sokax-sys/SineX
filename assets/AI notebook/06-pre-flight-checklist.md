# Pre-Flight Checklist

**THIS IS NOT OPTIONAL. Run every box before shipping code. If any box fails, the output is not done.**

---

## Brief & Configuration

- [ ] **Brief inference** declared (one-line "Design Read" before code)?
- [ ] **Dial values** explicit and reasoned from the brief, not silently using baseline (8/6/4)?
- [ ] **Design system** chosen from Section 2 if applicable, or aesthetic labeled honestly?
- [ ] **Redesign mode** detected and audit performed (if applicable)?

## Design Consistency

- [ ] **ZERO em-dashes (`—`) anywhere on the page.** Headlines, eyebrows, pills, body, quotes, attribution, captions, buttons, alt text. Zero. Non-negotiable.
- [ ] **Page Theme Lock**: ONE theme (light, dark, or auto) for the whole page. No section flips to inverted mode mid-page.
- [ ] **Color Consistency Lock**: one accent color used identically across ALL sections.
- [ ] **Shape Consistency Lock**: one corner-radius system applied consistently.

## Accessibility & Contrast

- [ ] **Button Contrast Check**: every CTA text is readable against its background (WCAG AA 4.5:1 minimum, no white-on-white).
- [ ] **CTA Button Wrap**: no CTA label wraps to 2+ lines at desktop.
- [ ] **Form Contrast Check**: form inputs, placeholders, focus rings, labels all pass WCAG AA against the section background.

## Typography

- [ ] **Serif discipline**: if serif is used, it is NOT Fraunces or Instrument_Serif (or it is, with explicit brand justification)? Different serif from your previous project?
- [ ] **Premium-consumer palette check**: if the brief is premium-consumer, palette is NOT the AI-default beige+brass+oxblood+espresso family? Different family from your previous project?
- [ ] **Italic descender clearance**: every italic word with y/g/j/p/q has `leading-[1.1]` min + `pb-1` reserve?

## Hero

- [ ] **Hero fits viewport**: headline ≤ 2 lines, subtext ≤ 20 words AND ≤ 4 lines, CTA visible without scroll, font scale planned around image.
- [ ] **Hero top padding**: max `pt-24` at desktop, hero content does not float halfway down.
- [ ] **Hero stack discipline**: max 4 text elements (eyebrow OR brand strip, headline, subtext, CTAs). NO tagline below CTAs, NO trust micro-strip.

## Layout

- [ ] **EYEBROW COUNT (mechanical)**: count instances of `uppercase tracking` micro-labels above section headlines. Count ≤ ceil(sectionCount / 3). Hero counts as 1.
- [ ] **Split-Header Ban**: no "left big headline + right small explainer paragraph" as section header.
- [ ] **Zigzag Alternation Cap**: no 3+ consecutive sections with the same image+text-split layout.
- [ ] **No Duplicate CTA Intent**: no two CTAs with the same intent ("Get in touch" + "Let's talk" = fail).
- [ ] **Logo wall = logo only**: no industry/category labels printed below logos.
- [ ] **Bento Background Diversity**: at least 2-3 bento cells have real visual variation (image, gradient, pattern), not all white-on-white text cards.
- [ ] **"Used by/Trusted by"** lives UNDER the hero, uses REAL SVG logos (Simple Icons / devicon) or generated SVG marks, NOT plain text wordmarks.
- [ ] **Navigation on ONE line** at desktop, height ≤ 80px.
- [ ] **Section-Layout-Repetition**: no two sections share the same layout family. 8 sections need ≥ 4 different families.
- [ ] **Bento cell count**: N items → N cells. No empty cells.
- [ ] **Long lists use right UI component**: not default `<ul>` with `divide-y` for > 5 items.

## Content & Copy

- [ ] **Copy Self-Audit**: every visible string re-read. No grammatically broken or AI-hallucinated phrases shipped.
- [ ] **Quotes ≤ 3 lines** of body. Attribution clean (name + role + optionally company, no em-dash).
- [ ] **Content density**: no 20-row data tables, no fake-precise specs without justification, ≤ 25-word sub-paragraphs by default.

## Motion

- [ ] **Motion motivated**: every animation has a one-sentence justification (hierarchy / storytelling / feedback / state transition). No GSAP-for-show.
- [ ] **MARQUEE max-one-per-page**: no two horizontal marquees on the same page.
- [ ] **Motion claimed = motion shown**: if MOTION_INTENSITY > 4, page actually animates.
- [ ] **GSAP sticky-stack / horizontal-pan**: uses canonical skeleton (`start: "top top"`, `pin: true`, correct scrub).
- [ ] **Reduced motion**: wrapped for everything MOTION_INTENSITY > 3.
- [ ] **No `window.addEventListener('scroll')`** — uses Motion `useScroll()`, ScrollTrigger, IntersectionObserver, or CSS scroll-driven animations only.

## Images & Assets

- [ ] **Real images used**: gen-tool first, then Picsum-seed (`https://picsum.photos/seed/{word}/{w}/{h}`), then explicit placeholder slots. NO div-based fake screenshots, NO hand-rolled decorative SVGs as default.
- [ ] **No pills/labels overlaid on images** (no "Plate · Brand", no "Field notes - journal").
- [ ] **No photo-credit captions as decoration** ("Field study no. 12 · Ines Caetano").
- [ ] **No version footers** (`v1.4.2`, `Build 0048`) on marketing pages.

## AI Tells (banned patterns)

- [ ] **No micro-meta-sentences** under eyebrows ("Each of these is a feature we ship today...").
- [ ] **No decoration text strip at hero bottom** (`BRAND. MOTION. SPATIAL.`).
- [ ] **No floating top-right sub-text** in section headings.
- [ ] **No scoring/progress bars with filled background tracks** as comparison visuals.
- [ ] **No locale/city/time/weather strips** unless brief is genuinely globally-distributed.
- [ ] **No scroll cues** (`Scroll`, `↓ scroll`, `Scroll to explore`).
- [ ] **No version labels in hero** (V0.6, BETA, INVITE-ONLY) unless brief is a launch.
- [ ] **No section-numbering eyebrows** (`00 / INDEX`, `001 · Capabilities`).
- [ ] **No decorative dots** (zero by default, only for real semantic state).
- [ ] **No `border-t` + `border-b` on every row** of long lists/spec tables.

## Engineering

- [ ] **Viewport stability**: `min-h-[100dvh]`, never `h-screen`.
- [ ] **Mobile collapse** explicit per section (`w-full`, `px-4`, `max-w-7xl mx-auto`) for high-variance layouts.
- [ ] **`useEffect` animations** have strict cleanup functions.
- [ ] **Empty / loading / error** states provided?
- [ ] **Cards omitted** in favor of spacing where possible?
- [ ] **Icons** from an allowed library only (Phosphor / HugeIcons / Radix / Tabler), no hand-rolled SVG paths?
- [ ] **Motion** isolated in client-leaf components with `'use client'`, memoized?
- [ ] **Core Web Vitals** plausibly hit (LCP < 2.5s, INP < 200ms, CLS < 0.1)?
- [ ] **One design system** per project (no Material + shadcn mixed)?
