public with sharing class DemoCartRequestController {
    private static final String STOREFRONT_CURRENCY = 'TWD';
    private static final Decimal USD_TO_TWD_RATE = 30;

    public class RequestResult {
        @AuraEnabled public Id leadId;
        @AuraEnabled public String message;

        public RequestResult(Id leadId, String message) {
            this.leadId = leadId;
            this.message = message;
        }
    }

    private class CartPayload {
        public List<CartItem> items;
        public Decimal totalAmount;
        public String currencyIsoCode;
    }

    private class CartItem {
        public String id;
        public String productId;
        public String sku;
        public String name;
        public Decimal unitPrice;
        public Integer quantity;
        public String currencyIsoCode;
    }

    private class NameParts {
        public String firstName;
        public String lastName;
    }

    @AuraEnabled
    public static RequestResult submitRequest(
        String customerName,
        String email,
        String phone,
        String note,
        String cartJson
    ) {
        String normalizedName = customerName == null ? '' : customerName.trim();
        String normalizedEmail = email == null ? '' : email.trim();
        String normalizedPhone = phone == null ? '' : phone.trim();
        String normalizedNote = note == null ? '' : note.trim();

        if (String.isBlank(normalizedName)) {
            throwHandledException('姓名為必填。');
        }

        if (String.isBlank(normalizedEmail)) {
            throwHandledException('電子郵件為必填。');
        }

        if (!isValidEmail(normalizedEmail)) {
            throwHandledException('請輸入有效的電子郵件。');
        }

        if (String.isBlank(normalizedPhone)) {
            throwHandledException('電話為必填。');
        }

        if (!isValidPhone(normalizedPhone)) {
            throwHandledException('請輸入有效的電話號碼。');
        }

        CartPayload cart = parseCart(cartJson);
        NameParts nameParts = splitName(normalizedName);

        Lead lead = new Lead(
            FirstName = nameParts.firstName,
            LastName = nameParts.lastName,
            Company = 'Demo Cart Request',
            Email = normalizedEmail,
            Phone = normalizedPhone,
            Description = buildDescription(normalizedName, normalizedEmail, normalizedPhone, normalizedNote, cart)
        );

        insert lead;

        return new RequestResult(lead.Id, '詢問已成功送出。');
    }

    private static Boolean isValidEmail(String value) {
        return Pattern.matches('^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$', value.toUpperCase());
    }

    private static Boolean isValidPhone(String value) {
        return Pattern.matches('^[0-9+()\\-\\s]{7,20}$', value);
    }

    private static CartPayload parseCart(String cartJson) {
        if (String.isBlank(cartJson)) {
            throwHandledException('缺少購物車資料。');
        }

        CartPayload cart;

        try {
            cart = (CartPayload) JSON.deserialize(cartJson, CartPayload.class);
        } catch (Exception ex) {
            throwHandledException('購物車資料格式不正確。');
        }

        if (cart == null || cart.items == null || cart.items.isEmpty()) {
            throwHandledException('購物車目前沒有商品。');
        }

        List<CartItem> sanitizedItems = new List<CartItem>();
        Decimal calculatedTotal = 0;
        String currencyCode;

        for (CartItem item : cart.items) {
            if (item == null || String.isBlank(item.name) || item.quantity == null || item.quantity <= 0) {
                continue;
            }

            Decimal unitPrice = toStorefrontAmount(item.unitPrice, item.currencyIsoCode);
            calculatedTotal += unitPrice * item.quantity;

            CartItem sanitizedItem = new CartItem();
            sanitizedItem.id = item.id;
            sanitizedItem.productId = item.productId;
            sanitizedItem.sku = item.sku;
            sanitizedItem.name = item.name.trim();
            sanitizedItem.unitPrice = unitPrice;
            sanitizedItem.quantity = item.quantity;
            sanitizedItem.currencyIsoCode = STOREFRONT_CURRENCY;

            if (String.isBlank(currencyCode)) {
                currencyCode = sanitizedItem.currencyIsoCode;
            }

            sanitizedItems.add(sanitizedItem);
        }

        if (sanitizedItems.isEmpty()) {
            throwHandledException('購物車目前沒有商品。');
        }

        cart.items = sanitizedItems;
        cart.totalAmount = calculatedTotal.setScale(0, System.RoundingMode.HALF_UP);
        cart.currencyIsoCode = String.isBlank(currencyCode) ? STOREFRONT_CURRENCY : currencyCode;
        return cart;
    }

    private static NameParts splitName(String fullName) {
        List<String> nameTokens = fullName.replaceAll('\\s+', ' ').split(' ');
        NameParts parts = new NameParts();

        if (nameTokens.size() == 1) {
            parts.firstName = null;
            parts.lastName = nameTokens[0];
            return parts;
        }

        parts.lastName = nameTokens[nameTokens.size() - 1];

        List<String> firstNameTokens = new List<String>();
        for (Integer index = 0; index < nameTokens.size() - 1; index++) {
            firstNameTokens.add(nameTokens[index]);
        }
        parts.firstName = String.join(firstNameTokens, ' ');

        return parts;
    }

    private static String buildDescription(
        String customerName,
        String email,
        String phone,
        String note,
        CartPayload cart
    ) {
        List<String> lines = new List<String>{
            '商城詢問單',
            '客戶姓名: ' + customerName,
            '電子郵件: ' + email,
            '電話: ' + phone,
            '總計: ' + formatStorefrontAmount(cart.totalAmount),
            '',
            '商品明細:'
        };

        for (CartItem item : cart.items) {
            lines.add(
                '- ' +
                item.name +
                ' | 數量 ' +
                item.quantity +
                ' | ' +
                formatStorefrontAmount(item.unitPrice * item.quantity)
            );
        }

        if (!String.isBlank(note)) {
            lines.add('');
            lines.add('備註: ' + note);
        }

        return String.join(lines, '\n');
    }

    private static void throwHandledException(String message) {
        AuraHandledException handledError = new AuraHandledException(message);
        handledError.setMessage(message);
        throw handledError;
    }

    private static Decimal toStorefrontAmount(Decimal amount, String currencyIsoCode) {
        Decimal normalizedAmount = amount == null ? 0 : amount;
        String normalizedCurrency = String.isBlank(currencyIsoCode) ? STOREFRONT_CURRENCY : currencyIsoCode.trim().toUpperCase();

        if (normalizedCurrency == 'USD') {
            return (normalizedAmount * USD_TO_TWD_RATE).setScale(0, System.RoundingMode.HALF_UP);
        }

        return normalizedAmount.setScale(0, System.RoundingMode.HALF_UP);
    }

    private static String formatStorefrontAmount(Decimal amount) {
        return (amount == null ? 0 : amount.setScale(0, System.RoundingMode.HALF_UP)).format();
    }
}
