import { LightningElement } from 'lwc';
import basePath from '@salesforce/community/basePath';
import getGuestProbe from '@salesforce/apex/AlpineStorefrontProbeController.getGuestProbe';

export default class AlpineMobileObjectProbe extends LightningElement {
    isLoading = true;
    errorMessage = '';
    isStaticMode = false;
    probe;

    connectedCallback() {
        this.isStaticMode = this.getSearchParams().get('static') === '1';
        this.loadProbe();
    }

    get communityBasePath() {
        return basePath || '/';
    }

    get storefront() {
        return this.probe?.storefront || {};
    }

    get topLinkLabel() {
        return this.isStaticMode ? 'Static' : 'Request';
    }

    get probeSummary() {
        return this.probe?.summary || 'Waiting for guest bootstrap results.';
    }

    get catalogNote() {
        return this.probe?.catalogNote || 'Public mobile storefront shell is ready to receive products.';
    }

    get requestPath() {
        return this.probe?.requestPath || `${this.communityBasePath}/request`;
    }

    get modeMessage() {
        if (!this.isStaticMode) {
            return '';
        }

        return 'Static isolation mode. No Apex, no guest bootstrap API, only pure frontend render.';
    }

    get quickLinks() {
        return this.probe?.quickLinks || [];
    }

    get hasQuickLinks() {
        return this.quickLinks.length > 0;
    }

    get featuredProducts() {
        return (this.probe?.products || []).map((item) => ({
            ...item,
            badgeText: item.badgeLabel || item.category || '精選商品',
            description: item.shortDescription || 'Public catalog item',
            hasImage: Boolean(item.imageUrl),
            imageAlt: item.imageAlt || item.name || '商品圖片',
            priceText: item.formattedPrice || '暫無售價',
            placeholderLabel: (item.name || 'P').slice(0, 1).toUpperCase()
        }));
    }

    get hasProducts() {
        return this.featuredProducts.length > 0;
    }

    get diagnosticCards() {
        return (this.probe?.objects || []).map((item) => ({
            ...item,
            cardClass: item.isAccessible ? 'diagnostic-card diagnostic-card_success' : 'diagnostic-card diagnostic-card_warning',
            statusLabel: item.isAccessible ? 'Readable' : 'Blocked'
        }));
    }

    get hasDiagnostics() {
        return this.diagnosticCards.length > 0;
    }

    async loadProbe() {
        this.isLoading = true;
        this.errorMessage = '';

        if (this.isStaticMode) {
            this.probe = buildStaticProbe(this.communityBasePath);
            this.isLoading = false;
            return;
        }

        try {
            this.probe = await getGuestProbe();
        } catch (error) {
            this.errorMessage = reduceError(error);
            this.probe = null;
        } finally {
            this.isLoading = false;
        }
    }

    handleReload() {
        if (this.isStaticMode && typeof window !== 'undefined') {
            window.location.reload();
            return;
        }

        this.loadProbe();
    }

    handleJumpToCatalog() {
        const section = this.template.querySelector('[data-catalog]');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    getSearchParams() {
        if (typeof window === 'undefined') {
            return new URLSearchParams();
        }

        return new URLSearchParams(window.location.search || '');
    }
}

function buildStaticProbe(basePath) {
    const staticPath = `${basePath || '/alpine'}/mobile-probe?static=1`;

    return {
        basePathLabel: basePath || '/alpine',
        requestPath: staticPath,
        summary: 'Static mode active. No guest bootstrap call was made.',
        catalogNote: 'These are static placeholder cards. If this page still turns into login after repeated browser reloads, the problem is in guest session/runtime rather than Apex bootstrap.',
        storefront: {
            storeName: 'Static Public Probe',
            storeTagline: 'No Apex, no guest API, frontend-only heartbeat',
            searchPlaceholder: 'Static mode: no server bootstrap',
            heroEyebrow: 'Static isolation mode',
            heroTitle: 'This version skips the guest bootstrap request completely.',
            heroBody:
                'Use this page to check whether repeated mobile reloads alone can force the public site into login. If it still happens here, the issue is below our Apex layer.',
            heroPrimaryCtaLabel: 'Jump To Static Catalog',
            heroSecondaryCtaLabel: 'Reload Static Probe',
            sectionTitle: 'Static Catalog',
            sectionIntro: 'Pure frontend placeholder content for isolating guest runtime behavior.',
            promoTitle: 'Isolation Result',
            promoBody: 'If static mode stays public while the normal page fails, the problem is in guest bootstrap or its transport path.',
            promoCtaLabel: 'Stay In Static Mode',
            footerCopy: 'Static mode is only for diagnosis. Once isolation is done, switch back to the live bootstrap page.'
        },
        quickLinks: [
            { label: 'Static Route', value: 'static-route', count: 1 },
            { label: 'No Apex', value: 'no-apex', count: 0 },
            { label: 'No Data Query', value: 'no-data-query', count: 0 }
        ],
        products: [
            {
                id: 'static-1',
                name: 'Static Placeholder Card',
                category: 'Isolation',
                formattedPrice: 'No price',
                shortDescription: 'Rendered entirely on the client with no Apex round-trip.',
                imageUrl: '',
                imageAlt: 'Static placeholder',
                detailPath: staticPath,
                badgeLabel: 'Static'
            },
            {
                id: 'static-2',
                name: 'Guest Runtime Check',
                category: 'Diagnostics',
                formattedPrice: 'No price',
                shortDescription: 'Reload this page directly from the browser toolbar to test guest-session stability.',
                imageUrl: '',
                imageAlt: 'Guest runtime check',
                detailPath: staticPath,
                badgeLabel: 'No API'
            }
        ],
        objects: [
            {
                apiName: 'Static Route',
                label: 'Frontend-Only Heartbeat',
                isAccessible: true,
                note: 'This mode never calls AlpineStorefrontProbeController.getGuestProbe(). Any redirect to login here points to Experience/LWR guest runtime behavior, not Apex bootstrap.',
                sampleCount: 1,
                records: [
                    {
                        id: 'static-route-ok',
                        title: 'No Apex Request',
                        subtitle: 'Pure frontend render only'
                    }
                ]
            }
        ]
    };
}

function reduceError(error) {
    if (error?.body?.message) {
        return error.body.message;
    }

    if (error?.message) {
        return error.message;
    }

    return 'The public mobile storefront shell could not load.';
}
