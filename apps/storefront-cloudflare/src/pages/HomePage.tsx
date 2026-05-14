import type { HomePageContent, HomeResponse } from "../../shared/contracts";
import type { HomeHeroPersonalization } from "../lib/homePersonalization";
import type { MemberProfile } from "../lib/memberStore";
import { StorefrontImage } from "../components/StorefrontImage";

interface HomePageProps {
  home: HomeResponse;
  member: MemberProfile | null;
  onAddToCart: (product: HomeResponse["recommended"][number]) => void;
  onNavigate: (href: string) => void;
  page: HomePageContent;
  personalization: HomeHeroPersonalization | null;
}

export function HomePage({
  home,
  member,
  onAddToCart,
  onNavigate,
  page,
  personalization
}: HomePageProps) {
  const heroTitleClassName = containsHanCharacters(home.heroFeature.title)
    ? "heroFeature__title heroFeature__title_cjk"
    : "heroFeature__title";
  const personalizedProducts = personalization?.products || [];
  const personalizedTitle = applyTemplate(page.personalizedTitleTemplate, {
    bundleName: personalization?.bundleName || ""
  });
  const personalizedBody = applyTemplate(page.personalizedBodyTemplate, {
    bundleName: personalization?.bundleName || ""
  });

  return (
    <>
      <section className="heroGrid" id="collections">
        <article className="heroFeature">
          <img
            alt={home.heroFeature.alt}
            className="heroFeature__image"
            src={home.heroFeature.imageUrl}
          />
          <div className="heroFeature__overlay">
            <span className="heroFeature__eyebrow">{home.heroFeature.label}</span>
            <h2 className={heroTitleClassName}>{home.heroFeature.title}</h2>
            <p>{home.heroFeature.body}</p>
            <div className="heroActionRow">
              <a
                className="heroButton"
                href="/products"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate("/products");
                }}
              >
                {page.heroCtaLabel}
              </a>
              <a
                className="heroButton heroButton_secondary"
                href="/quiz"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate("/quiz");
                }}
              >
                {page.heroQuizCtaLabel}
              </a>
            </div>
          </div>
        </article>

        <div className="heroColumn">
          <article className="heroSecondaryCard">
            <img
              alt={home.heroSecondary.alt}
              className="heroSecondaryCard__image"
              src={home.heroSecondary.imageUrl}
            />
            <div className="heroSecondaryCard__copy">
              <h3>{home.heroSecondary.title}</h3>
              <p>{home.heroSecondary.caption}</p>
            </div>
          </article>

          <article className="heroMembershipCard" id="membership">
            <div>
              <h3>{home.heroMembership.title}</h3>
              <p>{home.heroMembership.caption}</p>
              <button
                className="heroMembershipCard__button"
                onClick={() => onNavigate(member ? "/account" : "/register")}
                type="button"
              >
                {member ? "前往會員中心" : "建立會員帳戶"}
              </button>
            </div>
            <span className="material-symbols-outlined">stars</span>
          </article>
        </div>
      </section>

      {personalizedProducts.length ? (
        <section className="personalizedSpotlight" id="personalized-spotlight">
          <div className="personalizedSpotlight__header">
            <div>
              <p className="microLabel">{page.personalizedEyebrow}</p>
              <h2>{personalizedTitle}</h2>
              {personalizedBody ? (
                <p className="personalizedSpotlight__intro">{personalizedBody}</p>
              ) : null}
            </div>
            <a
              className="discoverButton personalizedSpotlight__cta"
              href="/quiz"
              onClick={(event) => {
                event.preventDefault();
                onNavigate("/quiz");
              }}
            >
              {page.heroQuizCtaLabel}
            </a>
          </div>

          <div className="personalizedSpotlight__grid">
            {personalizedProducts.map((product) => (
              <article
                className="recommendCard personalizedSpotlight__card"
                key={product.id}
                onClick={() => onNavigate(`/products/${product.slug}`)}
              >
                <div className="recommendCard__imageWrap">
                  <StorefrontImage alt={product.imageAlt} src={product.imageUrl} />
                </div>
                <p>{product.roleLabel}</p>
                <h3>{product.name}</h3>
                <span className="personalizedSpotlight__reason">{product.reason}</span>
                <strong>{product.priceLabel}</strong>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="shortcutGrid">
        {home.quickLinks.map((item) => (
          <button className="shortcutItem" key={item.label} type="button">
            <div className="shortcutItem__iconWrap">
              <span className="material-symbols-outlined">{item.icon}</span>
            </div>
            <span>{item.label}</span>
          </button>
        ))}
      </section>

      <section className="flashSaleSection" id="flash-sale">
        <div className="sectionBar">
          <div className="sectionBar__headline">
            <h2>{page.flashSaleTitle}</h2>
            <div className="countdownPills">
              <span>04</span>
              <em>:</em>
              <span>12</span>
              <em>:</em>
              <span>45</span>
            </div>
          </div>
          <div className="sectionBar__meta">
            <p>{page.flashSaleMetaLabel}</p>
            <a
              href="/products"
              onClick={(event) => {
                event.preventDefault();
                onNavigate("/products");
              }}
            >
              {page.flashSaleLinkLabel}
            </a>
          </div>
        </div>

        <div className="saleGrid">
          {home.flashSale.map((product) => (
            <article
              className="saleCard saleCard_clickable"
              key={product.id}
              onClick={() => onNavigate(`/products/${product.slug}`)}
              role="button"
              tabIndex={0}
            >
              <div className="saleCard__imageWrap">
                <StorefrontImage alt={product.imageAlt} src={product.imageUrl} />
                {product.saleBadge ? (
                  <div className="saleCard__badge">{product.saleBadge}</div>
                ) : null}
              </div>
              <h3>{product.name}</h3>
              <div className="saleCard__priceRow">
                <strong>{product.priceLabel}</strong>
                {product.originalPriceLabel ? (
                  <span>{product.originalPriceLabel}</span>
                ) : null}
              </div>
              <div className="saleCard__meter">
                <div
                  className="saleCard__meterFill"
                  style={{ width: `${product.claimedPercent || 40}%` }}
                />
              </div>
              <p className="saleCard__claimText">
                {applyTemplate(page.flashSaleClaimTextTemplate, {
                  percent: (product.claimedPercent || 40).toString()
                })}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="editorialBanner">
        <StorefrontImage alt={home.editorialBanner.alt} src={home.editorialBanner.imageUrl} />
        <div className="editorialBanner__overlay">
          <div>
            <h2>{home.editorialBanner.title}</h2>
            <p>{home.editorialBanner.caption}</p>
          </div>
        </div>
      </section>

      <section className="technologySection" id="new-arrivals">
        <div className="sectionBar">
          <div className="sectionBar__headline">
            <h2>{page.premiumTechnologyTitle}</h2>
          </div>
          <div className="arrowButtons">
            <button className="arrowButton" type="button">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <button className="arrowButton" type="button">
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        <div className="technologyRail">
          {home.premiumTechnology.map((product) => (
            <article
              className="technologyCard"
              key={product.id}
              onClick={() => onNavigate(`/products/${product.slug}`)}
            >
              <StorefrontImage alt={product.imageAlt} src={product.imageUrl} />
              <p>{product.categoryLabel}</p>
              <h3>{product.name}</h3>
              <strong>{product.priceLabel}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="recommendedSection" id="recommended">
        <div className="recommendedHeader">
          <div>
            <p className="microLabel">{page.recommendedEyebrow}</p>
            <h2>{page.recommendedTitle}</h2>
          </div>
        </div>

        <div className="recommendedGrid">
          {home.recommended.slice(0, 7).map((product) => (
            <article
              className="recommendCard"
              key={product.id}
              onClick={() => onNavigate(`/products/${product.slug}`)}
            >
              <div className="recommendCard__imageWrap">
                <StorefrontImage alt={product.imageAlt} src={product.imageUrl} />
                  <button
                    className="recommendCard__cart"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddToCart(product);
                    }}
                    type="button"
                  >
                  <span className="material-symbols-outlined">add_shopping_cart</span>
                  </button>
              </div>
              <p>{product.label}</p>
              <h3>{product.name}</h3>
              <strong>{product.priceLabel}</strong>
            </article>
          ))}

          <article className="promoCard">
            <h3>{page.promoCard.title}</h3>
            <p>{page.promoCard.body}</p>
            <button
              onClick={() => onNavigate("/request")}
              type="button"
            >
              {page.promoCard.ctaLabel}
            </button>
          </article>
        </div>

        <div className="recommendedFooter">
          <a
            className="discoverButton"
            href="/products"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/products");
            }}
          >
            {page.browseCatalogLabel}
          </a>
        </div>
      </section>
    </>
  );
}

function applyTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function containsHanCharacters(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}
