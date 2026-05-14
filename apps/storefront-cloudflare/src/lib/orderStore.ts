import type { CheckoutPayload, CheckoutResponse } from "../../shared/contracts";
import type { CartItem } from "./cartStore";
import type { MemberProfile } from "./memberStore";

const STORAGE_KEY = "alpine-storefront-orders-v1";

export interface StoredOrder {
  reference: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  currencyCode: string;
  customerName: string;
  email: string;
  phone: string;
  recipient: string;
  deliveryMethod: string;
  paymentMethod: string;
  shippingAddressLabel: string;
  note: string;
  itemCount: number;
  memberId: string;
  items: CartItem[];
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOrders(): StoredOrder[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as StoredOrder[];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function saveOrders(orders: StoredOrder[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function recordOrder(params: {
  cartItems: CartItem[];
  member: MemberProfile | null;
  payload: CheckoutPayload;
  response: CheckoutResponse;
}) {
  const nextOrder: StoredOrder = {
    reference: params.response.reference,
    createdAt: params.response.createdAt,
    status: "pending_confirmation",
    totalAmount: params.response.totalAmount,
    currencyCode: params.response.currencyCode,
    customerName: params.payload.fullName,
    email: params.payload.email,
    phone: params.payload.phone,
    recipient: params.payload.recipient,
    deliveryMethod: params.payload.deliveryMethod,
    paymentMethod: params.payload.paymentMethod,
    shippingAddressLabel: [
      params.payload.postalCode,
      params.payload.city,
      params.payload.district,
      params.payload.addressLine1,
      params.payload.addressLine2
    ]
      .map((part) => normalizeText(part))
      .filter(Boolean)
      .join(" "),
    note: params.payload.note,
    itemCount: params.cartItems.reduce((sum, item) => sum + item.quantity, 0),
    memberId: params.member?.id || "",
    items: params.cartItems
  };

  const nextOrders = [nextOrder, ...readOrders().filter((order) => order.reference !== nextOrder.reference)];
  saveOrders(nextOrders);
  return nextOrder;
}

export function getOrderByReference(reference: string) {
  const normalizedReference = normalizeText(reference);
  if (!normalizedReference) {
    return null;
  }

  return readOrders().find((order) => order.reference === normalizedReference) || null;
}

export function listOrdersForMember(member: MemberProfile | null) {
  if (!member) {
    return [];
  }

  return readOrders().filter(
    (order) => order.memberId === member.id || order.email.toLowerCase() === member.email.toLowerCase()
  );
}
