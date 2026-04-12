import { LightningElement, api } from 'lwc';
import {
    ADAPTER_SOURCE,
    ALL_CATEGORY_VALUE,
    DEFAULT_PRODUCT_SORT,
    buildProductDetailUrl,
    getProductCatalog
} from 'c/productCatalogAdapter';
import { resolveCatalogProducts } from 'c/cmsMediaResolver';

export default class ProductsPage extends LightningElement {
    @api heroEyebrow = '商品分類';
    @api title = '把熱銷品、分類與搜尋都放進同一個瀏覽頁';
    @api subtitle =
        '從首頁進來後可以直接延續搜尋與分類決策，不需要重新適應另一套介面。';
    @api detailPagePath = '/product';
    @api adapterSource = ADAPTER_SOURCE.WF1;

    products = [];
    categories = [];
    sortOptions = [];
    total = 0;
    errorMessage = '';
    isLoading = true;

    searchTerm = '';
    activeCategory = ALL_CATEGORY_VALUE;
    sortBy = DEFAULT_PRODUCT_SORT;

    connectedCallback() {
        this.applyInitialQueryState();
        this.loadCatalog();
    }

    get hasProducts() {
        return this.products.length > 0;
    }

    get resultCountLabel() {
        return `${this.total} 件商品`;
    }

    get emptyStateMessage() {
        if (this.searchTerm) {
            return `找不到符合「${this.searchTerm}」的商品。`;
        }
        return '目前沒有符合條件的商品。';
    }

    async loadCatalog() {
        this.isLoading = true;
        this.errorMessage = '';

        try {
            const payload = await getProductCatalog({
                source: this.adapterSource,
                searchTerm: this.searchTerm,
                category: this.activeCategory,
                sortBy: this.sortBy
            });

            this.categories = payload.categories || [];
            this.sortOptions = payload.sortOptions || [];
            this.total = payload.total || 0;
            const resolvedProducts = await resolveCatalogProducts(payload.products || []);
            this.products = resolvedProducts.map((product) => ({
                ...product,
                detailUrl: buildProductDetailUrl(product, this.detailPagePath)
            }));
        } catch (error) {
            this.errorMessage = this.reduceError(error);
            this.products = [];
            this.categories = [];
            this.sortOptions = [];
            this.total = 0;
        } finally {
            this.isLoading = false;
        }
    }

    handleFilterChange(event) {
        this.searchTerm = event.detail.searchTerm || '';
        this.activeCategory = event.detail.category || ALL_CATEGORY_VALUE;
        this.sortBy = event.detail.sortBy || DEFAULT_PRODUCT_SORT;
        this.syncQueryState();
        this.loadCatalog();
    }

    handleResetFilters() {
        const filters = this.template.querySelector('c-product-filters');
        if (filters) {
            filters.resetFilters();
        }
        this.searchTerm = '';
        this.activeCategory = ALL_CATEGORY_VALUE;
        this.sortBy = DEFAULT_PRODUCT_SORT;
        this.syncQueryState();
        this.loadCatalog();
    }

    applyInitialQueryState() {
        if (typeof window === 'undefined') {
            return;
        }

        const searchParams = new URLSearchParams(window.location.search || '');
        this.searchTerm = searchParams.get('q') || '';
        this.activeCategory = searchParams.get('category') || ALL_CATEGORY_VALUE;
        this.sortBy = searchParams.get('sortBy') || DEFAULT_PRODUCT_SORT;
    }

    syncQueryState() {
        if (typeof window === 'undefined') {
            return;
        }

        const searchParams = new URLSearchParams();
        if (this.searchTerm) {
            searchParams.set('q', this.searchTerm);
        }
        if (this.activeCategory && this.activeCategory !== ALL_CATEGORY_VALUE) {
            searchParams.set('category', this.activeCategory);
        }
        if (this.sortBy && this.sortBy !== DEFAULT_PRODUCT_SORT) {
            searchParams.set('sortBy', this.sortBy);
        }

        const query = searchParams.toString();
        const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
        window.history.replaceState({}, '', nextUrl);
    }

    handleCardOpen(event) {
        const { detailUrl } = event.detail || {};
        if (detailUrl && detailUrl !== '#') {
            return;
        }

        const matchedProduct = this.products.find((product) => product.id === event.detail?.productId);
        const fallbackUrl = buildProductDetailUrl(matchedProduct, this.detailPagePath);
        if (fallbackUrl && fallbackUrl !== '#') {
            window.location.assign(fallbackUrl);
        }
    }

    reduceError(error) {
        if (error?.body?.message) {
            return error.body.message;
        }

        if (error?.message) {
            return error.message;
        }

        return '商品列表暫時無法載入。';
    }
}
