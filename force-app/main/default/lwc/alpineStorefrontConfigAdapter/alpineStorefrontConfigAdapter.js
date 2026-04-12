import getPublicConfigApex from '@salesforce/apex/AlpineStorefrontConfigController.getPublicConfig';

const DEFAULT_STOREFRONT_CONFIG = Object.freeze({
    storeName: 'Alpine 健康生活館',
    storeTagline: '每日補給、輕運動與安心保養',
    logoImageUrl: '',
    searchPlaceholder: '搜尋燕麥穀物、機能飲、恢復補給與健康好物',
    heroEyebrow: '每日補給',
    heroTitle: '每日補給，一站買齊',
    heroBody: '早餐、機能飲、日常營養，補貨更快。',
    heroPrimaryCtaLabel: '開始選購',
    heroSecondaryCtaLabel: '詢問專人',
    flashSaleTitle: '每日補給快閃',
    flashSaleIntro: '挑出早餐穀物、運動飲與高回購機能品做短時優惠，讓你在固定補貨時更容易掌握價格與節奏。',
    technologyTitle: '人氣補給',
    technologyIntro: '集中呈現回購率高的燕麥穀物、機能飲與日常營養選品，適合快速補貨與日常搭配。',
    recommendationsTitle: '為你推薦的健康好物',
    recommendationsPromoTitle: '團購補貨與企業方案',
    recommendationsPromoBody: '如果你要辦公室茶水間補貨、員購、健身社團或企業禮盒搭配，可先送出需求，由專人協助整理組合。',
    recommendationsPromoCtaLabel: '聯絡我們',
    footerCopy: '從每日早餐、運動補給到恢復保養，全站以一致的中文選購體驗整理健康生活商品，讓回購與補貨更輕鬆。'
});

let cachedPromise;

export { DEFAULT_STOREFRONT_CONFIG };

export async function getStorefrontConfig({ refresh = false } = {}) {
    if (!cachedPromise || refresh) {
        cachedPromise = getPublicConfigApex()
            .then((payload) => normalizeConfig(payload))
            .catch(() => ({ ...DEFAULT_STOREFRONT_CONFIG }));
    }

    const config = await cachedPromise;
    return { ...config };
}

function normalizeConfig(payload) {
    const config = { ...DEFAULT_STOREFRONT_CONFIG };

    Object.keys(DEFAULT_STOREFRONT_CONFIG).forEach((key) => {
        const normalizedValue = normalizeString(payload?.[key]);
        config[key] = normalizedValue || DEFAULT_STOREFRONT_CONFIG[key];
    });

    return config;
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
