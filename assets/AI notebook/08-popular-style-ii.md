# Popular Style II — 73 Real Brand DESIGN.md Files

Source: `Chapter 5 - Popular style II/` — A curated collection of DESIGN.md files from 73 top brands, each documenting the visual language of that brand's website for AI-driven UI generation.

## How These Files Are Structured

Each brand has a `DESIGN.md` and a `README.md`. Most use YAML frontmatter with these fields:

```yaml
version: "1.0"
name: BrandName
description: One-line brand positioning
colors:
  primary: "#hex"
  secondary: "#hex"
  neutral: "#hex"
typography:
  fontFamily: "Name"
  weights: [300, 400, 500, 600, 700]
spacing:
  base: 4px or 8px
borderRadii:
  default: 8px
componentRules:
  button: "..."
  card: "..."
layout:
  grid: 12-column
interactions:
  hover: "..."
```

A smaller set (runwayml, sanity, spotify, starbucks, tesla, theverge) uses Markdown section headings instead of YAML.

---

## Key Patterns Across All 73 Brands

### 1. Color Discipline

| Observation | Count |
|---|---|
| Max 3 colors (primary + secondary + neutral) | ~60/73 |
| Dark-first palettes | ~45/73 |
| Single accent (never 2+ competing accents) | ~55/73 |
| Off-black / off-white (no pure `#000` or `#fff`) | ~40/73 |

### 2. Typography Rules

- **Custom fonts widely used**: Apple (SF Pro), Stripe (StripeSans), Ferrari (FerrariF1), Nike (Nike TG), Spotify (SpotifyMix)
- **System font fallback always present**
- **Weights**: 400 (regular) + 500 (medium) + 600 (semibold) — never more than 4 weights in use
- **Scale**: 10-12 distinct sizes from 12px (caption) to 64px+ (hero display)
- **Clamp() for responsive sizing** is nearly universal

### 3. Spacing Systems

- **Base units**: 4px (common in developer tools, SaaS) or 8px (common in consumer brands)
- **Semantic tokens**: `spacing-xs` through `spacing-3xl` or numbered `space-1` through `space-12`
- **Section padding**: 80-120px vertical, generous internal padding

### 4. Component Patterns

| Component | Common styling |
|---|---|
| **Button** | 12-16px font, 8-12px radius, solid bg + white text, hover darkens |
| **Card** | White/off-white bg, 8-12px radius, subtle shadow, 24px internal padding |
| **Input** | 14px font, 8px radius, 1px border, focus ring in accent color |
| **Navigation** | Fixed top, 64-80px height, max 6 links, hamburger < 768px |
| **Footer** | Dark bg, light text, 3-4 column grid, legal at bottom |
| **Badge** | 12px font, 500 weight, pill or 4px radius |

### 5. Layout Architecture

- **12-column grid**: Most common (Apple, Stripe, Vercel, Figma)
- **Flex-dominant**: Linear.app, Notion, Mintlify (content-width constrained)
- **Bento grids**: Common in premium brand pages (Nike, Porsche, Bugatti)
- **Container widths**: 924px-1280px, centered with `max-width` + `mx-auto`
- **Section count per page**: 4-9 sections typically

### 6. Motion & Interaction

- **Hover states on everything clickable**: color shift, lift, or underline
- **Scroll-triggered reveals**: fade-up (12px y, 600ms, ease-out)
- **Micro-interactions**: button press (scale 0.97), card lift (translateY -4px)
- **Marquee / horizontal scroll**: used sparingly (max 1 per page)
- **No scroll-jacking**: all use browser-native scroll

---

## Noteworthy Brand-Specific Patterns

| Brand | Distinctive Pattern |
|---|---|
| **Apple** | Ultra-wide hero, product-centric, white/black/clear, SF Pro, no clutter |
| **Stripe** | Blue/indigo gradient hero, clean sans, generous whitespace, subtle animations |
| **Ferrari** | Full-bleed imagery, track-red accent, dramatic typography, dark immersive |
| **Nike** | Heavy athletic type, high-contrast photography, black/white dominant |
| **Linear.app** | Ultra-minimal, warm monochrome, Geist font, no borders, content-first |
| **Vercel** | Geist font, dark-first, white/black/blue, bento grid, developer tone |
| **Notion** | No-bento, document-style, single-column prose, SF Pro, warm neutrals |
| **SpaceX** | Black/dark grey, white typography, imagery-led, technical/editorial |
| **Figma** | Purple/black/white, community-driven, bento grid, tool-emphasized |
| **PlayStation** | Deep blue/black, dynamic layouts, gaming energy, product-grid |
| **Lamborghini** | Yellow/black high contrast, aggressive typography, full-bleed video |
| **Shopify (Polaris)** | Green accent, commerce-first, clean functional UI, accessible |
| **IBM (Carbon)** | Blue primary, enterprise-scale, strict grid, data-dense components |
| **Mistral.ai** | Dark tech, monospace influence, purple/blue gradient, launchpad-feel |

---

## When to Reference This File

- Designing a page for a brand that maps to one of these 73
- Extracting a real brand's visual language to match a brief
- Understanding how top companies structure their DESIGN.md tokens
- Looking for inspiration on how to structure your own DESIGN.md

For the full list of all 73 brands, see the source directory at `assets/libs/Front-end book/Chapter 5 - Popular style II/design-md/`.
