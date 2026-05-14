import type { OrderCompletePageContent } from "../../shared/contracts";
import { formatCurrency } from "../lib/cartStore";
import { getOrderByReference } from "../lib/orderStore";

interface OrderCompletePageProps {
  onNavigate: (href: string) => void;
  page: OrderCompletePageContent;
  reference: string;
}

export function OrderCompletePage({
  onNavigate,
  page,
  reference
}: OrderCompletePageProps) {
  const order = getOrderByReference(reference);

  if (!order) {
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
          <h3>{page.orderNotFoundTitle}</h3>
          <p>{page.orderNotFoundBody}</p>
          <button onClick={() => onNavigate("/products")} type="button">
            {page.browseProductsLabel}
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
        <div className="commercePanel orderCompletePanel">
          <article className="successHero">
            <p className="microLabel">{page.summaryTitle}</p>
            <h3>{order.reference}</h3>
            <p>訂單已建立，狀態為待確認。這版尚未接入真實金流，因此只保留流程與訂單資料。</p>
          </article>

          <article className="orderHistoryItem orderHistoryItem_static">
            <div>
              <p className="microLabel">配送方式</p>
              <h4>{readDeliveryLabel(order.deliveryMethod)}</h4>
              <span>{order.shippingAddressLabel}</span>
            </div>
            <div className="orderHistoryItem__meta">
              <strong>{formatCurrency(order.totalAmount)}</strong>
              <span>{readPaymentLabel(order.paymentMethod)}</span>
            </div>
          </article>

          <div className="summaryPanel__itemList">
            {order.items.map((item) => (
              <div className="summaryPanel__item" key={item.productId}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
              </div>
            ))}
          </div>
        </div>

        <aside className="summaryPanel">
          <p className="microLabel">{page.summaryTitle}</p>
          <h3>{page.summaryTitle}</h3>
          <div className="summaryPanel__row">
            <span>收件人</span>
            <strong>{order.recipient}</strong>
          </div>
          <div className="summaryPanel__row">
            <span>聯絡方式</span>
            <strong>{order.phone}</strong>
          </div>
          <div className="summaryPanel__row">
            <span>總計</span>
            <strong>{formatCurrency(order.totalAmount)}</strong>
          </div>
          <button className="summaryPanel__primary" onClick={() => onNavigate("/account")} type="button">
            {page.viewAccountLabel}
          </button>
          <button
            className="detailHero__ghostButton summaryPanel__secondary"
            onClick={() => onNavigate("/products")}
            type="button"
          >
            {page.continueShoppingLabel}
          </button>
        </aside>
      </section>
    </section>
  );
}

function readDeliveryLabel(value: string) {
  if (value === "store-pickup") {
    return "門市自取";
  }

  return "宅配到府";
}

function readPaymentLabel(value: string) {
  if (value === "bank-transfer") {
    return "ATM / 匯款";
  }

  if (value === "cash-on-delivery") {
    return "貨到付款";
  }

  return "信用卡付款（示意）";
}
