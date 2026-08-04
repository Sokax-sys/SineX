import { useState, useEffect, useRef } from "react";

const GENRE_CATEGORIES = [
  {
    label: "Movies",
    items: [
      { id: 28, name: "Action", type: "movie" },
      { id: 35, name: "Comedy", type: "movie" },
      { id: 18, name: "Drama", type: "movie" },
      { id: 14, name: "Fantasy", type: "movie" },
      { id: 27, name: "Horror", type: "movie" },
      { id: 10749, name: "Romance", type: "movie" },
    ],
  },
  {
    label: "TV Series",
    items: [
      { id: 10759, name: "Action & Adventure", type: "tv" },
      { id: 10764, name: "Reality", type: "tv" },
      { id: 10767, name: "Talk Show", type: "tv" },
      { id: 10766, name: "Soap", type: "tv" },
      { id: 10763, name: "News", type: "tv" },
    ],
  },
];

export default function CategoryHeader({ onCategorySelect, currentCategory, onSidebarToggle }) {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const ticking = useRef(false);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => {
    const main = document.querySelector(".main");
    if (!main) return;
    const handler = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          setScrolled(main.scrollTop > 10);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };
    main.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => main.removeEventListener("scroll", handler);
  }, []);

  const handleGroupEnter = (label) => {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpenMenu(label), 800);
  };

  const handleGroupLeave = () => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 300);
  };

  const handleDropdownEnter = () => {
    clearTimeout(closeTimer.current);
  };

  return (
    <div
      className={`category-header${scrolled ? " category-header--scrolled" : ""}`}
    >
      {onSidebarToggle && (
        <button className="category-header-toggle" onClick={onSidebarToggle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
        </button>
      )}
      <div className="category-header-inner">
        <div className="category-menu">
          {GENRE_CATEGORIES.map((group) => (
            <div
              key={group.label}
              className="category-menu-group"
              onMouseEnter={() => handleGroupEnter(group.label)}
              onMouseLeave={handleGroupLeave}
            >
              <span className="category-menu-label">{group.label}</span>
              {openMenu === group.label && (
                <div
                  className="category-dropdown"
                  onMouseEnter={handleDropdownEnter}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {group.items.map((cat) => {
                    const active =
                      currentCategory?.id === cat.id &&
                      currentCategory?.type === cat.type;
                    return (
                      <button
                        key={`${cat.type}_${cat.id}`}
                        className={`category-dropdown-item${active ? " category-dropdown-item--active" : ""}`}
                        onClick={() => {
                          onCategorySelect(cat);
                          setOpenMenu(null);
                        }}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { GENRE_CATEGORIES };
