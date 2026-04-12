const MEDIA_BODY_KEY = 'sfdc_cms:media';
const DELIVERY_URL_CACHE = new Map();

export async function resolveCatalogProduct(product) {
    if (!product) {
        return product;
    }

    const [listingImage, images] = await Promise.all([
        resolveImageRecord(product.listingImage),
        Promise.all((product.images || []).map((image) => resolveImageRecord(image)))
    ]);

    return {
        ...product,
        listingImage,
        images
    };
}

export async function resolveCatalogProducts(products) {
    if (!Array.isArray(products) || !products.length) {
        return Array.isArray(products) ? products : [];
    }

    return Promise.all(products.map((product) => resolveCatalogProduct(product)));
}

async function resolveImageRecord(image) {
    if (!image) {
        return image;
    }

    if (!image.cmsDeliveryPath) {
        return image;
    }

    const resolvedUrl = await resolveCmsDeliveryPath(image.cmsDeliveryPath);
    if (!resolvedUrl) {
        return image;
    }

    return {
        ...image,
        url: resolvedUrl
    };
}

async function resolveCmsDeliveryPath(deliveryPath) {
    const normalizedPath = normalizeString(deliveryPath);
    if (!normalizedPath) {
        return '';
    }

    if (!DELIVERY_URL_CACHE.has(normalizedPath)) {
        DELIVERY_URL_CACHE.set(normalizedPath, fetchMediaUrl(normalizedPath));
    }

    return DELIVERY_URL_CACHE.get(normalizedPath);
}

async function fetchMediaUrl(deliveryPath) {
    try {
        const response = await fetch(deliveryPath, {
            credentials: 'same-origin'
        });
        if (!response.ok) {
            return '';
        }

        const payloadText = await response.text();
        if (!payloadText) {
            return '';
        }

        const payload = JSON.parse(payloadText);
        return (
            payload?.contentBody?.[MEDIA_BODY_KEY]?.url ||
            payload?.contentBody?.[MEDIA_BODY_KEY]?.source?.url ||
            ''
        );
    } catch (error) {
        return '';
    }
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
