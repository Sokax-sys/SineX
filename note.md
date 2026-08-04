# SineX Android Debug Guide

## Current State (July 2026)
TMDB data NOW loads on Android via this pipeline:
```
Phone WebView → fetch("http://127.0.0.1:9900/tmdb/...")
  → ADB reverse → Rust proxy server (port 9900 on PC)
    → curl.exe --ssl-no-revoke → TMDB API (works)
```

## How to Run
```powershell
# Terminal 1: Start Rust proxy server (must be running for app to work)
D:\Docs\SineX\SineX\scripts\tmdb-proxy-server\target\release\tmdb-proxy-server.exe

# Terminal 2: Start ADB reverse
C:\Users\JoeSok~1\AppData\Local\Android\Sdk\platform-tools\adb.exe reverse tcp:9900 tcp:9900

# Terminal 3: Build & install APK
cd D:\Docs\SineX\SineX
npm run dist:android:release
C:\Users\JoeSok~1\AppData\Local\Android\Sdk\platform-tools\adb.exe install -r src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk
C:\Users\JoeSok~1\AppData\Local\Android\Sdk\platform-tools\adb.exe shell monkey -p com.sinex.app 1

# Check logs
C:\Users\JoeSok~1\AppData\Local\Android\Sdk\platform-tools\adb.exe shell pidof com.sinex.app
C:\Users\JoeSok~1\AppData\Local\Android\Sdk\platform-tools\adb.exe logcat -d --pid=<PID> | findstr SINEX_ERR
```

## Debug Logs (SINEX_ERR)
Errors are captured in `src/utils/errorLog.js` with `pushError(source, message, detail)`.
View them in: Settings → Developer Error Debug section (auto-refreshes every 2s).
Also forwarded through Rust `log_error` command → `adb logcat` (look for `[SINEX_ERR]`).
Also sent via `fetch("http://127.0.0.1:9900/log")` to PC proxy server.

## Error Tags in api.js
- **tmdbFetch (pcproxy)** — WebView fetch to PC proxy (127.0.0.1:9900) failed
- **tmdbFetch (pcproxy status)** — PC proxy returned non-200 status + body
- **tmdbFetch (pcproxy full)** — Full error object properties for debugging
- **pcproxy health** — Test fetch to /logs endpoint to verify connectivity
- **tmdbFetch (proxy)** — Rust `tmdb_proxy` invoke failed (DoH + direct connection)
- **tmdbFetch (fetch)** — Native WebView fetch to TMDB directly failed
- **TMDB validation** — Configuration check on startup failed

## Architecture
- **api.js tmdbFetch()**: Strategy 1 → PC proxy (WebView fetch). Strategy 2 → Rust invoke (DoH + direct). Strategy 3 → native fetch.
- **PlayerFrame.jsx**: Renders Electron `<webview>` on desktop, `<iframe>` on Tauri/browser. Video element detection (not event-based) due to iframe limitations.
- **Mobile layout**: Sidebar from right (75vw, border-radius), 3-btn bottom nav (Home/Search/History), header hamburger.

## Key Files
- `src/utils/api.js` — TMDB fetch with 3-strategy fallback
- `src/utils/errorLog.js` — Error logging module
- `src/components/PlayerFrame.jsx` — Video player abstraction
- `src/pages/MoviePage.jsx` / `TVPage.jsx` — PlayerFrame integration
- `src/pages/SettingsPage.jsx` — Developer Error Debug section
- `scripts/tmdb-proxy-server/src/main.rs` — Rust TCP proxy (calls curl.exe)
- `scripts/error-server.cjs` — Old Node.js proxy (deprecated, use Rust proxy instead)
- `src-tauri/src/lib.rs` — `tmdb_proxy` (DoH + direct) and `log_error` commands

## Next Steps
1. **Video player not playing on Android** — PlayerFrame switched to `<iframe>`, user reports blank player when clicking a movie. Needs investigation.
2. **Clean up debug logging** — Remove verbose `pcproxy full`, `pcproxy health`, detailed body logging from api.js once stable.
3. **Vite proxy still works** — `/tmdb-api` at port 5173 for desktop dev. PC proxy at port 9900 for phone.
4. **Rust proxy at port 9900** — Must be running before launching the app. Only listens on 0.0.0.0:9900.

## Critical Notes
- `usesCleartextTraffic=true` in build.gradle.kts — enables HTTP for PC proxy
- Node.js `fetch()`/`https.request()` to TMDB gets ECONNRESET on this machine — USE `curl.exe --ssl-no-revoke` instead
- Phone's network blocks outbound TCP to TMDB CloudFront IPs — MUST use PC proxy
- ADB reverse must be set up: `adb reverse tcp:9900 tcp:9900`
- Rust reqwest on phone gets `connect:true` to TMDB IPs — same network block
- Rust reqwest on PC also failed with `connect:true` — needed curl.exe workaround
- `--ssl-no-revoke` flag required for curl.exe to work around schannel CRL timeout
