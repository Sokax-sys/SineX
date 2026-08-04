# Style Variants — When to Use What

## 1. Soft / Editorial / High-End Visual Design

**Skill name:** `high-end-visual-design`

**When:** Polished, calm, expensive UI with softer contrast, whitespace, premium fonts, spring motion.

**Signature techniques:**
- **Double-Bezel (Doppelrand)**: nested architecture — outer shell with subtle bg + inner core with highlight shadow
- **Button-in-Button**: trailing icon nested in its own circular wrapper inside the button
- **Macro-whitespace**: `py-24` to `py-40` sections
- **Fluid Island Nav**: floating glass pill navbar detached from top, staggered mask reveal on expand
- **Magnetic Button Hover**: scale down + inner icon translates diagonally
- **Custom cubic-bezier**: `cubic-bezier(0.32, 0.72, 0, 1)` for all transitions
- **Ambient shadows**: ultra-soft, diffused. Never `shadow-md` defaults

**Vibe archetypes (pick one):**
1. **Ethereal Glass** (SaaS/AI/Tech) — OLED black, radial mesh gradients, heavy `backdrop-blur-2xl`
2. **Editorial Luxury** (Lifestyle/Real Estate) — warm creams, muted sage, deep espresso, variable serif, paper grain
3. **Soft Structuralism** (Consumer/Health) — silver-grey/white, massive Grotesk type, floating components

**Banned:** Inter, Roboto, Lucide, FontAwesome, 1px solid gray borders, `ease-in-out` transitions, edge-to-edge sticky navbars, 3-column Bootstrap grids

---

## 2. Minimalist UI

**Skill name:** `minimalist-ui`

**When:** Editorial product UI with Notion/Linear vibes, restrained palette, crisp structure.

**Signature techniques:**
- Warm monochrome palette (`#F7F6F3`, `#FBFBFA`)
- Ultra-flat: `border: 1px solid #EAEAEA`, `border-radius: 8px max`
- Extreme typographic contrast (sans + serif pairings)
- Generous internal padding: 24-40px inside cards
- Soft pastel accents for tags/badges/code backgrounds
- Scroll entry: `translateY(12px)` + `opacity: 0` over 600ms, `cubic-bezier(0.16, 1, 0.3, 1)`
- Staggered reveals via `animation-delay: calc(var(--index) * 80ms)`

**Banned:** Inter, Roboto, Open Sans, Lucide, Heroicons, `shadow-md+`, gradients, pill shapes for containers, pure black, emojis, "Elevate/Seamless/Unleash" copy

---

## 3. Brutalist / Industrial

**Skill name:** `industrial-brutalist-ui`

**When:** Hard mechanical language, Swiss type, sharp contrast, experimental layout.

**Two modes (pick ONE per project):**

### Swiss Industrial Print (light)
- Newsprint substrate (`#F4F4F0`, `#EAE8E3`)
- Carbon ink (`#050505`)
- Aviation red accent only (`#E61919`)
- Zero border-radius. Visible compartmentalization via CSS Grid

### Tactical Telemetry / CRT Terminal (dark)
- Dark mode exclusive (`#0A0A0A`, `#121212`)
- White phosphor text (`#EAEAEA`)
- Monospace dominant (JetBrains Mono, IBM Plex Mono)
- Technical framing: `[ DELIVERY SYSTEMS ]`, `>>>`, crosshairs
- CRT scanlines via `repeating-linear-gradient`

**Signature techniques:**
- Macro-typography: `clamp(4rem, 10vw, 15rem)`, negative tracking, compressed leading
- CSS Grid with `gap: 1px` and contrasting parent/child backgrounds for razor-thin lines
- ASCII decoration for framing data
- Halftone/dithering via SVG filters or `mix-blend-mode`
- Mechanical noise overlay
- Strict 90° corners everywhere

**Banned:** border-radius, gradients, translucency, soft shadows. Only one accent color: red.

---

## 4. Redesign Protocol

**Skill name:** `redesign-existing-projects`

**Mode detection (first action):**
- **Greenfield** — no existing site. Dial baseline.
- **Redesign - Preserve** — modernise without breaking brand. Audit first, extract tokens, evolve.
- **Redesign - Overhaul** — new visual language on existing content. Preserve content and IA.

### Audit before touching

Check and fix:
- **Typography**: no browser defaults or Inter everywhere. Headlines lack presence. Body too wide. Only Regular+Bold weights. Missing letter-spacing. Orphaned words.
- **Color**: pure #000000 backgrounds. Oversaturated accents. Multiple accent colors. Warm+cool gray mixing. AI purple gradients. Generic box-shadows. Flat with zero texture. Inconsistent lighting direction. Random dark sections in light page. Empty flat sections.
- **Layout**: everything centered. 3-equal-card feature row. `height: 100vh`. Flexbox percentage math. No max-width. Cards of equal height forced. Uniform border-radius. No overlap. Symmetrical vertical padding. Buttons not bottom-aligned. Feature lists at different Y positions.
- **Interactivity**: no hover states. No active feedback. Instant transitions. Missing focus rings. No loading/empty/error states. Dead links. Animations using top/left/width/height.
- **Content**: generic names (John Doe). Fake round numbers (99.99%). Acme Corp names. AI copy cliches. Exclamation marks. "Oops!" errors. Passive voice. Lorem Ipsum. Title Case everywhere.
- **Components**: generic card (border + shadow + white). Always filled + ghost button. Pill-shaped badges. Accordion FAQ. 3-card carousel dots. Pricing with 3 towers.

### Modernisation levers (priority order)

1. Typography refresh (biggest lift per risk)
2. Spacing & rhythm (section padding, vertical rhythm)
3. Color recalibration (desaturate, unify neutrals)
4. Motion layer (micro-interactions)
5. Hero & key-section recomposition
6. Full block replacement (only if unsalvageable)

### What never changes silently

URL structure, primary nav labels, form field names/order (breaks analytics + autofill), brand logo, legal/consent/cookie copy.

---

## 5. Image-to-Code Pipeline

**Skill name:** `image-to-code`

**Workflow:** Image generation → Deep analysis → Implementation

**When:** Any visually important web task (hero sections, landing pages, premium multi-section websites, redesigns).

**Dial defaults:**
- DESIGN_VARIANCE: 8
- VISUAL_DENSITY: 3
- ART_DIRECTION: 8
- IMPLEMENTATION_CLARITY: 9
- IMAGE_USAGE_PRIORITY: 9

**Key rules:**
- Generate large, readable, section-specific images (not one compressed board for everything)
- Fresh standalone images per section (never crop old ones)
- No cards-inside-cards-inside-cards UI
- Hero must be clean, spacious, readable on a small laptop
- Deep analysis after generation — extract typography, spacing, color, layout structure
- Only then implement
