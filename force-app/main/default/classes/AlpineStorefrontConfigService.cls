public without sharing class AlpineStorefrontConfigService {
    @TestVisible
    private static final String DEFAULT_RECORD_NAME = 'Default';
    @TestVisible
    private static final String DEFAULT_STORE_NAME = 'Alpine 健康生活館';
    @TestVisible
    private static final String DEFAULT_STORE_TAGLINE = '每日補給、輕運動與安心保養';
    @TestVisible
    private static final String DEFAULT_SEARCH_PLACEHOLDER = '搜尋燕麥穀物、機能飲、恢復補給與健康好物';
    @TestVisible
    private static final String DEFAULT_HERO_EYEBROW = '每日補給';
    @TestVisible
    private static final String DEFAULT_HERO_TITLE = '每日補給，一站買齊';
    @TestVisible
    private static final String DEFAULT_HERO_BODY =
        '早餐、機能飲、日常營養，補貨更快。';
    @TestVisible
    private static final String DEFAULT_HERO_PRIMARY_CTA_LABEL = '開始選購';
    @TestVisible
    private static final String DEFAULT_HERO_SECONDARY_CTA_LABEL = '詢問專人';
    @TestVisible
    private static final String DEFAULT_FLASH_SALE_TITLE = '每日補給快閃';
    @TestVisible
    private static final String DEFAULT_FLASH_SALE_INTRO =
        '挑出早餐穀物、運動飲與高回購機能品做短時優惠，讓你在固定補貨時更容易掌握價格與節奏。';
    @TestVisible
    private static final String DEFAULT_TECHNOLOGY_TITLE = '人氣補給';
    @TestVisible
    private static final String DEFAULT_TECHNOLOGY_INTRO =
        '集中呈現回購率高的燕麥穀物、機能飲與日常營養選品，適合快速補貨與日常搭配。';
    @TestVisible
    private static final String DEFAULT_RECOMMENDATIONS_TITLE = '為你推薦的健康好物';
    @TestVisible
    private static final String DEFAULT_RECOMMENDATIONS_PROMO_TITLE = '團購補貨與企業方案';
    @TestVisible
    private static final String DEFAULT_RECOMMENDATIONS_PROMO_BODY =
        '如果你要辦公室茶水間補貨、員購、健身社團或企業禮盒搭配，可先送出需求，由專人協助整理組合。';
    @TestVisible
    private static final String DEFAULT_RECOMMENDATIONS_PROMO_CTA_LABEL = '聯絡我們';
    @TestVisible
    private static final String DEFAULT_FOOTER_COPY =
        '從每日早餐、運動補給到恢復保養，全站以一致的中文選購體驗整理健康生活商品，讓回購與補貨更輕鬆。';
    @TestVisible
    private static final String DEFAULT_SITE_NETWORK_NAME = 'B2C - Alpine group';
    @TestVisible
    private static final String DEFAULT_PUBLIC_CONTENT_CHANNEL_NAME = 'B2C - Alpine group Channel';
    @TestVisible
    private static final String DEFAULT_CMS_LANGUAGE = 'en_US';

    private static Alpine_Storefront_Config__c cachedRecord;

    public class PublicConfig {
        @AuraEnabled public String storeName;
        @AuraEnabled public String storeTagline;
        @AuraEnabled public String logoImageUrl;
        @AuraEnabled public String searchPlaceholder;
        @AuraEnabled public String heroEyebrow;
        @AuraEnabled public String heroTitle;
        @AuraEnabled public String heroBody;
        @AuraEnabled public String heroPrimaryCtaLabel;
        @AuraEnabled public String heroSecondaryCtaLabel;
        @AuraEnabled public String flashSaleTitle;
        @AuraEnabled public String flashSaleIntro;
        @AuraEnabled public String technologyTitle;
        @AuraEnabled public String technologyIntro;
        @AuraEnabled public String recommendationsTitle;
        @AuraEnabled public String recommendationsPromoTitle;
        @AuraEnabled public String recommendationsPromoBody;
        @AuraEnabled public String recommendationsPromoCtaLabel;
        @AuraEnabled public String footerCopy;
    }

    public class AdminConfig {
        @AuraEnabled public Id recordId;
        @AuraEnabled public String storeName;
        @AuraEnabled public String storeTagline;
        @AuraEnabled public String logoImageUrl;
        @AuraEnabled public String searchPlaceholder;
        @AuraEnabled public String heroEyebrow;
        @AuraEnabled public String heroTitle;
        @AuraEnabled public String heroBody;
        @AuraEnabled public String heroPrimaryCtaLabel;
        @AuraEnabled public String heroSecondaryCtaLabel;
        @AuraEnabled public String flashSaleTitle;
        @AuraEnabled public String flashSaleIntro;
        @AuraEnabled public String technologyTitle;
        @AuraEnabled public String technologyIntro;
        @AuraEnabled public String recommendationsTitle;
        @AuraEnabled public String recommendationsPromoTitle;
        @AuraEnabled public String recommendationsPromoBody;
        @AuraEnabled public String recommendationsPromoCtaLabel;
        @AuraEnabled public String footerCopy;
        @AuraEnabled public String demoPricebookId;
        @AuraEnabled public String siteNetworkName;
        @AuraEnabled public String publicContentChannelName;
        @AuraEnabled public String cmsLanguage;
        @AuraEnabled public Boolean enableCmsMedia;
    }

    public static PublicConfig getPublicConfig() {
        return buildPublicConfig(loadConfigRecord());
    }

    public static AdminConfig getAdminConfig() {
        return buildAdminConfig(loadConfigRecord());
    }

    public static Id ensureAdminRecordId() {
        Alpine_Storefront_Config__c record = loadConfigRecord();
        if (record == null) {
            record = buildDefaultRecord();
            insert record;
            cachedRecord = record;
        }

        return record.Id;
    }

    public static AdminConfig saveAdminConfig(AdminConfig payload) {
        if (payload == null) {
            throwHandledException('請提供要儲存的站台設定。');
        }

        Alpine_Storefront_Config__c record = loadConfigRecord();
        if (record == null) {
            record = new Alpine_Storefront_Config__c(Name = DEFAULT_RECORD_NAME);
        }

        record.Store_Name__c = normalizeString(payload.storeName);
        record.Store_Tagline__c = normalizeString(payload.storeTagline);
        record.Logo_Image_Url__c = normalizeString(payload.logoImageUrl);
        record.Search_Placeholder__c = normalizeString(payload.searchPlaceholder);
        record.Hero_Eyebrow__c = normalizeString(payload.heroEyebrow);
        record.Hero_Title__c = normalizeString(payload.heroTitle);
        record.Hero_Body__c = normalizeString(payload.heroBody);
        record.Hero_Primary_Cta_Label__c = normalizeString(payload.heroPrimaryCtaLabel);
        record.Hero_Secondary_Cta_Label__c = normalizeString(payload.heroSecondaryCtaLabel);
        record.Flash_Sale_Title__c = normalizeString(payload.flashSaleTitle);
        record.Flash_Sale_Intro__c = normalizeString(payload.flashSaleIntro);
        record.Technology_Title__c = normalizeString(payload.technologyTitle);
        record.Technology_Intro__c = normalizeString(payload.technologyIntro);
        record.Recommendations_Title__c = normalizeString(payload.recommendationsTitle);
        record.Recommendations_Promo_Title__c = normalizeString(payload.recommendationsPromoTitle);
        record.Recommendations_Promo_Body__c = normalizeString(payload.recommendationsPromoBody);
        record.Recommendations_Promo_Cta_Label__c = normalizeString(payload.recommendationsPromoCtaLabel);
        record.Footer_Copy__c = normalizeString(payload.footerCopy);
        record.Demo_Pricebook2_Id__c = normalizeString(payload.demoPricebookId);
        record.Site_Network_Name__c = normalizeString(payload.siteNetworkName);
        record.Public_Content_Channel_Name__c = normalizeString(payload.publicContentChannelName);
        record.Cms_Language__c = normalizeString(payload.cmsLanguage);
        record.Enable_Cms_Media__c = payload.enableCmsMedia == null ? true : payload.enableCmsMedia;

        upsert record;
        cachedRecord = record;

        return buildAdminConfig(record);
    }

    public static Id resolveDemoPricebookId(Id fallbackValue) {
        Alpine_Storefront_Config__c config = loadConfigRecord();
        String configuredValue = config == null ? '' : normalizeString(config.Demo_Pricebook2_Id__c);
        if (!looksLikeSalesforceId(configuredValue)) {
            return fallbackValue;
        }

        try {
            return Id.valueOf(configuredValue);
        } catch (Exception ex) {
            return fallbackValue;
        }
    }

    public static String resolveSiteNetworkName(String fallbackValue) {
        Alpine_Storefront_Config__c config = loadConfigRecord();
        String configuredValue = config == null ? '' : normalizeString(config.Site_Network_Name__c);
        return String.isBlank(configuredValue) ? normalizeString(fallbackValue) : configuredValue;
    }

    public static String resolvePublicContentChannelName(String fallbackValue) {
        Alpine_Storefront_Config__c config = loadConfigRecord();
        String configuredValue = config == null ? '' : normalizeString(config.Public_Content_Channel_Name__c);
        return String.isBlank(configuredValue) ? normalizeString(fallbackValue) : configuredValue;
    }

    public static String resolveCmsLanguage(String fallbackValue) {
        Alpine_Storefront_Config__c config = loadConfigRecord();
        String configuredValue = config == null ? '' : normalizeString(config.Cms_Language__c);
        return String.isBlank(configuredValue) ? normalizeString(fallbackValue) : configuredValue;
    }

    public static Boolean isCmsMediaEnabled(Boolean fallbackValue) {
        Alpine_Storefront_Config__c config = loadConfigRecord();
        if (config == null || config.Enable_Cms_Media__c == null) {
            return fallbackValue;
        }
        return config.Enable_Cms_Media__c;
    }

    private static PublicConfig buildPublicConfig(Alpine_Storefront_Config__c record) {
        PublicConfig config = new PublicConfig();
        config.storeName = stringOrDefault(record == null ? null : record.Store_Name__c, DEFAULT_STORE_NAME);
        config.storeTagline = stringOrDefault(record == null ? null : record.Store_Tagline__c, DEFAULT_STORE_TAGLINE);
        config.logoImageUrl = stringOrDefault(record == null ? null : record.Logo_Image_Url__c, '');
        config.searchPlaceholder =
            stringOrDefault(record == null ? null : record.Search_Placeholder__c, DEFAULT_SEARCH_PLACEHOLDER);
        config.heroEyebrow = stringOrDefault(record == null ? null : record.Hero_Eyebrow__c, DEFAULT_HERO_EYEBROW);
        config.heroTitle = stringOrDefault(record == null ? null : record.Hero_Title__c, DEFAULT_HERO_TITLE);
        config.heroBody = stringOrDefault(record == null ? null : record.Hero_Body__c, DEFAULT_HERO_BODY);
        config.heroPrimaryCtaLabel =
            stringOrDefault(record == null ? null : record.Hero_Primary_Cta_Label__c, DEFAULT_HERO_PRIMARY_CTA_LABEL);
        config.heroSecondaryCtaLabel = stringOrDefault(
            record == null ? null : record.Hero_Secondary_Cta_Label__c,
            DEFAULT_HERO_SECONDARY_CTA_LABEL
        );
        config.flashSaleTitle =
            stringOrDefault(record == null ? null : record.Flash_Sale_Title__c, DEFAULT_FLASH_SALE_TITLE);
        config.flashSaleIntro =
            stringOrDefault(record == null ? null : record.Flash_Sale_Intro__c, DEFAULT_FLASH_SALE_INTRO);
        config.technologyTitle =
            stringOrDefault(record == null ? null : record.Technology_Title__c, DEFAULT_TECHNOLOGY_TITLE);
        config.technologyIntro =
            stringOrDefault(record == null ? null : record.Technology_Intro__c, DEFAULT_TECHNOLOGY_INTRO);
        config.recommendationsTitle =
            stringOrDefault(record == null ? null : record.Recommendations_Title__c, DEFAULT_RECOMMENDATIONS_TITLE);
        config.recommendationsPromoTitle = stringOrDefault(
            record == null ? null : record.Recommendations_Promo_Title__c,
            DEFAULT_RECOMMENDATIONS_PROMO_TITLE
        );
        config.recommendationsPromoBody = stringOrDefault(
            record == null ? null : record.Recommendations_Promo_Body__c,
            DEFAULT_RECOMMENDATIONS_PROMO_BODY
        );
        config.recommendationsPromoCtaLabel = stringOrDefault(
            record == null ? null : record.Recommendations_Promo_Cta_Label__c,
            DEFAULT_RECOMMENDATIONS_PROMO_CTA_LABEL
        );
        config.footerCopy = stringOrDefault(record == null ? null : record.Footer_Copy__c, DEFAULT_FOOTER_COPY);
        return config;
    }

    private static AdminConfig buildAdminConfig(Alpine_Storefront_Config__c record) {
        AdminConfig config = new AdminConfig();
        config.recordId = record == null ? null : record.Id;
        if (record == null) {
            config.storeName = DEFAULT_STORE_NAME;
            config.storeTagline = DEFAULT_STORE_TAGLINE;
            config.logoImageUrl = '';
            config.searchPlaceholder = DEFAULT_SEARCH_PLACEHOLDER;
            config.heroEyebrow = DEFAULT_HERO_EYEBROW;
            config.heroTitle = DEFAULT_HERO_TITLE;
            config.heroBody = DEFAULT_HERO_BODY;
            config.heroPrimaryCtaLabel = DEFAULT_HERO_PRIMARY_CTA_LABEL;
            config.heroSecondaryCtaLabel = DEFAULT_HERO_SECONDARY_CTA_LABEL;
            config.flashSaleTitle = DEFAULT_FLASH_SALE_TITLE;
            config.flashSaleIntro = DEFAULT_FLASH_SALE_INTRO;
            config.technologyTitle = DEFAULT_TECHNOLOGY_TITLE;
            config.technologyIntro = DEFAULT_TECHNOLOGY_INTRO;
            config.recommendationsTitle = DEFAULT_RECOMMENDATIONS_TITLE;
            config.recommendationsPromoTitle = DEFAULT_RECOMMENDATIONS_PROMO_TITLE;
            config.recommendationsPromoBody = DEFAULT_RECOMMENDATIONS_PROMO_BODY;
            config.recommendationsPromoCtaLabel = DEFAULT_RECOMMENDATIONS_PROMO_CTA_LABEL;
            config.footerCopy = DEFAULT_FOOTER_COPY;
            config.demoPricebookId = '';
            config.siteNetworkName = DEFAULT_SITE_NETWORK_NAME;
            config.publicContentChannelName = DEFAULT_PUBLIC_CONTENT_CHANNEL_NAME;
            config.cmsLanguage = DEFAULT_CMS_LANGUAGE;
            config.enableCmsMedia = true;
            return config;
        }

        // Admin UI should show stored raw values so clearing a field does not
        // immediately snap back to a derived storefront default.
        config.storeName = normalizeString(record.Store_Name__c);
        config.storeTagline = normalizeString(record.Store_Tagline__c);
        config.logoImageUrl = normalizeString(record.Logo_Image_Url__c);
        config.searchPlaceholder = normalizeString(record.Search_Placeholder__c);
        config.heroEyebrow = normalizeString(record.Hero_Eyebrow__c);
        config.heroTitle = normalizeString(record.Hero_Title__c);
        config.heroBody = normalizeString(record.Hero_Body__c);
        config.heroPrimaryCtaLabel = normalizeString(record.Hero_Primary_Cta_Label__c);
        config.heroSecondaryCtaLabel = normalizeString(record.Hero_Secondary_Cta_Label__c);
        config.flashSaleTitle = normalizeString(record.Flash_Sale_Title__c);
        config.flashSaleIntro = normalizeString(record.Flash_Sale_Intro__c);
        config.technologyTitle = normalizeString(record.Technology_Title__c);
        config.technologyIntro = normalizeString(record.Technology_Intro__c);
        config.recommendationsTitle = normalizeString(record.Recommendations_Title__c);
        config.recommendationsPromoTitle = normalizeString(record.Recommendations_Promo_Title__c);
        config.recommendationsPromoBody = normalizeString(record.Recommendations_Promo_Body__c);
        config.recommendationsPromoCtaLabel = normalizeString(record.Recommendations_Promo_Cta_Label__c);
        config.footerCopy = normalizeString(record.Footer_Copy__c);
        config.demoPricebookId = normalizeString(record.Demo_Pricebook2_Id__c);
        config.siteNetworkName = normalizeString(record.Site_Network_Name__c);
        config.publicContentChannelName = normalizeString(record.Public_Content_Channel_Name__c);
        config.cmsLanguage = normalizeString(record.Cms_Language__c);
        config.enableCmsMedia = record.Enable_Cms_Media__c == null ? true : record.Enable_Cms_Media__c;
        return config;
    }

    private static Alpine_Storefront_Config__c loadConfigRecord() {
        if (cachedRecord != null) {
            return cachedRecord;
        }

        List<Alpine_Storefront_Config__c> records = [
            SELECT
                Id,
                Name,
                Store_Name__c,
                Store_Tagline__c,
                Logo_Image_Url__c,
                Search_Placeholder__c,
                Hero_Eyebrow__c,
                Hero_Title__c,
                Hero_Body__c,
                Hero_Primary_Cta_Label__c,
                Hero_Secondary_Cta_Label__c,
                Flash_Sale_Title__c,
                Flash_Sale_Intro__c,
                Technology_Title__c,
                Technology_Intro__c,
                Recommendations_Title__c,
                Recommendations_Promo_Title__c,
                Recommendations_Promo_Body__c,
                Recommendations_Promo_Cta_Label__c,
                Footer_Copy__c,
                Demo_Pricebook2_Id__c,
                Site_Network_Name__c,
                Public_Content_Channel_Name__c,
                Cms_Language__c,
                Enable_Cms_Media__c
            FROM Alpine_Storefront_Config__c
            WHERE Name = :DEFAULT_RECORD_NAME
            ORDER BY CreatedDate ASC
            LIMIT 1
        ];

        cachedRecord = records.isEmpty() ? null : records[0];
        return cachedRecord;
    }

    private static Alpine_Storefront_Config__c buildDefaultRecord() {
        Alpine_Storefront_Config__c record = new Alpine_Storefront_Config__c(Name = DEFAULT_RECORD_NAME);
        record.Store_Name__c = DEFAULT_STORE_NAME;
        record.Store_Tagline__c = DEFAULT_STORE_TAGLINE;
        record.Logo_Image_Url__c = '';
        record.Search_Placeholder__c = DEFAULT_SEARCH_PLACEHOLDER;
        record.Hero_Eyebrow__c = DEFAULT_HERO_EYEBROW;
        record.Hero_Title__c = DEFAULT_HERO_TITLE;
        record.Hero_Body__c = DEFAULT_HERO_BODY;
        record.Hero_Primary_Cta_Label__c = DEFAULT_HERO_PRIMARY_CTA_LABEL;
        record.Hero_Secondary_Cta_Label__c = DEFAULT_HERO_SECONDARY_CTA_LABEL;
        record.Flash_Sale_Title__c = DEFAULT_FLASH_SALE_TITLE;
        record.Flash_Sale_Intro__c = DEFAULT_FLASH_SALE_INTRO;
        record.Technology_Title__c = DEFAULT_TECHNOLOGY_TITLE;
        record.Technology_Intro__c = DEFAULT_TECHNOLOGY_INTRO;
        record.Recommendations_Title__c = DEFAULT_RECOMMENDATIONS_TITLE;
        record.Recommendations_Promo_Title__c = DEFAULT_RECOMMENDATIONS_PROMO_TITLE;
        record.Recommendations_Promo_Body__c = DEFAULT_RECOMMENDATIONS_PROMO_BODY;
        record.Recommendations_Promo_Cta_Label__c = DEFAULT_RECOMMENDATIONS_PROMO_CTA_LABEL;
        record.Footer_Copy__c = DEFAULT_FOOTER_COPY;
        record.Demo_Pricebook2_Id__c = '';
        record.Site_Network_Name__c = DEFAULT_SITE_NETWORK_NAME;
        record.Public_Content_Channel_Name__c = DEFAULT_PUBLIC_CONTENT_CHANNEL_NAME;
        record.Cms_Language__c = DEFAULT_CMS_LANGUAGE;
        record.Enable_Cms_Media__c = true;
        return record;
    }

    private static Boolean looksLikeSalesforceId(String value) {
        return Pattern.matches('^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$', normalizeString(value));
    }

    private static String stringOrDefault(String value, String defaultValue) {
        String normalizedValue = normalizeString(value);
        return String.isBlank(normalizedValue) ? defaultValue : normalizedValue;
    }

    private static String normalizeString(String value) {
        return value == null ? '' : value.trim();
    }

    private static void throwHandledException(String message) {
        AuraHandledException handledException = new AuraHandledException(message);
        handledException.setMessage(message);
        throw handledException;
    }
}
