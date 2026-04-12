@IsTest
private class AlpineProductCatalogControllerTest {
    @IsTest
    static void listProductsUsesDemoPricebookAndCategoryFilters() {
        TestData data = createCatalogFixture();

        Test.startTest();
        AlpineProductCatalogService.demoPricebookIdOverride = data.demoPricebookId;
        AlpineProductCatalogService.CatalogResponse response = AlpineProductCatalogController.listProducts(
            'Wellness',
            'featured',
            null
        );
        Test.stopTest();

        System.assertEquals(2, response.total);
        System.assertEquals(3, response.categories[0].count);
        System.assertEquals('Alpha Protein', response.products[0].name);
        System.assertEquals('Berry Focus Blend', response.products[1].name);
        System.assertEquals('全部商品', response.categories[0].label);
        System.assertEquals('Greens', response.categories[1].label);
        System.assertEquals('Wellness', response.categories[2].label);
    }

    @IsTest
    static void searchProductsMatchesCatalogFieldsAndSortsByPrice() {
        TestData data = createCatalogFixture();

        Test.startTest();
        AlpineProductCatalogService.demoPricebookIdOverride = data.demoPricebookId;
        AlpineProductCatalogService.CatalogResponse response = AlpineProductCatalogController.searchProducts(
            'berry focus',
            null,
            'priceDesc',
            null
        );
        Test.stopTest();

        System.assertEquals(1, response.total);
        System.assertEquals('Berry Focus Blend', response.products[0].name);
        System.assertEquals(29.5, response.products[0].price);
        System.assertEquals(0, response.products[0].badges.size());
    }

    @IsTest
    static void getProductDetailResolvesByIdSlugAndSku() {
        TestData data = createCatalogFixture();

        Test.startTest();
        AlpineProductCatalogService.demoPricebookIdOverride = data.demoPricebookId;
        AlpineProductCatalogService.ProductRecord byId = AlpineProductCatalogController.getProductDetail(
            data.firstProductId,
            null,
            null
        );
        AlpineProductCatalogService.ProductRecord bySlug = AlpineProductCatalogController.getProductDetail(
            null,
            'berry-focus-blend',
            null
        );
        AlpineProductCatalogService.ProductRecord bySku = AlpineProductCatalogController.getProductDetail(
            null,
            null,
            'ALP-GREENS-01'
        );
        Test.stopTest();

        System.assertEquals('Alpha Protein', byId.name);
        System.assertEquals('Berry Focus Blend', bySlug.name);
        System.assertEquals('Daily Greens', bySku.name);
        System.assert(byId.longDescription.contains('<p>'));
        System.assertEquals('Wellness', bySlug.category);
    }

    @IsTest
    static void featuredProductsReturnsTopRankedVisibleProducts() {
        TestData data = createCatalogFixture();

        Test.startTest();
        AlpineProductCatalogService.demoPricebookIdOverride = data.demoPricebookId;
        AlpineProductCatalogService.FeaturedProductsResponse response = AlpineProductCatalogController.featuredProducts(2);
        Test.stopTest();

        System.assertEquals(2, response.total);
        System.assertEquals('Alpha Protein', response.products[0].name);
        System.assertEquals('Berry Focus Blend', response.products[1].name);
    }

    @IsTest
    static void getProductDetailRejectsUnknownSelection() {
        TestData data = createCatalogFixture();

        try {
            AlpineProductCatalogService.demoPricebookIdOverride = data.demoPricebookId;
            AlpineProductCatalogController.getProductDetail('01t000000000000AAA', null, null);
            System.assert(false, 'Expected missing product to fail.');
        } catch (AuraHandledException ex) {
            System.assert(ex.getMessage().contains('找不到對應商品'));
        }
    }

    private static TestData createCatalogFixture() {
        Id standardPricebookId = Test.getStandardPricebookId();
        update new Pricebook2(Id = standardPricebookId, IsActive = true);

        Pricebook2 demoPricebook = new Pricebook2(Name = 'Alpine Demo Price Book', IsActive = true);
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
        Product2 thirdProduct = new Product2(
            Name = 'Daily Greens',
            ProductCode = 'ALP-GREENS-01',
            IsActive = true,
            Family = 'Greens',
            Description = 'Greens, fiber, and bright citrus.',
            Alpine_Category__c = 'Greens'
        );
        Product2 hiddenProduct = new Product2(
            Name = 'Hidden Product',
            ProductCode = 'ALP-HIDE-01',
            IsActive = true,
            Family = 'Wellness',
            Description = 'This product is hidden.'
        );
        insert new List<Product2>{ firstProduct, secondProduct, thirdProduct, hiddenProduct };

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
            ),
            new PricebookEntry(
                Pricebook2Id = standardPricebookId,
                Product2Id = thirdProduct.Id,
                UnitPrice = 18.25,
                IsActive = true
            ),
            new PricebookEntry(
                Pricebook2Id = standardPricebookId,
                Product2Id = hiddenProduct.Id,
                UnitPrice = 15,
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
            ),
            new PricebookEntry(
                Pricebook2Id = demoPricebook.Id,
                Product2Id = thirdProduct.Id,
                UnitPrice = 18.25,
                IsActive = true,
                UseStandardPrice = false
            ),
            new PricebookEntry(
                Pricebook2Id = demoPricebook.Id,
                Product2Id = hiddenProduct.Id,
                UnitPrice = 15,
                IsActive = false,
                UseStandardPrice = false
            )
        };

        TestData data = new TestData();
        data.demoPricebookId = demoPricebook.Id;
        data.firstProductId = firstProduct.Id;
        return data;
    }

    private class TestData {
        Id demoPricebookId;
        Id firstProductId;
    }
}
