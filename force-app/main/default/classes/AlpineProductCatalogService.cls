public without sharing class AlpineProductCatalogService {
    @TestVisible
    private static final Id DEFAULT_DEMO_PRICEBOOK_ID = '01sKh000000pu8fIAA';

    @TestVisible
    private static Id demoPricebookIdOverride;

    private static final Integer DEFAULT_FEATURED_LIMIT = 3;
    private static final String DEFAULT_SITE_NETWORK_NAME = 'B2C - Alpine group';
    private static final String DEFAULT_PUBLIC_CONTENT_CHANNEL_NAME = 'B2C - Alpine group Channel';
    private static final String ALL_CATEGORY_VALUE = 'all';
    private static final String CMS_CONTENT_TYPE_IMAGE = 'sfdc_cms__image';
    private static final String CMS_DELIVERY_API_VERSION = '66.0';
    private static final String CMS_LANGUAGE = 'en_US';
    private static final String CMS_USAGE_LISTING = 'Listing';
    private static final String CMS_USAGE_STANDARD = 'Standard';
    private static final String SORT_FEATURED = 'featured';
    private static final String SORT_NEWEST = 'newest';
    private static final String SORT_PRICE_ASC = 'priceAsc';
    private static final String SORT_PRICE_DESC = 'priceDesc';
    private static final String SORT_NAME_ASC = 'nameAsc';
    private static final Integer SORT_RANK_BASE = 1000000;
    private static CmsDeliveryContext cmsDeliveryContextCache;

    public class CatalogResponse {
        @AuraEnabled public Integer total;
        @AuraEnabled public List<ProductRecord> products;
        @AuraEnabled public List<CategoryOption> categories;

        public CatalogResponse() {
            total = 0;
            products = new List<ProductRecord>();
            categories = new List<CategoryOption>();
        }
    }

    public class FeaturedProductsResponse {
        @AuraEnabled public Integer total;
        @AuraEnabled public List<ProductRecord> products;

        public FeaturedProductsResponse() {
            total = 0;
            products = new List<ProductRecord>();
        }
    }

    public class CategoryOption {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        @AuraEnabled public Integer count;

        public CategoryOption(String label, String value, Integer count) {
            this.label = label;
            this.value = value;
            this.count = count;
        }
    }

    public class ProductRecord {
        @AuraEnabled public String id;
        @AuraEnabled public String sku;
        @AuraEnabled public String slug;
        @AuraEnabled public String name;
        @AuraEnabled public String category;
        @AuraEnabled public Decimal price;
        @AuraEnabled public String currencyIsoCode;
        @AuraEnabled public String formattedPrice;
        @AuraEnabled public String availability;
        @AuraEnabled public String shortDescription;
        @AuraEnabled public String longDescription;
        @AuraEnabled public List<String> badges;
        @AuraEnabled public Decimal sortRank;
        @AuraEnabled public Long releaseOrder;
        @AuraEnabled public List<String> featureHighlights;
        @AuraEnabled public List<FeatureRecord> features;
        @AuraEnabled public List<SpecRecord> specHighlights;
        @AuraEnabled public List<FaqRecord> faqs;
        @AuraEnabled public List<ImageRecord> images;
        @AuraEnabled public ImageRecord listingImage;

        public ProductRecord() {
            badges = new List<String>();
            featureHighlights = new List<String>();
            features = new List<FeatureRecord>();
            specHighlights = new List<SpecRecord>();
            faqs = new List<FaqRecord>();
            images = new List<ImageRecord>();
            availability = '現貨供應';
            currencyIsoCode = 'TWD';
        }
    }

    public class FeatureRecord {
        @AuraEnabled public String title;
        @AuraEnabled public String description;

        public FeatureRecord(String title, String description) {
            this.title = title;
            this.description = description;
        }
    }

    public class SpecRecord {
        @AuraEnabled public String label;
        @AuraEnabled public String value;

        public SpecRecord(String label, String value) {
            this.label = label;
            this.value = value;
        }
    }

    public class FaqRecord {
        @AuraEnabled public String question;
        @AuraEnabled public String answer;

        public FaqRecord(String question, String answer) {
            this.question = question;
            this.answer = answer;
        }
    }

    public class ImageRecord {
        @AuraEnabled public String url;
        @AuraEnabled public String alt;
        @AuraEnabled public String cmsContentId;
        @AuraEnabled public String cmsDeliveryPath;

        public ImageRecord(String url, String alt) {
            this.url = url;
            this.alt = alt;
        }
    }

    private class ProductMediaBundle {
        public List<ImageRecord> images = new List<ImageRecord>();
        public ImageRecord listingImage;
    }

    private class CmsDeliveryContext {
        public String publicChannelId;
        public String siteUrlPathPrefix;
        public String orgId;
        public String language;

        public CmsDeliveryContext(String publicChannelId, String siteUrlPathPrefix, String orgId, String language) {
            this.publicChannelId = publicChannelId;
            this.siteUrlPathPrefix = siteUrlPathPrefix;
            this.orgId = orgId;
            this.language = language;
        }
    }

    public static CatalogResponse listProducts(String category, String sortBy, Integer limitSize) {
        return buildCatalogResponse(loadVisibleProducts(), category, sortBy, null, limitSize);
    }

    public static CatalogResponse searchProducts(String searchTerm, String category, String sortBy, Integer limitSize) {
        return buildCatalogResponse(loadVisibleProducts(), category, sortBy, searchTerm, limitSize);
    }

    public static FeaturedProductsResponse featuredProducts(Integer limitSize) {
        List<ProductRecord> allProducts = loadVisibleProducts();
        List<ProductRecord> sortedProducts = sortProducts(allProducts, SORT_FEATURED);
        Integer safeLimit = normalizeLimit(limitSize, DEFAULT_FEATURED_LIMIT);

        sortedProducts = takeFirst(sortedProducts, safeLimit);

        FeaturedProductsResponse response = new FeaturedProductsResponse();
        response.products = sortedProducts;
        response.total = sortedProducts.size();
        return response;
    }

    public static ProductRecord getProductDetail(String productId, String productSlug, String productSku) {
        String normalizedId = normalizeString(productId);
        String normalizedSlug = normalizeSlug(productSlug);
        String normalizedSku = normalizeString(productSku).toLowerCase();

        for (ProductRecord product : loadVisibleProducts()) {
            if (!String.isBlank(normalizedId) && product.id == normalizedId) {
                return product;
            }

            if (!String.isBlank(normalizedSlug) && product.slug == normalizedSlug) {
                return product;
            }

            if (!String.isBlank(normalizedSku) && normalizeString(product.sku).toLowerCase() == normalizedSku) {
                return product;
            }
        }

        throwHandledException('找不到對應商品，請返回商品列表重新選擇。');
        return null;
    }

    private static CatalogResponse buildCatalogResponse(
        List<ProductRecord> allProducts,
        String category,
        String sortBy,
        String searchTerm,
        Integer limitSize
    ) {
        List<ProductRecord> filteredProducts = new List<ProductRecord>();
        String normalizedCategory = normalizeString(category);
        String normalizedSearchTerm = normalizeString(searchTerm).toLowerCase();

        for (ProductRecord product : allProducts) {
            if (!matchesCategory(product, normalizedCategory)) {
                continue;
            }

            if (!matchesSearch(product, normalizedSearchTerm)) {
                continue;
            }

            filteredProducts.add(product);
        }

        filteredProducts = sortProducts(filteredProducts, sortBy);

        Integer safeLimit = normalizeLimit(limitSize, 0);
        if (safeLimit > 0) {
            filteredProducts = takeFirst(filteredProducts, safeLimit);
        }

        CatalogResponse response = new CatalogResponse();
        response.products = filteredProducts;
        response.total = filteredProducts.size();
        response.categories = buildCategoryOptions(allProducts);
        return response;
    }

    private static List<ProductRecord> loadVisibleProducts() {
        Id demoPricebookId = resolveDemoPricebookId();
        ensureDemoPricebookAvailable(demoPricebookId);

        List<PricebookEntry> entries = [
            SELECT
                Id,
                CurrencyIsoCode,
                UnitPrice,
                IsActive,
                Product2Id,
                Product2.Id,
                Product2.Name,
                Product2.ProductCode,
                Product2.Description,
                Product2.DisplayUrl,
                Product2.Family,
                Product2.Show_on_Alpine__c,
                Product2.Alpine_Category__c,
                Product2.Alpine_Badge__c,
                Product2.Alpine_Short_Description__c,
                Product2.Alpine_Sort_Order__c,
                Product2.CreatedDate,
                Product2.IsActive
            FROM PricebookEntry
            WHERE Pricebook2Id = :demoPricebookId
                AND IsActive = true
                AND Product2.IsActive = true
            ORDER BY Product2.Name ASC
        ];
        Map<String, ProductMediaBundle> mediaByProductId = buildProductMediaByProductId(entries);
        Boolean hasExplicitVisibility = hasExplicitProductVisibility(entries);
        List<ProductRecord> products = new List<ProductRecord>();
        for (PricebookEntry entry : entries) {
            if (hasExplicitVisibility && entry.Product2.Show_on_Alpine__c != true) {
                continue;
            }

            if (containsProduct(products, (String) entry.Product2Id)) {
                continue;
            }

            products.add(toProductRecord(entry, mediaByProductId.get((String) entry.Product2Id)));
        }

        return products;
    }

    private static void ensureDemoPricebookAvailable(Id pricebookId) {
        List<Pricebook2> pricebooks = [
            SELECT Id, Name, IsActive
            FROM Pricebook2
            WHERE Id = :pricebookId
            LIMIT 1
        ];

        if (pricebooks.isEmpty()) {
            throwHandledException(
                '找不到商城使用的 Pricebook。請到 Alpine Storefront 設定後台更新 Pricebook2 Id。'
            );
        }

        if (!pricebooks[0].IsActive) {
            throwHandledException('目前設定的 Pricebook 尚未啟用。');
        }
    }

    private static ProductRecord toProductRecord(PricebookEntry entry, ProductMediaBundle mediaBundle) {
        ProductRecord product = new ProductRecord();
        product.id = (String) entry.Product2Id;
        product.sku = normalizeString(entry.Product2.ProductCode);
        product.slug = buildSlug(entry.Product2.Name, product.sku, product.id);
        product.name = normalizeString(entry.Product2.Name);
        product.category = resolveCategory(entry.Product2);
        product.price = entry.UnitPrice;
        product.currencyIsoCode = normalizeString(entry.CurrencyIsoCode);
        product.formattedPrice = formatPrice(entry.UnitPrice, product.currencyIsoCode);
        product.shortDescription = resolveShortDescription(entry.Product2);
        product.longDescription = toRichText(entry.Product2.Description, product.shortDescription);
        product.badges = splitMultiValueField(entry.Product2.Alpine_Badge__c);
        product.sortRank = resolveSortRank(entry.Product2);
        product.releaseOrder = entry.Product2.CreatedDate == null ? 0 : entry.Product2.CreatedDate.getTime();
        product.featureHighlights = new List<String>();
        product.features = new List<FeatureRecord>();
        product.specHighlights = new List<SpecRecord>();
        product.faqs = new List<FaqRecord>();

        if (mediaBundle != null) {
            if (mediaBundle.listingImage != null) {
                product.listingImage = cloneImageRecord(mediaBundle.listingImage);
            }

            if (!mediaBundle.images.isEmpty()) {
                product.images.addAll(cloneImageRecords(mediaBundle.images));
            }
        }

        applyDisplayUrlFallback(product, entry.Product2.DisplayUrl);

        if (product.images.isEmpty() && !String.isBlank(entry.Product2.DisplayUrl)) {
            product.images.add(new ImageRecord(entry.Product2.DisplayUrl, product.name));
        }

        if (product.listingImage == null && !product.images.isEmpty()) {
            product.listingImage = cloneImageRecord(product.images[0]);
        }

        return product;
    }

    private static Boolean hasExplicitProductVisibility(List<PricebookEntry> entries) {
        for (PricebookEntry entry : entries) {
            if (entry.Product2.Show_on_Alpine__c == true) {
                return true;
            }
        }

        return false;
    }

    private static void applyDisplayUrlFallback(ProductRecord product, String fallbackUrl) {
        if (String.isBlank(fallbackUrl)) {
            return;
        }

        if (product.listingImage != null && String.isBlank(product.listingImage.url)) {
            product.listingImage.url = fallbackUrl;
        }

        for (ImageRecord image : product.images) {
            if (String.isBlank(image.url)) {
                image.url = fallbackUrl;
            }
        }
    }

    private static Map<String, ProductMediaBundle> buildProductMediaByProductId(List<PricebookEntry> entries) {
        Map<String, ProductMediaBundle> bundlesByProductId = new Map<String, ProductMediaBundle>();
        Set<Id> productIds = new Set<Id>();
        for (PricebookEntry entry : entries) {
            if (entry.Product2Id != null) {
                productIds.add(entry.Product2Id);
            }
        }

        if (productIds.isEmpty()) {
            return bundlesByProductId;
        }

        CmsDeliveryContext cmsDeliveryContext = resolveCmsDeliveryContext();
        if (cmsDeliveryContext == null) {
            return bundlesByProductId;
        }

        List<ProductMedia> mediaRecords = [
            SELECT ProductId, ElectronicMediaId, ElectronicMediaGroup.UsageType, SortOrder
            FROM ProductMedia
            WHERE ProductId IN :productIds
                AND ElectronicMediaId != null
            ORDER BY ProductId ASC, SortOrder ASC
        ];
        if (mediaRecords.isEmpty()) {
            return bundlesByProductId;
        }

        Set<Id> mediaContentIds = new Set<Id>();
        for (ProductMedia mediaRecord : mediaRecords) {
            mediaContentIds.add(mediaRecord.ElectronicMediaId);
        }

        Map<Id, ManagedContent> managedContentById = new Map<Id, ManagedContent>();
        if (!mediaContentIds.isEmpty()) {
            managedContentById = new Map<Id, ManagedContent>([
                SELECT Id, Name, ContentTypeFullyQualifiedName
                FROM ManagedContent
                WHERE Id IN :mediaContentIds
            ]);
        }

        Map<String, Set<String>> seenStandardContentByProductId = new Map<String, Set<String>>();
        for (ProductMedia mediaRecord : mediaRecords) {
            ManagedContent mediaContent = managedContentById.get(mediaRecord.ElectronicMediaId);
            if (mediaContent == null || mediaContent.ContentTypeFullyQualifiedName != CMS_CONTENT_TYPE_IMAGE) {
                continue;
            }

            String productId = (String) mediaRecord.ProductId;
            ProductMediaBundle bundle = getOrCreateMediaBundle(bundlesByProductId, productId);
            ImageRecord image = buildManagedContentImageRecord(mediaContent, cmsDeliveryContext);
            String usageType = normalizeString(mediaRecord.ElectronicMediaGroup == null ? null : mediaRecord.ElectronicMediaGroup.UsageType);

            if (usageType == CMS_USAGE_LISTING) {
                if (bundle.listingImage == null) {
                    bundle.listingImage = image;
                }
                continue;
            }

            if (usageType != CMS_USAGE_STANDARD && !String.isBlank(usageType)) {
                continue;
            }

            if (!seenStandardContentByProductId.containsKey(productId)) {
                seenStandardContentByProductId.put(productId, new Set<String>());
            }

            String dedupeKey = normalizeString(image.cmsContentId);
            if (seenStandardContentByProductId.get(productId).contains(dedupeKey)) {
                continue;
            }

            seenStandardContentByProductId.get(productId).add(dedupeKey);
            bundle.images.add(image);
        }

        for (String productId : bundlesByProductId.keySet()) {
            ProductMediaBundle bundle = bundlesByProductId.get(productId);
            if (bundle.listingImage == null && !bundle.images.isEmpty()) {
                bundle.listingImage = cloneImageRecord(bundle.images[0]);
            }
        }

        return bundlesByProductId;
    }

    private static ProductMediaBundle getOrCreateMediaBundle(Map<String, ProductMediaBundle> bundlesByProductId, String productId) {
        if (!bundlesByProductId.containsKey(productId)) {
            bundlesByProductId.put(productId, new ProductMediaBundle());
        }
        return bundlesByProductId.get(productId);
    }

    private static ImageRecord buildManagedContentImageRecord(ManagedContent mediaContent, CmsDeliveryContext cmsDeliveryContext) {
        ImageRecord image = new ImageRecord('', normalizeString(mediaContent.Name));
        image.cmsContentId = (String) mediaContent.Id;
        image.cmsDeliveryPath = buildCmsDeliveryPath(cmsDeliveryContext, image.cmsContentId);
        return image;
    }

    private static String buildCmsDeliveryPath(CmsDeliveryContext cmsDeliveryContext, String managedContentId) {
        if (
            cmsDeliveryContext == null ||
            String.isBlank(cmsDeliveryContext.siteUrlPathPrefix) ||
            String.isBlank(cmsDeliveryContext.publicChannelId) ||
            String.isBlank(managedContentId)
        ) {
            return null;
        }

        return '/' +
            cmsDeliveryContext.siteUrlPathPrefix +
            '/cms/delivery/v' +
            CMS_DELIVERY_API_VERSION +
            '/' +
            cmsDeliveryContext.publicChannelId +
            '/contents/' +
            managedContentId +
            '?oid=' +
            EncodingUtil.urlEncode(cmsDeliveryContext.orgId, 'UTF-8') +
            '&language=' +
            EncodingUtil.urlEncode(cmsDeliveryContext.language, 'UTF-8');
    }

    private static CmsDeliveryContext resolveCmsDeliveryContext() {
        if (cmsDeliveryContextCache != null) {
            return cmsDeliveryContextCache;
        }

        if (!AlpineStorefrontConfigService.isCmsMediaEnabled(true)) {
            return null;
        }

        String publicChannelName = AlpineStorefrontConfigService.resolvePublicContentChannelName(
            DEFAULT_PUBLIC_CONTENT_CHANNEL_NAME
        );
        String siteNetworkName = AlpineStorefrontConfigService.resolveSiteNetworkName(DEFAULT_SITE_NETWORK_NAME);
        String cmsLanguage = AlpineStorefrontConfigService.resolveCmsLanguage(CMS_LANGUAGE);

        List<ManagedContentChannel> publicChannels = [
            SELECT Id
            FROM ManagedContentChannel
            WHERE Name = :publicChannelName
                AND Type = 'PublicUnauthenticated'
            LIMIT 1
        ];
        List<Network> networks = [
            SELECT UrlPathPrefix
            FROM Network
            WHERE Name = :siteNetworkName
            LIMIT 1
        ];

        if (publicChannels.isEmpty() || networks.isEmpty() || String.isBlank(networks[0].UrlPathPrefix)) {
            return null;
        }

        cmsDeliveryContextCache = new CmsDeliveryContext(
            (String) publicChannels[0].Id,
            networks[0].UrlPathPrefix,
            UserInfo.getOrganizationId(),
            cmsLanguage
        );
        return cmsDeliveryContextCache;
    }

    private static ImageRecord cloneImageRecord(ImageRecord source) {
        if (source == null) {
            return null;
        }

        ImageRecord copy = new ImageRecord(source.url, source.alt);
        copy.cmsContentId = source.cmsContentId;
        copy.cmsDeliveryPath = source.cmsDeliveryPath;
        return copy;
    }

    private static List<ImageRecord> cloneImageRecords(List<ImageRecord> source) {
        List<ImageRecord> copies = new List<ImageRecord>();
        for (ImageRecord image : source) {
            copies.add(cloneImageRecord(image));
        }
        return copies;
    }

    private static List<CategoryOption> buildCategoryOptions(List<ProductRecord> products) {
        Map<String, Integer> countsByCategory = new Map<String, Integer>();

        for (ProductRecord product : products) {
            String category = normalizeString(product.category);
            if (String.isBlank(category)) {
                continue;
            }

            countsByCategory.put(category, (countsByCategory.containsKey(category) ? countsByCategory.get(category) : 0) + 1);
        }

        List<String> categoryLabels = new List<String>(countsByCategory.keySet());
        categoryLabels.sort();

        List<CategoryOption> options = new List<CategoryOption>{
            new CategoryOption('全部商品', ALL_CATEGORY_VALUE, products.size())
        };

        for (String label : categoryLabels) {
            options.add(new CategoryOption(label, label, countsByCategory.get(label)));
        }

        return options;
    }

    private static List<ProductRecord> sortProducts(List<ProductRecord> products, String sortBy) {
        List<SortEnvelope> envelopes = new List<SortEnvelope>();
        String normalizedSort = normalizeSortBy(sortBy);

        for (ProductRecord product : products) {
            envelopes.add(new SortEnvelope(product, normalizedSort));
        }

        envelopes.sort();

        List<ProductRecord> sortedProducts = new List<ProductRecord>();
        for (SortEnvelope envelope : envelopes) {
            sortedProducts.add(envelope.product);
        }

        return sortedProducts;
    }

    private static List<ProductRecord> takeFirst(List<ProductRecord> products, Integer limitSize) {
        if (limitSize <= 0 || products.size() <= limitSize) {
            return products;
        }

        List<ProductRecord> limitedProducts = new List<ProductRecord>();
        for (Integer index = 0; index < limitSize; index++) {
            limitedProducts.add(products[index]);
        }

        return limitedProducts;
    }

    private static Boolean matchesCategory(ProductRecord product, String category) {
        if (String.isBlank(category) || category.toLowerCase() == ALL_CATEGORY_VALUE) {
            return true;
        }

        return normalizeString(product.category).toLowerCase() == category.toLowerCase();
    }

    private static Boolean matchesSearch(ProductRecord product, String searchTerm) {
        if (String.isBlank(searchTerm)) {
            return true;
        }

        List<String> tokens = searchTerm.split('\\s+');
        String searchableText = String.join(
            new List<String>{
                normalizeString(product.name),
                normalizeString(product.sku),
                normalizeString(product.category),
                normalizeString(product.shortDescription),
                stripHtml(product.longDescription),
                String.join(product.badges, ' ')
            },
            ' '
        ).toLowerCase();

        for (String token : tokens) {
            if (String.isBlank(token)) {
                continue;
            }

            if (!searchableText.contains(token)) {
                return false;
            }
        }

        return true;
    }

    private static String resolveCategory(Product2 product) {
        String category = normalizeString(product.Alpine_Category__c);
        if (String.isBlank(category)) {
            category = normalizeString(product.Family);
        }
        return String.isBlank(category) ? '其他' : category;
    }

    private static String resolveShortDescription(Product2 product) {
        String shortDescription = normalizeString(product.Alpine_Short_Description__c);
        if (String.isBlank(shortDescription)) {
            shortDescription = normalizeString(product.Description);
        }
        return String.isBlank(shortDescription) ? '商品短描述尚未提供。' : shortDescription;
    }

    private static Decimal resolveSortRank(Product2 product) {
        if (product.Alpine_Sort_Order__c != null) {
            return SORT_RANK_BASE - product.Alpine_Sort_Order__c;
        }

        return 0;
    }

    private static Boolean containsProduct(List<ProductRecord> products, String productId) {
        for (ProductRecord product : products) {
            if (product.id == productId) {
                return true;
            }
        }

        return false;
    }

    private static String toRichText(String description, String fallback) {
        String sourceText = normalizeString(description);
        if (String.isBlank(sourceText)) {
            sourceText = normalizeString(fallback);
        }

        if (String.isBlank(sourceText)) {
            return '<p>商品詳細介紹尚未提供。</p>';
        }

        List<String> paragraphs = new List<String>();
        for (String block : sourceText.split('(\\r\\n|\\n|\\r)+')) {
            String normalizedBlock = normalizeString(block);
            if (String.isBlank(normalizedBlock)) {
                continue;
            }

            paragraphs.add('<p>' + escapeHtml(normalizedBlock) + '</p>');
        }

        if (paragraphs.isEmpty()) {
            return '<p>商品詳細介紹尚未提供。</p>';
        }

        return String.join(paragraphs, '');
    }

    private static List<String> splitMultiValueField(String value) {
        List<String> results = new List<String>();
        Set<String> seenValues = new Set<String>();

        for (String token : normalizeString(value).split('[\\n\\r,;|]+')) {
            String normalizedToken = normalizeString(token);
            if (String.isBlank(normalizedToken)) {
                continue;
            }

            String dedupeKey = normalizedToken.toLowerCase();
            if (seenValues.contains(dedupeKey)) {
                continue;
            }

            seenValues.add(dedupeKey);
            results.add(normalizedToken);
        }

        return results;
    }

    private static String formatPrice(Decimal amount, String currencyIsoCode) {
        if (amount == null) {
            return '請洽客服';
        }

        return amount.setScale(0, System.RoundingMode.HALF_UP).format();
    }

    private static String stripHtml(String value) {
        return normalizeString(value).replaceAll('<[^>]+>', ' ');
    }

    private static String buildSlug(String name, String sku, String fallbackId) {
        String slugSource = normalizeString(name);
        if (String.isBlank(slugSource)) {
            slugSource = normalizeString(sku);
        }
        if (String.isBlank(slugSource)) {
            slugSource = normalizeString(fallbackId);
        }

        String slug = slugSource.toLowerCase().replaceAll('[^a-z0-9]+', '-');
        slug = slug.replaceAll('^-+', '').replaceAll('-+$', '');
        return String.isBlank(slug) ? normalizeString(fallbackId) : slug;
    }

    private static String normalizeSlug(String value) {
        return buildSlug(value, null, null);
    }

    private static String normalizeSortBy(String value) {
        String normalizedValue = normalizeString(value);
        if (
            normalizedValue == SORT_NEWEST ||
            normalizedValue == SORT_PRICE_ASC ||
            normalizedValue == SORT_PRICE_DESC ||
            normalizedValue == SORT_NAME_ASC
        ) {
            return normalizedValue;
        }

        return SORT_FEATURED;
    }

    private static Integer normalizeLimit(Integer requestedLimit, Integer defaultLimit) {
        if (requestedLimit == null) {
            return defaultLimit;
        }

        return requestedLimit < 0 ? 0 : requestedLimit;
    }

    private static Id resolveDemoPricebookId() {
        if (Test.isRunningTest() && demoPricebookIdOverride != null) {
            return demoPricebookIdOverride;
        }

        return AlpineStorefrontConfigService.resolveDemoPricebookId(DEFAULT_DEMO_PRICEBOOK_ID);
    }

    private static String normalizeString(String value) {
        return value == null ? '' : value.trim();
    }

    private static String escapeHtml(String value) {
        return normalizeString(value)
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace('\'', '&#39;');
    }

    private static void throwHandledException(String message) {
        AuraHandledException handledException = new AuraHandledException(message);
        handledException.setMessage(message);
        throw handledException;
    }

    private class SortEnvelope implements Comparable {
        private ProductRecord product;
        private String sortBy;

        private SortEnvelope(ProductRecord product, String sortBy) {
            this.product = product;
            this.sortBy = sortBy;
        }

        public Integer compareTo(Object otherObject) {
            SortEnvelope other = (SortEnvelope) otherObject;
            Integer comparison = 0;

            if (sortBy == SORT_NEWEST) {
                comparison = compareLongs(product.releaseOrder, other.product.releaseOrder, false);
            } else if (sortBy == SORT_PRICE_ASC) {
                comparison = compareDecimals(product.price, other.product.price, true);
            } else if (sortBy == SORT_PRICE_DESC) {
                comparison = compareDecimals(product.price, other.product.price, false);
            } else if (sortBy == SORT_NAME_ASC) {
                comparison = compareStrings(product.name, other.product.name, true);
            } else {
                comparison = compareDecimals(product.sortRank, other.product.sortRank, false);
            }

            if (comparison != 0) {
                return comparison;
            }

            comparison = compareStrings(product.name, other.product.name, true);
            if (comparison != 0) {
                return comparison;
            }

            return compareStrings(product.id, other.product.id, true);
        }
    }

    private static Integer compareDecimals(Decimal leftValue, Decimal rightValue, Boolean ascending) {
        if (leftValue == null && rightValue == null) {
            return 0;
        }

        if (leftValue == null) {
            return 1;
        }

        if (rightValue == null) {
            return -1;
        }

        Integer comparison = leftValue == rightValue ? 0 : (leftValue < rightValue ? -1 : 1);
        return ascending ? comparison : 0 - comparison;
    }

    private static Integer compareLongs(Long leftValue, Long rightValue, Boolean ascending) {
        if (leftValue == null && rightValue == null) {
            return 0;
        }

        if (leftValue == null) {
            return 1;
        }

        if (rightValue == null) {
            return -1;
        }

        Integer comparison = leftValue == rightValue ? 0 : (leftValue < rightValue ? -1 : 1);
        return ascending ? comparison : 0 - comparison;
    }

    private static Integer compareStrings(String leftValue, String rightValue, Boolean ascending) {
        String normalizedLeft = normalizeString(leftValue).toLowerCase();
        String normalizedRight = normalizeString(rightValue).toLowerCase();
        Integer comparison = normalizedLeft.compareTo(normalizedRight);
        return ascending ? comparison : 0 - comparison;
    }
}
