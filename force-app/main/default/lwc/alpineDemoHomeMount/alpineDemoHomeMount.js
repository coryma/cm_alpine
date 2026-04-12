import { LightningElement } from 'lwc';
import basePath from '@salesforce/community/basePath';
import { ADAPTER_SOURCE, getHomePageContent } from 'c/alpineDemoHomeAdapter';

const QUICK_LINK_BADGE_CLASS = 'quick-link__badge';
const QUICK_LINK_TONE_CLASS = {
    slate: `${QUICK_LINK_BADGE_CLASS} ${QUICK_LINK_BADGE_CLASS}_slate`,
    mist: `${QUICK_LINK_BADGE_CLASS} ${QUICK_LINK_BADGE_CLASS}_mist`,
    charcoal: `${QUICK_LINK_BADGE_CLASS} ${QUICK_LINK_BADGE_CLASS}_charcoal`,
    sand: `${QUICK_LINK_BADGE_CLASS} ${QUICK_LINK_BADGE_CLASS}_sand`
};
const HERO_PANEL_CLASS = 'hero-tile';
const HERO_TONE_CLASS = {
    mist: `${HERO_PANEL_CLASS} ${HERO_PANEL_CLASS}_mist`,
    night: `${HERO_PANEL_CLASS} ${HERO_PANEL_CLASS}_night`
};
const SLOT_BUTTON_CLASS = 'slot-button';
const COUNTDOWN_INTERVAL_MS = 1000;

export default class AlpineDemoHomeMount extends LightningElement {
    adapterSource = ADAPTER_SOURCE.WF1;
    productsPagePath = '/products';
    requestPagePath = '/request';
    detailPagePath = '/product';

    pageContent;
    errorMessage = '';
    isLoading = true;
    countdownLabel = '';
    activeSlotKey = 'morning';
    countdownHandle;

    connectedCallback() {
        this.loadHomePageContent();
        this.startCountdown();
    }

    disconnectedCallback() {
        if (typeof window !== 'undefined' && this.countdownHandle) {
            window.clearInterval(this.countdownHandle);
        }
    }

    get quickLinks() {
        return (this.pageContent?.quickLinks || []).map((item) => ({
            ...item,
            badgeClass: QUICK_LINK_TONE_CLASS[item.tone] || QUICK_LINK_BADGE_CLASS
        }));
    }

    get hero() {
        return this.pageContent?.hero || {};
    }

    get heroFeaturedProduct() {
        return this.hero?.featuredProduct || null;
    }

    get heroSecondaryPanels() {
        return (this.hero?.secondaryPanels || []).map((panel) => ({
            ...panel,
            className: HERO_TONE_CLASS[panel.tone] || HERO_PANEL_CLASS
        }));
    }

    get flashSale() {
        return this.pageContent?.flashSale || {};
    }

    get flashSaleSlots() {
        return (this.flashSale?.slots || []).map((slot) => ({
            ...slot,
            className:
                slot.key === this.activeSlotKey ? `${SLOT_BUTTON_CLASS} ${SLOT_BUTTON_CLASS}_active` : SLOT_BUTTON_CLASS
        }));
    }

    get displayedFlashSaleItems() {
        const items = this.flashSale?.items || [];
        const matchingItems = items.filter((item) => item.slotKey === this.activeSlotKey);
        return matchingItems.length ? matchingItems : items.slice(0, 4);
    }

    get collectionBanner() {
        return this.pageContent?.collectionBanner || {};
    }

    get technologyShowcase() {
        return this.pageContent?.technologyShowcase || {};
    }

    get technologyItems() {
        return this.technologyShowcase?.items || [];
    }

    get recommendations() {
        return this.pageContent?.recommendations || {};
    }

    get recommendationItems() {
        return this.recommendations?.items || [];
    }

    get recommendationPromoCard() {
        return this.recommendations?.promoCard || {};
    }

    async loadHomePageContent() {
        this.isLoading = true;
        this.errorMessage = '';

        try {
            const payload = await getHomePageContent({
                source: this.adapterSource,
                productsPagePath: this.productsPagePath,
                requestPagePath: this.requestPagePath,
                detailPagePath: this.detailPagePath
            });

            this.pageContent = this.decorateContent(payload);
            this.activeSlotKey = this.flashSale?.slots?.[0]?.key || 'morning';
        } catch (error) {
            this.pageContent = null;
            this.errorMessage = this.reduceError(error);
        } finally {
            this.isLoading = false;
        }
    }

    decorateContent(payload) {
        return {
            ...payload,
            quickLinks: (payload?.quickLinks || []).map((item) => ({
                ...item,
                href: this.resolveHref(item.path)
            })),
            hero: {
                ...payload?.hero,
                primaryCtaHref: this.resolveHref(payload?.hero?.primaryCtaPath),
                secondaryCtaHref: this.resolveHref(payload?.hero?.secondaryCtaPath),
                featuredProduct: this.decorateLinkedProduct(payload?.hero?.featuredProduct),
                secondaryPanels: (payload?.hero?.secondaryPanels || []).map((panel) => ({
                    ...panel,
                    href: this.resolveHref(panel.path)
                }))
            },
            flashSale: {
                ...payload?.flashSale,
                ctaHref: this.resolveHref(payload?.flashSale?.ctaPath),
                items: (payload?.flashSale?.items || []).map((item) => this.decorateLinkedProduct(item))
            },
            collectionBanner: {
                ...payload?.collectionBanner,
                href: this.resolveHref(payload?.collectionBanner?.path)
            },
            technologyShowcase: {
                ...payload?.technologyShowcase,
                items: (payload?.technologyShowcase?.items || []).map((item) => this.decorateLinkedProduct(item))
            },
            recommendations: {
                ...payload?.recommendations,
                items: (payload?.recommendations?.items || []).map((item) => this.decorateLinkedProduct(item)),
                promoCard: {
                    ...payload?.recommendations?.promoCard,
                    href: this.resolveHref(payload?.recommendations?.promoCard?.path)
                }
            }
        };
    }

    decorateLinkedProduct(product) {
        if (!product) {
            return null;
        }

        return {
            ...product,
            href: this.resolveHref(product.href || product.path)
        };
    }

    resolveHref(path) {
        const normalizedBasePath = basePath === '/' ? '' : basePath || '';
        const normalizedPath = normalizeString(path);

        if (!normalizedPath) {
            return normalizedBasePath || '/';
        }

        if (normalizedPath === '#') {
            return '#';
        }

        if (/^https?:\/\//i.test(normalizedPath)) {
            return normalizedPath;
        }

        const prefixedPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
        return `${normalizedBasePath}${prefixedPath}`.replace(/\/{2,}/g, '/');
    }

    handleSlotClick(event) {
        this.activeSlotKey = event.currentTarget.dataset.key || this.activeSlotKey;
    }

    startCountdown() {
        if (typeof window === 'undefined') {
            return;
        }

        this.updateCountdownLabel();
        this.countdownHandle = window.setInterval(() => {
            this.updateCountdownLabel();
        }, COUNTDOWN_INTERVAL_MS);
    }

    updateCountdownLabel() {
        const now = new Date();
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        const diffMs = end.getTime() - now.getTime();
        if (diffMs <= 0) {
            this.countdownLabel = '00:00:00';
            return;
        }

        const hours = String(Math.floor(diffMs / 3600000)).padStart(2, '0');
        const minutes = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0');
        const seconds = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, '0');
        this.countdownLabel = `${hours}:${minutes}:${seconds}`;
    }

    reduceError(error) {
        if (error?.body?.message) {
            return error.body.message;
        }

        if (error?.message) {
            return error.message;
        }

        return '首頁內容暫時無法載入。';
    }
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
