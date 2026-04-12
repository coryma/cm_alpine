public without sharing class AlpineStorefrontConfigController {
    @AuraEnabled(cacheable=true)
    public static AlpineStorefrontConfigService.PublicConfig getPublicConfig() {
        return AlpineStorefrontConfigService.getPublicConfig();
    }

    @AuraEnabled
    public static AlpineStorefrontConfigService.AdminConfig getAdminConfig() {
        return AlpineStorefrontConfigService.getAdminConfig();
    }

    @AuraEnabled
    public static Id ensureAdminRecordId() {
        return AlpineStorefrontConfigService.ensureAdminRecordId();
    }

    @AuraEnabled
    public static AlpineStorefrontConfigService.AdminConfig saveAdminConfig(
        AlpineStorefrontConfigService.AdminConfig payload
    ) {
        return AlpineStorefrontConfigService.saveAdminConfig(payload);
    }

    @AuraEnabled
    public static AlpineStorefrontConfigService.AdminConfig saveAdminConfigJson(String payloadJson) {
        if (String.isBlank(payloadJson)) {
            throw new AuraHandledException('請提供要儲存的站台設定。');
        }

        AlpineStorefrontConfigService.AdminConfig payload =
            (AlpineStorefrontConfigService.AdminConfig) JSON.deserialize(
                payloadJson,
                AlpineStorefrontConfigService.AdminConfig.class
            );

        return AlpineStorefrontConfigService.saveAdminConfig(payload);
    }
}
