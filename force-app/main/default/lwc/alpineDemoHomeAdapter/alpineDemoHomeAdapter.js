import { ADAPTER_SOURCE, buildProductDetailUrl, getProductCatalog } from 'c/productCatalogAdapter';
import { getStorefrontConfig } from 'c/alpineStorefrontConfigAdapter';
import { resolveCatalogProducts } from 'c/cmsMediaResolver';

const BASE_QUICK_LINKS = Object.freeze([
    { key: 'daily', glyph: '日選', label: '今日精選', caption: '快速查看今日主推補給與熱賣健康好物', sortBy: 'featured', tone: 'slate' },
    { key: 'value', glyph: '輕價', label: '友善價格', caption: '先看較容易入手的日常補貨品項', sortBy: 'priceAsc', tone: 'mist' },
    { key: 'member', glyph: '詢問', label: '專人服務', caption: '會員、企業採購與客製補貨需求', request: true, tone: 'charcoal' },
    { key: 'newest', glyph: '新品', label: '最新到貨', caption: '掌握新上架補給與健康選品', sortBy: 'newest', tone: 'charcoal' },
    { key: 'all', glyph: '全部', label: '全部商品', caption: '瀏覽完整健康生活商品目錄', path: '/products', tone: 'sand' }
]);

const FLASH_SALE_SLOTS = Object.freeze([
    { key: 'morning', label: '08:00 開搶', note: '早餐穀物與晨間補給' },
    { key: 'afternoon', label: '14:00 開搶', note: '運動續航與機能飲品' },
    { key: 'night', label: '20:00 開搶', note: '晚間修復與日常營養' }
]);

const COLLECTION_BANNER = Object.freeze({
    eyebrow: '主題選輯',
    title: '一週健康生活提案',
    body: '把早餐、運動與日常保養的高回購商品整理成一組情境選品，讓你補貨時更容易找到合適組合。',
    category: 'Alpine Blends'
});

const RECOMMENDATION_PROMO = Object.freeze({
    eyebrow: '服務入口',
    title: '團購補貨與企業方案',
    body: '如果你要辦公室茶水間補貨、員購、健身社團或企業禮盒搭配，可先送出需求，由專人協助整理組合。',
    ctaLabel: '聯絡我們'
});

const CATEGORY_COPY = Object.freeze({
    all: { label: '全部商品', note: '瀏覽完整健康生活商品目錄' },
    'Alpine Blends': { label: '穀物輕食', note: '燕麥穀物與晨間輕補給' },
    'Alpine Energy': { label: '運動機能', note: '運動前後續航與即飲補給' },
    'Alpine Nutrition': { label: '日常營養', note: '日常維持、恢復與營養搭配' },
    Nutrition: { label: '基礎補給', note: '固定回購的主食與營養品' },
    Product: { label: '健康好物', note: '站內精選與延伸健康商品' },
    '其他': { label: '生活選物', note: '日常周邊與延伸健康商品' }
});

const CATEGORY_COPY_BY_LOWERCASE = Object.freeze(
    Object.entries(CATEGORY_COPY).reduce((accumulator, [key, value]) => {
        accumulator[key.toLowerCase()] = value;
        return accumulator;
    }, {})
);

export { ADAPTER_SOURCE };

export async function getHomePageContent({
    source = ADAPTER_SOURCE.WF1,
    productsPagePath = '/products',
    requestPagePath = '/request',
    detailPagePath = '/product'
    } = {}) {
    const storefrontConfig = await getStorefrontConfig();
    const payload = await getProductCatalog({ source });
    const products = await resolveCatalogProducts(Array.isArray(payload?.products) ? payload.products : []);
    const categories = buildHomepageCategories(payload?.categories);

    const featuredProduct = products[0] || null;
    const quietLuxuryProduct = products[3] || products[1] || featuredProduct;
    const memberSpotlightProduct = products[1] || featuredProduct;

    const technologyItems = buildTechnologyItems(products, detailPagePath);

    const recommendationItems = products.slice(0, 7).map((product, index) =>
        decorateProduct(product, detailPagePath, {
            eyebrow: `熱銷 ${String(index + 1).padStart(2, '0')}`
        })
    );

    const flashSaleItems = products.slice(0, 8).map((product, index) =>
        decorateProduct(product, detailPagePath, {
            discountLabel: `現省 ${10 + (index % 4) * 5}%`,
            claimPercent: 28 + index * 9,
            slotKey: FLASH_SALE_SLOTS[index % FLASH_SALE_SLOTS.length].key
        })
    );

    return {
        quickLinks: buildQuickLinks(categories, requestPagePath, productsPagePath).map((item) => ({
            ...item,
            path:
                item.path ||
                (item.request
                    ? normalizePath(requestPagePath)
                    : buildProductsQueryPath(productsPagePath, {
                          category: item.category,
                          sortBy: item.sortBy
                      }))
        })),
        hero: {
            eyebrow: storefrontConfig.heroEyebrow,
            title: storefrontConfig.heroTitle,
            body: storefrontConfig.heroBody,
            primaryCtaLabel: storefrontConfig.heroPrimaryCtaLabel,
            primaryCtaPath: buildProductsQueryPath(productsPagePath, { sortBy: 'featured' }),
            secondaryCtaLabel: storefrontConfig.heroSecondaryCtaLabel,
            secondaryCtaPath: normalizePath(requestPagePath),
            featuredProduct: decorateProduct(featuredProduct, detailPagePath, {
                eyebrow: '本週主打',
                ribbon: '首頁焦點'
            }),
            secondaryPanels: [
                {
                    key: 'quiet-luxury',
                    tone: 'mist',
                    eyebrow: '本週熱賣',
                    title: '早餐穀物',
                    body: '晨間補給，先從熱賣款開始。',
                    path: buildProductDetailUrl(quietLuxuryProduct, detailPagePath),
                    imageUrl: quietLuxuryProduct?.images?.[0]?.url || '',
                    imageAlt: quietLuxuryProduct?.images?.[0]?.alt || quietLuxuryProduct?.name || '晨間補給'
                },
                {
                    key: 'member-only',
                    tone: 'night',
                    eyebrow: '團購服務',
                    title: '企業團購',
                    body: '大量補貨，交給專人協助。',
                    path: normalizePath(requestPagePath),
                    imageUrl: memberSpotlightProduct?.images?.[0]?.url || '',
                    imageAlt: memberSpotlightProduct?.images?.[0]?.alt || memberSpotlightProduct?.name || '專人服務'
                }
            ]
        },
        flashSale: {
            eyebrow: '每日補給',
            title: storefrontConfig.flashSaleTitle,
            intro: storefrontConfig.flashSaleIntro,
            ctaLabel: '查看全部活動',
            ctaPath: buildProductsQueryPath(productsPagePath, { sortBy: 'featured' }),
            slots: FLASH_SALE_SLOTS,
            items: flashSaleItems
        },
        collectionBanner: {
            ...COLLECTION_BANNER,
            category: quietLuxuryProduct?.categoryLabel || quietLuxuryProduct?.category || COLLECTION_BANNER.category,
            path: buildProductsQueryPath(productsPagePath, {
                category: quietLuxuryProduct?.categoryLabel || quietLuxuryProduct?.category || ''
            }),
            imageUrl: firstImageUrl(quietLuxuryProduct) || firstImageUrl(featuredProduct),
            imageAlt: firstImageAlt(quietLuxuryProduct) || quietLuxuryProduct?.name || '主題選輯'
        },
        technologyShowcase: {
            eyebrow: '回購清單',
            title: storefrontConfig.technologyTitle,
            intro: storefrontConfig.technologyIntro,
            items: technologyItems
        },
        recommendations: {
            eyebrow: '依習慣補貨',
            title: storefrontConfig.recommendationsTitle,
            items: recommendationItems,
            promoCard: {
                ...RECOMMENDATION_PROMO,
                title: storefrontConfig.recommendationsPromoTitle,
                body: storefrontConfig.recommendationsPromoBody,
                ctaLabel: storefrontConfig.recommendationsPromoCtaLabel,
                path: normalizePath(requestPagePath)
            }
        }
    };
}

function decorateProduct(product, detailPagePath, extra = {}) {
    if (!product) {
        return null;
    }

    const image = product.listingImage || (Array.isArray(product.images) && product.images.length ? product.images[0] : {});
    const normalizedClaim = Math.max(12, Math.min(96, extra.claimPercent || 48));

    return {
        ...product,
        ...extra,
        key: product.id || product.sku || product.slug,
        href: buildProductDetailUrl(product, detailPagePath),
        imageUrl: image?.url || '',
        imageAlt: image?.alt || product.name || '商品圖片',
        categoryLabel: localizeCategoryLabel(product.categoryLabel || product.category) || '精選商品',
        ribbon: extra.ribbon || (Array.isArray(product.badges) && product.badges[0]) || '精選',
        priceNote: product.availability || '限量供應',
        accentNote: Array.isArray(product.featureHighlights) ? product.featureHighlights.slice(0, 3) : [],
        discountLabel: extra.discountLabel || '精選',
        claimPercent: normalizedClaim,
        claimLabel: `已搶購 ${normalizedClaim}%`,
        progressStyle: `width: ${normalizedClaim}%`
    };
}

function buildHomepageCategories(rawCategories) {
    return (rawCategories || [])
        .filter((category) => normalizeString(category?.value).toLowerCase() !== 'all')
        .map((category) => ({
            key: normalizeKey(category.value || category.label),
            label: localizeCategoryLabel(category.label || category.value),
            value: normalizeString(category.value || category.label),
            count: category.count || 0,
            note: categoryNote(category.value || category.label)
        }))
        .filter((category) => category.value);
}

function buildQuickLinks(categories, requestPagePath, productsPagePath) {
    const categoryLinks = categories.slice(0, 5).map((category, index) => ({
        key: category.key,
        glyph: buildGlyph(category.label),
        label: category.label,
        caption: category.note || `此分類共 ${category.count} 件商品`,
        category: category.value,
        tone: ['slate', 'mist', 'sand', 'slate', 'mist'][index % 5]
    }));

    return [
        ...BASE_QUICK_LINKS.map((item) => ({
            ...item,
            path: item.path === '/products' ? normalizePath(productsPagePath) : item.path
        })),
        ...categoryLinks
    ];
}

function buildTechnologyItems(products, detailPagePath) {
    const keywords = ['nutrition', 'energy', 'blend', 'protein', 'recovery', 'oat', '機能', '營養', '補給', '保健', '穀'];
    const matched = products.filter((product) => {
        const haystack = [
            normalizeString(product.categoryLabel || product.category),
            normalizeString(product.name),
            normalizeString(product.shortDescription)
        ]
            .join(' ')
            .toLowerCase();
        return keywords.some((keyword) => haystack.includes(keyword));
    });

    return (matched.length ? matched : products)
        .slice(0, 4)
        .map((product) =>
            decorateProduct(product, detailPagePath, {
                eyebrow: '人氣補給'
            })
        );
}

function localizeCategoryLabel(value) {
    const normalized = normalizeString(value);
    if (!normalized) {
        return '';
    }

    return CATEGORY_COPY[normalized]?.label || CATEGORY_COPY_BY_LOWERCASE[normalized.toLowerCase()]?.label || normalized;
}

function categoryNote(value) {
    const normalized = normalizeString(value);
    if (!normalized) {
        return '';
    }

    return CATEGORY_COPY[normalized]?.note || CATEGORY_COPY_BY_LOWERCASE[normalized.toLowerCase()]?.note || '';
}

function buildGlyph(label) {
    const normalized = normalizeString(label);
    if (!normalized) {
        return 'CT';
    }

    const compact = normalized.replace(/[^A-Za-z0-9\u4e00-\u9fff]/g, '');
    return compact.slice(0, 2).toUpperCase();
}

function normalizeKey(value) {
    return normalizeString(value).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-');
}

function firstImageUrl(product) {
    return product?.listingImage?.url || (Array.isArray(product?.images) && product.images.length ? product.images[0]?.url || '' : '');
}

function firstImageAlt(product) {
    return product?.listingImage?.alt || (Array.isArray(product?.images) && product.images.length ? product.images[0]?.alt || '' : '');
}

function buildProductsQueryPath(basePath, params = {}) {
    const normalizedPath = normalizePath(basePath);
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        const normalizedValue = normalizeString(value);
        if (normalizedValue) {
            searchParams.set(key, normalizedValue);
        }
    });

    const query = searchParams.toString();
    return query ? `${normalizedPath}?${query}` : normalizedPath;
}

function normalizePath(path) {
    const normalized = normalizeString(path);
    if (!normalized) {
        return '/';
    }

    return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
