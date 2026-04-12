const STORAGE_KEY = 'demo-cart-v1';
const CHANGE_EVENT_NAME = 'demo-cart-change';
const DEFAULT_CURRENCY = 'TWD';
const USD_TO_TWD_RATE = 30;

function isBrowser() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function toNumber(value, fallbackValue = 0) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function roundCurrency(value) {
    return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeCurrency(value) {
    return normalizeText(value).toUpperCase() || DEFAULT_CURRENCY;
}

function toStorefrontAmount(amount, currencyIsoCode) {
    const normalizedAmount = toNumber(amount);
    if (!Number.isFinite(normalizedAmount)) {
        return 0;
    }

    const normalizedCurrency = normalizeCurrency(currencyIsoCode);
    if (normalizedCurrency === 'USD') {
        return Math.round(normalizedAmount * USD_TO_TWD_RATE);
    }

    return Math.round(normalizedAmount);
}

export function formatStorefrontAmount(amount) {
    const normalizedAmount = toNumber(amount);
    if (!Number.isFinite(normalizedAmount)) {
        return '暫無售價';
    }

    try {
        return new Intl.NumberFormat('zh-TW', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(normalizedAmount);
    } catch (error) {
        return `${Math.round(normalizedAmount)}`;
    }
}

function normalizeItem(rawItem, index) {
    if (!rawItem) {
        return null;
    }

    const itemId =
        normalizeText(rawItem.id) ||
        normalizeText(rawItem.productId) ||
        normalizeText(rawItem.sku) ||
        `item-${index}`;
    const quantity = Math.max(1, Math.floor(toNumber(rawItem.quantity, 1)));
    const unitPrice = Math.max(0, toStorefrontAmount(rawItem.unitPrice ?? rawItem.price ?? 0, rawItem.currencyIsoCode));
    const attributes = Array.isArray(rawItem.attributes)
        ? rawItem.attributes
              .map((attribute) => normalizeText(attribute))
              .filter((attribute) => attribute)
        : [];

    return {
        id: itemId,
        productId: normalizeText(rawItem.productId),
        sku: normalizeText(rawItem.sku),
        name: normalizeText(rawItem.name) || 'Product',
        subtitle: normalizeText(rawItem.subtitle),
        imageUrl: normalizeText(rawItem.imageUrl),
        unitPrice,
        quantity,
        currencyIsoCode: DEFAULT_CURRENCY,
        attributes
    };
}

function buildCart(items) {
    const normalizedItems = Array.isArray(items)
        ? items.map((item, index) => normalizeItem(item, index)).filter((item) => item)
        : [];
    const itemCount = normalizedItems.reduce((count, item) => count + item.quantity, 0);
    const totalAmount = Math.round(
        normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    );

    return {
        items: normalizedItems,
        itemCount,
        totalAmount,
        currencyIsoCode: normalizedItems[0]?.currencyIsoCode || DEFAULT_CURRENCY
    };
}

function dispatchChange(cart) {
    if (!isBrowser()) {
        return;
    }

    window.dispatchEvent(
        new CustomEvent(CHANGE_EVENT_NAME, {
            detail: cart
        })
    );
}

function readStoredItems() {
    if (!isBrowser()) {
        return [];
    }

    try {
        const rawValue = window.localStorage.getItem(STORAGE_KEY);
        if (!rawValue) {
            return [];
        }

        const parsedValue = JSON.parse(rawValue);
        return Array.isArray(parsedValue?.items) ? parsedValue.items : [];
    } catch (error) {
        return [];
    }
}

function saveItems(items) {
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

export function getLineTotal(item) {
    return Math.round(toNumber(item?.unitPrice) * toNumber(item?.quantity, 0));
}

export function upsertItem(rawItem) {
    const currentCart = loadCart();
    const nextItems = [...currentCart.items];
    const normalizedItem = normalizeItem(rawItem, nextItems.length);

    if (!normalizedItem) {
        return currentCart;
    }

    const existingIndex = nextItems.findIndex(
        (item) =>
            item.id === normalizedItem.id ||
            (normalizedItem.productId && item.productId === normalizedItem.productId) ||
            (normalizedItem.sku && item.sku === normalizedItem.sku)
    );

    if (existingIndex === -1) {
        nextItems.push(normalizedItem);
    } else {
        const existingItem = nextItems[existingIndex];
        nextItems[existingIndex] = {
            ...existingItem,
            ...normalizedItem,
            quantity: existingItem.quantity + normalizedItem.quantity
        };
    }

    return saveItems(nextItems);
}

export function setItemQuantity(itemId, quantity) {
    const normalizedQuantity = Math.max(0, Math.floor(toNumber(quantity, 0)));
    const nextItems = loadCart()
        .items.map((item) =>
            item.id === itemId
                ? {
                      ...item,
                      quantity: normalizedQuantity
                  }
                : item
        )
        .filter((item) => item.quantity > 0);

    return saveItems(nextItems);
}

export function removeItem(itemId) {
    return saveItems(loadCart().items.filter((item) => item.id !== itemId));
}

export function clearCart() {
    if (isBrowser()) {
        window.localStorage.removeItem(STORAGE_KEY);
    }

    const emptyCart = buildCart([]);
    dispatchChange(emptyCart);
    return emptyCart;
}

export function subscribe(listener) {
    if (!isBrowser() || typeof listener !== 'function') {
        return () => {};
    }

    const handleLocalChange = (event) => {
        listener(event.detail || loadCart());
    };
    const handleStorage = (event) => {
        if (event.key === STORAGE_KEY) {
            listener(loadCart());
        }
    };

    window.addEventListener(CHANGE_EVENT_NAME, handleLocalChange);
    window.addEventListener('storage', handleStorage);

    return () => {
        window.removeEventListener(CHANGE_EVENT_NAME, handleLocalChange);
        window.removeEventListener('storage', handleStorage);
    };
}

export function serializeCart(cartValue) {
    const cart = Array.isArray(cartValue)
        ? buildCart(cartValue)
        : cartValue?.items
          ? buildCart(cartValue.items)
          : loadCart();

    return JSON.stringify({
        items: cart.items,
        totalAmount: cart.totalAmount,
        currencyIsoCode: cart.currencyIsoCode
    });
}

export { DEFAULT_CURRENCY, STORAGE_KEY as DEMO_CART_STORAGE_KEY };
