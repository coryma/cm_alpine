@IsTest
private class DemoCartRequestControllerTest {
    @IsTest
    static void submitRequestCreatesLead() {
        String cartJson =
            '{"items":[{"id":"sku-1","name":"Demo Jacket","unitPrice":120.50,"quantity":2,"currencyIsoCode":"USD"}],"totalAmount":241.00,"currencyIsoCode":"USD"}';

        Test.startTest();
        DemoCartRequestController.RequestResult result = DemoCartRequestController.submitRequest(
            'Ada Lovelace',
            'ada@example.com',
            '+1 415 555 0100',
            'Need the delivery lead time.',
            cartJson
        );
        Test.stopTest();

        Lead createdLead = [
            SELECT FirstName, LastName, Company, Email, Phone, Description
            FROM Lead
            WHERE Id = :result.leadId
        ];

        System.assertEquals('Ada', createdLead.FirstName);
        System.assertEquals('Lovelace', createdLead.LastName);
        System.assertEquals('Demo Cart Request', createdLead.Company);
        System.assertEquals('ada@example.com', createdLead.Email);
        System.assertEquals('+1 415 555 0100', createdLead.Phone);
        System.assert(createdLead.Description.contains('Demo Jacket'));
        System.assert(createdLead.Description.contains('總計: 7,230'));
        System.assert(!createdLead.Description.contains('USD'));
        System.assert(createdLead.Description.contains('Need the delivery lead time.'));
    }

    @IsTest
    static void submitRequestRejectsInvalidEmail() {
        String cartJson =
            '{"items":[{"id":"sku-1","name":"Demo Jacket","unitPrice":120.50,"quantity":1,"currencyIsoCode":"USD"}],"totalAmount":120.50,"currencyIsoCode":"USD"}';

        try {
            DemoCartRequestController.submitRequest(
                'Ada Lovelace',
                'ada-at-example.com',
                '+1 415 555 0100',
                '',
                cartJson
            );
            System.assert(false, 'Expected validation failure.');
        } catch (AuraHandledException ex) {
            System.assert(ex.getMessage().contains('有效的電子郵件'));
        }
    }

    @IsTest
    static void submitRequestRejectsEmptyCart() {
        try {
            DemoCartRequestController.submitRequest(
                'Ada Lovelace',
                'ada@example.com',
                '+1 415 555 0100',
                '',
                '{"items":[],"totalAmount":0,"currencyIsoCode":"USD"}'
            );
            System.assert(false, 'Expected empty cart failure.');
        } catch (AuraHandledException ex) {
            System.assert(ex.getMessage().contains('購物車目前沒有商品'));
        }
    }
}
