import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import MediaCard from "../components/MediaCard";
import TrendingCarousel from "../components/TrendingCarousel";
import { PlayIcon, StarIcon } from "../components/Icons";
import { imgUrl, tmdbFetch, fetchKinoCheckTrailer } from "../utils/api";

import { useRatings, getRatingForItem } from "../utils/useRatings";
import { isRestricted } from "../utils/ageRating";
import { storage } from "../utils/storage";
import { loadHomeLayout, loadHomeViewMode } from "../utils/homeLayout";
import { useTranslate } from "../utils/i18n";

/**
 * Extract up to `count` unique, recently watched items from the user's
 * history (within the last 30 days).  Returns newest-first and dedupes
 * by TMDB id + media_type so we don't fire duplicate API calls.
 */
function getRecentHistoryItems(history, count = 5) {
  if (!history || history.length === 0) return [];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = history
    .filter((h) => h.watchedAt && h.watchedAt > thirtyDaysAgo)
    .sort((a, b) => b.watchedAt - a.watchedAt);

  const seen = new Set();
  const unique = [];
  for (const item of recent) {
    const key = `${item.media_type || "movie"}_${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= count) break;
  }
  return unique;
}

function HeroTrailer({ videoId, show }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [srcUrl, setSrcUrl] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    if (!videoId) { setSrcUrl(null); setAudioUrl(null); return; }
    let cancelled = false;
    window.electron.getVideoUrl(videoId).then((res) => {
      if (cancelled || !res) return;
      if (res.type === "separate") {
        setSrcUrl(res.videoUrl);
        setAudioUrl(res.audioUrl);
      } else {
        setSrcUrl(res.videoUrl);
        setAudioUrl(null);
      }
    });
    return () => { cancelled = true; };
  }, [videoId]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !srcUrl) return;
    el.src = srcUrl;
    if (show) el.play().catch(() => {});
  }, [srcUrl, show]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !srcUrl) return;
    if (show) el.play().catch(() => {});
    else el.pause();
  }, [show, srcUrl]);

  useEffect(() => {
    const a = audioRef.current;
    const v = videoRef.current;
    if (!a || !audioUrl || !v) return;
    a.src = audioUrl;
    const sync = () => {
      if (!a.paused) return;
      a.currentTime = v.currentTime;
      a.play().catch(() => {});
    };
    v.addEventListener("play", sync);
    v.addEventListener("seeking", sync);
    return () => {
      v.removeEventListener("play", sync);
      v.removeEventListener("seeking", sync);
    };
  }, [audioUrl]);

  return (
    <>
      <video
        ref={videoRef}
        className="hero-video-bg"
        muted
        loop
        playsInline
        preload="auto"
      />
      <audio ref={audioRef} muted={false} loop />
    </>
  );
}

function HomeHero({ trendingItems, recommendedItems, apiKey, onSelect, heroReady, getRating }) {
  const t = useTranslate();
  const [items, setItems] = useState(() => trendingItems);
  const [cursor, setCursor] = useState(0);
  const [trailerKey, setTrailerKey] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [hasCycled, setHasCycled] = useState(false);
  const timerRef = useRef(null);
  const initRef = useRef(false);

  const current = items[cursor];
  const total = items.length;
  const isTrending = !hasCycled;
  const hasPrev = cursor > 0 || (hasCycled && trendingItems.length > 0);
  const hasNext = cursor < total - 1 || (!hasCycled && recommendedItems.length > 0) || (hasCycled && total > 0);

  const goTo = useCallback((idx) => {
    setCursor(idx);
    setShowVideo(false);
    setTrailerKey(null);
  }, []);

  const goNext = () => {
    const next = cursor + 1;
    if (next < items.length) {
      goTo(next);
    } else if (!hasCycled && recommendedItems.length > 0) {
      setItems(recommendedItems);
      setCursor(0);
      setHasCycled(true);
      setShowVideo(false);
      setTrailerKey(null);
    } else {
      goTo(0);
    }
  };

  const goPrev = () => {
    if (cursor > 0) {
      goTo(cursor - 1);
    } else if (hasCycled && trendingItems.length > 0) {
      setItems(trendingItems);
      setCursor(trendingItems.length - 1);
      setHasCycled(false);
      setShowVideo(false);
      setTrailerKey(null);
    }
  };

  const advance = useRef(goNext);
  advance.current = goNext;

  useEffect(() => {
    if (!trendingItems?.length) return;
    setItems(trendingItems);
    setCursor(0);
    setShowVideo(false);
    setTrailerKey(null);
    setHasCycled(false);
  }, [trendingItems?.[0]?.id]);

  useEffect(() => {
    if (!current?.id) return;
    const type = current.media_type === "tv" ? "tv" : "movie";
    let cancelled = false;
    fetchKinoCheckTrailer(current.id, type).then((key) => {
      if (cancelled) return;
      console.log(`[HeroTrailer] ${current.title || current.name}: ${key ? "found key=" + key : "NO trailer (quota or unavailable)"}`);
      setTrailerKey(key || null);
    });
    return () => { cancelled = true; };
  }, [current?.id]);

  useEffect(() => {
    if (!heroReady) return;
    clearTimeout(timerRef.current);
    const delay = initRef.current ? (trailerKey ? 3000 : 5000) : 5000;
    initRef.current = true;
    timerRef.current = setTimeout(() => {
      if (trailerKey) {
        setShowVideo(true);
      } else {
        advance.current();
      }
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [cursor, trailerKey, heroReady]);

  useEffect(() => {
    if (!showVideo || !trailerKey) return;
    timerRef.current = setTimeout(() => advance.current(), 20000);
    return () => clearTimeout(timerRef.current);
  }, [showVideo, trailerKey]);

  const mediaType = current?.media_type === "tv" ? t("home.typeSeries") : t("home.typeMovie");
  const position = cursor + 1;
  const heroLabel = isTrending
    ? `#${position} ${t("home.ofTheWeek", { type: mediaType })}`
    : t("home.recommendedMedia", { type: mediaType });

  const heroRating = getRating ? getRating(current) : null;
  const ageCert = heroRating?.cert || null;

  const desc = current?.overview || "";
  const descLong = desc.length > 300;
  const displayDesc = descLong ? desc.slice(0, 300) + "…" : desc;

  if (!current) return null;

  const showTrailer = showVideo && trailerKey;

  return (
    <div className="hero hero--video" key={cursor}>
      <div
        className="hero-bg"
        style={{
          backgroundImage: `url(${imgUrl(current.backdrop_path, "original")})`,
          opacity: showTrailer ? 0 : 1,
        }}
      />
      {trailerKey && (
        <div
          className="hero-video-wrap"
          style={{ opacity: showVideo ? 1 : 0 }}
        >
          <HeroTrailer videoId={trailerKey} show={showVideo} />
          <div className="hero-video-overlay" />
        </div>
      )}
      <div className="hero-gradient" />
      <div className="hero-content" key={cursor}>
        <div className="hero-type">{heroLabel}</div>
        <div className="hero-title">{current.title || current.name}</div>
        <div className="hero-meta">
          <span className="hero-rating">
            <StarIcon /> {current.vote_average?.toFixed(1)}
          </span>
          <span>{current.release_date?.slice(0, 4)}</span>
        </div>
        <div className="hero-overview">{displayDesc}</div>
        <div className="hero-actions">
          <button
            className="btn btn-primary"
            onClick={() => onSelect(current)}
          >
            <PlayIcon /> {t("home.watchNow")}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onSelect(current)}
          >
            {t("home.moreInfo")}
          </button>
        </div>
      </div>
      {ageCert && (
        <div className="hero-age-rating">
          <span className="age-cert">{ageCert}</span>
          <span className="age-accent" />
        </div>
      )}

      {/* Navigation arrows */}
      <button
        className="hero-nav hero-nav--prev"
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        style={{
          position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
          zIndex: 10, background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%",
          width: 40, height: 40, cursor: hasPrev ? "pointer" : "default",
          opacity: hasPrev ? 0.8 : 0.2, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "opacity 0.2s, background 0.2s", color: "#fff",
        }}
        onMouseEnter={(e) => { if (hasPrev) e.currentTarget.style.background = "rgba(0,0,0,0.6)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.4)"; }}
        disabled={!hasPrev}
        aria-label="Previous"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <button
        className="hero-nav hero-nav--next"
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        style={{
          position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
          zIndex: 10, background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%",
          width: 40, height: 40, cursor: hasNext ? "pointer" : "default",
          opacity: hasNext ? 0.8 : 0.2, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "opacity 0.2s, background 0.2s", color: "#fff",
        }}
        onMouseEnter={(e) => { if (hasNext) e.currentTarget.style.background = "rgba(0,0,0,0.6)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.4)"; }}
        disabled={!hasNext}
        aria-label="Next"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>

      {/* Dot indicators */}
      <div
        style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 10, display: "flex", gap: 8, alignItems: "center",
        }}
      >
        {isTrending && trendingItems.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
            style={{
              width: i === cursor ? 24 : 8, height: 8, borderRadius: 4,
              border: "none", cursor: "pointer",
              background: i === cursor ? "var(--red)" : "rgba(255,255,255,0.35)",
              transition: "all 0.2s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomePage({
  trending,
  trendingTV,
  loading,
  onSelect,
  progress,
  inProgress,
  offline,
  onRetry,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  history,
  apiKey,
  heroReady,
}) {
  const t = useTranslate();
  const hero = trending[0];

  const [recommendedItems, setRecommendedItems] = useState([]);
  const [topRatedItems, setTopRatedItems] = useState([]);

  // Load layout config (order + visibility) once on mount
  const [layout] = useState(() => loadHomeLayout());
  const { order: rowOrder, visible: rowVisible } = layout;

  const [viewMode] = useState(() => loadHomeViewMode());

  // All items for batch ratings fetch
  const allItems = useMemo(
    () => [
      ...inProgress,
      ...trending.map((i) => ({ ...i, media_type: "movie" })),
      ...trendingTV.map((i) => ({ ...i, media_type: "tv" })),
      ...recommendedItems,
      ...topRatedItems,
    ],
    [inProgress, trending, trendingTV, recommendedItems, topRatedItems],
  );

  const { ratingsMap, ageLimitSetting } = useRatings(allItems);

  const getRating = useCallback(
    (item) => getRatingForItem(item, ratingsMap),
    [ratingsMap],
  );
  const itemRestricted = useCallback(
    (item) =>
      isRestricted(getRatingForItem(item, ratingsMap).minAge, ageLimitSetting),
    [ratingsMap, ageLimitSetting],
  );

  // Enrich ratingsMap with restricted flag for carousels
  const enrichedRatingsMap = useMemo(() => {
    const out = {};
    for (const [k, v] of Object.entries(ratingsMap)) {
      out[k] = { ...v, restricted: isRestricted(v.minAge, ageLimitSetting) };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingsMap, ageLimitSetting]);

  // Filter recommended items that exceed age limit setting
  const filteredRecommendedItems = useMemo(() => {
    return recommendedItems.filter((item) => !itemRestricted(item));
  }, [recommendedItems, itemRestricted]);

  // Fetch personalised recommendations from multiple recent history items
  useEffect(() => {
    if (!apiKey || offline || !history || history.length === 0) return;
    const sources = getRecentHistoryItems(history, 5);
    if (sources.length === 0) return;

    const controller = new AbortController();

    // Build a Set of already-watched TMDB ids for dedup
    const watchedIds = new Set(
      (history || []).map((h) => `${h.media_type || "movie"}_${h.id}`),
    );

    // For each source, try /recommendations first, fall back to /similar
    const fetches = sources.map((source) => {
      const type = source.media_type === "tv" ? "tv" : "movie";
      return tmdbFetch(
        `/${type}/${source.id}/recommendations`,
        apiKey,
        { signal: controller.signal },
      )
        .then((data) => {
          const results = (data.results || []).map((i) => ({
            ...i,
            media_type: type,
          }));
          if (results.length > 0) return results;
          // Fall back to /similar if /recommendations returned nothing
          return tmdbFetch(
            `/${type}/${source.id}/similar`,
            apiKey,
            { signal: controller.signal },
          ).then((d) =>
            (d.results || []).map((i) => ({ ...i, media_type: type })),
          );
        })
        .catch(() => []);
    });

    Promise.all(fetches)
      .then((arrays) => {
        // Interleave results from each source for variety
        const merged = [];
        const maxLen = Math.max(...arrays.map((a) => a.length));
        for (let i = 0; i < maxLen; i++) {
          for (const arr of arrays) {
            if (arr[i]) merged.push(arr[i]);
          }
        }

        // Deduplicate and filter out already-watched items
        const seen = new Set();
        const deduped = merged.filter((item) => {
          const key = `${item.media_type}_${item.id}`;
          if (seen.has(key) || watchedIds.has(key)) return false;
          seen.add(key);
          return true;
        });

        setRecommendedItems(deduped.slice(0, 20));
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          console.warn("Recommendations fetch failed", e);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, offline, history?.length]);

  // Fetch top rated movies + TV, merge and shuffle
  useEffect(() => {
    if (!apiKey || offline) return;
    const controller = new AbortController();
    Promise.all([
      tmdbFetch("/movie/top_rated?page=1", apiKey, {
        signal: controller.signal,
      }),
      tmdbFetch("/tv/top_rated?page=1", apiKey, { signal: controller.signal }),
    ])
      .then(([moviesData, tvData]) => {
        const movies = (moviesData.results || [])
          .slice(0, 8)
          .map((i) => ({ ...i, media_type: "movie" }));
        const tv = (tvData.results || [])
          .slice(0, 8)
          .map((i) => ({ ...i, media_type: "tv" }));
        // Interleave movies and TV for variety
        const merged = [];
        const max = Math.max(movies.length, tv.length);
        for (let i = 0; i < max; i++) {
          if (movies[i]) merged.push(movies[i]);
          if (tv[i]) merged.push(tv[i]);
        }
        setTopRatedItems(merged);
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.warn("Top rated fetch failed", e);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, offline]);

  // Stable pre-built item arrays for carousels, capped at 10
  const trendingMovieItems = useMemo(
    () => trending.slice(0, 10).map((i) => ({ ...i, media_type: "movie" })),
    [trending],
  );
  const trendingTVItems = useMemo(
    () => trendingTV.slice(0, 10).map((i) => ({ ...i, media_type: "tv" })),
    [trendingTV],
  );

  return (
    <div className="fade-in">
      {/* ── Offline ── */}
      {offline && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            gap: 16,
            color: "var(--text2)",
          }}
        >
          <div style={{ fontSize: 48 }}>📡</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>
            {t("home.noInternet")}
          </div>
          <div style={{ fontSize: 14, color: "var(--text3)" }}>
            {t("home.noInternetDesc")}
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={onRetry}
          >
            {t("home.retry")}
          </button>
        </div>
      )}

      {!offline && loading && (
        <div className="loader">
          <div className="spinner" />
        </div>
      )}

      {/* ── Hero (always first) ── */}
      {!loading && trendingMovieItems.length > 0 && <HomeHero
        trendingItems={trendingMovieItems}
        recommendedItems={filteredRecommendedItems}
        apiKey={apiKey}
        onSelect={onSelect}
        heroReady={heroReady}
        getRating={getRating}
      />}

      {/* ── Rows in user-configured order ── */}
      {rowOrder.map((id) => {
        if (!rowVisible[id]) return null;

        if (id === "continue") {
          if (inProgress.length === 0) return null;
          return (
            <div key="continue" className="section">
              <div className="section-title">{t("home.continueWatching")}</div>
              <div className="cards-grid">
                {inProgress.map((item) => {
                  const pk =
                    item.media_type === "movie"
                      ? `movie_${item.id}`
                      : `tv_${item.id}_s${item.season}e${item.episode}`;
                  const r = getRating(item);
                  const restr = itemRestricted(item);
                  return (
                    <MediaCard
                      key={`${item.media_type}_${item.id}`}
                      item={item}
                      onClick={() => onSelect(item)}
                      progress={progress[pk] || 0}
                      watched={watched}
                      onMarkWatched={onMarkWatched}
                      onMarkUnwatched={onMarkUnwatched}
                      ageRating={r.cert}
                      restricted={restr}
                    />
                  );
                })}
              </div>
            </div>
          );
        }

        // Render a section as a flat cards-grid (list view)
        const renderList = (key, title, titleHighlight, items) => {
          if (!items || items.length === 0) return null;
          return (
            <div key={key} className="section">
              <div className="section-title">
                {titleHighlight ? (
                  <>
                    {title}&nbsp;
                    <span style={{ color: "var(--red)" }}>
                      {titleHighlight}
                    </span>
                  </>
                ) : (
                  title
                )}
              </div>
              <div className="cards-grid">
                {items.map((item) => {
                  const type = item.media_type === "tv" ? "tv" : "movie";
                  const rk = `${type}_${item.id}`;
                  const rd = enrichedRatingsMap[rk] || {};
                  return (
                    <MediaCard
                      key={`${item.media_type}_${item.id}`}
                      item={item}
                      onClick={() => onSelect(item)}
                      progress={0}
                      watched={watched}
                      onMarkWatched={onMarkWatched}
                      onMarkUnwatched={onMarkUnwatched}
                      ageRating={rd.cert}
                      restricted={rd.restricted}
                    />
                  );
                })}
              </div>
            </div>
          );
        };

        if (id === "recommended") {
          if (filteredRecommendedItems.length === 0) return null;
          if (viewMode === "list")
            return renderList(
              "recommended",
              t("home.recommended"),
              null,
              filteredRecommendedItems,
            );
          return (
            <TrendingCarousel
              key="recommended"
              items={filteredRecommendedItems}
              title={t("home.recommended")}
              onSelect={onSelect}
              ratingsMap={enrichedRatingsMap}
            />
          );
        }

        if (id === "trendingMovies") {
          if (trendingMovieItems.length === 0) return null;
          if (viewMode === "list")
            return renderList(
              "trendingMovies",
              t("home.trendingMovies"),
              null,
              trendingMovieItems,
            );
          return (
            <TrendingCarousel
              key="trendingMovies"
              items={trendingMovieItems}
              title={t("home.trendingMovies")}
              onSelect={onSelect}
              ratingsMap={enrichedRatingsMap}
            />
          );
        }

        if (id === "trendingTV") {
          if (trendingTVItems.length === 0) return null;
          if (viewMode === "list")
            return renderList(
              "trendingTV",
              t("home.trendingSeries"),
              null,
              trendingTVItems,
            );
          return (
            <TrendingCarousel
              key="trendingTV"
              items={trendingTVItems}
              title={t("home.trendingSeries")}
              onSelect={onSelect}
              ratingsMap={enrichedRatingsMap}
            />
          );
        }

        if (id === "topRated") {
          if (topRatedItems.length === 0) return null;
          if (viewMode === "list")
            return renderList("topRated", t("home.topRated"), null, topRatedItems);
          return (
            <TrendingCarousel
              key="topRated"
              items={topRatedItems}
              title={t("home.topRated")}
              onSelect={onSelect}
              ratingsMap={enrichedRatingsMap}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
