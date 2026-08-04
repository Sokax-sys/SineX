import { pushError } from "./errorLog";

const DEFAULT_TMDB_BASE = "https://api.themoviedb.org/3";

export function getTmdbBase() {
  try {
    const raw = localStorage.getItem("sinex_tmdbBase");
    return raw ? JSON.parse(raw) : DEFAULT_TMDB_BASE;
  } catch {
    return DEFAULT_TMDB_BASE;
  }
}

const TMDB_BASE = getTmdbBase();
const IMG_BASE = "https://image.tmdb.org/t/p";
export const DEFAULT_API_KEY =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0ODhiYTY3NzUwMmUzODQ3YmVmYTJkZjc0ZmQ1YTNmNCIsIm5iZiI6MTc3OTQ0MDM5Ny41ODA5OTk5LCJzdWIiOiI2YTEwMWIwZDhlZmM4MmE3MDlhMzQ4NjAiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.iKKyEvTXs0KNi-rCkaXQf3OYr38h-iu7_DZBdGU616M";

// ── TMDB metadata language ────────────────────────────────────────────────────
// Read lazily from localStorage so it always reflects the current setting.
// Falls back to "en-US".
function getTmdbLanguage() {
  try {
    const raw = localStorage.getItem("sinex_tmdbLang");
    return raw ? JSON.parse(raw) : "en-US";
  } catch {
    return "en-US";
  }
}

// Append the language query param to a TMDB path.
function withLanguage(path) {
  const lang = getTmdbLanguage();
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}language=${lang}`;
}

export const imgUrl = (path, size = "w500") =>
  path ? `${IMG_BASE}/${size}${path}` : null;

// Global auth-error callback, registered by App on mount
let _onAuthError = null;
let _onUnreachable = null;
export const setApiErrorHandlers = (onAuth, onUnreachable) => {
  _onAuthError = onAuth;
  _onUnreachable = onUnreachable;
};

// ── In-memory TMDB response cache (session-scoped, cleared on page reload) ───
// Avoids redundant network calls when navigating back to the same show.
// TTL: 5 minutes
const _tmdbCache = new Map(); // key → { data, expiresAt }
const TMDB_CACHE_TTL = 5 * 60 * 1000;

/** Clears the in-memory TMDB cache and the persisted trending cache.
 * Calling this when the metadata language changes. */
export function clearTmdbCache() {
  _tmdbCache.clear();
  try {
    localStorage.removeItem("sinex_trendingCache");
  } catch {}
}

// ── Request queue (max 4 concurrent TMDB fetches) ────────────────────────────
// Prevents bursts of 10-20 parallel requests from carousel/similar-rows rapid
// navigation from hammering the API and triggering rate-limit responses.
let _inflight = 0;
const MAX_INFLIGHT = 4;
const _waiters = [];

function _acquireSlot() {
  if (_inflight < MAX_INFLIGHT) {
    _inflight++;
    return Promise.resolve();
  }
  return new Promise((resolve) => _waiters.push(resolve));
}

function _releaseSlot() {
  _inflight--;
  if (_waiters.length > 0) {
    _inflight++;
    _waiters.shift()();
  }
}

// Extract the raw API key from the JWT Bearer token (second base64 segment)
function extractApiKey(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return payload.aud || payload.sub || "";
  } catch { return ""; }
}

export const tmdbFetch = async (path, apiKey, options = {}) => {
  const localizedPath = options.noLang ? path : withLanguage(path);
  const cacheKey = `${apiKey}|${localizedPath}`;
  const cached = _tmdbCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  await _acquireSlot();

  let res;
  let err = null;
  try {
    const base = getTmdbBase();
    const rawKey = extractApiKey(apiKey);
    const url = `${base}${localizedPath}`;
    const proxiedUrl = rawKey
      ? `${url}${localizedPath.includes("?") ? "&" : "?"}api_key=${rawKey}`
      : url;
    const headers = { Authorization: `Bearer ${apiKey}` };
    if (typeof window !== "undefined" && window.__TAURI__) {
      // Strategy 1: PC proxy via WebView fetch (ADB reverse port 9900)
      try {
        const pcUrl = `http://127.0.0.1:9900/tmdb${localizedPath}${localizedPath.includes("?") ? "&" : "?"}api_key=${rawKey}`;
        const pcRes = await fetch(pcUrl, { signal: AbortSignal.timeout(10000) });
        if (pcRes.ok) {
          _releaseSlot();
          const data = await pcRes.json();
          _tmdbCache.set(cacheKey, { data, expiresAt: Date.now() + TMDB_CACHE_TTL });
          if (_tmdbCache.size > 80) {
            const now = Date.now();
            for (const [k, v] of _tmdbCache) {
              if (now >= v.expiresAt) _tmdbCache.delete(k);
            }
          }
          return data;
        }
        const pcBody = await pcRes.text().catch(() => "(no body)");
        pushError("tmdbFetch (pcproxy status)", `${pcRes.status} ${pcRes.statusText} | ${pcBody.slice(0, 200)}`);
      } catch (pcErr) {
        const detail = pcErr?.message || String(pcErr);
        pushError("tmdbFetch (pcproxy)", detail);
        try { pushError("tmdbFetch (pcproxy full)", JSON.stringify(Object.getOwnPropertyNames(pcErr).map(k=>k+':'+pcErr[k]))); } catch(e) {}
        try { await fetch("http://127.0.0.1:9900/logs", { signal: AbortSignal.timeout(3000) }).then(r => r.text()).then(t => pushError("pcproxy health", t)).catch(e => pushError("pcproxy health err", e.message)); } catch(e) {}
      }
      // Strategy 2: Rust invoke proxy (DoH + direct connection)
      const invoke = window.__TAURI__.core?.invoke || window.__TAURI__.invoke;
      if (invoke) {
        try {
          const body = await invoke("tmdb_proxy", {
            url: proxiedUrl,
            headers: [],
          });
          _releaseSlot();
          const data = JSON.parse(body);
          _tmdbCache.set(cacheKey, { data, expiresAt: Date.now() + TMDB_CACHE_TTL });
          if (_tmdbCache.size > 80) {
            const now = Date.now();
            for (const [k, v] of _tmdbCache) {
              if (now >= v.expiresAt) _tmdbCache.delete(k);
            }
          }
          return data;
        } catch (proxyErr) {
          pushError("tmdbFetch (proxy)", proxyErr?.message || proxyErr, proxyErr?.stack);
          console.error("tmdbFetch (proxy) error:", proxyErr);
          err = proxyErr;
        }
      } else {
        console.warn("tmdbFetch: __TAURI__ found but no invoke function");
      }
    }
    res = await fetch(url, { headers, signal: options.signal });
  } catch (e) {
    _releaseSlot();
    if (e?.name === "AbortError") throw e;
    pushError("tmdbFetch (fetch)", e?.message || e, e?.stack);
    console.error("tmdbFetch (fetch) error:", e);
    _onUnreachable?.();
    throw new Error("TMDB unreachable");
  }

  _releaseSlot();

  if (res.status === 401 || res.status === 403) {
    _onAuthError?.();
    throw new Error(`TMDB ${res.status}`);
  }

  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  _tmdbCache.set(cacheKey, { data, expiresAt: Date.now() + TMDB_CACHE_TTL });

  // Evict stale entries to prevent unbounded memory growth
  if (_tmdbCache.size > 80) {
    const now = Date.now();
    for (const [k, v] of _tmdbCache) {
      if (now >= v.expiresAt) _tmdbCache.delete(k);
    }
  }

  return data;
};

// ── Player Sources ────────────────────────────────────────────────────────────
// supportsProgress: true = executeJavaScript tracking works for this source
export const PLAYER_SOURCES = [
  {
    id: "videasy",
    label: "Videasy",
    tag: null,
    note: null,
    supportsProgress: true,
    movieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://player.videasy.net/tv/${id}/${season}/${ep}`,
  },
  {
    id: "vidsrc",
    label: "VidSrc",
    tag: null,
    note: null,
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://vidsrc.to/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "2embed",
    label: "2Embed",
    tag: null,
    note: "unstable",
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://www.2embed.online/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://www.2embed.online/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "superembed",
    label: "SuperEmbed",
    tag: null,
    note: "customizable",
    usesImdb: true,
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://getsuperembed.link/?video_id=${id}`,
    tvUrl: (id, season, ep) =>
      `https://getsuperembed.link/?video_id=${id}&season=${season}&episode=${ep}`,
  },
  {
    id: "fsapi",
    label: "FSAPI",
    tag: null,
    note: null,
    usesImdb: true,
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://fsapi.xyz/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://fsapi.xyz/tv/${id}/${season}/${ep}`,
  },
  {
    id: "curtstream",
    label: "CurtStream",
    tag: null,
    note: null,
    usesImdb: true,
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://curtstream.com/movies/imdb/${id}`,
    tvUrl: (id, season, ep) =>
      `https://curtstream.com/tv/imdb/${id}/${season}/${ep}`,
  },
  {
    id: "moviewp",
    label: "MovieWP",
    tag: null,
    note: null,
    usesImdb: true,
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://moviewp.com/se.php?video_id=${id}`,
    tvUrl: (id, season, ep) =>
      `https://moviewp.com/se.php?video_id=${id}&season=${season}&ep=${ep}`,
  },
  {
    id: "vidcloud",
    label: "VidCloud",
    tag: null,
    note: null,
    usesImdb: true,
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://vidcloud.stream/${id}.html`,
    tvUrl: (id, season, ep) =>
      `https://vidcloud.stream/${id}.html?season=${season}&episode=${ep}`,
  },
  {
    id: "123embed",
    label: "123Embed",
    tag: null,
    note: "subs available",
    usesImdb: true,
    supportsProgress: true,
    progressViaFrames: true,
    movieUrl: (id) => `https://play.123embed.net/mv/${id}`,
    tvUrl: (id, season, ep) =>
      `https://play.123embed.net/tv/${id}/${season}/${ep}`,
  },
  {
    id: "allmanga",
    label: "AllManga",
    tag: "ANIME",
    note: null,
    supportsProgress: true,
    async: true,
    movieUrl: (_id) => "https://allmanga.to",
    tvUrl: (_id, _season, _ep) => "https://allmanga.to",
  },
];

export const getSourceUrl = (sourceId, type, id, season, ep, imdbId) => {
  const src =
    PLAYER_SOURCES.find((s) => s.id === sourceId) ?? PLAYER_SOURCES[0];
  const finalId = src.usesImdb && imdbId ? imdbId : id;
  return type === "movie" ? src.movieUrl(finalId) : src.tvUrl(finalId, season, ep);
};

export const sourceSupportsProgress = (sourceId) =>
  PLAYER_SOURCES.find((s) => s.id === sourceId)?.supportsProgress ?? false;

export const sourceProgressViaFrames = (sourceId) =>
  PLAYER_SOURCES.find((s) => s.id === sourceId)?.progressViaFrames ?? false;

export const sourceIsAsync = (sourceId) =>
  PLAYER_SOURCES.find((s) => s.id === sourceId)?.async ?? false;

// Sources that require a transparent webRequest intercept to load properly
export const NEEDS_INTERCEPT = ["vidsrc", "2embed", "superembed", "fsapi", "curtstream", "moviewp", "vidcloud", "123embed"];

// Fallback order when a source fails to load
export const SOURCE_FALLBACK_ORDER = ["vidsrc", "2embed", "superembed", "fsapi", "curtstream", "moviewp", "vidcloud", "123embed", "videasy", "allmanga"];

export const getNextSource = (currentSourceId) => {
  const idx = SOURCE_FALLBACK_ORDER.indexOf(currentSourceId);
  const nextId =
    idx !== -1 && idx < SOURCE_FALLBACK_ORDER.length - 1
      ? SOURCE_FALLBACK_ORDER[idx + 1]
      : SOURCE_FALLBACK_ORDER[0];
  return PLAYER_SOURCES.find((s) => s.id === nextId) ?? PLAYER_SOURCES[0];
};

// ── AniList API (anime metadata) ──────────────────────────────────────────────
const ANILIST_API = "https://graphql.anilist.co";

// Strip "(Source: ...)", "Note: ..." and similar attribution lines from AniList descriptions
export const cleanAnilistDescription = (desc) => {
  if (!desc) return desc;
  // Remove HTML by stripping all < and > characters and anything between them.
  // Splitting on < and dropping the tag portion of each chunk is immune to
  // unclosed/malformed tags and avoids any regex that starts with "<" (which
  // static analysers flag as potentially incomplete).
  let clean = desc
    .split("<")
    .map((chunk, i) => (i === 0 ? chunk : chunk.slice(chunk.indexOf(">") + 1)))
    .join("")
    .replace(/>/g, "");
  // Remove everything from "(Source:" onwards (including multi-line variants)
  clean = clean.replace(/\(Source:[^)]*\)/gi, "");
  // Remove "Note: ..." sentences/paragraphs at the end
  clean = clean.replace(/\bNote:[^\n]*/gi, "");
  // Remove trailing whitespace, newlines, punctuation left over
  clean = clean.replace(/[\s\n]+$/, "").trim();
  return clean;
};

const ANILIST_QUERY = `
query ($search: String, $type: MediaType) {
  Media(search: $search, type: $type, sort: SEARCH_MATCH) {
    id
    idMal
    title { romaji english native }
    description(asHtml: false)
    coverImage { extraLarge large }
    bannerImage
    genres
    averageScore
    episodes
    status
    season
    seasonYear
    studios(isMain: true) { nodes { name } }
    startDate { year month }
    relations {
      edges {
        relationType
        node {
          id
          type
          format
          title { romaji english }
          episodes
          startDate { year month }
          seasonYear
        }
      }
    }
  }
}`;

// ── AniList cache (localStorage + in-memory) ──────────────────────────────────
const ANILIST_CACHE_KEY = "sinex_anilistCache";
const ANILIST_CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

// loaded once on first use, flushed to localStorage on write.
let _anilistCache = null;

function getAnilistCache() {
  if (_anilistCache) return _anilistCache;
  try {
    const raw = localStorage.getItem(ANILIST_CACHE_KEY);
    _anilistCache = raw ? JSON.parse(raw) : {};
  } catch {
    _anilistCache = {};
  }
  // Evict stale entries once on load
  const now = Date.now();
  for (const key of Object.keys(_anilistCache)) {
    if (now - _anilistCache[key].ts > ANILIST_CACHE_TTL) {
      delete _anilistCache[key];
    }
  }
  return _anilistCache;
}

let _anilistFlushTimer = null;
function flushAnilistCache() {
  if (_anilistFlushTimer) clearTimeout(_anilistFlushTimer);
  _anilistFlushTimer = setTimeout(() => {
    _anilistFlushTimer = null;
    try {
      localStorage.setItem(ANILIST_CACHE_KEY, JSON.stringify(_anilistCache));
    } catch {}
  }, 500);
}

// tmdbId is used as the cache key (unique per show) while title is used for the AniList search query.
export const fetchAnilistData = async (
  title,
  type = "ANIME",
  tmdbId = null,
) => {
  const cacheKey = tmdbId
    ? `${type}__tmdb_${tmdbId}`
    : `${type}__${title.toLowerCase().trim()}`;

  const cache = getAnilistCache();
  const entry = cache[cacheKey];
  if (entry && Date.now() - entry.ts <= ANILIST_CACHE_TTL) {
    // Sanity-check: make sure cached data actually belongs to this title.
    const cachedTitles = [
      entry.data?.title?.romaji,
      entry.data?.title?.english,
      entry.data?.title?.native,
    ]
      .filter(Boolean)
      .map((t) => t.toLowerCase());
    const searchTitle = title.toLowerCase();
    const isMismatch =
      entry.data !== null &&
      cachedTitles.length > 0 &&
      !cachedTitles.some(
        (t) => t.includes(searchTitle) || searchTitle.includes(t),
      );
    if (!isMismatch) return entry.data;
    // Mismatch detected
    delete cache[cacheKey];
    flushAnilistCache();
  }

  try {
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: { search: title, type },
      }),
    });
    const json = await res.json();
    const data = json?.data?.Media || null;

    cache[cacheKey] = { data, ts: Date.now() };
    flushAnilistCache();

    return data;
  } catch {
    if (entry) return entry.data;
    return null;
  }
};

/**
 * Build an ordered list of seasons from AniList data.
 * AniList represents each season of a series as a separate Media entry
 * linked by SEQUEL/PREQUEL relations. This function walks the SEQUEL chain
 * starting from the fetched entry and returns seasons sorted by air date.
 *
 * Returns: [{ seasonNum, title, episodes, year, month }]
 */
export const buildAnilistSeasons = (anilistData) => {
  if (!anilistData) return null;

  const main = {
    id: anilistData.id,
    title:
      anilistData.title?.english ||
      anilistData.title?.romaji ||
      anilistData.title?.native,
    episodes: anilistData.episodes || null,
    year: anilistData.startDate?.year || anilistData.seasonYear || 9999,
    month: anilistData.startDate?.month || 0,
  };

  // Collect direct TV-format sequels from relations
  const sequels = (anilistData.relations?.edges || [])
    .filter(
      (e) =>
        e.relationType === "SEQUEL" &&
        e.node.type === "ANIME" &&
        (e.node.format === "TV" || e.node.format === "TV_SHORT"),
    )
    .map((e) => ({
      id: e.node.id,
      title: e.node.title?.english || e.node.title?.romaji,
      episodes: e.node.episodes || null,
      year: e.node.startDate?.year || e.node.seasonYear || 9999,
      month: e.node.startDate?.month || 0,
    }));

  const all = [main, ...sequels].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  return all.map((s, i) => ({ seasonNum: i + 1, ...s }));
};

// TMDB genre ID 16 = Animation. Treat it as anime when origin_country includes JP or language is jp
export const isAnimeContent = (item, details) => {
  const d = details || item;
  const lang = d.original_language;
  const countries = d.origin_country || [];
  const genreIds = d.genre_ids || (d.genres || []).map((g) => g.id);
  const hasAnimation = genreIds.includes(16);
  return hasAnimation && (lang === "ja" || countries.includes("JP"));
};

// Default sources
export const ANIME_DEFAULT_SOURCE = "allmanga";
export const NON_ANIME_DEFAULT_SOURCE = "vidsrc";

// ── Episode Group fetch (localStorage + in-memory cache, 7-day TTL) ─────────
// Episode groups almost never change -> cache aggressively across sessions.
const EG_CACHE_KEY = "sinex_episodeGroupCache";
const EG_CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

let _egCache = null;

function getEgCache() {
  if (_egCache) return _egCache;
  try {
    const raw = localStorage.getItem(EG_CACHE_KEY);
    _egCache = raw ? JSON.parse(raw) : {};
  } catch {
    _egCache = {};
  }
  // Evict stale entries once on load
  const now = Date.now();
  for (const key of Object.keys(_egCache)) {
    if (now - _egCache[key].ts > EG_CACHE_TTL) delete _egCache[key];
  }
  return _egCache;
}

let _egFlushTimer = null;
function flushEgCache() {
  if (_egFlushTimer) clearTimeout(_egFlushTimer);
  _egFlushTimer = setTimeout(() => {
    _egFlushTimer = null;
    try {
      localStorage.setItem(EG_CACHE_KEY, JSON.stringify(_egCache));
    } catch {}
  }, 500);
}

export const fetchEpisodeGroup = async (groupId, apiKey) => {
  const cache = getEgCache();
  const entry = cache[groupId];
  if (entry && Date.now() - entry.ts <= EG_CACHE_TTL) return entry.data;

  const data = await tmdbFetch(`/tv/episode_group/${groupId}`, apiKey);
  cache[groupId] = { data, ts: Date.now() };
  flushEgCache();
  return data;
};

// ── KinoCheck API (hero-trailer only, 1000 req/day) ──────────────────────────
const KINOCHECK_BASE = "https://api.kinocheck.com";

// Track daily request count in localStorage
const KC_COUNT_KEY = "sinex_kc_count";
const KC_DATE_KEY = "sinex_kc_date";
const KC_DAILY_LIMIT = 950; // leave headroom under the 1000/day cap

function kcDailyCount() {
  try {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(KC_DATE_KEY);
    if (storedDate !== today) {
      localStorage.setItem(KC_DATE_KEY, today);
      localStorage.setItem(KC_COUNT_KEY, "0");
      return 0;
    }
    return Number(localStorage.getItem(KC_COUNT_KEY)) || 0;
  } catch {
    return 0;
  }
}

function kcIncrementCount() {
  try {
    const c = kcDailyCount() + 1;
    localStorage.setItem(KC_COUNT_KEY, String(c));
  } catch {}
}

/**
 * Fetch a trailer YouTube ID from KinoCheck for the hero background.
 * Returns the YouTube video ID string, or null if unavailable / quota exhausted.
 * Only used for hero background — TrailerModal continues to use TMDB.
 */
export async function fetchKinoCheckTrailer(tmdbId, mediaType) {
  if (!tmdbId) return null;
  if (kcDailyCount() >= KC_DAILY_LIMIT) {
    console.warn(`[KinoCheck] QUOTA EXCEEDED (${kcDailyCount()}/${KC_DAILY_LIMIT}) — falling back to static images`);
    return null;
  }

  const endpoint = mediaType === "tv" ? "shows" : "movies";
  const url = `${KINOCHECK_BASE}/${endpoint}?tmdb_id=${tmdbId}&categories=Trailer&language=${getTmdbLanguage().split("-")[0]}`;

  try {
    const res = await fetch(url);
    kcIncrementCount();
    if (!res.ok) {
      console.warn(`[KinoCheck] HTTP ${res.status} for ${mediaType} ${tmdbId}`);
      return null;
    }
    const data = await res.json();
    const key = data?.trailer?.youtube_video_id || null;
    console.log(`[KinoCheck] ${mediaType} ${tmdbId} → ${key ? "youtube_id=" + key : "no trailer found"} (count: ${kcDailyCount()})`);
    return key;
  } catch (e) {
    console.warn(`[KinoCheck] Network error for ${mediaType} ${tmdbId}:`, e);
    return null;
  }
}
