@RestResource(urlMapping='/alpine-storefront/v1/*')
global without sharing class AlpineStorefrontPublicRest {
    private static final String BASE_PATH = '/alpine-storefront/v1';

    global class CloudflareRequestPayload {
        public String fullName;
        public String email;
        public String company;
        public String interest;
        public String message;
        public String phone;
    }

    global class CloudflareRequestResult {
        public Id leadId;
        public String reference;
        public String message;

        public CloudflareRequestResult(Id leadId, String message) {
            this.leadId = leadId;
            this.reference = leadId == null ? null : String.valueOf(leadId);
            this.message = message;
        }
    }

    global class QuizProgressPayload {
        public String sessionKey;
        public String displayLabel;
        public Integer stepNumber;
        public String stepKey;
        public String optionKey;
        public String optionLabel;
        public String iconKey;
        public Integer completedSteps;
        public Boolean isComplete;
        public String bundleName;
    }

    global class ErrorPayload {
        public String error;
        public String message;

        public ErrorPayload(String error, String message) {
            this.error = error;
            this.message = message;
        }
    }

    private class NameParts {
        public String firstName;
        public String lastName;
    }

    @HttpGet
    global static void handleGet() {
        try {
            String resourcePath = readResourcePath();

            if (resourcePath == 'config') {
                writeJson(200, AlpineStorefrontConfigService.getPublicConfig());
                return;
            }

            if (resourcePath == 'products') {
                String searchTerm = readQueryParam('searchTerm');
                String category = readQueryParam('category');
                String sortBy = readQueryParam('sortBy');
                Integer limitSize = parseInteger(readQueryParam('limitSize'));

                if (String.isBlank(searchTerm)) {
                    writeJson(
                        200,
                        AlpineProductCatalogService.listProducts(category, sortBy, limitSize)
                    );
                } else {
                    writeJson(
                        200,
                        AlpineProductCatalogService.searchProducts(
                            searchTerm,
                            category,
                            sortBy,
                            limitSize
                        )
                    );
                }
                return;
            }

            if (resourcePath == 'quiz/sessions') {
                writeJson(200, HealthQuizProgressService.getRecentSessions(parseInteger(readQueryParam('limitSize'))));
                return;
            }

            if (resourcePath.startsWith('products/')) {
                String productSlug = decodePathToken(resourcePath.substring('products/'.length()));
                writeJson(
                    200,
                    AlpineProductCatalogService.getProductDetail(
                        readQueryParam('productId'),
                        productSlug,
                        readQueryParam('productSku')
                    )
                );
                return;
            }

            writeError(404, 'Not Found', '找不到對應的 storefront REST 資源。');
        } catch (AuraHandledException ex) {
            Integer statusCode = ex.getMessage() != null && ex.getMessage().contains('找不到')
                ? 404
                : 400;
            writeError(statusCode, statusCode == 404 ? 'Not Found' : 'Bad Request', ex.getMessage());
        } catch (Exception ex) {
            writeError(500, 'Internal Server Error', ex.getMessage());
        }
    }

    @HttpPost
    global static void handlePost() {
        try {
            String resourcePath = readResourcePath();

            if (resourcePath == 'quiz/progress') {
                writeJson(200, HealthQuizProgressService.recordProgress(readQuizProgressPayload()));
                return;
            }

            if (resourcePath != 'request') {
                writeError(404, 'Not Found', '找不到對應的 storefront REST 資源。');
                return;
            }

            CloudflareRequestPayload payload = readRequestPayload();
            validateRequest(payload);

            NameParts nameParts = splitName(payload.fullName);
            Lead lead = new Lead(
                FirstName = nameParts.firstName,
                LastName = nameParts.lastName,
                Company = String.isBlank(normalizeString(payload.company))
                    ? 'Cloudflare Storefront Request'
                    : normalizeString(payload.company),
                Email = normalizeString(payload.email),
                Phone = normalizeString(payload.phone),
                Description = buildDescription(payload)
            );

            insert lead;

            writeJson(200, new CloudflareRequestResult(lead.Id, '詢問已成功送出。'));
        } catch (AuraHandledException ex) {
            writeError(400, 'Bad Request', ex.getMessage());
        } catch (Exception ex) {
            writeError(500, 'Internal Server Error', ex.getMessage());
        }
    }

    private static CloudflareRequestPayload readRequestPayload() {
        String requestBody = readRequestBody();

        try {
            return (CloudflareRequestPayload) JSON.deserialize(
                requestBody,
                CloudflareRequestPayload.class
            );
        } catch (Exception ex) {
            throwHandledException('請提供有效的 JSON payload。');
        }

        return null;
    }

    private static HealthQuizProgressService.ProgressInput readQuizProgressPayload() {
        String requestBody = readRequestBody();

        try {
            return (HealthQuizProgressService.ProgressInput) JSON.deserialize(
                requestBody,
                HealthQuizProgressService.ProgressInput.class
            );
        } catch (Exception ex) {
            throwHandledException('請提供有效的 quiz progress payload。');
        }

        return null;
    }

    private static String readRequestBody() {
        RestRequest request = RestContext.request;
        String requestBody = request == null || request.requestBody == null
            ? ''
            : request.requestBody.toString();

        if (String.isBlank(requestBody)) {
            throwHandledException('請提供有效的 JSON payload。');
        }
        return requestBody;
    }

    private static void validateRequest(CloudflareRequestPayload payload) {
        if (payload == null) {
            throwHandledException('請提供有效的詢問資料。');
        }

        if (String.isBlank(normalizeString(payload.fullName))) {
            throwHandledException('姓名為必填。');
        }

        if (String.isBlank(normalizeString(payload.email))) {
            throwHandledException('電子郵件為必填。');
        }

        if (!Pattern.matches(
            '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$',
            normalizeString(payload.email).toUpperCase()
        )) {
            throwHandledException('請輸入有效的電子郵件。');
        }
    }

    private static String buildDescription(CloudflareRequestPayload payload) {
        List<String> lines = new List<String>{
            'Cloudflare Storefront Inquiry',
            '姓名: ' + normalizeString(payload.fullName),
            '電子郵件: ' + normalizeString(payload.email)
        };

        if (!String.isBlank(normalizeString(payload.phone))) {
            lines.add('電話: ' + normalizeString(payload.phone));
        }

        if (!String.isBlank(normalizeString(payload.company))) {
            lines.add('公司: ' + normalizeString(payload.company));
        }

        if (!String.isBlank(normalizeString(payload.interest))) {
            lines.add('Interest: ' + normalizeString(payload.interest));
        }

        if (!String.isBlank(normalizeString(payload.message))) {
            lines.add('');
            lines.add('訊息:');
            lines.add(normalizeString(payload.message));
        }

        return String.join(lines, '\n');
    }

    private static NameParts splitName(String fullName) {
        List<String> tokens = normalizeString(fullName).replaceAll('\\s+', ' ').split(' ');
        NameParts parts = new NameParts();

        if (tokens.isEmpty() || String.isBlank(tokens[0])) {
            parts.firstName = null;
            parts.lastName = 'Guest';
            return parts;
        }

        if (tokens.size() == 1) {
            parts.firstName = null;
            parts.lastName = tokens[0];
            return parts;
        }

        parts.lastName = tokens[tokens.size() - 1];
        List<String> firstNameTokens = new List<String>();
        for (Integer index = 0; index < tokens.size() - 1; index++) {
            firstNameTokens.add(tokens[index]);
        }
        parts.firstName = String.join(firstNameTokens, ' ');
        return parts;
    }

    private static String readResourcePath() {
        RestRequest request = RestContext.request;
        String requestUri = request == null ? '' : normalizeString(request.requestURI);
        Integer baseIndex = requestUri.indexOf(BASE_PATH);

        if (baseIndex < 0) {
            return '';
        }

        String path = requestUri.substring(baseIndex + BASE_PATH.length());
        path = path.startsWith('/') ? path.substring(1) : path;
        return normalizeString(path);
    }

    private static String decodePathToken(String token) {
        return String.isBlank(token) ? '' : EncodingUtil.urlDecode(token, 'UTF-8');
    }

    private static String readQueryParam(String name) {
        RestRequest request = RestContext.request;
        return request == null || request.params == null ? null : request.params.get(name);
    }

    private static Integer parseInteger(String value) {
        if (String.isBlank(normalizeString(value))) {
            return null;
        }

        try {
            return Integer.valueOf(normalizeString(value));
        } catch (Exception ex) {
            throwHandledException('limitSize 必須為整數。');
        }

        return null;
    }

    private static String normalizeString(String value) {
        return value == null ? '' : value.trim();
    }

    private static void throwHandledException(String message) {
        AuraHandledException handledError = new AuraHandledException(message);
        handledError.setMessage(message);
        throw handledError;
    }

    private static void writeJson(Integer statusCode, Object payload) {
        if (RestContext.response == null) {
            RestContext.response = new RestResponse();
        }

        RestContext.response.statusCode = statusCode;
        RestContext.response.addHeader('Content-Type', 'application/json; charset=UTF-8');
        RestContext.response.responseBody = Blob.valueOf(JSON.serialize(payload));
    }

    private static void writeError(Integer statusCode, String error, String message) {
        writeJson(statusCode, new ErrorPayload(error, message));
    }
}
