import type { CartPageContent } from "../../shared/contracts";
import { StorefrontImage } from "../components/StorefrontImage";
import {
  clearCart,
  formatCurrency,
  removeCartItem,
  setCartItemQuantity,
  type CartSnapshot
} from "../lib/cartStore";

interface CartPageProps {
  cart: CartSnapshot;
  onNavigate: (href: string) => void;
  page: CartPageContent;
}

export function CartPage({ cart, onNavigate, page }: CartPageProps) {
  if (!cart.items.length) {
    return (
      <section className="contentStack">
        <header className="pageIntro">
          <div>
            <p className="microLabel">{page.eyebrow}</p>
            <h2>{page.title}</h2>
            <p>{page.description}</p>
          </div>
        </header>

        <div className="emptyRouteState">
          <p className="microLabel">{page.eyebrow}</p>
          <h3>{page.emptyTitle}</h3>
          <p>{page.emptyBody}</p>
          <button onClick={() => onNavigate("/products")} type="button">
            {page.continueShoppingLabel}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="contentStack">
      <header className="pageIntro">
        <div>
          <p className="microLabel">{page.eyebrow}</p>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>
      </header>

      <section className="commerceLayout">
        <div className="commercePanel">
          {cart.items.map((item) => (
            <article className="cartLineItem" key={item.productId}>
              <div className="cartLineItem__media">
                <StorefrontImage alt={item.imageAlt} src={item.imageUrl} />
              </div>

              <div className="cartLineItem__copy">
                <p className="microLabel">{item.label}</p>
                <h3>{item.name}</h3>
                <strong>{formatCurrency(item.unitPrice)}</strong>
              </div>

              <label className="cartLineItem__qty">
                <span>數量</span>
                <input
                  min={1}
                  onChange={(event) =>
                    setCartItemQuantity(item.productId, Number(event.target.value))
                  }
                  step={1}
                  type="number"
                  value={item.quantity}
                />
              </label>

              <div className="cartLineItem__summary">
                <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
                <button onClick={() => removeCartItem(item.productId)} type="button">
                  移除
                </button>
              </div>
            </article>
          ))}

          <div className="commercePanel__actions">
            <button className="detailHero__ghostButton" onClick={() => clearCart()} type="button">
              {page.clearCartLabel}
            </button>
            <button onClick={() => onNavigate("/products")} type="button">
              {page.continueShoppingLabel}
            </button>
          </div>
        </div>

        <aside className="summaryPanel">
          <p className="microLabel">{page.summaryTitle}</p>
          <h3>{page.summaryTitle}</h3>

          <div className="summaryPanel__row">
            <span>{page.itemCountLabel}</span>
            <strong>{cart.itemCount}</strong>
          </div>

          <div className="summaryPanel__row">
            <span>{page.subtotalLabel}</span>
            <strong>{formatCurrency(cart.subtotal)}</strong>
          </div>

          <button className="summaryPanel__primary" onClick={() => onNavigate("/checkout")} type="button">
            {page.checkoutLabel}
          </button>
        </aside>
      </section>
    </section>
  );
}
