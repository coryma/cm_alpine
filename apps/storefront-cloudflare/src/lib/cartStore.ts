import type { StorefrontProduct } from "../../shared/contracts";

const STORAGE_KEY = "alpine-storefront-cart-v1";
const CHANGE_EVENT_NAME = "alpine-storefront-cart-change";

export interface CartItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  label: string;
  imageUrl: string;
  imageAlt: string;
  quantity: number;
  unitPrice: number;
}

export interface CartSnapshot {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  currencyCode: string;
}

export interface CartProductLike
  extends Pick<
    StorefrontProduct,
    "id" | "slug" | "name" | "priceLabel" | "imageUrl" | "imageAlt" | "label"
  > {}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown, fallbackValue = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function parsePriceLabel(priceLabel: string) {
  const parsedValue = Number.parseFloat(priceLabel.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsedValue) ? Math.round(parsedValue) : 0;
}

function normalizeCartItem(rawItem: Partial<CartItem>, index: number): CartItem | null {
  const productId = normalizeText(rawItem.productId) || normalizeText(rawItem.id);
  if (!productId) {
    return null;
  }

  return {
    id: normalizeText(rawItem.id) || `item-${index}`,
    productId,
    slug: normalizeText(rawItem.slug),
    name: normalizeText(rawItem.name) || "商品",
    label: normalizeText(rawItem.label),
    imageUrl: normalizeText(rawItem.imageUrl),
    imageAlt: normalizeText(rawItem.imageAlt) || normalizeText(rawItem.name) || "商品圖片",
    quantity: Math.max(1, Math.floor(toNumber(rawItem.quantity, 1))),
    unitPrice: Math.max(0, Math.round(toNumber(rawItem.unitPrice, 0)))
  };
}

function buildCart(items: CartItem[]): CartSnapshot {
  const normalizedItems = items
    .map((item, index) => normalizeCartItem(item, index))
    .filter((item): item is CartItem => Boolean(item));

  return {
    items: normalizedItems,
    itemCount: normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    currencyCode: "TWD"
  };
}

function dispatchChange(cart: CartSnapshot) {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT_NAME, {
      detail: cart
    })
  );
}

function readStoredItems(): CartItem[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as { items?: CartItem[] };
    return Array.isArray(parsedValue.items) ? parsedValue.items : [];
  } catch {
    return [];
  }
}

function saveItems(items: CartItem[]) {
  const cart = buildCart(items);

  if (isBrowser()) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        items: cart.items
      })
    );
  }

  dispatchChange(cart);
  return cart;
}

export function loadCart() {
  return buildCart(readStoredItems());
}

export function subscribeCart(listener: (cart: CartSnapshot) => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleChange = (event: Event) => {
    const customEvent = event as CustomEvent<CartSnapshot>;
    listener(customEvent.detail || loadCart());
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener(loadCart());
    }
  };

  window.addEventListener(CHANGE_EVENT_NAME, handleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT_NAME, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function buildCartItemFromProduct(
  product: CartProductLike,
  quantity = 1
): CartItem {
  return {
    id: product.id,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    label: product.label,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    quantity: Math.max(1, Math.floor(quantity)),
    unitPrice: parsePriceLabel(product.priceLabel)
  };
}

export function upsertCartItem(rawItem: CartItem) {
  const currentCart = loadCart();
  const nextItems = [...currentCart.items];
  const existingIndex = nextItems.findIndex((item) => item.productId === rawItem.productId);

  if (existingIndex === -1) {
    nextItems.push(rawItem);
  } else {
    const existingItem = nextItems[existingIndex];
    nextItems[existingIndex] = {
      ...existingItem,
      ...rawItem,
      quantity: existingItem.quantity + rawItem.quantity
    };
  }

  return saveItems(nextItems);
}

export function setCartItemQuantity(productId: string, quantity: number) {
  const normalizedQuantity = Math.max(0, Math.floor(quantity));
  const nextItems = loadCart()
    .items.map((item) =>
      item.productId === productId
        ? {
            ...item,
            quantity: normalizedQuantity
          }
        : item
    )
    .filter((item) => item.quantity > 0);

  return saveItems(nextItems);
}

export function removeCartItem(productId: string) {
  return saveItems(loadCart().items.filter((item) => item.productId !== productId));
}

export function clearCart() {
  if (isBrowser()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const emptyCart = buildCart([]);
  dispatchChange(emptyCart);
  return emptyCart;
}

export function formatCurrency(amount: number) {
  try {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `NT$ ${Math.round(amount)}`;
  }
}
