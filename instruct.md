 You're working on /d D:\Docs\SineX (a streaming app called SineX — Electron + React + Vite). The user has reported that the Movie/TV detail pages have broken/poorly organized layouts on mobile devices and wants the .detail-poster, .detail-title, .genres, .detail-meta, and .age-rating-pill elements to be reorganized to be more responsive. The user is OK with hiding some elements on certain device sizes if needed.

Where to look:

D:\Docs\SineX\SineX\src\styles\global.css (lines 4795-5198) — the responsive CSS section I just added
D:\Docs\SineX\SineX\src\pages\MoviePage.jsx (lines 695-790) — Movie detail page JSX
D:\Docs\SineX\SineX\src\pages\TVPage.jsx (lines 1500-1620) — TV detail page JSX
Current detail page HTML structure (identical in both files):

<div className="detail-content">     // flex row, 40px gap, 48px padding, align-items: center
  <div className="detail-poster">     // 200px wide, 2:3 aspect ratio
    <img />
  </div>
  <div className="detail-info">       // flex: 1
    <div className="detail-type" />
    <div className="detail-title" />  // 56px font
    <div className="genres">          // wraps with gap: 6px
      <span className="genre-tag" />
    </div>
    <div className="detail-meta">     // flex-wrap, gap: 16px
      <span className="detail-rating" />
      <span>{year}</span>
      <span>{runtime}</span>
    </div>
    {d.tagline && <div className="detail-tagline" />}
    <div className="age-rating-pill">  // rounded pill with icon + cert + label
      <Icon />
      <span className="age-rating-pill-cert" />
      <span className="age-rating-pill-label" />
    </div>
    <div className="detail-overview-wrap">
      <p className="detail-overview" />
      <button className="overview-more-btn" />
    </div>
    <div className="detail-actions">
      <button className="btn" />
    </div>
  </div>
</div>
What I already did (existing breakpoints to refine):

Fixed ep-downloaded-badge inline style bug in TVPage.jsx:2430 (removed padding: 12px 20px and borderRadius: 8 overrides that were making the 16x16 circular badge huge)
Added @media (max-width: 1024px) for tablets
Added detail page styles inside existing @media (max-width: 768px) media query:
.detail-hero → height: auto
.detail-content → flex-direction: column; padding: 16px
.detail-poster → width: 120px
.detail-title → font-size: 28px
.hero-title → font-size: 36px
Sections padding → 16px
Grids → single column
Your task: Reorganize .detail-poster, .detail-title, .genres, .detail-meta, .age-rating-pill for better responsiveness. The current mobile flow stacks poster on top, then all the info — but the user wants this smarter. Consider:

Use CSS order on flex children to rearrange layout on mobile (e.g., title first, then poster + meta side-by-side, then buttons)
Hide elements on tiny screens (< 480px) — poster is a candidate since the backdrop is already visible, tagline is decorative, age-rating-pill-label text could disappear leaving just the cert badge
Make .genres horizontally scrollable on mobile instead of wrapping
Add a new @media (max-width: 480px) breakpoint for very small phones
Make .age-rating-pill inline with .detail-meta on mobile (move it into the meta row visually) — this might require wrapping both in a flex container or using order to position the pill after the meta row
Refine the 768px breakpoint — currently .detail-poster is 120px which is too big for phones
Constraints:

Do NOT modify the JSX structure in MoviePage.jsx or TVPage.jsx — only CSS changes (use order, display: none, flex, order properties to reorganize)
The 5 target elements must remain in the DOM (don't remove them from JSX) — use CSS to hide/restyle
Do NOT add comments to the code
Run npm run dev (or check the file) to verify visually
Key CSS classes to use:

.detail-content — the flex container (use flex-direction + align-items + gap)
.detail-poster — order + width + display
.detail-info — order to control position
.detail-title — font-size, line-height
.genres — flex-wrap, overflow-x, gap
.genre-tag — white-space, flex-shrink
.detail-meta — gap, font-size, flex-wrap
.age-rating-pill — padding, font-size, display
.age-rating-pill-label — display: none candidate
.detail-tagline — display: none candidate
Final goal: On a 360px phone screen, the detail page should look clean — title is prominent, meta info is compact, genres don't wrap awkwardly, and the page doesn't feel cramped. The poster can be small or hidden on very small screens.