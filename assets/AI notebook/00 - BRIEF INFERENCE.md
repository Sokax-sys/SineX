# Brief Inference — Chat → Preview Prototype

## Project
Local prototype of an AI-powered website builder for designers who can't code.

## Core Flow
1. User types a prompt in natural language
2. AI generates HTML/CSS (with GSAP if needed)
3. Live preview renders side-by-side
4. User iterates via follow-up prompts

## Target User
**Designers** — visually literate, know what "good" looks like, can't/won't write code. They think in layout, typography, color, motion — not in DOM or CSS properties.

## Taste Skill Alignment (Anti-Slop Framework)
The UI itself must embody taste-skill principles:
- **Typography**: System font stack (Inter or SF) for UI chrome; the preview shows whatever the AI generates
- **Color**: Dark-first UI (designer preference), 3-color system — bg (#0c0c0c), surface (#1a1a1a), accent (electric blue #3b82f6)
- **Space**: Generous padding, minimal chrome, content-first
- **Motion**: GSAP for UI transitions (panel open/close, prompt submit feedback), reduced-motion respect
- **Imagery**: None in UI — the preview IS the imagery

## Constraints
- Localhost only (no auth, no backend persistence)
- Single chat session per page load
- Output is client-side HTML (no React SSR, no framework)
- Gemini API at localhost:8081/v1
- Reduced-motion support required
