import { useState, useEffect } from "react";
import MediaCard from "../components/MediaCard";
import { tmdbFetch } from "../utils/api";
import { useTranslate } from "../utils/i18n";

export default function BrowsePage({ genre, apiKey, onSelect, watched, onMarkWatched, onMarkUnwatched }) {
  const t = useTranslate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!apiKey || !genre) return;
    let cancelled = false;
    setLoading(true);
    const endpoint =
      genre.type === "tv"
        ? `/discover/tv?with_genres=${genre.id}&sort_by=popularity.desc&page=${page}`
        : `/discover/movie?with_genres=${genre.id}&sort_by=popularity.desc&page=${page}`;
    tmdbFetch(endpoint, apiKey)
      .then((data) => {
        if (cancelled) return;
        const results = (data.results || []).map((item) => ({
          ...item,
          media_type: genre.type,
        }));
        setItems(page === 1 ? results : (prev) => [...prev, ...results]);
        setTotalPages(data.total_pages || 1);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiKey, genre?.id, genre?.type, page]);

  if (!genre) {
    return (
      <div className="section" style={{ paddingTop: 100, textAlign: "center", color: "var(--text3)" }}>
        {t("browse.selectCategory")}
      </div>
    );
  }

  const loadMore = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  return (
    <div>
      <div className="section" style={{ paddingTop: 100 }}>
        <div className="section-title">
          {genre.name}
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text3)", fontFamily: "var(--font-body)", marginLeft: 12 }}>
            {genre.type === "tv" ? t("browse.tvSeries") : t("browse.movies")}
          </span>
        </div>
        {loading && items.length === 0 ? (
          <div className="loader"><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text3)" }}>
            {t("browse.noResults")}
          </div>
        ) : (
          <>
            <div className="cards-grid">
              {items.map((item) => {
                const type = genre.type;
                const rk = `${type}_${item.id}`;
                return (
                  <MediaCard
                    key={`${type}_${item.id}`}
                    item={{ ...item, media_type: type }}
                    onClick={() => onSelect(item)}
                    progress={0}
                    watched={watched}
                    onMarkWatched={onMarkWatched}
                    onMarkUnwatched={onMarkUnwatched}
                  />
                );
              })}
            </div>
            {page < totalPages && (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                <button
                  className="btn btn-secondary"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? t("common.loading") : t("common.loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
