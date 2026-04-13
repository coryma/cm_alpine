import type { ReactNode } from "react";
import type { StorefrontShellContent } from "../../shared/contracts";

interface StorefrontShellProps {
  activeCategoryId: string;
  children: ReactNode;
  onCategorySelect: (categoryId: string) => void;
  onNavigate: (href: string) => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  searchTerm: string;
  shell: StorefrontShellContent;
}

export function StorefrontShell({
  activeCategoryId,
  children,
  onCategorySelect,
  onNavigate,
  onSearchChange,
  onSearchSubmit,
  searchTerm,
  shell
}: StorefrontShellProps) {
  return (
    <div className="pageShell">
      <header className="topBar">
        <div className="topBar__inner">
          <div className="topBar__brand">
            <div>
              <p className="microLabel">{shell.brandEyebrow}</p>
              <h1>{shell.brandName}</h1>
            </div>
            <nav className="topBar__nav">
              {shell.navLinks.map((link) => (
                <a
                  href={link.href}
                  key={link.label}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(link.href);
                  }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="topBar__actions">
            <form
              className="searchBox"
              onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit();
              }}
            >
              <input
                name="storefront-search"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={shell.searchPlaceholder}
                type="search"
                value={searchTerm}
              />
              <button aria-label="search" className="searchBox__button" type="submit">
                <span className="material-symbols-outlined">search</span>
              </button>
            </form>

            <button aria-label="cart" className="iconButton" type="button">
              <span className="material-symbols-outlined">shopping_cart</span>
            </button>
            <button aria-label="profile" className="iconButton" type="button">
              <span className="material-symbols-outlined">person</span>
            </button>
          </div>
        </div>
      </header>

      <aside className="sideRail">
        <div className="sideRail__header">
          <p className="microLabel">{shell.categoryEyebrow}</p>
          <h2>{shell.categoryTitle}</h2>
        </div>

        <nav className="sideRail__nav">
          {shell.sideCategories.map((category) => (
            <button
              className={
                category.id === activeCategoryId
                  ? "sideRail__item sideRail__item_active"
                  : "sideRail__item"
              }
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              type="button"
            >
              <span className="material-symbols-outlined">{category.icon}</span>
              <span className="sideRail__labelGroup">
                <strong>{category.label}</strong>
                <small>{category.caption}</small>
              </span>
            </button>
          ))}
        </nav>

        <button
          className="sideRail__cta"
          onClick={() => onNavigate("/request")}
          type="button"
        >
          {shell.categoryCtaLabel}
        </button>
      </aside>

      <main className="editorialMain">
        <div className="editorialMain__inner">{children}</div>

        <footer className="editorialFooter">
          <h2>{shell.footerBrand}</h2>
          <div className="editorialFooter__links">
            {shell.footerLinks.map((link) => (
              <a href={link.href} key={link.label}>
                {link.label}
              </a>
            ))}
          </div>
          <p>{shell.footerLegal}</p>
        </footer>
      </main>
    </div>
  );
}
