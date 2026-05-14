import type { ProductsPageContent, ProductsResponse } from "../../shared/contracts";
import { StorefrontImage } from "../components/StorefrontImage";
import type { StorefrontProduct } from "../../shared/contracts";

interface ProductsPageProps {
  activeCategory: string;
  onAddToCart: (product: StorefrontProduct) => void;
  onCategoryChange: (categoryId: string) => void;
  onNavigate: (href: string) => void;
  page: ProductsPageContent;
  productsResponse: ProductsResponse;
}

export function ProductsPage({
  activeCategory,
  onAddToCart,
  onCategoryChange,
  onNavigate,
  page,
  productsResponse
}: ProductsPageProps) {
  return (
    <section className="contentStack">
      <header className="pageIntro">
        <div>
          <p className="microLabel">{page.eyebrow}</p>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>
        <div className="pageIntro__meta">
          <strong>{productsResponse.total}</strong>
          <span>{page.matchingLabel}</span>
        </div>
      </header>

      <div className="pageChipRow">
        {productsResponse.sideCategories.map((category) => (
          <button
            className={
              category.id === activeCategory ? "pageChip pageChip_active" : "pageChip"
            }
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>

      {productsResponse.items.length ? (
        <div className="catalogListingGrid">
          {productsResponse.items.map((product) => (
            <article className="listingCard" key={product.id}>
              <div className="listingCard__imageWrap">
                <StorefrontImage alt={product.imageAlt} src={product.imageUrl} />
                {product.saleBadge ? (
                  <div className="saleCard__badge">{product.saleBadge}</div>
                ) : null}
              </div>
              <div className="listingCard__body">
                <p>{product.label}</p>
                <h3>{product.name}</h3>
                <span>{product.description}</span>
                <div className="listingCard__footer">
                  <strong>{product.priceLabel}</strong>
                  <div className="listingCard__actions">
                    <button
                      className="detailHero__ghostButton"
                      onClick={() => onAddToCart(product)}
                      type="button"
                    >
                      加入購物車
                    </button>
                    <button
                      onClick={() => onNavigate(`/products/${product.slug}`)}
                      type="button"
                    >
                      {page.viewProductLabel}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="emptyRouteState">
          <p className="microLabel">{page.emptyEyebrow}</p>
          <h3>{page.emptyTitle}</h3>
          <p>{page.emptyBody}</p>
        </div>
      )}
    </section>
  );
}
