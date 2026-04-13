import { useState } from "react";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (href: string) => {
    setIsMobileMenuOpen(false);
    onNavigate(href);
  };

  const handleCategorySelect = (categoryId: string) => {
    setIsMobileMenuOpen(false);
    onCategorySelect(categoryId);
  };

  return (
    <div className="pageShell">
      <header className={isMobileMenuOpen ? "topBar topBar_menuOpen" : "topBar"}>
        <div className="topBar__inner">
          <div className="topBar__primary">
            <button
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "close navigation menu" : "open navigation menu"}
              className="topBar__menuToggle"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              type="button"
            >
              <span className="material-symbols-outlined">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>

            <div className="topBar__brand">
              <div className="topBar__brandCopy">
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
                      handleNavigate(link.href);
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
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

            <div className="topBar__iconRow">
              <button aria-label="cart" className="iconButton" type="button">
                <span className="material-symbols-outlined">shopping_cart</span>
              </button>
              <button aria-label="profile" className="iconButton" type="button">
                <span className="material-symbols-outlined">person</span>
              </button>
            </div>
          </div>
        </div>

        <div className={isMobileMenuOpen ? "mobileMenu mobileMenu_open" : "mobileMenu"}>
          <div className="mobileMenu__panel">
            <nav className="mobileMenu__links">
              {shell.navLinks.map((link) => (
                <button
                  className="mobileMenu__link"
                  key={link.label}
                  onClick={() => handleNavigate(link.href)}
                  type="button"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="mobileMenu__section">
              <p className="microLabel">{shell.categoryEyebrow}</p>
              <div className="mobileMenu__categories">
                {shell.sideCategories.map((category) => (
                  <button
                    className={
                      category.id === activeCategoryId
                        ? "mobileMenu__category mobileMenu__category_active"
                        : "mobileMenu__category"
                    }
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined">{category.icon}</span>
                    <span>
                      <strong>{category.label}</strong>
                      <small>{category.caption}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              className="mobileMenu__cta"
              onClick={() => handleNavigate("/request")}
              type="button"
            >
              {shell.categoryCtaLabel}
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
              onClick={() => handleCategorySelect(category.id)}
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
          onClick={() => handleNavigate("/request")}
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
