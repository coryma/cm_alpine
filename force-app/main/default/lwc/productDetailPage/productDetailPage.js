import { LightningElement, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { ADAPTER_SOURCE, PENDING_CART_MESSAGE, addProductToCart, getProductDetail } from 'c/productCatalogAdapter';
import { resolveCatalogProduct } from 'c/cmsMediaResolver';

const RESERVED_PATH_SEGMENTS = new Set(['products', 'product', 'catalog']);

export default class ProductDetailPage extends LightningElement {
    @api adapterSource = ADAPTER_SOURCE.WF1;

    _productId;
    _productSlug;
    _productSku;
    currentPageReference;
    lastResolvedKey;

    product;
    errorMessage = '';
    addToCartMessage = '';
    isLoading = true;
    isAddingToCart = false;
    selectedImageIndex = 0;
    hasAttemptedContextLoad = false;

    @api
    get productId() {
        return this._productId;
    }

    set productId(value) {
        this._productId = normalizeString(value);
        this.tryLoadProduct();
    }

    @api
    get productSlug() {
        return this._productSlug;
    }

    set productSlug(value) {
        this._productSlug = normalizeString(value);
        this.tryLoadProduct();
    }

    @api
    get productSku() {
        return this._productSku;
    }

    set productSku(value) {
        this._productSku = normalizeString(value);
        this.tryLoadProduct();
    }

    @wire(CurrentPageReference)
    setCurrentPageReference(pageRef) {
        this.currentPageReference = pageRef;
        this.tryLoadProduct();
    }

    renderedCallback() {
        if (!this.hasAttemptedContextLoad) {
            this.hasAttemptedContextLoad = true;
            this.tryLoadProduct();
        }
    }

    get hasProduct() {
        return !!this.product;
    }

    get currentImage() {
        if (!this.product?.images?.length) {
            return null;
        }

        return this.product.images[this.selectedImageIndex] || this.product.images[0];
    }

    get hasImageGallery() {
        return (this.product?.images?.length || 0) > 1;
    }

    get thumbnailItems() {
        return (this.product?.images || []).map((image, index) => ({
            ...image,
            index,
            className: index === this.selectedImageIndex ? 'thumbnail-button thumbnail-button_active' : 'thumbnail-button'
        }));
    }

    get featureList() {
        return this.product?.features || [];
    }

    get specList() {
        return this.product?.specHighlights || [];
    }

    get faqList() {
        return this.product?.faqs || [];
    }

    get badgeList() {
        return this.product?.badges || [];
    }

    get hasBadges() {
        return this.badgeList.length > 0;
    }

    get featureHighlights() {
        return this.product?.featureHighlights || [];
    }

    get hasFeatureHighlights() {
        return this.featureHighlights.length > 0;
    }

    get addToCartLabel() {
        return this.isAddingToCart ? '加入中...' : '加入購物車';
    }

    get hasLongDescription() {
        return !!this.product?.longDescription;
    }

    get hasSpecs() {
        return this.specList.length > 0;
    }

    get hasFaqs() {
        return this.faqList.length > 0;
    }

    get hasFeatures() {
        return this.featureList.length > 0;
    }

    get quickSpecList() {
        return this.specList.slice(0, 3);
    }

    get hasQuickSpecs() {
        return this.quickSpecList.length > 0;
    }

    async handleAddToCart() {
        if (!this.product?.id || this.isAddingToCart) {
            return;
        }

        this.isAddingToCart = true;
        try {
            const result = await addProductToCart({
                source: this.adapterSource,
                productId: this.product.id,
                quantity: 1
            });

            this.addToCartMessage = result?.message || PENDING_CART_MESSAGE;
            this.dispatchEvent(
                new CustomEvent('addtocart', {
                    detail: {
                        productId: this.product.id,
                        productSlug: this.product.slug,
                        sku: this.product.sku,
                        quantity: 1,
                        result
                    },
                    bubbles: true,
                    composed: true
                })
            );
        } catch (error) {
            this.addToCartMessage = this.reduceError(error);
        } finally {
            this.isAddingToCart = false;
        }
    }

    handleThumbnailClick(event) {
        const index = Number(event.currentTarget.dataset.index);
        if (Number.isInteger(index)) {
            this.selectedImageIndex = index;
        }
    }

    tryLoadProduct() {
        const selection = this.resolveSelection();
        if (!selection.productId && !selection.productSlug && !selection.productSku) {
            this.isLoading = false;
            if (!this.product) {
                this.errorMessage =
                    '目前沒有可解析的商品資訊，請從商品列表重新進入。';
            }
            return;
        }

        const requestKey = `${selection.productId || ''}::${selection.productSlug || ''}::${selection.productSku || ''}`;
        if (requestKey === this.lastResolvedKey) {
            return;
        }

        this.lastResolvedKey = requestKey;
        this.loadProduct(selection);
    }

    async loadProduct(selection) {
        this.isLoading = true;
        this.errorMessage = '';
        this.addToCartMessage = '';

        try {
            const product = await getProductDetail({
                source: this.adapterSource,
                productId: selection.productId,
                productSlug: selection.productSlug,
                productSku: selection.productSku
            });
            this.product = await resolveCatalogProduct(product);
            this.selectedImageIndex = 0;
        } catch (error) {
            this.product = null;
            this.errorMessage = this.reduceError(error);
        } finally {
            this.isLoading = false;
        }
    }

    resolveSelection() {
        const pageState = this.currentPageReference?.state || {};
        const pageAttributes = this.currentPageReference?.attributes || {};
        const searchParams = this.getSearchParams();

        return {
            productId:
                this._productId ||
                normalizeString(pageAttributes.recordId) ||
                normalizeString(pageState.productId) ||
                normalizeString(pageState.c__productId) ||
                normalizeString(pageState.recordId) ||
                normalizeString(pageState.c__recordId) ||
                normalizeString(searchParams.get('productId')) ||
                normalizeString(searchParams.get('recordId')),
            productSlug:
                this._productSlug ||
                normalizeString(pageState.productSlug) ||
                normalizeString(pageState.c__productSlug) ||
                normalizeString(pageState.slug) ||
                normalizeString(pageState.c__slug) ||
                normalizeString(searchParams.get('productSlug')) ||
                normalizeString(searchParams.get('slug')) ||
                this.extractSlugFromPath(),
            productSku:
                this._productSku ||
                normalizeString(pageState.sku) ||
                normalizeString(pageState.c__sku) ||
                normalizeString(searchParams.get('sku'))
        };
    }

    getSearchParams() {
        if (typeof window === 'undefined') {
            return new URLSearchParams();
        }
        return new URLSearchParams(window.location.search || '');
    }

    extractSlugFromPath() {
        if (typeof window === 'undefined') {
            return '';
        }

        const segments = window.location.pathname
            .split('/')
            .map((segment) => decodeURIComponent(segment || '').trim())
            .filter(Boolean);
        const lastSegment = segments[segments.length - 1];

        if (!lastSegment || RESERVED_PATH_SEGMENTS.has(lastSegment.toLowerCase())) {
            return '';
        }

        return lastSegment;
    }

    reduceError(error) {
        if (error?.body?.message) {
            return error.body.message;
        }

        if (error?.message) {
            return error.message;
        }

        return '商品詳情暫時無法載入。';
    }
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
