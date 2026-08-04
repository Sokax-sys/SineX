# AGENTS.md — SineX Project Context

## Project Overview
SineX is a streaming media app (Electron + Tauri + PWA) for browsing movies/TV/anime from TMDB and playing them via 10+ third-party streaming sources. Dual-shell: Electron for desktop, Tauri for Android.

## Architecture (studied fully)
- **State**: Single `App.jsx` (~1369 lines) as state hub — no Redux/Zustand. Props down / callbacks up. localStorage for persistence, Electron safeStorage for secrets.
- **Frontend**: 7 lazy-loaded pages (Home, Movie, TV, Browse, Library, Downloads, Settings), 20 components (PlayerFrame, SearchModal, Sidebar, MediaCard, TrendingCarousel, SetupScreen, etc.), 14 utilities (api, storage, i18n, ageRating, aniSkip, errorLog, episodeMappings, etc.)
- **Backend/Electron**: `index.js` main process (window mgmt, ad-block, yt-dlp, auto-updater, 3 web partitions), `preload.js` (~70+ IPC channels)
- **IPC modules** (6): allmanga.js (anime), subtitles.js (SubDL/Wyzie), downloads.js (queue), player.js (mpv/VLC), storage.js (safeStorage), updateNotifier.js
- **Proxy layers** (3): direct Electron fetch, Tauri Rust DoH, standalone Rust TCP proxy (port 9900 via curl.exe)
- **Streaming**: 10 sources (Videasy, VidSrc, 2Embed, SuperEmbed, FSAPI, CurtStream, MovieWP, VidCloud, 123Embed, AllManga) with fallback chain
- **Anime**: AllManga pipeline — hex-cipher decryption, AES-256-CTR, AllAnime GraphQL + Cloudflare bypass, local HTTP server

## Testing Status (NOT done)
- No tests have been examined or run yet
- Check package.json for test script, or ask user
- Run lint/typecheck after changes if available

## UI/UX Status (studied)
- **Complete**: All 7 pages, 20 components, full CSS (3835 lines), no TODOs/FIXMEs, no stubs, no placeholder screens
- **Minor leftovers**:
  - `WyzieKeyModal.jsx` — 355-line modal, fully built but never imported (Wyzie key handled inline in SettingsPage)
  - `BookIcon` in Icons.jsx — exported but unused
  - `App.jsx:218` — empty `if` branch during cache migration (no-op with comment)
  - `SettingsPage.jsx:785` — empty `<div>` with "toggle handles everything" comment

## Assets Folder Structure (studied fully)
```
assets/
├── Agent-skills/          # Addy Osmani's agent-skills repo — 24 workflow skills, 4 agent personas, 8 slash commands, for Claude Code/Cursor/Gemini/OpenCode/etc.
├── AI notebook/           # 15 .md files: taste-skill-core, GSAP reference, liquid glass, design system map, prompt engineering patterns, brand analysis, 2026 web design landscape
├── AI Prompts/            # 3 collections of leaked system prompts from ~320+ files across all major AI vendors (Claude, GPT, Gemini, Grok, Copilot, Cursor, etc.)
├── Front-end book/        # 6 chapters: Taste Skill, Popular Style, GSAP, Liquid Glass, Popular Style II (16 brand deep-dives), Branding Awareness
├── Gradient Lib/          # Shader Gradient v2 monorepo — pnpm + Turborepo + Changesets. Core: @shadergradient/react (React Three Fiber animated 3D gradients). 5 apps (Next.js examples, Figma/Framer plugins), 5 packages.
└── gradient-dist/         # Built ES module distribution of Shader Gradient. 4 shader families (defaults, cosmic, glass, positionMix) × 3 geometries (plane, sphere, waterPlane). Post-processing, camera controls, 11 presets, Framer integration.
```

## Key Design Philosophy (from assets)
- **Taste Skill**: Anti-slop framework — no AI purple/blue glows, no pure black/white, max 1 accent color, generous spacing, content-first
- **GSAP**: Preferred for scrolltelling/scroll-hijack; Motion (framer-motion) for UI/state-change; never mix both in same component tree
- **Color System**: Dark-first UI (#0c0c0c bg, #1a1a1a surface, #3b82f6 accent) or alternatives per brand brief
- **Shader Gradient**: Animated 3D gradient backgrounds (plane/sphere/waterPlane) as aesthetic enhancement

## TODO Next Steps
- [ ] Run test suite (find test command)
- [ ] Build/run the app to verify it compiles
- [ ] Fix leftover items (WyzieKeyModal, BookIcon, empty branches) if desired
- [ ] Any feature work or bug fixes as requested
