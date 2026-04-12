public without sharing class AlpineStorefrontProbeController {
    @TestVisible
    private static final String DEFAULT_BASE_PATH = '/alpine';

    @TestVisible
    private static final Integer DEFAULT_PUBLIC_PRODUCT_LIMIT = 4;

    @TestVisible
    private static final Integer DEFAULT_CATEGORY_CHIP_LIMIT = 4;

    public class ProbeResponse {
        @AuraEnabled public String basePathLabel;
        @AuraEnabled public String summary;
        @AuraEnabled public String requestPath;
        @AuraEnabled public String catalogNote;
        @AuraEnabled public StorefrontShell storefront;
        @AuraEnabled public List<CategoryChip> quickLinks = new List<CategoryChip>();
        @AuraEnabled public List<ProductCard> products = new List<ProductCard>();
        @AuraEnabled public List<ObjectProbe> objects = new List<ObjectProbe>();
    }

    public class StorefrontShell {
        @AuraEnabled public String storeName;
        @AuraEnabled public String storeTagline;
        @AuraEnabled public String searchPlaceholder;
        @AuraEnabled public String heroEyebrow;
        @AuraEnabled public String heroTitle;
        @AuraEnabled public String heroBody;
        @AuraEnabled public String heroPrimaryCtaLabel;
        @AuraEnabled public String heroSecondaryCtaLabel;
        @AuraEnabled public String sectionTitle;
        @AuraEnabled public String sectionIntro;
        @AuraEnabled public String promoTitle;
        @AuraEnabled public String promoBody;
        @AuraEnabled public String promoCtaLabel;
        @AuraEnabled public String footerCopy;
    }

    public class CategoryChip {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        @AuraEnabled public Integer count;
    }

    public class ProductCard {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String category;
        @AuraEnabled public String formattedPrice;
        @AuraEnabled public String shortDescription;
        @AuraEnabled public String imageUrl;
        @AuraEnabled public String imageAlt;
        @AuraEnabled public String detailPath;
        @AuraEnabled public String badgeLabel;
    }

    public class ObjectProbe {
        @AuraEnabled public String apiName;
        @AuraEnabled public String label;
        @AuraEnabled public Boolean isAccessible;
        @AuraEnabled public String note;
        @AuraEnabled public Integer sampleCount;
        @AuraEnabled public List<RecordProbe> records = new List<RecordProbe>();
    }

    public class RecordProbe {
        @AuraEnabled public String id;
        @AuraEnabled public String title;
        @AuraEnabled public String subtitle;
    }

    @AuraEnabled(cacheable=true)
    public static ProbeResponse getGuestProbe() {
        ProbeResponse response = new ProbeResponse();
        response.basePathLabel = DEFAULT_BASE_PATH;
        response.requestPath = response.basePathLabel + '/request';
        response.storefront = buildStorefrontShell();
        response.objects.add(probeProducts());
        response.objects.add(probeStorefrontConfig());
        hydrateCatalog(response);
        response.summary = buildSummary(response.objects);
        return response;
    }

    private static void hydrateCatalog(ProbeResponse response) {
        try {
            AlpineProductCatalogService.CatalogResponse catalog = AlpineProductCatalogService.listProducts(
                null,
                'featured',
                DEFAULT_PUBLIC_PRODUCT_LIMIT
            );

            response.quickLinks = toCategoryChips(catalog.categories);
            response.products = toProductCards(catalog.products, response.basePathLabel);
            response.catalogNote = response.products.isEmpty()
                ? '公開路由已開通，但目前沒有可顯示的公開商品。'
                : response.products.size() + ' 個商品已可匿名載入。';
        } catch (Exception ex) {
            response.catalogNote = '公開商品暫時無法載入：' + ex.getMessage();
        }
    }

    private static StorefrontShell buildStorefrontShell() {
        AlpineStorefrontConfigService.PublicConfig config = AlpineStorefrontConfigService.getPublicConfig();
        StorefrontShell shell = new StorefrontShell();
        shell.storeName = valueOrFallback(config.storeName, 'Alpine');
        shell.storeTagline = valueOrFallback(config.storeTagline, 'Public mobile storefront');
        shell.searchPlaceholder = valueOrFallback(config.searchPlaceholder, '搜尋公開商品');
        shell.heroEyebrow = valueOrFallback(config.heroEyebrow, 'Mobile storefront');
        shell.heroTitle = valueOrFallback(config.heroTitle, '公開手機版 storefront 已經接上真實資料。');
        shell.heroBody = valueOrFallback(
            config.heroBody,
            '這一版先維持最薄殼，只驗證匿名路由、LWC、Apex 與公開商品清單都能一起工作。'
        );
        shell.heroPrimaryCtaLabel = valueOrFallback(config.heroPrimaryCtaLabel, '瀏覽商品');
        shell.heroSecondaryCtaLabel = valueOrFallback(config.heroSecondaryCtaLabel, '詢問專人');
        shell.sectionTitle = valueOrFallback(config.technologyTitle, '公開商品清單');
        shell.sectionIntro = valueOrFallback(
            config.technologyIntro,
            '先用最小的商品卡片驗證手機版殼層與匿名 catalog query。'
        );
        shell.promoTitle = valueOrFallback(config.recommendationsPromoTitle, '需要人工協助？');
        shell.promoBody = valueOrFallback(
            config.recommendationsPromoBody,
            '如果你要詢價、團購或企業需求，先走 request 流程，先不要把 checkout 搬進來。'
        );
        shell.promoCtaLabel = valueOrFallback(config.recommendationsPromoCtaLabel, '前往需求單');
        shell.footerCopy = valueOrFallback(
            config.footerCopy,
            '這個 public mobile shell 會是後續搬舊 storefront 的新基底。'
        );
        return shell;
    }

    private static List<CategoryChip> toCategoryChips(List<AlpineProductCatalogService.CategoryOption> categories) {
        List<CategoryChip> chips = new List<CategoryChip>();
        if (categories == null) {
            return chips;
        }

        Integer limitCounter = 0;
        for (AlpineProductCatalogService.CategoryOption option : categories) {
            if (option == null || String.isBlank(option.label)) {
                continue;
            }

            CategoryChip chip = new CategoryChip();
            chip.label = option.label;
            chip.value = option.value;
            chip.count = option.count;
            chips.add(chip);
            limitCounter++;

            if (limitCounter >= DEFAULT_CATEGORY_CHIP_LIMIT) {
                break;
            }
        }

        return chips;
    }

    private static List<ProductCard> toProductCards(
        List<AlpineProductCatalogService.ProductRecord> products,
        String basePath
    ) {
        List<ProductCard> cards = new List<ProductCard>();
        if (products == null) {
            return cards;
        }

        for (AlpineProductCatalogService.ProductRecord product : products) {
            if (product == null) {
                continue;
            }

            ProductCard card = new ProductCard();
            card.id = product.id;
            card.name = valueOrFallback(product.name, 'Untitled Product');
            card.category = valueOrFallback(product.category, 'General');
            card.formattedPrice = valueOrFallback(product.formattedPrice, '暫無售價');
            card.shortDescription = valueOrFallback(
                product.shortDescription,
                '公開 catalog 已經可匿名載入，但這張卡片還沒有補上更多描述。'
            );
            card.imageUrl = product.listingImage == null ? '' : valueOrFallback(product.listingImage.url, '');
            card.imageAlt = product.listingImage == null
                ? card.name
                : valueOrFallback(product.listingImage.alt, card.name);
            card.detailPath = buildDetailPath(basePath, product.slug, product.id);
            card.badgeLabel = resolveBadgeLabel(product);
            cards.add(card);
        }

        return cards;
    }

    private static String resolveBadgeLabel(AlpineProductCatalogService.ProductRecord product) {
        if (product.badges != null && !product.badges.isEmpty() && !String.isBlank(product.badges[0])) {
            return product.badges[0];
        }

        return valueOrFallback(product.category, '精選商品');
    }

    private static String buildDetailPath(String basePath, String slug, String productId) {
        if (!String.isBlank(slug)) {
            return valueOrFallback(basePath, DEFAULT_BASE_PATH) + '/product/' + slug;
        }

        if (!String.isBlank(productId)) {
            return valueOrFallback(basePath, DEFAULT_BASE_PATH) + '/product/item/' + productId;
        }

        return '';
    }

    private static ObjectProbe probeProducts() {
        ObjectProbe probe = new ObjectProbe();
        probe.apiName = 'Product2';
        probe.label = 'Catalog Access';
        probe.isAccessible = Schema.sObjectType.Product2.isAccessible();

        if (!probe.isAccessible) {
            probe.note = 'Guest user cannot read Product2.';
            probe.sampleCount = 0;
            return probe;
        }

        try {
            for (Product2 product : [
                SELECT Id, Name, ProductCode, Family
                FROM Product2
                WHERE IsActive = true
                ORDER BY LastModifiedDate DESC
                LIMIT 5
            ]) {
                probe.records.add(toRecord(product.Id, product.Name, joinParts(product.ProductCode, product.Family)));
            }

            probe.sampleCount = probe.records.size();
            probe.note = probe.records.isEmpty()
                ? 'Product2 is readable, but there are no active products to show.'
                : 'Guest user can read Product2 and return live sample rows.';
        } catch (Exception ex) {
            probe.sampleCount = 0;
            probe.note = 'Product2 query failed: ' + ex.getMessage();
        }

        return probe;
    }

    private static ObjectProbe probeStorefrontConfig() {
        ObjectProbe probe = new ObjectProbe();
        probe.apiName = 'Alpine_Storefront_Config__c';
        probe.label = 'Storefront Config';
        probe.isAccessible = Schema.sObjectType.Alpine_Storefront_Config__c.isAccessible();

        if (!probe.isAccessible) {
            probe.note = 'Guest user cannot read Alpine_Storefront_Config__c.';
            probe.sampleCount = 0;
            return probe;
        }

        try {
            for (Alpine_Storefront_Config__c config : [
                SELECT Id, Name, Store_Name__c, Site_Network_Name__c
                FROM Alpine_Storefront_Config__c
                ORDER BY LastModifiedDate DESC
                LIMIT 1
            ]) {
                probe.records.add(
                    toRecord(config.Id, valueOrFallback(config.Store_Name__c, config.Name), config.Site_Network_Name__c)
                );
            }

            probe.sampleCount = probe.records.size();
            probe.note = probe.records.isEmpty()
                ? 'Config object is readable, but there is no storefront config record yet.'
                : 'Guest user can read the storefront config record.';
        } catch (Exception ex) {
            probe.sampleCount = 0;
            probe.note = 'Config query failed: ' + ex.getMessage();
        }

        return probe;
    }

    private static RecordProbe toRecord(Id recordId, String title, String subtitle) {
        RecordProbe probe = new RecordProbe();
        probe.id = (String) recordId;
        probe.title = valueOrFallback(title, 'Untitled');
        probe.subtitle = valueOrFallback(subtitle, 'No secondary value');
        return probe;
    }

    private static String buildSummary(List<ObjectProbe> probes) {
        Integer accessibleCount = 0;

        for (ObjectProbe probe : probes) {
            if (probe != null && probe.isAccessible == true) {
                accessibleCount++;
            }
        }

        return accessibleCount + ' / ' + probes.size() + ' guest access checks readable.';
    }

    private static String joinParts(String firstValue, String secondValue) {
        List<String> values = new List<String>();

        if (!String.isBlank(firstValue)) {
            values.add(firstValue);
        }
        if (!String.isBlank(secondValue)) {
            values.add(secondValue);
        }

        return values.isEmpty() ? '' : String.join(values, ' · ');
    }

    private static String valueOrFallback(String value, String fallbackValue) {
        return String.isBlank(value) ? fallbackValue : value;
    }
}
