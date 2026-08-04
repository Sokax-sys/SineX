import { useState, useRef, useEffect } from "react";
import { imgUrl } from "../utils/api";
import { useTranslate } from "../utils/i18n";
import {
  SineXLogo,
  HomeIcon,
  SearchIcon,
  HistoryIcon,
  FilmIcon,
  SettingsIcon,
  DownloadsQueueIcon,
  QuitIcon,
  BackIcon,
  HelpIcon,
} from "./Icons";

function useNetflixTheme() {
  const [isNetflix, setIsNetflix] = useState(
    () => document.documentElement.getAttribute("data-theme") === "netflix",
  );
  useEffect(() => {
    const el = document.documentElement;
    const mo = new MutationObserver(() => {
      setIsNetflix(el.getAttribute("data-theme") === "netflix");
    });
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return isNetflix;
}

export default function Sidebar({
  page,
  onNavigate,
  onSearch,
  savedList,
  activeDownloads,
  onReorderSaved,
  onRemoveSaved,
  canGoBack,
  onBack,
  onShowShortcuts,
  mobile,
  sidebarOpen,
  onToggle,
  onLogoClick,
}) {
  const netflix = useNetflixTheme();
  const t = useTranslate();
  const [dragOver, setDragOver] = useState(null);
  const dragItem = useRef(null);
  const dragNode = useRef(null);

  const [tooltip, setTooltip] = useState(null); // { title, y }
  const [contextMenu, setContextMenu] = useState(null); // { item, x, y }

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, []);

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setTooltip(null);
    setContextMenu({ item, x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (e, index) => {
    dragItem.current = index;
    dragNode.current = e.currentTarget;
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = "0.4";
    }, 0);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = "1";
    dragItem.current = null;
    dragNode.current = null;
    setDragOver(null);
  };

  const handleDragEnter = (e, index) => {
    if (dragItem.current === index) return;
    setDragOver(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const fromIndex = dragItem.current;
    if (fromIndex === null || fromIndex === dropIndex) return;

    const newList = [...savedList];
    const [moved] = newList.splice(fromIndex, 1);
    newList.splice(dropIndex, 0, moved);

    const newOrder = newList.map((item) => `${item.media_type}_${item.id}`);
    onReorderSaved(newOrder);
    setDragOver(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleMouseEnter = (e, title) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ title, y: rect.top + rect.height / 2 });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className={`sidebar${mobile ? (sidebarOpen ? " open" : "") : ""}`}>
      {mobile && (
        <button className="sidebar-close" onClick={onToggle} aria-label="Close sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
      <div
        className="sidebar-logo"
        onClick={mobile ? onLogoClick : () => onNavigate("home")}
        title={netflix ? "Netflix" : "SineX"}
      >
        {netflix ? (
          <svg viewBox="0 0 44 44" width="44" height="44" style={{ display: "block" }}>
            <text
              x="22"
              y="32"
              textAnchor="middle"
              fill="#e50914"
              fontFamily="Arial Black, Helvetica Neue, sans-serif"
              fontSize="32"
              fontWeight="900"
            >
              N
            </text>
          </svg>
        ) : (
          <SineXLogo />
        )}
      </div>

      {canGoBack && (
        <SideBtn onClick={onBack} icon={<BackIcon />} label={t("sidebar.back")} />
      )}

      <SideBtn onClick={onSearch} icon={<SearchIcon />} label={t("sidebar.search")} />
      <SideBtn
        active={page === "home"}
        onClick={() => onNavigate("home")}
        icon={<HomeIcon />}
        label={t("sidebar.home")}
      />
      <SideBtn
        active={page === "history"}
        onClick={() => onNavigate("history")}
        icon={<HistoryIcon />}
        label={t("sidebar.library")}
      />
      <SideBtn
        active={page === "downloads"}
        onClick={() => onNavigate("downloads")}
        icon={<DownloadsQueueIcon />}
        label={t("sidebar.downloads")}
        badge={activeDownloads > 0 ? activeDownloads : null}
      />

      <div className="sidebar-sep" />

      <div className="sidebar-saved">
        {savedList.map((item, index) => {
          const key = `${item.media_type}_${item.id}`;
          const title = item.title || item.name;
          return (
            <div
              key={key}
              className={`saved-thumb${dragOver === index ? " drag-over" : ""}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() =>
                onNavigate(item.media_type === "tv" ? "tv" : "movie", item)
              }
              onContextMenu={(e) => handleContextMenu(e, item)}
              onMouseEnter={(e) => handleMouseEnter(e, title)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: "grab", position: "relative" }}
            >
              {item.poster_path ? (
                <img src={imgUrl(item.poster_path, "w200")} alt={title} />
              ) : (
                <div className="no-img">
                  <FilmIcon />
                </div>
              )}
              {mobile && <span className="saved-thumb-label">{title}</span>}
              {dragOver === index && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "var(--accent, #e50914)",
                    borderRadius: 2,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {tooltip && (
        <div className="saved-thumb-tooltip" style={{ top: tooltip.y }}>
          {tooltip.title}
        </div>
      )}

      {contextMenu && (
        <div
          className="sidebar-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="sidebar-context-menu-item"
            onClick={() => {
              onRemoveSaved && onRemoveSaved(contextMenu.item);
              setContextMenu(null);
            }}
          >
            {t("sidebar.remove")}
          </div>
        </div>
      )}

      <div className="sidebar-bottom">
        <SideBtn
          onClick={onShowShortcuts}
          icon={<HelpIcon />}
          label={t("sidebar.help")}
        />
        <SideBtn
          active={page === "settings"}
          onClick={() => onNavigate("settings")}
          icon={<SettingsIcon />}
          label={t("sidebar.settings")}
        />
        <button
          className="sidebar-btn"
          onClick={() => window.electron?.quitApp?.()}
          title={t("sidebar.quit")}
          style={{ color: "var(--red)", marginTop: 4 }}
        >
          <QuitIcon />
          <span className="tooltip">{t("sidebar.quit")}</span>
        </button>
      </div>
    </div>
  );
}

function SideBtn({ active, onClick, icon, label, badge }) {
  return (
    <button
      className={`sidebar-btn ${active ? "active" : ""}`}
      onClick={onClick}
      style={{ position: "relative" }}
    >
      {icon}
      <span className="tooltip">{label}</span>
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: "var(--red)",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "16px",
            textAlign: "center",
            padding: "0 4px",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
