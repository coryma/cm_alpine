import { LightningElement, api } from 'lwc';
import basePath from '@salesforce/community/basePath';
import { DEFAULT_STOREFRONT_CONFIG, getStorefrontConfig } from 'c/alpineStorefrontConfigAdapter';

const TOP_NAV_ITEMS = [
    { key: 'home', label: '首頁', shortLabel: '首', path: '' },
    { key: 'collections', label: '商品目錄', shortLabel: '目', path: 'products' },
    {
        key: 'new-arrivals',
        label: '最新上架',
        shortLabel: '新',
        path: 'products?sortBy=newest'
    },
    {
        key: 'flash-sale',
        label: '每日補給',
        shortLabel: '快',
        path: 'products?sortBy=featured'
    },
    { key: 'request', label: 'AI 配方', shortLabel: '配', path: 'request' }
];

const SIDE_NAV_ITEMS = [
    { key: 'blends', label: '穀物輕食', note: '燕麥穀物與晨間輕補給', path: 'products?category=Alpine%20Blends' },
    { key: 'energy', label: '運動機能', note: '運動前後續航與即飲補給', path: 'products?category=Alpine%20Energy' },
    { key: 'nutrition', label: '日常營養', note: '日常維持、恢復與營養搭配', path: 'products?category=Alpine%20Nutrition' },
    { key: 'essentials', label: '基礎補給', note: '固定回購的主食與營養品', path: 'products?category=Nutrition' },
    { key: 'wellbeing', label: '生活選物', note: '日常周邊與延伸健康商品', path: 'products?category=%E5%85%B6%E4%BB%96' }
];

const PAGE_META = {
    home: {
        key: 'home',
        navKey: 'home',
        eyebrow: '品牌首頁',
        helper: '首頁集中呈現晨間補給、機能飲與回購熱賣，讓健康生活商品更容易快速補貨。'
    },
    products: {
        key: 'products',
        navKey: 'products',
        eyebrow: '商品目錄',
        helper: '商品列表保留搜尋、分類與排序，方便依補給目標、口味與需求快速挑品。'
    },
    'product-detail': {
        key: 'product-detail',
        navKey: 'products',
        eyebrow: '商品詳情',
        helper: '商品詳情延續同一套健康生活選物語言，集中說明用途、口味與補貨資訊。'
    },
    cart: {
        key: 'cart',
        navKey: 'cart',
        eyebrow: '購物車',
        helper: '購物車整理你的日常補貨清單，方便確認數量並延伸到後續詢問流程。'
    },
    request: {
        key: 'request',
        navKey: 'request',
        eyebrow: 'AI 配方問卷',
        helper: '這個頁面用 5 頁內的互動問卷，整理出更符合當下生活節奏的健康商品組合。'
    }
};

const BASE_NAV_CLASS = 'topbar__nav-link';
const ACTIVE_NAV_CLASS = `${BASE_NAV_CLASS} ${BASE_NAV_CLASS}_active`;
const BASE_BOTTOM_NAV_CLASS = 'bottom-nav__link';
const ACTIVE_BOTTOM_NAV_CLASS = `${BASE_BOTTOM_NAV_CLASS} ${BASE_BOTTOM_NAV_CLASS}_active`;

export default class AlpineDemoSiteShell extends LightningElement {
    @api pageKey = 'home';

    searchValue = '';
    logoImageBroken = false;
    storefrontConfig = { ...DEFAULT_STOREFRONT_CONFIG };

    connectedCallback() {
        this.loadStorefrontConfig();
    }

    get currentPage() {
        return PAGE_META[this.pageKey] || PAGE_META.home;
    }

    get topNavItems() {
        return TOP_NAV_ITEMS.map((item) => ({
            ...item,
            href: this.hrefFor(item.path),
            className: this.isTopNavActive(item) ? ACTIVE_NAV_CLASS : BASE_NAV_CLASS
        }));
    }

    get mobileNavItems() {
        return [
            { key: 'home', label: '首頁', shortLabel: '首', path: '' },
            { key: 'products', label: '目錄', shortLabel: '目', path: 'products' },
            { key: 'cart', label: '購物車', shortLabel: '車', path: 'cart' },
            { key: 'request', label: '配方', shortLabel: '配', path: 'request' }
        ].map((item) => ({
            ...item,
            href: this.hrefFor(item.path),
            className: item.key === this.currentPage.navKey ? ACTIVE_BOTTOM_NAV_CLASS : BASE_BOTTOM_NAV_CLASS
        }));
    }

    get sideNavItems() {
        return SIDE_NAV_ITEMS.map((item) => ({
            ...item,
            href: this.hrefFor(item.path)
        }));
    }

    get homeHref() {
        return this.hrefFor('');
    }

    get cartHref() {
        return this.hrefFor('cart');
    }

    get requestHref() {
        return this.hrefFor('request');
    }

    get productsHref() {
        return this.hrefFor('products');
    }

    get isHome() {
        return this.currentPage.key === 'home';
    }

    get isProducts() {
        return this.currentPage.key === 'products';
    }

    get isProductDetail() {
        return this.currentPage.key === 'product-detail';
    }

    get isCart() {
        return this.currentPage.key === 'cart';
    }

    get storeName() {
        return this.storefrontConfig.storeName;
    }

    get storeTagline() {
        return this.storefrontConfig.storeTagline;
    }

    get searchPlaceholder() {
        return this.storefrontConfig.searchPlaceholder;
    }

    get logoImageUrl() {
        return this.storefrontConfig.logoImageUrl;
    }

    get showLogoImage() {
        return Boolean(this.logoImageUrl) && !this.logoImageBroken;
    }

    get logoAltText() {
        return `${this.storeName} logo`;
    }

    get footerCopy() {
        return this.storefrontConfig.footerCopy;
    }

    async loadStorefrontConfig() {
        try {
            this.storefrontConfig = await getStorefrontConfig();
            this.logoImageBroken = false;
        } catch (error) {
            this.storefrontConfig = { ...DEFAULT_STOREFRONT_CONFIG };
            this.logoImageBroken = false;
        }
    }

    handleLogoError() {
        this.logoImageBroken = true;
    }

    handleSearchInput(event) {
        this.searchValue = event.target.value || '';
    }

    handleSearchSubmit(event) {
        event.preventDefault();

        const query = normalizeString(this.searchValue);
        const searchParams = new URLSearchParams();
        if (query) {
            searchParams.set('q', query);
        }

        const queryString = searchParams.toString();
        const target = this.hrefFor(`products${queryString ? `?${queryString}` : ''}`);

        if (typeof window !== 'undefined') {
            window.location.assign(target);
        }
    }

    isTopNavActive(item) {
        if (item.key === 'home') {
            return this.currentPage.key === 'home';
        }

        if (item.key === 'request') {
            return this.currentPage.key === 'request';
        }

        if (item.key === 'collections') {
            return this.currentPage.key === 'products' || this.currentPage.key === 'product-detail';
        }

        return false;
    }

    hrefFor(path) {
        const normalizedBasePath = basePath === '/' ? '' : basePath || '';
        const normalizedPath = normalizeString(path);

        if (!normalizedPath) {
            return normalizedBasePath || '/';
        }

        const prefixedPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
        return `${normalizedBasePath}${prefixedPath}`.replace(/\/{2,}/g, '/');
    }
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
