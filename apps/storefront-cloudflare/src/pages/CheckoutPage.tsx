import { startTransition, useEffect, useState } from "react";
import type { CheckoutPageContent, CheckoutPayload } from "../../shared/contracts";
import {
  clearCart,
  formatCurrency,
  type CartSnapshot
} from "../lib/cartStore";
import type { MemberProfile } from "../lib/memberStore";
import { updateMemberProfile } from "../lib/memberStore";
import { submitCheckout } from "../lib/api";
import { recordOrder } from "../lib/orderStore";

const DELIVERY_OPTIONS = [
  {
    value: "home-delivery",
    label: "宅配到府",
    caption: "1-3 個工作天內安排配送"
  },
  {
    value: "store-pickup",
    label: "門市自取",
    caption: "建立訂單後由客服通知取貨時段"
  }
] as const;

const PAYMENT_OPTIONS = [
  {
    value: "credit-card",
    label: "信用卡付款",
    caption: "送出後將由專人確認並處理付款"
  },
  {
    value: "bank-transfer",
    label: "ATM / 匯款",
    caption: "送出後顯示待確認，後續可再串真實流程"
  },
  {
    value: "cash-on-delivery",
    label: "貨到付款",
    caption: "先保留為示意選項"
  }
] as const;

interface CheckoutPageProps {
  cart: CartSnapshot;
  member: MemberProfile | null;
  onNavigate: (href: string) => void;
  page: CheckoutPageContent;
}

interface CheckoutFormState {
  fullName: string;
  email: string;
  phone: string;
  recipient: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  postalCode: string;
  deliveryMethod: string;
  paymentMethod: string;
  note: string;
  saveProfile: boolean;
}

export function CheckoutPage({
  cart,
  member,
  onNavigate,
  page
}: CheckoutPageProps) {
  const [form, setForm] = useState<CheckoutFormState>(() => buildInitialForm(member));
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(buildInitialForm(member));
  }, [member]);

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
          <h3>購物車目前沒有商品。</h3>
          <p>先把商品加入購物車，再回到這裡完成結帳。</p>
          <button onClick={() => onNavigate("/products")} type="button">
            {page.backToCartLabel}
          </button>
        </div>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.recipient.trim() ||
      !form.addressLine1.trim() ||
      !form.city.trim() ||
      !form.district.trim()
    ) {
      setErrorMessage(page.validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const payload: CheckoutPayload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      recipient: form.recipient.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      postalCode: form.postalCode.trim(),
      deliveryMethod: form.deliveryMethod,
      paymentMethod: form.paymentMethod,
      note: form.note.trim(),
      items: cart.items.map((item) => ({
        productId: item.productId,
        slug: item.slug,
        name: item.name,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };

    try {
      const result = await submitCheckout(payload);

      if (member && form.saveProfile) {
        await updateMemberProfile(member.id, {
          fullName: payload.fullName,
          phone: payload.phone,
          defaultAddress: {
            recipient: payload.recipient,
            addressLine1: payload.addressLine1,
            addressLine2: payload.addressLine2,
            city: payload.city,
            district: payload.district,
            postalCode: payload.postalCode
          }
        });
      }

      recordOrder({
        cartItems: cart.items,
        member,
        payload,
        response: result
      });
      clearCart();

      startTransition(() => {
        onNavigate(`/order-complete?reference=${encodeURIComponent(result.reference)}`);
      });
    } catch (error) {
      startTransition(() => {
        setErrorMessage(
          error instanceof Error ? error.message : page.submitErrorMessage
        );
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const redirectToCheckout = encodeURIComponent("/checkout");

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
        <form className="requestFormPanel checkoutPanel" onSubmit={handleSubmit}>
          <div className="checkoutPanel__section">
            <div className="checkoutPanel__heading">
              <p className="microLabel">Contact</p>
              <h3>聯絡資訊</h3>
            </div>

            <div className="checkoutPanel__grid">
              <label>
                <span>{page.fieldLabels.fullName}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  type="text"
                  value={form.fullName}
                />
              </label>
              <label>
                <span>{page.fieldLabels.email}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  type="email"
                  value={form.email}
                />
              </label>
              <label>
                <span>{page.fieldLabels.phone}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  type="tel"
                  value={form.phone}
                />
              </label>
              <label>
                <span>{page.fieldLabels.recipient}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, recipient: event.target.value }))
                  }
                  type="text"
                  value={form.recipient}
                />
              </label>
            </div>
          </div>

          <div className="checkoutPanel__section">
            <div className="checkoutPanel__heading">
              <p className="microLabel">Shipping</p>
              <h3>配送地址</h3>
            </div>

            <div className="checkoutPanel__grid">
              <label className="checkoutPanel__fieldWide">
                <span>{page.fieldLabels.addressLine1}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      addressLine1: event.target.value
                    }))
                  }
                  type="text"
                  value={form.addressLine1}
                />
              </label>
              <label className="checkoutPanel__fieldWide">
                <span>{page.fieldLabels.addressLine2}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      addressLine2: event.target.value
                    }))
                  }
                  type="text"
                  value={form.addressLine2}
                />
              </label>
              <label>
                <span>{page.fieldLabels.city}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, city: event.target.value }))
                  }
                  type="text"
                  value={form.city}
                />
              </label>
              <label>
                <span>{page.fieldLabels.district}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, district: event.target.value }))
                  }
                  type="text"
                  value={form.district}
                />
              </label>
              <label>
                <span>{page.fieldLabels.postalCode}</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      postalCode: event.target.value
                    }))
                  }
                  type="text"
                  value={form.postalCode}
                />
              </label>
            </div>
          </div>

          <div className="checkoutPanel__section">
            <div className="checkoutPanel__heading">
              <p className="microLabel">Delivery</p>
              <h3>配送與付款</h3>
            </div>

            <div className="choiceGrid">
              {DELIVERY_OPTIONS.map((option) => (
                <label className="choiceCard" key={option.value}>
                  <input
                    checked={form.deliveryMethod === option.value}
                    name="delivery-method"
                    onChange={() =>
                      setForm((current) => ({ ...current, deliveryMethod: option.value }))
                    }
                    type="radio"
                  />
                  <div>
                    <strong>{option.label}</strong>
                    <p>{option.caption}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="choiceGrid">
              {PAYMENT_OPTIONS.map((option) => (
                <label className="choiceCard" key={option.value}>
                  <input
                    checked={form.paymentMethod === option.value}
                    name="payment-method"
                    onChange={() =>
                      setForm((current) => ({ ...current, paymentMethod: option.value }))
                    }
                    type="radio"
                  />
                  <div>
                    <strong>{option.label}</strong>
                    <p>{option.caption}</p>
                  </div>
                </label>
              ))}
            </div>

            <label>
              <span>{page.fieldLabels.note}</span>
              <textarea
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
                rows={4}
                value={form.note}
              />
            </label>
          </div>

          {!member ? (
            <div className="inlinePrompt">
              <div>
                <p className="microLabel">Member</p>
                <h3>{page.memberPromptTitle}</h3>
                <p>{page.memberPromptBody}</p>
              </div>
              <div className="inlinePrompt__actions">
                <button
                  className="detailHero__ghostButton"
                  onClick={() => onNavigate(`/login?redirect=${redirectToCheckout}`)}
                  type="button"
                >
                  {page.loginLabel}
                </button>
                <button
                  onClick={() => onNavigate(`/register?redirect=${redirectToCheckout}`)}
                  type="button"
                >
                  {page.registerLabel}
                </button>
              </div>
            </div>
          ) : (
            <label className="choiceToggle">
              <input
                checked={form.saveProfile}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    saveProfile: event.target.checked
                  }))
                }
                type="checkbox"
              />
              <span>{page.saveProfileLabel}</span>
            </label>
          )}

          {errorMessage ? <div className="formNotice formNotice_error">{errorMessage}</div> : null}

          <div className="requestFormPanel__actions">
            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? page.submitBusyLabel : page.submitIdleLabel}
            </button>
            <button
              className="detailHero__ghostButton"
              onClick={() => onNavigate("/cart")}
              type="button"
            >
              {page.backToCartLabel}
            </button>
          </div>
        </form>

        <aside className="summaryPanel">
          <p className="microLabel">{page.summaryTitle}</p>
          <h3>{page.summaryTitle}</h3>

          <div className="summaryPanel__itemList">
            {cart.items.map((item) => (
              <div className="summaryPanel__item" key={item.productId}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
              </div>
            ))}
          </div>

          <div className="summaryPanel__row">
            <span>商品件數</span>
            <strong>{cart.itemCount}</strong>
          </div>

          <div className="summaryPanel__row">
            <span>小計</span>
            <strong>{formatCurrency(cart.subtotal)}</strong>
          </div>
        </aside>
      </section>
    </section>
  );
}

function buildInitialForm(member: MemberProfile | null): CheckoutFormState {
  return {
    fullName: member?.fullName || "",
    email: member?.email || "",
    phone: member?.phone || "",
    recipient: member?.defaultAddress?.recipient || member?.fullName || "",
    addressLine1: member?.defaultAddress?.addressLine1 || "",
    addressLine2: member?.defaultAddress?.addressLine2 || "",
    city: member?.defaultAddress?.city || "",
    district: member?.defaultAddress?.district || "",
    postalCode: member?.defaultAddress?.postalCode || "",
    deliveryMethod: DELIVERY_OPTIONS[0].value,
    paymentMethod: PAYMENT_OPTIONS[0].value,
    note: "",
    saveProfile: Boolean(member)
  };
}
