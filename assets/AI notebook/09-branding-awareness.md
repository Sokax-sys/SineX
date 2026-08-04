# Branding Awareness — Open Source Branding Toolkit

Source: `Chapter 6 - Branding awareness/` — A dev-friendly starter kit for open-source branding design, covering the full process from creative brief to final assets.

## Core Philosophy

Branding ≠ just a logo. Branding is a **system of artifacts and guidelines**:

```
BRAND (conceptual) → BRAND IDENTITY (system) → LOGO (instantiation)
```

- **Brand** = the story and narrative
- **Brand Identity** = collected artifacts and guidelines
- **Logo** = one specific visual element of the identity

Open source projects **need good branding more than commercial projects** — closed-source projects have marketing departments; open source has only its visual identity to attract users and contributors.

---

## The Branding Workflow

### 1. Creative Brief (start here)

Template from `creative-brief.md` — answer these before any design work:

```
## Product
- Describe the product
- What is the Unique Value Proposition? (one sentence)

## Target Audience
- Who are you reaching? Demographics? How will they find you?
- Are they developers, IT workers, educators, scientists, designers?

## Medium
- Where do they use the product? CLI? Web? Native? Mobile? VR?
```

### 2. Base Elements

#### Type Palette

Three levels:
- **Header/Display**: Bold, scannable. Similar to logo font. Examples: Color Tube, Baloo, Bebas Kai
- **Paragraph**: Unobtrusive workhorse. Examples: Quicksand, Open Sans
- **Monospace**: Code display. Nerd Font Project, Fira Code, Input, Space Mono

#### Color Palette

Define hex values with semantic roles (primary, secondary, accent, surface, text).

### 3. Visual Components

Self-contained visual elements:
- **Master Logo** — the primary lockup
- **Logo Variations** — horizontal, stacked, icon-only, monochrome
- **Brandmarks** — symbols that stand alone
- **Icon Sets** — consistent style, all matching
- **Illustration Library** — reusable illustrations

### 4. Documentation Files

| File | Purpose |
|------|---------|
| `checklist.md` | Master logo, logo variations, type palette, color palette, social media elements |
| `creative-brief.md` | Product description, UVP, target audience, medium |
| `base-elements.md` | Type palette, color palette, geometry guidelines |
| `visual-components.md` | Logo, brandmarks, icons, illustration catalog |
| `voice/` | Tone of voice and copywriting guidelines |
| `favicons/generate-favicon.zsh` | SVG → multi-size ICO converter (requires svgexport + ImageMagick) |

---

## Anti-Patterns in Open Source Branding

- **Skipping the brief** — jumping straight to logo design without understanding the project
- **Copying mainstream brands** — your open-source CLI tool probably shouldn't look like Nike
- **Designing in isolation** — branding is communication; get feedback from actual users
- **No system, just a logo** — a logo without color/type/space guidelines isn't maintainable

## Resources

- [Font Squirrel](https://www.fontsquirrel.com/) — Free fonts
- [Nerd Font Project](https://github.com/ryanoasis/nerd-fonts) — Developer monospace fonts
- [freepik illustrations](https://www.freepik.com/free-vectors/illustrations) — Illustration resources
- [Open Source Design community](https://opensourcedesign.net/) — Community for OSS designers

For full templates, see the source directory at `assets/libs/Front-end book/Chapter 6 - Branding awareness/`.
