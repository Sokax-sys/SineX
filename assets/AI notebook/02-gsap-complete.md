# GSAP Complete Reference

> All GSAP plugins are **100% free** (including SplitText, MorphSVG, etc.) since Webflow's acquisition. Install everything from the public `gsap` npm package. No Club GSAP membership, no `.npmrc` auth token, no private registry required.

---

## 1. Core API

### Tween Methods

```js
gsap.to(targets, vars)        // animate FROM current TO vars (most common)
gsap.from(targets, vars)      // animate FROM vars TO current (entrances)
gsap.fromTo(targets, from, to) // explicit start AND end
gsap.set(targets, vars)       // apply immediately (duration 0)
```

### Common Vars

```js
gsap.to(".box", {
  x: 100,                     // transform aliases: x, y, z, scale, rotation, skewX, skewY
  xPercent: 50,               // translateX in % (works on SVG too)
  autoAlpha: 1,               // opacity + visibility. At 0: visibility hidden (no pointer events)
  backgroundColor: "red",     // camelCase for CSS props
  duration: 1,                // seconds (default 0.5)
  delay: 0.5,
  ease: "power2.inOut",       // see easing section
  stagger: 0.1,               // or { amount: 0.3, from: "center" }
  overwrite: "auto",          // kill only overlapping properties
  repeat: -1,                 // -1 = infinite
  yoyo: true,                 // alternates with repeat
  immediateRender: false,     // set false when stacking multiple from/fromTo on same property
  clearProps: "all",          // remove inline styles on complete
  onComplete: () => {},
  onStart: () => {},
  onUpdate: () => {},
})
```

### Transform Aliases (prefer over raw `transform`)

| GSAP prop | CSS equivalent |
|-----------|---------------|
| `x`, `y`, `z` | translateX/Y/Z (px default) |
| `xPercent`, `yPercent` | translateX/Y in % |
| `scale`, `scaleX`, `scaleY` | scale |
| `rotation` | rotate (deg default) |
| `rotationX`, `rotationY` | 3D rotate |
| `skewX`, `skewY` | skew |
| `transformOrigin` | transform-origin |

### Directional Rotation

```js
rotation: "-170_short"   // shortest path
rotation: "+=30_cw"      // clockwise
rotation: "50_ccw"       // counter-clockwise
```

### SVG Only

```js
svgOrigin: "250 100"     // transform origin in SVG global coords
```

### Relative Values

```js
x: "+=20"   // adds 20
x: "-=20"   // subtracts 20
x: "*=2"    // multiply by 2
x: "/=2"    // divide by 2
```

### Function-Based Values

```js
gsap.to(".item", {
  x: (i, target, targets) => i * 50,
  stagger: 0.1
})
```

### Easing

```js
// Built-in (suffix .in / .out / .inOut):
ease: "none"          // linear
ease: "power1.out"    // default feel
ease: "power3.inOut"
ease: "back.out(1.7)" // overshoot
ease: "elastic.out(1, 0.3)"
ease: "bounce.out"
ease: "steps(5)"
```

Power levels: 1 (gradual) → 4 (steepest). Each has .in / .out / .inOut.

### Custom Ease (requires CustomEase plugin)

```js
const myEase = CustomEase.create("hop", "M0,0 C0,0 0.056,0.442 0.175,0.442...");
gsap.to(".item", { x: 100, ease: myEase });
```

### gsap.defaults()

```js
gsap.defaults({ duration: 0.6, ease: "power2.out" });
```

### gsap.matchMedia() (responsive + reduced-motion)

```js
const mm = gsap.matchMedia();

// Single query
mm.add("(min-width: 800px)", () => {
  gsap.to(".box", { x: 100 });
  return () => { /* cleanup */ };
}, containerRef);  // scope (optional)

// Multiple conditions
mm.add({
  isDesktop: "(min-width: 800px)",
  reduceMotion: "(prefers-reduced-motion: reduce)"
}, (context) => {
  const { isDesktop, reduceMotion } = context.conditions;
  gsap.to(".box", {
    rotation: isDesktop ? 360 : 180,
    duration: reduceMotion ? 0 : 2
  });
});
```

---

## 2. Timelines

```js
const tl = gsap.timeline({
  paused: true,
  repeat: 2,
  yoyo: true,
  defaults: { duration: 0.5, ease: "power2.out" },  // inherited by children
  onComplete: () => {},
});

tl.to(".a", { x: 100 })               // appended sequentially
  .to(".b", { y: 50 }, "+=0.2")       // position parameter
  .to(".c", { opacity: 0 }, "-=0.1"); // overlap
```

### Position Parameter (3rd argument)

| Value | Placement |
|-------|-----------|
| `0` | Exactly at 0 seconds |
| `1` | At 1 second (absolute) |
| `"+=0.5"` | 0.5s after previous end |
| `"-=0.2"` | 0.2s before previous end |
| `"<"` | Same start as previous |
| `">"` | Same end as previous (default) |
| `"<0.2"` | 0.2s after previous start |
| `"label"` | At label |
| `"label+=0.3"` | 0.3s after label |
| `"-=50%"` | Overlap by half of inserting animation's duration |

### Labels

```js
tl.addLabel("intro", 0);
tl.to(".a", { x: 100 }, "intro");
tl.play("outro");                 // play from label
tl.tweenFromTo("intro", "outro"); // animate playhead between labels
```

### Nesting Timelines

```js
const master = gsap.timeline();
const child = gsap.timeline();
child.to(".a", { x: 100 }).to(".b", { y: 50 });
master.add(child, 0);
```

### Playback Control

```js
tl.play() / tl.pause()
tl.reverse()
tl.restart()
tl.progress(0.5)       // 50%
tl.time(2)             // seek to 2s
tl.kill()
tl.isActive()
tl.then()              // Promise
tl.invalidate()        // clear recorded start/end values
```

---

## 3. ScrollTrigger

```js
gsap.registerPlugin(ScrollTrigger);
```

### Basic Setup

```js
gsap.to(".box", {
  x: 500,
  scrollTrigger: {
    trigger: ".box",
    start: "top center",     // [trigger] [scroller] position
    end: "bottom center",
    toggleActions: "play reverse play reverse",  // onEnter, onLeave, onEnterBack, onLeaveBack
  }
});
```

### Key Config

| Property | Description |
|----------|-------------|
| `trigger` | Element that defines start/end |
| `start` | Default `"top bottom"` (or `"top top"` if pin). Format: `"triggerPos scrollerPos"` |
| `end` | Default `"bottom top"`. Use `endTrigger` for different element |
| `endTrigger` | Element for end when different from trigger |
| `scrub` | `true` = direct link, number = seconds to "catch up" |
| `toggleActions` | 4 actions: onEnter, onLeave, onEnterBack, onLeaveBack. Each: play/pause/resume/reset/restart/complete/reverse/none |
| `pin` | Pin element while active. Don't animate pinned element itself |
| `pinSpacing` | Default `true` (adds spacer). `false` or `"margin"` |
| `horizontal` | `true` for horizontal scroll |
| `scroller` | Scroll container (default: viewport) |
| `markers` | Dev only. Remove in production |
| `once` | Kill after end reached once |
| `id` | For `ScrollTrigger.getById(id)` |
| `snap` | `0.25` (increment), array, `"labels"`, or object |
| `containerAnimation` | Tie to horizontal tween/timeline for fake horizontal scroll |
| `onEnter`, `onLeave`, `onEnterBack`, `onLeaveBack` | Callbacks receive instance |
| `onUpdate`, `onToggle`, `onRefresh` | Progress/active/recalc callbacks |

### Standalone (no linked animation)

```js
ScrollTrigger.create({
  trigger: "#id",
  start: "top top",
  end: "+=500",
  onUpdate: (self) => console.log(self.progress, self.direction)
});
```

### ScrollTrigger.batch()

```js
ScrollTrigger.batch(".box", {
  onEnter: (elements, triggers) => {
    gsap.to(elements, { opacity: 1, y: 0, stagger: 0.15 });
  },
  interval: 0.1,
  batchMax: 4,
  start: "top 80%",
  end: "bottom 20%"
});
```

### Timeline + ScrollTrigger

```js
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".container",
    start: "top top",
    end: "+=2000",
    scrub: 1,
    pin: true
  }
});
tl.to(".a", { x: 100 }).to(".b", { y: 50 });
```

### Horizontal Scroll (containerAnimation)

```js
// ease: "none" is REQUIRED
const scrollTween = gsap.to(scrollingEl, {
  xPercent: () => Math.max(0, window.innerWidth - scrollingEl.offsetWidth),
  ease: "none",
  scrollTrigger: {
    trigger: scrollingEl,
    pin: scrollingEl.parentNode,
    start: "top top",
    end: "+=1000",
    scrub: true
  }
});

// Other tweens triggered by horizontal movement
gsap.to(".nested-el", {
  y: 100,
  scrollTrigger: {
    containerAnimation: scrollTween,  // reference the horizontal tween
    trigger: ".nested-wrapper",
    start: "left center",
    toggleActions: "play none none reset"
  }
});
```

### ScrollTrigger.scrollerProxy()

For integrating third-party smooth-scroll libraries:

```js
ScrollTrigger.scrollerProxy(document.body, {
  scrollTop(value) {
    if (arguments.length) smoothScroller.scrollTop = value;
    return smoothScroller.scrollTop;
  },
  getBoundingClientRect() {
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  }
});
smoothScroller.addListener(ScrollTrigger.update);
```

### Cleanup

```js
ScrollTrigger.refresh();       // after DOM/layout changes
ScrollTrigger.getAll().forEach(t => t.kill());
ScrollTrigger.getById("my-id")?.kill();
```

### Do Not

- ❌ Put ScrollTrigger on a child tween inside a timeline. Put it on the timeline only
- ❌ Nest ScrollTriggered animations inside a parent timeline
- ❌ Use `scrub` AND `toggleActions` together (scrub wins)
- ❌ Use ease other than `"none"` on containerAnimation horizontal tween
- ❌ Leave `markers: true` in production
- ❌ Forget `registerPlugin(ScrollTrigger)`

---

## 4. Plugins

### Registration

```js
gsap.registerPlugin(ScrollTrigger, Flip, Draggable, SplitText);
```

### Flip (layout transitions)

```js
const state = Flip.getState(".item");
// change DOM (reorder, add/remove, classes)
Flip.from(state, { duration: 0.5, ease: "power2.inOut" });
```

### Draggable + Inertia

```js
Draggable.create(".box", {
  type: "x,y",
  bounds: "#container",
  inertia: true      // requires InertiaPlugin
});
```

### Observer

```js
Observer.create({
  target: "#area",
  onUp: () => {}, onDown: () => {},
  onLeft: () => {}, onRight: () => {},
  tolerance: 10
});
```

### SplitText

```js
const split = SplitText.create(".heading", { type: "words, chars" });
gsap.from(split.chars, { opacity: 0, y: 20, stagger: 0.03, duration: 0.4 });

// With autoSplit + onSplit (v3.13+)
SplitText.create(".split", {
  type: "lines",
  autoSplit: true,
  onSplit(self) {
    return gsap.from(self.lines, { y: 100, opacity: 0, stagger: 0.05 });
  }
});
```

### DrawSVG

```js
gsap.from("#path", { duration: 1, drawSVG: 0 });                    // 0 → full
gsap.fromTo("#path", { drawSVG: "0% 0%" }, { drawSVG: "0% 100%" }); // explicit
gsap.to("#path", { drawSVG: "20% 80%" });                            // middle segment
```

### MorphSVG

```js
gsap.to("#diamond", {
  duration: 1,
  morphSVG: { shape: "#lightning", type: "rotational", shapeIndex: 2 }
});
```

### MotionPath

```js
gsap.to(".dot", {
  duration: 2,
  motionPath: { path: "#path", align: "#path", alignOrigin: [0.5, 0.5] }
});
```

### ScrollToPlugin

```js
gsap.to(window, { duration: 1, scrollTo: { y: 500 } });
gsap.to(window, { duration: 1, scrollTo: { y: "#section", offsetY: 50 } });
```

### ScrollSmoother

DOM structure required:
```html
<div id="smooth-wrapper">
  <div id="smooth-content">
    <!-- ALL content here -->
  </div>
</div>
<!-- position: fixed elements go outside -->
```

### GSDevTools (dev only)

```js
GSDevTools.create({ animation: tl });
```

---

## 5. GSAP x React

### Preferred: useGSAP() hook

```js
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);  // register once

function Component() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.to(".box", { x: 100 });
    gsap.from(".item", { autoAlpha: 0, stagger: 0.1 });
  }, { scope: containerRef });

  return <div ref={containerRef}>...</div>;
}
```

### With dependencies + revertOnUpdate

```js
useGSAP(() => {
  gsap.to(".box", { x: endX });
}, {
  dependencies: [endX],
  scope: container,
  revertOnUpdate: true    // revert + re-run when deps change
});
```

### Alternative: gsap.context() in useEffect

```js
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.to(".box", { x: 100 });
  }, containerRef);
  return () => ctx.revert();  // ALWAYS cleanup
}, []);
```

### contextSafe (for event handlers outside useGSAP)

```js
useGSAP((context, contextSafe) => {
  const onClick = contextSafe(() => {
    gsap.to(goodRef.current, { rotation: 180 });
  });
  goodRef.current.addEventListener('click', onClick);
  return () => goodRef.current.removeEventListener('click', onClick);
}, { scope: container });
```

### SSR Safety (Next.js)

```js
// All GSAP code runs only on client via useGSAP or useEffect
// Dynamic import is an option:
const gsap = (await import("gsap")).gsap;
```

---

## 6. gsap.utils

### Function form: omit the value argument to get a reusable function

```js
// Immediate: returns result
gsap.utils.clamp(0, 100, 150);     // 100

// Function form: returns a function
let clamp = gsap.utils.clamp(0, 100);
clamp(150);   // 100
clamp(-10);   // 0
```

### clamp

```js
gsap.utils.clamp(0, 100, 200);  // 100
```

### mapRange

```js
gsap.utils.mapRange(0, 100, 0, 500, 50);   // 250
gsap.utils.mapRange(0, 1, 0, 360, 0.5);    // 180
```

### normalize

```js
gsap.utils.normalize(0, 100, 50);   // 0.5
```

### interpolate

```js
gsap.utils.interpolate(0, 100, 0.5);              // 50 (number)
gsap.utils.interpolate("#ff0000", "#0000ff", 0.5); // mid color
gsap.utils.interpolate({ x: 0 }, { x: 100 }, 0.5); // { x: 50 }
```

### random

```js
gsap.utils.random(-100, 100);         // random number
gsap.utils.random(0, 500, 5);         // snap to 5
gsap.utils.random(-200, 500, 10, true); // function form
gsap.utils.random(["red", "blue"]);   // pick from array

// String form in tween vars:
gsap.to(".box", { x: "random(-100, 100, 5)" });
gsap.to(".item", { backgroundColor: "random([red, blue, green])" });
```

### snap

```js
gsap.utils.snap(10, 23);               // 20
gsap.utils.snap([0, 100, 200], 150);  // 100 or 200

// In tween:
gsap.to(".x", { x: 200, snap: { x: 20 } });
```

### distribute

```js
gsap.to(".class", {
  scale: gsap.utils.distribute({
    base: 0.5,
    amount: 2.5,
    from: "center"
  })
});
```

### Others

```js
gsap.utils.shuffle([1, 2, 3, 4]);     // shuffled copy
gsap.utils.getUnit("100px");           // "px"
gsap.utils.unitize(100, "px");         // "100px"
gsap.utils.selector(containerRef);     // scoped selector function
gsap.utils.toArray(".item");           // NodeList → Array
gsap.utils.pipe(normalize, snap);      // compose functions
gsap.utils.wrap(0, 360, 370);          // 10 (wrap around)
gsap.utils.wrapYoyo(0, 100, 150);      // 50 (bounce back)
gsap.utils.splitColor("red");          // [255, 0, 0]
```

### quickTo (performance)

```js
let xTo = gsap.quickTo("#id", "x", { duration: 0.4, ease: "power3" });
document.addEventListener("mousemove", (e) => xTo(e.pageX));
```

---

## 7. Vue / Svelte / Other Frameworks

### Vue 3

```js
const container = ref(null);
let ctx;

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.to(".box", { x: 100 });
  }, container.value);
});

onUnmounted(() => {
  ctx?.revert();
});
```

### Svelte

```js
let container;
onMount(() => {
  const ctx = gsap.context(() => {
    gsap.to(".box", { x: 100 });
  }, container);
  return () => ctx.revert();
});
```

---

## 8. Performance

- ✅ Animate `transform` (`x`, `y`, `scale`, `rotation`) and `opacity` only
- ❌ Avoid `width`, `height`, `top`, `left`, `margin`, `padding`
- ✅ Use `will-change: transform` on elements that animate
- ✅ Use `stagger` instead of many separate tweens
- ✅ Use `gsap.quickTo()` for frequently updated props (mouse followers)
- ✅ Clean up off-screen animations
- ❌ Don't set `will-change` or `force3D` everywhere "just in case"
