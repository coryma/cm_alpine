import getProductDetailApex from '@salesforce/apex/AlpineProductCatalogController.getProductDetail';
import listProductsApex from '@salesforce/apex/AlpineProductCatalogController.listProducts';
import searchProductsApex from '@salesforce/apex/AlpineProductCatalogController.searchProducts';

const ADAPTER_SOURCE = Object.freeze({
    MOCK: 'mock',
    WF1: 'wf1'
});

const ALL_CATEGORY_VALUE = 'all';
const DEFAULT_PRODUCT_SORT = 'featured';
const PENDING_CART_MESSAGE =
    '購物車已加入示意流程，正式結帳串接完成後即可直接下單。';

const SORT_DEFINITIONS = Object.freeze({
    featured: {
        label: '精選推薦',
        compare: (left, right) => (right.sortRank || 0) - (left.sortRank || 0)
    },
    newest: {
        label: '最新上架',
        compare: (left, right) => (right.releaseOrder || 0) - (left.releaseOrder || 0)
    },
    priceAsc: {
        label: '價格低到高',
        compare: (left, right) => (left.price || Number.MAX_SAFE_INTEGER) - (right.price || Number.MAX_SAFE_INTEGER)
    },
    priceDesc: {
        label: '價格高到低',
        compare: (left, right) => (right.price || 0) - (left.price || 0)
    },
    nameAsc: {
        label: '名稱排序',
        compare: (left, right) => (left.name || '').localeCompare(right.name || '')
    }
});

const MOCK_PRODUCTS = Object.freeze([
    {
        id: '01t900000000001AAA',
        slug: 'airwave-anc-earbuds',
        sku: 'CM-AW-001',
        name: 'AirWave ANC 降噪耳機',
        category: '3C數位',
        badges: ['限時免運', '熱銷'],
        sortRank: 98,
        releaseOrder: 8,
        price: 3290,
        currencyIsoCode: 'TWD',
        availability: '24h 快速出貨',
        shortDescription:
            '通勤降噪、雙裝置切換與 36 小時續航，一副就能 cover 上班到夜跑。',
        longDescription:
            '<p>AirWave ANC 針對通勤與長時間配戴重新調音，低頻厚實但不悶，人聲清楚，開會與追劇都夠用。</p><p>耳機盒支援快充與無線充電，日常拿起就走，不必額外記住充電節奏。</p>',
        featureHighlights: ['主動降噪', '36hr 續航', '雙裝置切換'],
        features: [
            {
                title: '安靜但不壓耳',
                description: '混合式 ANC 與氣壓平衡設計，長時間戴著也不會有悶脹感。'
            },
            {
                title: '一秒切工作與娛樂',
                description: '支援手機與筆電雙連線，切會議或影音不需要重新配對。'
            },
            {
                title: '日常補電更直覺',
                description: '10 分鐘快充可補足約 3 小時播放，臨時出門也來得及。'
            }
        ],
        specHighlights: [
            { label: '藍牙', value: 'Bluetooth 5.4' },
            { label: '防水', value: 'IPX5' },
            { label: '單耳重量', value: '4.8g' }
        ],
        faqs: [
            {
                question: '耳機能單耳獨立使用嗎？',
                answer: '可以，左右耳都支援單獨配對與麥克風通話。'
            },
            {
                question: '有支援無線充電嗎？',
                answer: '有，耳機盒相容常見 Qi 無線充電盤。'
            }
        ],
        images: [
            {
                url: buildPlaceholderImage('AirWave ANC', ['#0f172a', '#1d4ed8', '#93c5fd']),
                alt: 'AirWave ANC 降噪耳機示意圖'
            },
            {
                url: buildPlaceholderImage('Midnight Blue Case', ['#1e293b', '#334155', '#cbd5e1']),
                alt: 'AirWave ANC 耳機盒示意圖'
            }
        ]
    },
    {
        id: '01t900000000002AAA',
        slug: 'pixelgo-tablet-11',
        sku: 'CM-PG-011',
        name: 'PixelGo 11 吋護眼平板',
        category: '3C數位',
        badges: ['新品', '分期 0 利率'],
        sortRank: 96,
        releaseOrder: 7,
        price: 10990,
        currencyIsoCode: 'TWD',
        availability: '限量現貨',
        shortDescription:
            '11 吋 2.5K 螢幕、四喇叭與長續航，追劇、筆記與輕辦公一次搞定。',
        longDescription:
            '<p>PixelGo 主打高解析護眼面板與輕量機身，適合學生、內容消費與移動工作情境。</p><p>鍵盤與觸控筆可選購，當成日常筆記與簡報裝置也很順手。</p>',
        featureHighlights: ['2.5K 護眼螢幕', '8400mAh', '四喇叭環繞'],
        features: [
            {
                title: '輕巧卻夠看',
                description: '11 吋顯示區域剛好兼顧閱讀與攜帶，不會有過大的負擔。'
            },
            {
                title: '影音體驗完整',
                description: '四聲道喇叭與高解析面板讓追劇、看課程影片更有沉浸感。'
            },
            {
                title: '續航撐一整天',
                description: '日常筆記、串流影音與網頁處理可應付完整工作天。'
            }
        ],
        specHighlights: [
            { label: '螢幕', value: '11 吋 2.5K LCD' },
            { label: '儲存', value: '256GB' },
            { label: '連線', value: 'Wi-Fi 6' }
        ],
        faqs: [
            {
                question: '可以外接鍵盤嗎？',
                answer: '可以，支援藍牙鍵盤與官方磁吸鍵盤配件。'
            },
            {
                question: '有支援觸控筆嗎？',
                answer: '有，支援 4096 階壓感觸控筆，適合筆記與塗鴉。'
            }
        ],
        images: [
            {
                url: buildPlaceholderImage('PixelGo 11', ['#172554', '#2563eb', '#dbeafe']),
                alt: 'PixelGo 11 吋護眼平板示意圖'
            },
            {
                url: buildPlaceholderImage('Tablet + Pen', ['#1e3a8a', '#3b82f6', '#bfdbfe']),
                alt: 'PixelGo 平板與觸控筆示意圖'
            }
        ]
    },
    {
        id: '01t900000000003AAA',
        slug: 'lumafold-mini-projector',
        sku: 'CM-LF-210',
        name: 'LumaFold 便攜投影機',
        category: '影音娛樂',
        badges: ['今晚下單 95 折', '露營必備'],
        sortRank: 93,
        releaseOrder: 6,
        price: 6980,
        currencyIsoCode: 'TWD',
        availability: '3-5 天出貨',
        shortDescription:
            '1080p 自動對焦、內建雙喇叭，客廳、臥室或露營都能快速投出大畫面。',
        longDescription:
            '<p>LumaFold 採用可折式提把與簡潔機身，拿去朋友家或戶外都不突兀。</p><p>自動梯形校正與對焦讓開機後不需要太多設定就能開始播放。</p>',
        featureHighlights: ['1080p', '自動對焦', '手機無線投放'],
        features: [
            {
                title: '房間再小也能看',
                description: '短焦投影設計，租屋空間或臥室也能有足夠尺寸。'
            },
            {
                title: '設定成本很低',
                description: '開機自動校正，第一次使用也不需要研究半天。'
            },
            {
                title: '不只看片',
                description: '支援遊戲主機、手機與筆電投放，追劇與聚會都適合。'
            }
        ],
        specHighlights: [
            { label: '亮度', value: '450 ANSI 流明' },
            { label: '投影尺寸', value: '40-120 吋' },
            { label: '喇叭', value: '2 x 5W' }
        ],
        faqs: [
            {
                question: '白天也看得清楚嗎？',
                answer: '建議拉上窗簾或在夜間使用，可獲得更好的對比與色彩表現。'
            },
            {
                question: '能直接看 Netflix 嗎？',
                answer: '支援常見串流裝置與 HDMI 輸入，也可透過手機投放。'
            }
        ],
        images: [
            {
                url: buildPlaceholderImage('LumaFold', ['#3f3cbb', '#6366f1', '#c7d2fe']),
                alt: 'LumaFold 便攜投影機示意圖'
            }
        ]
    },
    {
        id: '01t900000000004AAA',
        slug: 'breeze-one-air-circulator',
        sku: 'CM-BZ-310',
        name: 'Breeze One 靜音循環扇',
        category: '居家生活',
        badges: ['免運', '夏季熱銷'],
        sortRank: 90,
        releaseOrder: 5,
        price: 2480,
        currencyIsoCode: 'TWD',
        availability: '現貨供應',
        shortDescription:
            '12 段風量、左右自動擺頭與靜音夜間模式，租屋與小家庭都很實用。',
        longDescription:
            '<p>Breeze One 不是只把風打出來而已，而是把空氣循環做得更均勻，搭冷氣更省力。</p><p>外型簡潔，擺在客廳或臥室都不會太突兀。</p>',
        featureHighlights: ['12 段風量', '夜間靜音', '3D 擺頭'],
        features: [
            {
                title: '冷房效率更好',
                description: '配合冷氣使用能加快空氣循環，室內溫度更平均。'
            },
            {
                title: '睡覺也不吵',
                description: '夜間模式降低風切聲，臥室使用不容易被干擾。'
            }
        ],
        specHighlights: [
            { label: '風量', value: '12 段' },
            { label: '定時', value: '1-12 小時' },
            { label: '高度', value: '88cm' }
        ],
        faqs: [
            {
                question: '需要自己組裝嗎？',
                answer: '到貨後僅需簡單底座固定，約 5 分鐘即可完成。'
            }
        ],
        images: [
            {
                url: buildPlaceholderImage('Breeze One', ['#14532d', '#22c55e', '#dcfce7']),
                alt: 'Breeze One 靜音循環扇示意圖'
            }
        ]
    },
    {
        id: '01t900000000005AAA',
        slug: 'chefease-ceramic-pan-set',
        sku: 'CM-CE-118',
        name: 'ChefEase 陶瓷不沾鍋三件組',
        category: '餐廚',
        badges: ['滿額折 200', '人氣廚房組'],
        sortRank: 88,
        releaseOrder: 4,
        price: 1880,
        currencyIsoCode: 'TWD',
        availability: '今日下單最快明到',
        shortDescription:
            '煎鍋、湯鍋與平底鍋一次備齊，耐磨陶瓷塗層讓日常料理更省油。',
        longDescription:
            '<p>ChefEase 以日常家用尺寸為主，適合兩到四人份料理，不會太大也不過度佔空間。</p><p>鍋身導熱穩定，搭配電磁爐與瓦斯爐都能使用。</p>',
        featureHighlights: ['少油不沾', 'IH 可用', '好清洗'],
        features: [
            {
                title: '廚房更整齊',
                description: '同色系鍋具組合讓檯面視覺一致，不用再東湊西湊。'
            },
            {
                title: '日常清洗不費力',
                description: '陶瓷塗層讓煎蛋、煎魚較不易沾黏，清洗也更快。'
            }
        ],
        specHighlights: [
            { label: '內容物', value: '20cm 湯鍋 / 24cm 平底鍋 / 26cm 煎鍋' },
            { label: '材質', value: '陶瓷塗層鋁合金' },
            { label: '適用爐具', value: '瓦斯爐 / IH 爐' }
        ],
        faqs: [
            {
                question: '可放洗碗機嗎？',
                answer: '建議手洗可延長塗層壽命，但短時間洗碗機清洗仍可接受。'
            }
        ],
        images: [
            {
                url: buildPlaceholderImage('ChefEase Set', ['#7c2d12', '#ea580c', '#fed7aa']),
                alt: 'ChefEase 陶瓷不沾鍋三件組示意圖'
            }
        ]
    },
    {
        id: '01t900000000006AAA',
        slug: 'glowfit-massage-gun',
        sku: 'CM-GF-520',
        name: 'GlowFit 深層按摩槍',
        category: '健康保健',
        badges: ['今日必搶', '送收納盒'],
        sortRank: 86,
        releaseOrder: 3,
        price: 2590,
        currencyIsoCode: 'TWD',
        availability: '現貨供應',
        shortDescription:
            '五段力度加上熱敷按摩頭，運動後、久坐後都能快速鬆開緊繃感。',
        longDescription:
            '<p>GlowFit 主打手感穩定與不會太吵的馬達聲，適合家用也適合帶去健身房。</p><p>附多款按摩頭與旅行收納盒，日常保養更方便。</p>',
        featureHighlights: ['熱敷按摩頭', '五段力度', '低噪馬達'],
        features: [
            {
                title: '針對大肌群更有感',
                description: '腿部、肩頸與背部等常見緊繃區域都能快速放鬆。'
            },
            {
                title: '女生也能好掌握',
                description: '握把防滑且重心平衡，不會因為太重而降低使用意願。'
            }
        ],
        specHighlights: [
            { label: '續航', value: '最長 6 小時' },
            { label: '重量', value: '780g' },
            { label: '配件', value: '4 種按摩頭' }
        ],
        faqs: [
            {
                question: '可以帶上飛機嗎？',
                answer: '內建電池容量符合多數航空公司隨身攜帶規範，仍建議搭機前先確認。'
            }
        ],
        images: [
            {
                url: buildPlaceholderImage('GlowFit', ['#831843', '#ec4899', '#fbcfe8']),
                alt: 'GlowFit 深層按摩槍示意圖'
            }
        ]
    },
    {
        id: '01t900000000007AAA',
        slug: 'puresip-stainless-bottle',
        sku: 'CM-PS-640',
        name: 'PureSip 640ml 保冰手提瓶',
        category: '運動戶外',
        badges: ['兩色任選', '加價購'],
        sortRank: 82,
        releaseOrder: 2,
        price: 790,
        currencyIsoCode: 'TWD',
        availability: '大量現貨',
        shortDescription:
            '雙層真空保冰保溫，搭配提把與防漏杯蓋，外出通勤與健身都順手。',
        longDescription:
            '<p>PureSip 的瓶口設計方便清洗，也能放入冰塊與茶包，不只是裝白開水。</p><p>霧面塗層更止滑，包包裡也不容易刮出明顯痕跡。</p>',
        featureHighlights: ['24hr 保冰', '防漏杯蓋', '可提式瓶蓋'],
        features: [
            {
                title: '出門拿了就走',
                description: '提把一體成型，通勤、健身或開車都方便。'
            },
            {
                title: '清洗不麻煩',
                description: '大口徑設計方便刷洗，不容易殘留氣味。'
            }
        ],
        specHighlights: [
            { label: '容量', value: '640ml' },
            { label: '材質', value: '304 不鏽鋼' },
            { label: '保溫', value: '12hr' }
        ],
        faqs: [
            {
                question: '能裝碳酸飲料嗎？',
                answer: '不建議，避免氣壓造成開蓋時液體噴濺。'
            }
        ],
        images: [
            {
                url: buildPlaceholderImage('PureSip', ['#0f766e', '#14b8a6', '#ccfbf1']),
                alt: 'PureSip 640ml 保冰手提瓶示意圖'
            }
        ]
    },
    {
        id: '01t900000000008AAA',
        slug: 'cloudnest-aroma-blanket',
        sku: 'CM-CN-405',
        name: 'CloudNest 香氛抱枕毯',
        category: '居家生活',
        badges: ['週末加碼', '送香氛包'],
        sortRank: 79,
        releaseOrder: 1,
        price: 1280,
        currencyIsoCode: 'TWD',
        availability: '少量補貨中',
        shortDescription:
            '平常是抱枕，需要時展開就是午睡毯，沙發、辦公室和車上都好用。',
        longDescription:
            '<p>CloudNest 主打柔軟觸感與耐看的中性色調，不論擺在臥室或客廳都能融進空間。</p><p>附可替換香氛包，打開時會有淡淡棉柔香氣，但不會過度濃烈。</p>',
        featureHighlights: ['抱枕變毛毯', '柔霧配色', '可替換香氛包'],
        features: [
            {
                title: '空間收納更省',
                description: '不用多放一條毛毯，平常就當抱枕擺著。'
            },
            {
                title: '摸起來真的舒服',
                description: '短絨布面細緻親膚，冷氣房午睡很剛好。'
            }
        ],
        specHighlights: [
            { label: '展開尺寸', value: '110 x 150cm' },
            { label: '材質', value: '超細短絨' },
            { label: '洗滌', value: '可機洗' }
        ],
        faqs: [
            {
                question: '香氛味道會很重嗎？',
                answer: '不會，屬於偏淡的棉麻香氣，可依喜好自行取出。'
            }
        ],
        images: [
            {
                url: buildPlaceholderImage('CloudNest', ['#854d0e', '#f59e0b', '#fde68a']),
                alt: 'CloudNest 香氛抱枕毯示意圖'
            }
        ]
    }
]);

export { ADAPTER_SOURCE, ALL_CATEGORY_VALUE, DEFAULT_PRODUCT_SORT, PENDING_CART_MESSAGE };

export async function getProductCatalog({
    source = ADAPTER_SOURCE.MOCK,
    searchTerm = '',
    category = ALL_CATEGORY_VALUE,
    sortBy = DEFAULT_PRODUCT_SORT
} = {}) {
    if (normalizeSource(source) === ADAPTER_SOURCE.WF1) {
        return fetchWF1Catalog({ searchTerm, category, sortBy });
    }

    const filteredProducts = filterAndSortProducts(MOCK_PRODUCTS, {
        searchTerm,
        category,
        sortBy
    });

    return buildCatalogResponse({
        products: filteredProducts,
        allProducts: MOCK_PRODUCTS,
        source: ADAPTER_SOURCE.MOCK
    });
}

export async function getProductDetail({
    source = ADAPTER_SOURCE.MOCK,
    productId,
    productSlug,
    productSku
} = {}) {
    if (normalizeSource(source) === ADAPTER_SOURCE.WF1) {
        return fetchWF1ProductDetail({ productId, productSlug, productSku });
    }

    const normalizedId = normalizeString(productId);
    const normalizedSlug = normalizeSlug(productSlug);
    const normalizedSku = normalizeString(productSku).toLowerCase();
    const product = MOCK_PRODUCTS.find((item) => {
        if (normalizedId && item.id === normalizedId) {
            return true;
        }
        if (normalizedSlug && item.slug === normalizedSlug) {
            return true;
        }
        return normalizedSku && normalizeString(item.sku).toLowerCase() === normalizedSku;
    });

    if (!product) {
        throw new Error('找不到這項商品，請返回列表重新選購。');
    }

    return cloneProduct(product);
}

export async function addProductToCart({
    source = ADAPTER_SOURCE.MOCK,
    productId,
    quantity = 1
} = {}) {
    const normalizedProductId = normalizeString(productId);
    if (!normalizedProductId) {
        throw new Error('加入購物車前需要有效的商品編號。');
    }

    if (normalizeSource(source) === ADAPTER_SOURCE.WF1) {
        return postWF1AddToCart({ productId: normalizedProductId, quantity });
    }

    return {
        status: 'pending_integration',
        productId: normalizedProductId,
        quantity,
        message: PENDING_CART_MESSAGE
    };
}

export function buildProductDetailUrl(product, detailPagePath = '/product') {
    const normalizedPath = normalizePath(detailPagePath);
    if (!normalizedPath || !product) {
        return '#';
    }

    if (product.detailUrl) {
        return product.detailUrl;
    }

    const templatedUrl = resolveTemplatedDetailPath(product, normalizedPath);
    if (templatedUrl) {
        return templatedUrl;
    }

    const separator = normalizedPath.includes('?') ? '&' : '?';
    if (product.id) {
        return `${normalizedPath}${separator}productId=${encodeURIComponent(product.id)}`;
    }

    if (product.sku) {
        return `${normalizedPath}${separator}sku=${encodeURIComponent(product.sku)}`;
    }

    if (product.slug) {
        return `${normalizedPath}${separator}productSlug=${encodeURIComponent(product.slug)}`;
    }

    return '#';
}

export function getProductSortOptions() {
    return Object.entries(SORT_DEFINITIONS).map(([value, definition]) => ({
        label: definition.label,
        value
    }));
}

async function fetchWF1Catalog({ searchTerm, category, sortBy }) {
    const payload = normalizeString(searchTerm)
        ? await searchProductsApex({ searchTerm, category, sortBy })
        : await listProductsApex({ category, sortBy });

    return normalizeWF1CatalogPayload(payload, { searchTerm, category, sortBy });
}

async function fetchWF1ProductDetail({ productId, productSlug, productSku }) {
    const payload = await getProductDetailApex({ productId, productSlug, productSku });
    const product = normalizeProductRecord(payload);
    if (!product.id && !product.slug && !product.sku) {
        throw new Error('WF-1 detail payload did not include a recognizable product identity.');
    }
    return product;
}

async function postWF1AddToCart({ productId, quantity }) {
    return {
        status: 'pending_integration',
        productId,
        quantity,
        message: PENDING_CART_MESSAGE
    };
}

function normalizeWF1CatalogPayload(payload, filters) {
    const rawProducts = Array.isArray(payload?.products)
        ? payload.products
        : Array.isArray(payload?.items)
          ? payload.items
          : [];
    const allProducts = rawProducts.map(normalizeProductRecord);
    const filteredProducts = filterAndSortProducts(allProducts, filters);
    return buildCatalogResponse({
        products: filteredProducts,
        allProducts,
        source: ADAPTER_SOURCE.WF1,
        categories: payload?.categories
    });
}

function buildCatalogResponse({ products, allProducts, source, categories }) {
    return {
        source,
        adapterMode: source === ADAPTER_SOURCE.WF1 ? 'wf1' : 'fallback',
        total: products.length,
        products: products.map(cloneProduct),
        categories: normalizeCategoryOptions(categories, allProducts),
        sortOptions: getProductSortOptions()
    };
}

function filterAndSortProducts(products, { searchTerm, category, sortBy }) {
    const normalizedSearch = normalizeString(searchTerm).toLowerCase();
    const normalizedCategory = normalizeString(category).toLowerCase();
    const filtered = products.filter((product) => {
        const categoryMatches =
            !normalizedCategory ||
            normalizedCategory === ALL_CATEGORY_VALUE ||
            normalizeString(product.category).toLowerCase() === normalizedCategory;

        if (!categoryMatches) {
            return false;
        }

        if (!normalizedSearch) {
            return true;
        }

        const searchableText = [
            product.name,
            product.shortDescription,
            product.longDescription,
            product.category,
            product.sku,
            ...(product.badges || []),
            ...(product.featureHighlights || [])
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return searchableText.includes(normalizedSearch);
    });

    const comparator =
        SORT_DEFINITIONS[normalizeString(sortBy)]?.compare || SORT_DEFINITIONS[DEFAULT_PRODUCT_SORT].compare;

    return [...filtered].sort(comparator);
}

function normalizeCategoryOptions(rawCategories, allProducts) {
    const normalizedAllProducts = Array.isArray(allProducts) ? allProducts : [];
    if (Array.isArray(rawCategories) && rawCategories.length) {
        const normalizedCategories = rawCategories.map((item) => ({
            label: item.label || item.name || item.value,
            value: item.value || item.name || item.label,
            count: Number.isFinite(item.count)
                ? item.count
                : countProductsInCategory(normalizedAllProducts, item.value || item.name || item.label)
        }));
        const hasAllCategory = normalizedCategories.some(
            (item) => normalizeString(item.value).toLowerCase() === ALL_CATEGORY_VALUE
        );

        return hasAllCategory
            ? normalizedCategories
            : [
                  {
                      label: '全部分類',
                      value: ALL_CATEGORY_VALUE,
                      count: normalizedAllProducts.length
                  },
                  ...normalizedCategories
              ];
    }

    const counts = normalizedAllProducts.reduce((collection, product) => {
        const key = normalizeString(product.category);
        if (!key) {
            return collection;
        }
        collection.set(key, (collection.get(key) || 0) + 1);
        return collection;
    }, new Map());

    const categoryOptions = Array.from(counts.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([value, count]) => ({
            label: value,
            value,
            count
        }));

    return [
        {
            label: '全部分類',
            value: ALL_CATEGORY_VALUE,
            count: normalizedAllProducts.length
        },
        ...categoryOptions
    ];
}

function normalizeProductRecord(record = {}) {
    const product = {
        id: normalizeString(firstPresent(record, ['id', 'Id', 'productId', 'product_id'])),
        slug: normalizeSlug(firstPresent(record, ['slug', 'productSlug', 'product_slug'])),
        sku: normalizeString(firstPresent(record, ['sku', 'productCode', 'product_code', 'code'])),
        name: normalizeString(firstPresent(record, ['name', 'productName', 'product_name', 'title'])),
        category: normalizeString(firstPresent(record, ['category', 'family', 'categoryName', 'productFamily'])),
        badges: normalizeStringArray(record.badges),
        sortRank: toNumber(firstPresent(record, ['sortRank', 'featuredRank', 'rank'])) || 0,
        releaseOrder: toNumber(firstPresent(record, ['releaseOrder', 'newnessRank', 'publishedOrder'])) || 0,
        price: toNumber(
            firstPresent(record, ['price.amount', 'price.value', 'unitPrice', 'price', 'pricebookEntry.unitPrice'])
        ),
        currencyIsoCode:
            normalizeString(firstPresent(record, ['price.currencyIsoCode', 'currencyIsoCode', 'currency'])) || 'TWD',
        availability:
            normalizeString(firstPresent(record, ['availability', 'inventoryStatus', 'status'])) || 'Configure to order',
        shortDescription:
            normalizeString(firstPresent(record, ['shortDescription', 'summary', 'teaser', 'short_description'])) ||
            '商品介紹整理中，請先查看規格與亮點。',
        longDescription:
            normalizeString(firstPresent(record, ['longDescription', 'longDescriptionHtml', 'description', 'body'])) ||
            '<p>詳細商品說明整理中，稍後會補上更多內容。</p>',
        featureHighlights: normalizeStringArray(
            firstPresent(record, ['featureHighlights', 'highlights', 'sellingPoints'])
        ),
        features: normalizeFeatureList(record.features),
        specHighlights: normalizeSpecHighlights(firstPresent(record, ['specHighlights', 'specs', 'attributes'])),
        faqs: normalizeFaqList(record.faqs),
        images: normalizeImages(record),
        detailUrl: normalizeString(firstPresent(record, ['detailUrl', 'url']))
    };

    return withComputedDisplayFields(product);
}

function normalizeFeatureList(value) {
    if (!Array.isArray(value) || !value.length) {
        return [];
    }

    return value
        .map((item) => {
            if (typeof item === 'string') {
                return {
                    title: item,
                    description: ''
                };
            }

            return {
                title: normalizeString(item.title || item.name || item.label),
                description: normalizeString(item.description || item.value || item.body)
            };
        })
        .filter((item) => item.title || item.description);
}

function normalizeSpecHighlights(value) {
    if (!Array.isArray(value) || !value.length) {
        return [];
    }

    return value
        .map((item) => {
            if (typeof item === 'string') {
                return {
                    label: 'Spec',
                    value: item
                };
            }

            return {
                label: normalizeString(item.label || item.name || item.key),
                value: normalizeString(item.value || item.description || item.body)
            };
        })
        .filter((item) => item.label && item.value);
}

function normalizeFaqList(value) {
    if (!Array.isArray(value) || !value.length) {
        return [];
    }

    return value
        .map((item) => ({
            question: normalizeString(item.question || item.q || item.title),
            answer: normalizeString(item.answer || item.a || item.description)
        }))
        .filter((item) => item.question && item.answer);
}

function normalizeImages(record) {
    const candidateImages = [];
    const rawImages = Array.isArray(record.images) ? record.images : [];
    const singleImage = firstPresent(record, ['image.url', 'image', 'primaryImage.url', 'primaryImage']);

    rawImages.forEach((image) => candidateImages.push(image));
    if (singleImage) {
        candidateImages.unshift(singleImage);
    }

    const images = candidateImages
        .map((image) => {
            if (typeof image === 'string') {
                return {
                    url: image,
                    alt: normalizeString(record.name || record.productName || '商品圖片')
                };
            }

            return {
                url: normalizeString(image.url || image.src || image.href),
                alt: normalizeString(image.alt || image.title || record.name || record.productName || '商品圖片')
            };
        })
        .filter((image) => image.url);

    if (images.length) {
        return images;
    }

    const fallbackTitle = normalizeString(record.name || record.productName || 'Product');
    return [
        {
            url: buildPlaceholderImage(fallbackTitle, ['#0f172a', '#334155', '#e2e8f0']),
            alt: `${fallbackTitle} placeholder artwork`
        }
    ];
}

function normalizeStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item) => normalizeString(item)).filter(Boolean);
}

function withComputedDisplayFields(product) {
    return {
        ...product,
        formattedPrice: formatPrice(product.price, product.currencyIsoCode),
        categoryLabel: product.category || '其他'
    };
}

function cloneProduct(product) {
    return {
        ...product,
        badges: [...(product.badges || [])],
        featureHighlights: [...(product.featureHighlights || [])],
        features: [...(product.features || [])],
        specHighlights: [...(product.specHighlights || [])],
        faqs: [...(product.faqs || [])],
        images: [...(product.images || [])]
    };
}

function countProductsInCategory(products, categoryValue) {
    const normalizedCategory = normalizeString(categoryValue).toLowerCase();
    if (!normalizedCategory) {
        return 0;
    }

    return products.filter((product) => normalizeString(product.category).toLowerCase() === normalizedCategory).length;
}

function resolveTemplatedDetailPath(product, normalizedPath) {
    const containsTemplate =
        normalizedPath.includes('{id}') || normalizedPath.includes('{slug}') || normalizedPath.includes('{sku}');

    if (!containsTemplate) {
        return '';
    }

    if (normalizedPath.includes('{id}') && !product.id) {
        return '';
    }

    if (normalizedPath.includes('{slug}') && !product.slug) {
        return '';
    }

    if (normalizedPath.includes('{sku}') && !product.sku) {
        return '';
    }

    return normalizedPath
        .replace('{id}', encodeURIComponent(product.id || ''))
        .replace('{slug}', encodeURIComponent(product.slug || ''))
        .replace('{sku}', encodeURIComponent(product.sku || ''));
}

function firstPresent(record, paths) {
    for (const path of paths) {
        const value = getValueByPath(record, path);
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }
    return undefined;
}

function getValueByPath(target, path) {
    return path.split('.').reduce((value, segment) => {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value[segment];
    }, target);
}

function formatPrice(amount, currencyIsoCode) {
    if (!Number.isFinite(amount)) {
        return '暫無售價';
    }

    try {
        return new Intl.NumberFormat('zh-TW', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    } catch (error) {
        return `${Math.round(amount)}`;
    }
}

function buildPlaceholderImage(label, colors) {
    const palette = Array.isArray(colors) && colors.length >= 3 ? colors : ['#0f172a', '#334155', '#f8fafc'];
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${escapeXml(label)}">
            <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${palette[0]}"/>
                    <stop offset="55%" stop-color="${palette[1]}"/>
                    <stop offset="100%" stop-color="${palette[2]}"/>
                </linearGradient>
            </defs>
            <rect width="800" height="600" fill="url(#g)"/>
            <circle cx="620" cy="160" r="110" fill="rgba(255,255,255,0.14)"/>
            <circle cx="150" cy="470" r="150" fill="rgba(255,255,255,0.08)"/>
            <rect x="90" y="118" width="620" height="364" rx="32" fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.22)"/>
            <text x="110" y="300" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${escapeXml(
                label
            )}</text>
            <text x="110" y="356" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="rgba(255,255,255,0.86)">Curated storefront artwork</text>
        </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizePath(pathValue) {
    const value = normalizeString(pathValue);
    if (!value) {
        return '';
    }
    return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizeSlug(value) {
    return normalizeString(value)
        .toLowerCase()
        .replace(/\/+$/, '');
}

function normalizeSource(value) {
    return normalizeString(value).toLowerCase() === ADAPTER_SOURCE.WF1 ? ADAPTER_SOURCE.WF1 : ADAPTER_SOURCE.MOCK;
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
