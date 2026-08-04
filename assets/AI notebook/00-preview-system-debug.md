# Preview System Debug: `querySelector` Null in Sandboxed Iframe

## The Bug

```
about:srcdoc:653: Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
  at initNavigation (about:srcdoc:653:12)
```

Element `.menu-toggle` exists in the HTML source, DOM is fully parsed — yet `document.querySelector('.menu-toggle')` returns `null`.

## Root Cause (Frontend-only)

### The Regex Anchor Bug

`stripDomContentLoaded()` at `frontend/js/app.js` had a regex with `$` anchor:

```js
/...\}\s*\)\s*;?\s*$/   ← BAD: requires string to END with `});`
```

The generated `app.js` has function definitions **after** the `});`:

```
document.addEventListener('DOMContentLoaded', () => {     ← line 1
  initNavigation();
  initTheme();
  ...
});                                                        ← line 9: wrapper closes
                                                           ← but file CONTINUES
/* Navigation Logic */
function initNavigation() {                                ← line 12: defs OUTSIDE wrapper
  const menuToggle = document.querySelector('.menu-toggle');
  ...
}
```

Because the `$` anchor required the string to end at `});`, the regex **never matched** → the DOMContentLoaded wrapper was **never stripped** → it survived into the try-catch wrapping.

### Why The Error Was "Uncaught"

```
try{
  document.addEventListener('DOMContentLoaded', () => {   ← try-catch wraps THIS (registration)
    initNavigation();                                       ← callback runs LATER, outside try-catch
  });
}catch(e){...}                                              ← catch only covers sync registration errors
```

`try{}catch{}` cannot catch errors inside async callbacks. The `DOMContentLoaded` callback executes asynchronously, after the try block has completed. So when `initNavigation()` throws (regardless of why), the error is **uncaught**.

### The Fix

Change the regex from anchored (`$`) to non-greedy without end-anchor:

```js
/^document\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]\s*,\s*(?:...)\s*\{([\s\S]*?)\}\s*\)\s*;?\s*/
```

- `([\s\S]*?)` — non-greedy, matches only inside the callback body
- No `$` — preserves everything after `});` (function defs, etc.)
- `code.slice(m[0].length)` — appends the trailing content

Result:

```
// Before (280 chars: wrapper + fn defs):
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  ...
});
function initNavigation() { ... }

// After stripDomContentLoaded (240 chars: calls + fn defs):
  initNavigation();
  ...

function initNavigation() { ... }

// After try-catch wrapping:
try{
  initNavigation();
  ...
  function initNavigation() { ... }
}catch(e){console.warn('Preview error:', e)}
```

Function declarations are hoisted, so they're available when the calls execute. The try-catch now wraps ALL execution, including the function bodies.

## Why The Sandbox Was Innocent (mostly)

The sandbox (`allow-scripts` without `allow-same-origin`) does NOT block:
- `<script src="...">` external resource loading
- DOM construction or `querySelector`
- `defer` script execution ordering

The primary bug was purely the regex anchor. However, the sandbox DID cause a secondary issue:

## Secondary Issue: localStorage/sessionStorage Denied

Generated code often uses `localStorage` (theme persistence, etc.) and Chrome extensions inject content scripts that access `sessionStorage`. With `allow-scripts` alone, any `localStorage`/`sessionStorage` access throws:

```
SecurityError: Failed to read the 'localStorage' property from 'Window':
The document is sandboxed and lacks the 'allow-same-origin' flag.
```

**Fix:** add `allow-same-origin` to the sandbox. This gives the iframe the origin of its `src` URL (`localhost:3000`), so `localStorage` works. Since the preview files are served by our own Express server, same-origin is safe — the preview is already trusted code from our pipeline.

```html
<iframe sandbox="allow-scripts allow-same-origin"></iframe>
```

## Preview Pipeline (Current State)

Files are served from disk via Express, not inlined into srcdoc:

```
Model output → saved to generated/_preview/ via POST /api/preview-save
  → iframe.src = /generated/_preview/index.html (sandbox="allow-scripts allow-same-origin")
  → real HTTP requests for style.css, app.js, CDN scripts
  → no inlineAssets, no sanitizers needed in preview path
```

`inlineAssets` and sanitizers remain as a fallback (when server is unreachable), but the normal path is just file serving.

## Model-Generated Code Issues (Not Pipeline)

These are bugs in the *generated* code that surface when served as real files (not pipeline errors):

| Error | Likely Cause |
|-------|-------------|
| `prefersLight is not defined` / `ReferenceError: X is not defined` | Model writes `if (X)` but the `const X = ...` declaration was omitted or placed after the usage in a different code path. Happens when model restructures code mid-generation. |
| `Cannot read properties of null (reading 'addEventListener')` | `querySelector` returns null because the model referenced a class name that doesn't exist in the HTML, or the element is inside a template/shadow DOM. The original bug report was this error *inside* a `DOMContentLoaded` callback which made it uncaught. |

**Mitigation:** Try-catch wrapping of individual `initXxx()` calls + `DOMContentLoaded` guard prevents one failure from breaking the entire init chain.

### Per-Init-Call Wrapping (Both Paths)

A single `try{}catch{}` around all init calls was insufficient: if `initTheme()` threw `ReferenceError`, the catch fired but `initModals()`, `initTabs()`, etc. never ran because execution stopped inside the try block.

**Fix:** wrap each `initXxx()` call individually:

- **Frontend (srcdoc fallback):** After `stripDomContentLoaded`, regex wraps each init call on its own line:
  ```
  try{initNavigation();}catch(e){console.warn("[preview]",e.message)}
  try{initTheme();}catch(e){console.warn("[preview]",e.message)}
  try{initModals();}catch(e){console.warn("[preview]",e.message)}
  ```

- **Server (real file path):** Before saving JS files, regex finds `DOMContentLoaded` callback body and rewraps the init calls inside it:
  ```js
  code.replace(dclRe, (m, body) => {
    const wrappedBody = body.replace(/^(\s*)(init\w*\s*\([^)]*\)\s*;?)\s*$/gm,
      '$1try{$2}catch(e){console.warn("[preview]",e.message)}');
    return m.replace(body, wrappedBody);
  });
  ```

### DOMContentLoaded Guard (Both Paths)

Additionally, a guard script is injected into HTML files (both paths) that overrides `EventTarget.prototype.addEventListener` to wrap every `'DOMContentLoaded'` callback individually in try-catch:

```html
<script>
(function(){
  var oe = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(t, fn, op) {
    if (t === "DOMContentLoaded") {
      var w = function() {
        try { fn.apply(this, arguments); }
        catch(e) { console.warn("[preview]", e.message); }
      };
      return oe.call(this, t, w, op);
    }
    return oe.call(this, t, fn, op);
  };
})();
</script>
```

This catches errors from any DOMContentLoaded callback, including those from CDN scripts or model code that doesn't use `initXxx()` naming.

### Three Layers of Defense

| Layer | What | Catches |
|-------|------|---------|
| 1 | Per-call `try{}catch{}` around `initXxx()` calls | Prevents one init failure from breaking the chain |
| 2 | Guard overriding `addEventListener` | Catches uncaught errors in ANY DOMContentLoaded callback |
| 3 | `stripDomContentLoaded` + per-call wrapping (srcdoc only) | Removes wrapper so code runs eagerly — errors don't disappear into async gap |

## Key Takeaway

Always check regex anchors: a `$` anchor when the expected input continues past the matched pattern causes SILENT failure — the function returns the input unmodified, and the bug looks like it's somewhere else entirely.

If using sandbox, always add `allow-same-origin` if the generated code accesses `localStorage`/`sessionStorage` (common for theme persistence, user preferences).
