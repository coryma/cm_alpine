import type {
  ProductDetailPageContent,
  StorefrontProduct
} from "../../shared/contracts";
import { StorefrontImage } from "../components/StorefrontImage";
import type { ProductSelectionTrackingContext } from "../lib/salesforceDataCloud";

interface ProductDetailPageProps {
  onAddToCart: (
    product: StorefrontProduct,
    trackingContext?: ProductSelectionTrackingContext
  ) => void;
  onNavigate: (href: string) => void;
  page: ProductDetailPageContent;
  product: StorefrontProduct | null;
}

export function ProductDetailPage({
  onAddToCart,
  onNavigate,
  page,
  product
}: ProductDetailPageProps) {
  if (!product) {
    return (
      <section className="contentStack">
        <div className="emptyRouteState">
          <p className="microLabel">{page.notFoundEyebrow}</p>
          <h3>{page.notFoundTitle}</h3>
          <button onClick={() => onNavigate("/products")} type="button">
            {page.backButtonLabel}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="contentStack">
      <div className="breadcrumbRow">
        <button onClick={() => onNavigate("/products")} type="button">
          {page.catalogLabel}
        </button>
        <span>/</span>
        <strong>{product.name}</strong>
      </div>

      <section className="detailHero">
        <div className="detailHero__media">
          <StorefrontImage alt={product.imageAlt} src={product.imageUrl} />
        </div>

        <article className="detailHero__copy">
          <p className="microLabel">{product.label}</p>
          <h2>{product.name}</h2>
          <div className="detailHero__priceRow">
            <strong>{product.priceLabel}</strong>
            {product.originalPriceLabel ? <span>{product.originalPriceLabel}</span> : null}
          </div>
          <p className="detailHero__body">{product.longDescription}</p>

          <ul className="detailHighlightList">
            {product.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>

          <div className="detailHero__actions">
            <button
              onClick={() =>
                onAddToCart(product, {
                  productAction: "add_to_cart",
                  routeKind: "product"
                })
              }
              type="button"
            >
              {page.addToCartLabel}
            </button>
            <button
              onClick={() => {
                onAddToCart(product, {
                  productAction: "buy_now",
                  routeKind: "product"
                });
                onNavigate("/checkout");
              }}
              type="button"
            >
              {page.buyNowLabel}
            </button>
            <button
              className="detailHero__ghostButton"
              onClick={() => onNavigate("/request")}
              type="button"
            >
              {page.requestButtonLabel}
            </button>
          </div>
        </article>
      </section>

      <section className="detailSpecsPanel">
        <div className="sectionBar">
          <div className="sectionBar__headline">
            <h2>{page.notesTitle}</h2>
          </div>
        </div>

        <div className="detailSpecGrid">
          {product.specs.map((spec) => (
            <article className="detailSpecCard" key={spec.label}>
              <p>{spec.label}</p>
              <strong>{spec.value}</strong>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
