@IsTest
private class AlpineStorefrontPublicRestTest {
    @IsTest
    static void getConfigReturnsPublicDefaults() {
        RestRequest request = new RestRequest();
        request.httpMethod = 'GET';
        request.requestURI = '/services/apexrest/alpine-storefront/v1/config';
        RestContext.request = request;
        RestContext.response = new RestResponse();

        Test.startTest();
        AlpineStorefrontPublicRest.handleGet();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode);

        Map<String, Object> payload = (Map<String, Object>) JSON.deserializeUntyped(
            RestContext.response.responseBody.toString()
        );

        System.assertEquals('Alpine 健康生活館', payload.get('storeName'));
        System.assertEquals(
            '搜尋燕麥穀物、機能飲、恢復補給與健康好物',
            payload.get('searchPlaceholder')
        );
    }

    @IsTest
    static void getProductsAndDetailUseCatalogService() {
        TestData data = createCatalogFixture();
        AlpineProductCatalogService.demoPricebookIdOverride = data.demoPricebookId;

        RestRequest listRequest = new RestRequest();
        listRequest.httpMethod = 'GET';
        listRequest.requestURI = '/services/apexrest/alpine-storefront/v1/products';
        listRequest.addParameter('category', 'Wellness');
        listRequest.addParameter('sortBy', 'featured');
        listRequest.addParameter('limitSize', '1');
        RestContext.request = listRequest;
        RestContext.response = new RestResponse();

        Test.startTest();
        AlpineStorefrontPublicRest.handleGet();

        RestRequest detailRequest = new RestRequest();
        detailRequest.httpMethod = 'GET';
        detailRequest.requestURI =
            '/services/apexrest/alpine-storefront/v1/products/berry-focus-blend';
        RestContext.request = detailRequest;
        AlpineStorefrontPublicRest.handleGet();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode);
        RestContext.request = listRequest;
        RestContext.response = new RestResponse();
        AlpineStorefrontPublicRest.handleGet();
        Map<String, Object> listPayload = (Map<String, Object>) JSON.deserializeUntyped(
            RestContext.response.responseBody.toString()
        );
        List<Object> products = (List<Object>) listPayload.get('products');
        System.assertEquals(1, products.size());

        Map<String, Object> firstProduct = (Map<String, Object>) products[0];
        System.assertEquals('Alpha Protein', firstProduct.get('name'));

        RestContext.request = detailRequest;
        RestContext.response = new RestResponse();
        AlpineStorefrontPublicRest.handleGet();
        Map<String, Object> detailPayload = (Map<String, Object>) JSON.deserializeUntyped(
            RestContext.response.responseBody.toString()
        );
        System.assertEquals('Berry Focus Blend', detailPayload.get('name'));
        System.assertEquals('Wellness', detailPayload.get('category'));
    }

    @IsTest
    static void getUnknownProductReturns404() {
        TestData data = createCatalogFixture();
        AlpineProductCatalogService.demoPricebookIdOverride = data.demoPricebookId;

        RestRequest request = new RestRequest();
        request.httpMethod = 'GET';
        request.requestURI =
            '/services/apexrest/alpine-storefront/v1/products/missing-product';
        RestContext.request = request;
        RestContext.response = new RestResponse();

        Test.startTest();
        AlpineStorefrontPublicRest.handleGet();
        Test.stopTest();

        System.assertEquals(404, RestContext.response.statusCode);
        Map<String, Object> payload = (Map<String, Object>) JSON.deserializeUntyped(
            RestContext.response.responseBody.toString()
        );
        System.assertEquals('Not Found', payload.get('error'));
    }

    @IsTest
    static void postRequestCreatesLeadFromCloudflarePayload() {
        RestRequest request = new RestRequest();
        request.httpMethod = 'POST';
        request.requestURI = '/services/apexrest/alpine-storefront/v1/request';
        request.requestBody = Blob.valueOf(
            '{"fullName":"Ada Lovelace","email":"ada@example.com","company":"Analytical Engines","interest":"Bulk order","message":"Need a lead time check."}'
        );
        RestContext.request = request;
        RestContext.response = new RestResponse();

        Test.startTest();
        AlpineStorefrontPublicRest.handlePost();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode);
        Map<String, Object> payload = (Map<String, Object>) JSON.deserializeUntyped(
            RestContext.response.responseBody.toString()
        );

        Id leadId = Id.valueOf((String) payload.get('leadId'));
        Lead createdLead = [
            SELECT FirstName, LastName, Company, Email, Description
            FROM Lead
            WHERE Id = :leadId
        ];

        System.assertEquals('Ada', createdLead.FirstName);
        System.assertEquals('Lovelace', createdLead.LastName);
        System.assertEquals('Analytical Engines', createdLead.Company);
        System.assertEquals('ada@example.com', createdLead.Email);
        System.assert(createdLead.Description.contains('Bulk order'));
        System.assert(createdLead.Description.contains('Need a lead time check.'));
    }

    @IsTest
    static void postQuizProgressAndGetSessions() {
        RestRequest progressRequest = new RestRequest();
        progressRequest.httpMethod = 'POST';
        progressRequest.requestURI = '/services/apexrest/alpine-storefront/v1/quiz/progress';
        progressRequest.requestBody = Blob.valueOf(
            '{"sessionKey":"cf-quiz-alpha","displayLabel":"alpha1234","stepNumber":1,"stepKey":"goal","optionKey":"energy","optionLabel":"白天更有精神","iconKey":"goal-energy","completedSteps":1,"isComplete":false,"bundleName":""}'
        );
        RestContext.request = progressRequest;
        RestContext.response = new RestResponse();

        Test.startTest();
        AlpineStorefrontPublicRest.handlePost();

        RestRequest secondProgressRequest = new RestRequest();
        secondProgressRequest.httpMethod = 'POST';
        secondProgressRequest.requestURI = '/services/apexrest/alpine-storefront/v1/quiz/progress';
        secondProgressRequest.requestBody = Blob.valueOf(
            '{"sessionKey":"cf-quiz-alpha","displayLabel":"alpha1234","stepNumber":5,"stepKey":"support","optionKey":"steady","optionLabel":"穩定一點","iconKey":"support-steady","completedSteps":5,"isComplete":true,"bundleName":"工作日續航穩定配方"}'
        );
        RestContext.request = secondProgressRequest;
        RestContext.response = new RestResponse();
        AlpineStorefrontPublicRest.handlePost();

        RestRequest sessionsRequest = new RestRequest();
        sessionsRequest.httpMethod = 'GET';
        sessionsRequest.requestURI = '/services/apexrest/alpine-storefront/v1/quiz/sessions';
        sessionsRequest.addParameter('limitSize', '5');
        RestContext.request = sessionsRequest;
        RestContext.response = new RestResponse();
        AlpineStorefrontPublicRest.handleGet();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode);
        List<Object> sessions = (List<Object>) JSON.deserializeUntyped(
            RestContext.response.responseBody.toString()
        );
        System.assertEquals(1, sessions.size());

        Map<String, Object> session = (Map<String, Object>) sessions[0];
        System.assertEquals('alpha1234', session.get('displayLabel'));
        System.assertEquals(true, session.get('isComplete'));
        System.assertEquals('工作日續航穩定配方', session.get('bundleName'));

        List<Object> steps = (List<Object>) session.get('steps');
        System.assertEquals(2, steps.size());
    }

    private static TestData createCatalogFixture() {
        Id standardPricebookId = Test.getStandardPricebookId();
        update new Pricebook2(Id = standardPricebookId, IsActive = true);

        Pricebook2 demoPricebook = new Pricebook2(Name = 'REST Demo Price Book', IsActive = true);
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
            ),
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

        TestData data = new TestData();
        data.demoPricebookId = demoPricebook.Id;
        return data;
    }

    private class TestData {
        Id demoPricebookId;
    }
}
