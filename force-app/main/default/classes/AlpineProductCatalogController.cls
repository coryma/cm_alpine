public without sharing class AlpineProductCatalogController {
    @AuraEnabled(cacheable=true)
    public static AlpineProductCatalogService.CatalogResponse listProducts(
        String category,
        String sortBy,
        Integer limitSize
    ) {
        return AlpineProductCatalogService.listProducts(category, sortBy, limitSize);
    }

    @AuraEnabled(cacheable=true)
    public static AlpineProductCatalogService.ProductRecord getProductDetail(
        String productId,
        String productSlug,
        String productSku
    ) {
        return AlpineProductCatalogService.getProductDetail(productId, productSlug, productSku);
    }

    @AuraEnabled(cacheable=true)
    public static AlpineProductCatalogService.FeaturedProductsResponse featuredProducts(Integer limitSize) {
        return AlpineProductCatalogService.featuredProducts(limitSize);
    }

    @AuraEnabled(cacheable=true)
    public static AlpineProductCatalogService.CatalogResponse searchProducts(
        String searchTerm,
        String category,
        String sortBy,
        Integer limitSize
    ) {
        return AlpineProductCatalogService.searchProducts(searchTerm, category, sortBy, limitSize);
    }
}
