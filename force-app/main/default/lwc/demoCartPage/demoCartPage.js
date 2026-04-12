import { api, LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import {
    formatStorefrontAmount,
    getLineTotal,
    loadCart,
    removeItem,
    setItemQuantity,
    subscribe
} from 'c/demoCartStore';

export default class DemoCartPage extends NavigationMixin(LightningElement) {
    @api title = '購物車確認';
    @api requestPageUrl;
    @api emptyCartMessage = '你的購物車目前還沒有商品。';

    cart = loadCart();
    errorMessage = '';
    unsubscribeCart;

    connectedCallback() {
        this.refreshCart();
        this.unsubscribeCart = subscribe((cart) => {
            this.cart = cart;
        });
    }

    disconnectedCallback() {
        if (this.unsubscribeCart) {
            this.unsubscribeCart();
        }
    }

    get cartItems() {
        return this.cart.items.map((item) => ({
            ...item,
            attributeText: item.attributes.join(' • '),
            lineTotal: getLineTotal(item),
            unitPriceDisplay: formatStorefrontAmount(item.unitPrice),
            lineTotalDisplay: formatStorefrontAmount(getLineTotal(item))
        }));
    }

    get hasItems() {
        return this.cart.itemCount > 0;
    }

    get totalAmount() {
        return this.cart.totalAmount;
    }

    get totalAmountDisplay() {
        return formatStorefrontAmount(this.cart.totalAmount);
    }

    get isRequestDisabled() {
        return !this.hasItems;
    }

    refreshCart() {
        this.cart = loadCart();
    }

    handleQuantityChange(event) {
        this.errorMessage = '';

        const itemId = event.target.dataset.id;
        const rawValue = Number(event.detail.value ?? event.target.value);
        const normalizedQuantity = Math.max(1, Math.floor(rawValue || 0));

        if (!itemId) {
            return;
        }

        if (Number.isNaN(rawValue) || normalizedQuantity < 1) {
            event.target.setCustomValidity('數量至少要 1 件。');
            event.target.reportValidity();
            return;
        }

        event.target.setCustomValidity('');
        event.target.reportValidity();
        this.cart = setItemQuantity(itemId, normalizedQuantity);
    }

    handleRemove(event) {
        this.errorMessage = '';

        const itemId = event.currentTarget.dataset.id;
        if (!itemId) {
            return;
        }

        this.cart = removeItem(itemId);
    }

    handleRequest() {
        this.errorMessage = '';

        if (!this.hasItems) {
            this.errorMessage = '購物車目前沒有商品。';
            return;
        }

        if (!this.requestPageUrl) {
            this.errorMessage = '客服表單頁面尚未設定。';
            return;
        }

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: this.requestPageUrl
            }
        });
    }
}
