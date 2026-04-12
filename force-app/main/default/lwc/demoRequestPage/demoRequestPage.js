import { api, LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import submitRequest from '@salesforce/apex/DemoCartRequestController.submitRequest';
import { clearCart, formatStorefrontAmount, getLineTotal, loadCart, serializeCart, subscribe } from 'c/demoCartStore';

function reduceError(error) {
    if (Array.isArray(error?.body)) {
        return error.body.map((item) => item.message).join(', ');
    }

    return error?.body?.message || error?.message || '目前無法送出詢問。';
}

export default class DemoRequestPage extends NavigationMixin(LightningElement) {
    @api title = '專人詢問單';
    @api cartPageUrl;

    cart = loadCart();
    submittedCart;
    fullName = '';
    email = '';
    phone = '';
    note = '';
    errorMessage = '';
    successMessage = '';
    isSubmitting = false;
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

    get activeCart() {
        return this.submittedCart || this.cart;
    }

    get cartItems() {
        return this.activeCart.items.map((item) => ({
            ...item,
            attributeText: item.attributes.join(' • '),
            lineTotal: getLineTotal(item),
            lineTotalDisplay: formatStorefrontAmount(getLineTotal(item))
        }));
    }

    get hasItems() {
        return this.cart.itemCount > 0;
    }

    get totalAmount() {
        return this.activeCart.totalAmount;
    }

    get totalAmountDisplay() {
        return formatStorefrontAmount(this.activeCart.totalAmount);
    }

    get disableSubmit() {
        return this.isSubmitting || !this.hasItems;
    }

    get showSuccess() {
        return Boolean(this.successMessage);
    }

    refreshCart() {
        this.cart = loadCart();
    }

    handleInputChange(event) {
        const fieldName = event.target.name;
        this.errorMessage = '';

        if (fieldName === 'fullName') {
            this.fullName = event.target.value;
        } else if (fieldName === 'email') {
            this.email = event.target.value;
        } else if (fieldName === 'phone') {
            this.phone = event.target.value;
        } else if (fieldName === 'note') {
            this.note = event.target.value;
        }
    }

    handleBackToCart() {
        if (!this.cartPageUrl) {
            return;
        }

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: this.cartPageUrl
            }
        });
    }

    validateForm() {
        let isValid = true;
        const inputs = this.template.querySelectorAll('input, textarea');

        inputs.forEach((input) => {
            if (input.name === 'fullName') {
                input.setCustomValidity(input.value?.trim() ? '' : '姓名為必填。');
            } else if (input.name === 'phone') {
                const phoneValue = input.value?.trim();

                if (!phoneValue) {
                    input.setCustomValidity('電話為必填。');
                } else if (!/^[0-9+()\-\s]{7,20}$/.test(phoneValue)) {
                    input.setCustomValidity('請輸入有效的電話號碼。');
                } else {
                    input.setCustomValidity('');
                }
            } else {
                input.setCustomValidity('');
            }

            input.reportValidity();
            isValid = isValid && input.checkValidity();
        });

        if (!this.hasItems) {
            this.errorMessage = '購物車目前沒有商品。';
            isValid = false;
        }

        return isValid;
    }

    async handleSubmit() {
        this.errorMessage = '';
        this.successMessage = '';

        if (!this.validateForm()) {
            return;
        }

        this.isSubmitting = true;

        try {
            const cartSnapshot = {
                ...this.cart,
                items: this.cart.items.map((item) => ({
                    ...item
                }))
            };
            const result = await submitRequest({
                customerName: this.fullName.trim(),
                email: this.email.trim(),
                phone: this.phone.trim(),
                note: this.note ? this.note.trim() : '',
                cartJson: serializeCart(cartSnapshot)
            });

            this.submittedCart = cartSnapshot;
            this.successMessage = result?.message || '詢問已成功送出。';
            this.fullName = '';
            this.email = '';
            this.phone = '';
            this.note = '';
            clearCart();
        } catch (error) {
            this.errorMessage = reduceError(error);
        } finally {
            this.isSubmitting = false;
        }
    }
}
