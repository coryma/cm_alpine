# WF-1 Product UI Integration

This repo now ships the storefront UI as four Lightning Web Components plus one shared adapter:

- `productsPage`: list page host with search, category filter, and sorting
- `productDetailPage`: detail page host with image gallery, price, descriptions, features, FAQ, and add-to-cart CTA
- `productCard`: reusable summary card
- `productFilters`: reusable search / category / sort controls
- `productCatalogAdapter`: the single normalization seam for WF-1

## Current adapter behavior

`productCatalogAdapter` still defaults to `mock` mode when used standalone, but the Alpine demo mount components now point the storefront at Apex-backed `wf1` mode:

- `getProductCatalog({ source, searchTerm, category, sortBy })`
- `getProductDetail({ source, productId, productSlug, productSku })`
- `addProductToCart({ source, productId, quantity })`
- `buildProductDetailUrl(product, detailPagePath)`

The Alpine demo storefront now resolves those seams with:

- Apex controller: `AlpineProductCatalogController`
- Apex service: `AlpineProductCatalogService`
- Fixed demo price book id: `AlpineProductCatalogService.DEFAULT_DEMO_PRICEBOOK_ID`

Implemented read APIs:

- `listProducts({ category, sortBy, limitSize })`
- `searchProducts({ searchTerm, category, sortBy, limitSize })`
- `getProductDetail({ productId, productSlug, productSku })`
- `featuredProducts({ limitSize })`

`postWF1AddToCart()` remains intentionally pending and still returns the existing placeholder message. No cart or request-submit implementation was added in this workflow.

## Apex contract

`listProducts` and `searchProducts` return a catalog wrapper:

```json
{
  "total": 2,
  "categories": [
    { "label": "All Categories", "value": "all", "count": 5 },
    { "label": "Wellness", "value": "Wellness", "count": 3 }
  ],
  "products": [
    {
      "id": "01t...",
      "sku": "ALP-BERRY-02",
      "slug": "berry-focus-blend",
      "name": "Berry Focus Blend",
      "category": "Wellness",
      "price": 29.5,
      "currencyIsoCode": "USD",
      "formattedPrice": "$29.50",
      "availability": "In stock",
      "shortDescription": "Berry-forward daily support.",
      "longDescription": "<p>Berry notes with focused energy support.</p>",
      "badges": ["Best Seller"],
      "sortRank": 999998,
      "releaseOrder": 1775712345000,
      "featureHighlights": [],
      "features": [],
      "specHighlights": [],
      "faqs": [],
      "images": []
    }
  ]
}
```

`getProductDetail` returns a single product object in the same normalized shape.

`featuredProducts` returns:

```json
{
  "total": 3,
  "products": [{ "...same normalized product shape..." }]
}
```

The homepage UI was left intact. `alpineDemoHomeAdapter` simply maps `featuredProducts()` into the existing featured card fields while preserving the current homepage copy/layout.

## Product field mapping

The Apex service reads from one fixed `Pricebook2` and filters to active `PricebookEntry` records where:

- `PricebookEntry.IsActive = true`
- `Product2.IsActive = true`
- `Product2.Show_on_Alpine__c = true`

Field priority:

- `category`: `Product2.Alpine_Category__c` -> `Product2.Family` -> `General`
- `shortDescription`: `Product2.Alpine_Short_Description__c` -> `Product2.Description`
- `badges`: `Product2.Alpine_Badge__c` split on comma / semicolon / pipe / newline
- `sortRank`: derived from `Product2.Alpine_Sort_Order__c` so smaller sort order renders earlier in `featured`
- `price`: `PricebookEntry.UnitPrice`
- `currencyIsoCode`: `PricebookEntry.CurrencyIsoCode`
- `longDescription`: `Product2.Description` converted into paragraph HTML
- `images`: `Product2.DisplayUrl` when present
- `slug`: generated from `Product2.Name`, falling back to `ProductCode`

## Expected normalized shape

The pages already consume this normalized product shape:

```json
{
  "id": "01t...",
  "sku": "WT-EAI-410",
  "slug": "edge-ai-vision-kit",
  "name": "Edge AI Vision Kit",
  "category": "Embedded AI",
  "price": 1299,
  "currencyIsoCode": "USD",
  "formattedPrice": "$1,299",
  "availability": "In stock",
  "shortDescription": "Short teaser copy",
  "longDescription": "<p>Rich text description</p>",
  "badges": ["New"],
  "featureHighlights": ["8 TOPS edge inference"],
  "features": [{ "title": "Fast pilot deployment", "description": "..." }],
  "specHighlights": [{ "label": "Compute", "value": "NVIDIA Jetson Orin NX" }],
  "faqs": [{ "question": "Can this run multi-camera inspection workloads?", "answer": "Yes." }],
  "images": [{ "url": "https://...", "alt": "Product image" }],
  "detailUrl": "/product?productId=01t..."
}
```

The Apex API now returns this shape directly. `normalizeProductRecord()` is still kept as the single browser-side normalization seam and continues to accept a few common aliases:

- `id`, `Id`, `productId`
- `slug`, `productSlug`
- `sku`, `productCode`
- `name`, `productName`, `title`
- `price.amount`, `price.value`, `unitPrice`
- `shortDescription`, `summary`, `teaser`
- `longDescription`, `longDescriptionHtml`, `description`

If WF-1 returns a different shape, extend `normalizeProductRecord()` instead of editing the page components.

## Routing and cart notes

- Experience routes were intentionally left untouched.
- `alpineDemoProductsMount` and `alpineDemoProductDetailMount` now use `adapter-source="wf1"`.
- `alpineDemoHomeMount` now uses `ADAPTER_SOURCE.WF1`, but only to swap the featured-products data source; homepage UI and copy structure stay the same.
- `productsPage` composes detail links from the configurable `detailPagePath` builder property. For the current Alpine route setup, the safe default is `/product`, which yields query-string handoff such as `/product?productId=...`.
- `productDetailPage` can resolve context from Builder properties, page state (`productId`, `productSlug`, `productSku`, `c__productId`, `c__productSlug`, `c__sku`, `slug`), query params, or the last URL path segment.
- Add-to-cart does not use `localStorage`. The button dispatches an `addtocart` event and calls the adapter seam only.
- Lead / demo request submission is intentionally not implemented here.
