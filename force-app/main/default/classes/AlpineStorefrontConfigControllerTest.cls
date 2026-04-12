@IsTest
private class AlpineStorefrontConfigControllerTest {
    @IsTest
    static void returnsDefaultsWhenNoConfigExists() {
        Test.startTest();
        AlpineStorefrontConfigService.PublicConfig config = AlpineStorefrontConfigController.getPublicConfig();
        Test.stopTest();

        System.assertEquals('Alpine 健康生活館', config.storeName);
        System.assertEquals('搜尋燕麥穀物、機能飲、恢復補給與健康好物', config.searchPlaceholder);
    }

    @IsTest
    static void savesAndReadsAdminConfig() {
        AlpineStorefrontConfigService.AdminConfig payload = new AlpineStorefrontConfigService.AdminConfig();
        payload.storeName = '測試商城';
        payload.logoImageUrl = 'https://cdn.example.com/logo.png';
        payload.heroTitle = '自訂首頁標題';
        payload.demoPricebookId = '01s000000000001AAA';
        payload.siteNetworkName = 'Test Network';
        payload.publicContentChannelName = 'Test Channel';
        payload.cmsLanguage = 'zh_TW';
        payload.enableCmsMedia = false;

        Test.startTest();
        AlpineStorefrontConfigService.AdminConfig savedConfig = AlpineStorefrontConfigController.saveAdminConfig(payload);
        AlpineStorefrontConfigService.AdminConfig loadedConfig = AlpineStorefrontConfigController.getAdminConfig();
        AlpineStorefrontConfigService.PublicConfig publicConfig = AlpineStorefrontConfigController.getPublicConfig();
        Test.stopTest();

        System.assertNotEquals(null, savedConfig.recordId);
        System.assertEquals('測試商城', loadedConfig.storeName);
        System.assertEquals('https://cdn.example.com/logo.png', loadedConfig.logoImageUrl);
        System.assertEquals('https://cdn.example.com/logo.png', publicConfig.logoImageUrl);
        System.assertEquals('自訂首頁標題', loadedConfig.heroTitle);
        System.assertEquals('01s000000000001AAA', loadedConfig.demoPricebookId);
        System.assertEquals('Test Network', loadedConfig.siteNetworkName);
        System.assertEquals(false, loadedConfig.enableCmsMedia);
    }

    @IsTest
    static void preservesBlankAdminValuesAfterSave() {
        AlpineStorefrontConfigService.AdminConfig initialPayload = new AlpineStorefrontConfigService.AdminConfig();
        initialPayload.storeName = '先存一個值';
        AlpineStorefrontConfigController.saveAdminConfig(initialPayload);

        AlpineStorefrontConfigService.AdminConfig blankPayload = AlpineStorefrontConfigController.getAdminConfig();
        blankPayload.storeName = '';
        blankPayload.heroTitle = '';

        Test.startTest();
        AlpineStorefrontConfigService.AdminConfig savedConfig = AlpineStorefrontConfigController.saveAdminConfig(blankPayload);
        AlpineStorefrontConfigService.AdminConfig loadedConfig = AlpineStorefrontConfigController.getAdminConfig();
        AlpineStorefrontConfigService.PublicConfig publicConfig = AlpineStorefrontConfigController.getPublicConfig();
        Test.stopTest();

        System.assertEquals('', savedConfig.storeName);
        System.assertEquals('', loadedConfig.storeName);
        System.assertEquals('', loadedConfig.heroTitle);
        System.assertEquals('Alpine 健康生活館', publicConfig.storeName);
        System.assertEquals('每日補給，一站買齊', publicConfig.heroTitle);
    }

    @IsTest
    static void ensuresDefaultRecordForAdminForm() {
        Test.startTest();
        Id recordId = AlpineStorefrontConfigController.ensureAdminRecordId();
        AlpineStorefrontConfigService.AdminConfig loadedConfig = AlpineStorefrontConfigController.getAdminConfig();
        Test.stopTest();

        System.assertNotEquals(null, recordId);
        System.assertEquals(recordId, loadedConfig.recordId);
        System.assertEquals('Alpine 健康生活館', loadedConfig.storeName);
        System.assertEquals('', loadedConfig.logoImageUrl);
        System.assertEquals('每日補給、輕運動與安心保養', loadedConfig.storeTagline);
    }

    @IsTest
    static void savesAdminConfigThroughJsonTransport() {
        String payloadJson =
            '{"storeName":"JSON 商城","heroTitle":"JSON 標題","logoImageUrl":"https://cdn.example.com/json-logo.png","enableCmsMedia":true}';

        Test.startTest();
        AlpineStorefrontConfigService.AdminConfig savedConfig =
            AlpineStorefrontConfigController.saveAdminConfigJson(payloadJson);
        Test.stopTest();

        System.assertEquals('JSON 商城', savedConfig.storeName);
        System.assertEquals('JSON 標題', savedConfig.heroTitle);
        System.assertEquals('https://cdn.example.com/json-logo.png', savedConfig.logoImageUrl);
        System.assertEquals(true, savedConfig.enableCmsMedia);
    }
}
