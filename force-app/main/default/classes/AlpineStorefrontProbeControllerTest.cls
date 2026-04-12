@IsTest
private class AlpineStorefrontProbeControllerTest {
    @IsTest
    static void returnsMobileShellBootstrapForGuestRoute() {
        TestData data = createCatalogFixture();

        Test.startTest();
        AlpineProductCatalogService.demoPricebookIdOverride = data.demoPricebookId;
        AlpineStorefrontProbeController.ProbeResponse response = AlpineStorefrontProbeController.getGuestProbe();
        Test.stopTest();

        System.assertEquals('/alpine', response.basePathLabel);
        System.assertEquals('/alpine/request', response.requestPath);
        System.assertEquals(false, String.isBlank(response.storefront.storeName));
        System.assertEquals(false, String.isBlank(response.storefront.storeTagline));
        System.assertEquals(2, response.objects.size());
        System.assertEquals('Product2', response.objects[0].apiName);
        System.assertEquals(true, response.objects[0].isAccessible);
        System.assertEquals('Alpine_Storefront_Config__c', response.objects[1].apiName);
        System.assertEquals(true, response.objects[1].isAccessible);
        System.assert(response.summary.contains('2 / 2'));

        System.assertEquals(true, response.quickLinks.size() >= 2);
        System.assertEquals('全部商品', response.quickLinks[0].label);
        System.assertEquals(2, response.products.size());
        System.assertEquals('Alpha Protein', response.products[0].name);
        Set<String> productTitles = new Set<String>();
        for (AlpineStorefrontProbeController.RecordProbe record : response.objects[0].records) {
            productTitles.add(record.title);
        }
        System.assert(productTitles.contains('Alpha Protein'));
        System.assert(productTitles.contains('Berry Focus Blend'));
        System.assert(response.products[0].detailPath.startsWith('/alpine/product/'));
        System.assertEquals('主打', response.products[0].badgeLabel);
        System.assert(response.catalogNote.contains('2 個商品'));
    }

    private static TestData createCatalogFixture() {
        Id standardPricebookId = Test.getStandardPricebookId();
        update new Pricebook2(Id = standardPricebookId, IsActive = true);

        Pricebook2 demoPricebook = new Pricebook2(Name = 'Probe Demo Price Book', IsActive = true);
        insert demoPricebook;

        Product2 firstProduct = new Product2(
            Name = 'Alpha Protein',
            ProductCode = 'ALP-ALPHA-01',
            IsActive = true,
            Family = 'Wellness',
            Description = 'Whole-food protein for busy mornings.',
            Alpine_Badge__c = '主打,熱銷',
            Alpine_Short_Description__c = 'Alpha 自訂短描述',
            Alpine_Sort_Order__c = 1
        );
        Product2 secondProduct = new Product2(
            Name = 'Berry Focus Blend',
            ProductCode = 'ALP-BERRY-02',
            IsActive = true,
            Family = 'Wellness',
            Description = 'Berry notes with focused energy support.',
            Alpine_Sort_Order__c = 2
        );
        insert new List<Product2>{ firstProduct, secondProduct };

        insert new List<PricebookEntry>{
            new PricebookEntry(
                Pricebook2Id = standardPricebookId,
                Product2Id = firstProduct.Id,
                UnitPrice = 32,
                IsActive = true
            ),
            new PricebookEntry(
                Pricebook2Id = standardPricebookId,
                Product2Id = secondProduct.Id,
                UnitPrice = 29.5,
                IsActive = true
            )
        };

        insert new List<PricebookEntry>{
            new PricebookEntry(
                Pricebook2Id = demoPricebook.Id,
                Product2Id = firstProduct.Id,
                UnitPrice = 32,
                IsActive = true,
                UseStandardPrice = false
            ),
            new PricebookEntry(
                Pricebook2Id = demoPricebook.Id,
                Product2Id = secondProduct.Id,
                UnitPrice = 29.5,
                IsActive = true,
                UseStandardPrice = false
            )
        };

        insert new Alpine_Storefront_Config__c(
            Name = 'Probe Config',
            Store_Name__c = 'Probe Store',
            Store_Tagline__c = 'Public shell tagline',
            Hero_Title__c = 'Probe Hero',
            Hero_Body__c = 'Probe hero body',
            Site_Network_Name__c = 'B2C - Alpine group'
        );

        TestData data = new TestData();
        data.demoPricebookId = demoPricebook.Id;
        return data;
    }

    private class TestData {
        Id demoPricebookId;
    }
}
