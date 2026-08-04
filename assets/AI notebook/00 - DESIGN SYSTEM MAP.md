# Design System Map — Chat → Preview Prototype

## Dials (Locked)
| Dial | Setting |
|---|---|
| Aesthetic | Swiss — grid, system fonts, minimal color, content-first |
| Motion | Restrained — fades/slides, 300ms, ease-out |
| UX Density | Hybrid — sparse (initial landing) → split 50/50 (after first prompt) |

---

## 1. Color Tokens

```css
:root {
  /* Backgrounds */
  --bg-base: #0c0c0c;
  --bg-surface: #1a1a1a;
  --bg-elevated: #242424;
  --bg-hover: #2e2e2e;

  /* Text */
  --text-primary: #f5f5f5;
  --text-secondary: #a0a0a0;
  --text-tertiary: #6b6b6b;

  /* Accent */
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --accent-subtle: rgba(59, 130, 246, 0.12);

  /* Borders */
  --border: #2a2a2a;
  --border-focus: #3b82f6;

  /* Status */
  --success: #22c55e;
  --error: #ef4444;
  --warning: #eab308;
}
```

## 2. Typography

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

  /* Scale */
  --text-xs: 0.75rem;     /* 12px — labels, meta */
  --text-sm: 0.875rem;    /* 14px — body small */
  --text-base: 1rem;      /* 16px — body */
  --text-lg: 1.125rem;    /* 18px — lead */
  --text-xl: 1.5rem;      /* 24px — h3 */
  --text-2xl: 2rem;       /* 32px — h2 */
  --text-3xl: 3rem;       /* 48px — h1 */
  --text-4xl: 4.5rem;     /* 72px — hero prompt */
}
```

## 3. Spacing & Grid

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;
  --space-10: 64px;
  --space-12: 96px;

  /* Layout */
  --sidebar-w: 480px;       /* Prompt panel width in split mode */
  --preview-min-w: 480px;   /* Minimum preview width */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

## 4. Motion Tokens

```css
:root {
  --duration-fast: 150ms;
  --duration-base: 300ms;
  --duration-slow: 500ms;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
```

GSAP defaults for UI transitions:
```js
const UI_DEFAULTS = {
  duration: 0.3,
  ease: 'power2.out',
}
```

## 5. Component Architecture

### Layout States

```
LANDING (sparse)
┌──────────────────────────────────────┐
│                                      │
│   ┌────────────────────────────┐     │
│   │    prompt (big textarea)   │     │
│   │    placeholder: "Build me  │     │
│   │    a real estate CRM..."   │     │
│   │                            │     │
│   │    [→ Generate]            │     │
│   └────────────────────────────┘     │
│                                      │
└──────────────────────────────────────┘

SPLIT (after generation)
┌─────────────────┬────────────────────┐
│  SIDEBAR (480px)│  PREVIEW (flex)    │
├─────────────────┤                    │
│ prompt (small)  │  iframe / preview  │
│ chat history    │                    │
│ [→ Generate]    │                    │
│                 │                    │
│ version undo    │                    │
└─────────────────┴────────────────────┘
```

### Component Tree

```
App
├── LandingScreen       (sparse mode — big prompt + full preview)
│   ├── Logo
│   ├── BigPrompt       (textarea, hero-scale)
│   ├── GenerateButton
│   └── PreviewFrame    (full-screen, iframe)
│
├── WorkspaceScreen     (split mode — after first generation)
│   ├── Sidebar
│   │   ├── ChatThread  (message list)
│   │   │   ├── UserMessage
│   │   │   └── AIMessage (with generated preview mark)
│   │   ├── PromptInput (compact textarea)
│   │   └── Toolbar     (generate, undo, clear)
│   └── PreviewPanel
│       ├── PreviewFrame
│       └── PreviewToolbar (refresh, copy code, fullscreen)
│
└── Shared
    ├── MotionWrapper   (GSAP enter/exit transitions)
    ├── CodeBlock       (mono, copyable)
    └── Spinner         (loading state with GSAP rotate)
```

### State Machine

```
IDLE ──(prompt)──→ LOADING ──(success)──→ READY ──(iterate)──→ LOADING...
  │                   │
  └───(empty)──┘  └──(error)──→ ERROR ──(retry)──→ LOADING
```

Transitions animate: `IDLE ↔ LOADING` (spinner fade-in), `LOADING → READY` (preview slide-up), `ERROR → LOADING` (shake + retry)

## 6. Key Interaction Specs

| Interaction | Behavior | Motion |
|---|---|---|
| Prompt → Generate | Button morphs into spinner, preview panel slides up from bottom | 300ms, ease-out |
| Chat message appears | Fade-in + slide-down from top of chat | 200ms, ease-out, stagger 50ms |
| Preview refreshes | Old preview fades out, new fades in (crossfade 250ms) | 250ms, ease-in-out |
| Panel resize (split) | Drag gutter, panels reflow | instant (no anim) |
| Error state | Brief shake on prompt input + red border flash | 400ms, ease-out |
| Reduced motion | All durations → 0, skip GSAP timelines, instant swaps | none |

## 7. Responsive Breakpoints

```css
--bp-sm: 640px;   /* stack sidebar below preview */
--bp-md: 1024px;  /* sidebar collapses to bottom sheet */
--bp-lg: 1440px;  /* max content width */
```

## 8. Swiss Grid (CSS utility approach)

Use a simple 12-column flex grid for the preview output container — no framework:
```css
.grid { display: flex; flex-wrap: wrap; }
.grid-col { flex: 1 0 calc(var(--col) / 12 * 100%); }
```
The preview (AI-generated content) lives in an isolated iframe — the UI chrome uses flex layout, not grid.
