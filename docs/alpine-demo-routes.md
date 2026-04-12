# Alpine Demo Storefront Routes and Component Contract

This document defines the Experience/LWR page shell contract for the Alpine demo storefront. Other workflows should treat the Experience metadata as fixed and attach their work inside the mount components listed below.

## Route map

| Page | Public path | Route metadata | View metadata | Shell pageKey | Mount component |
| --- | --- | --- | --- | --- | --- |
| Home | `/` | `force-app/main/default/digitalExperiences/site/alpineDemoStorefront/sfdc_cms__route/Home/content.json` | `force-app/main/default/digitalExperiences/site/alpineDemoStorefront/sfdc_cms__view/home/content.json` | `home` | `force-app/main/default/lwc/alpineDemoHomeMount` |
| Products | `/products` | `force-app/main/default/digitalExperiences/site/alpineDemoStorefront/sfdc_cms__route/Products/content.json` | `force-app/main/default/digitalExperiences/site/alpineDemoStorefront/sfdc_cms__view/products/content.json` | `products` | `force-app/main/default/lwc/alpineDemoProductsMount` |
| Product Detail | `/product?sku=<value>` | `force-app/main/default/digitalExperiences/site/alpineDemoStorefront/sfdc_cms__route/Product_Detail/content.json` | `force-app/main/default/digitalExperiences/site/alpineDemoStorefront/sfdc_cms__view/productDetail/content.json` | `product-detail` | `force-app/main/default/lwc/alpineDemoProductDetailMount` |
| Cart | `/cart` | `force-app/main/default/digitalExperiences/site/alpineDemoStorefront/sfdc_cms__route/Cart/content.json` | `force-app/main/default/digitalExperiences/site/alpineDemoStorefront/sfdc_cms__view/cart/content.json` | `cart` | `force-app/main/default/lwc/alpineDemoCartMount` |
| Request | `/request` | `force-app/main/default/digitalExperiences/site/alpineDemoStorefront/sfdc_cms__route/Request/content.json` | `force-app/main/default/digitalExperiences/site/alpineDemoStorefront/sfdc_cms__view/request/content.json` | `request` | `force-app/main/default/lwc/alpineDemoRequestMount` |

## Ownership boundaries

- Experience page metadata is owned centrally. The five view files all render `c:alpineDemoSiteShell` and should not be repurposed by downstream workflows.
- Global header, footer, route-aware navigation, and shared design tokens are owned by `force-app/main/default/lwc/alpineDemoSiteShell`.
- Shared page framing is owned by `force-app/main/default/lwc/alpineDemoPageContainer`.
- Page-specific UX belongs inside the five mount bundles only.
- Canonical page entrypoints for this storefront shell are the `alpineDemo*Mount` bundles referenced above. Other local demo components are intentionally not wired into the Experience routes.
- Do not introduce Commerce built-in components into these Experience views.
- Do not add product-query logic to the shell. Product and cart data flows should be implemented inside page mounts or their child components later.

## Component contract

### `alpineDemoSiteShell`

- Exposure: `lightningCommunity__Page` and `lightningCommunity__Default`
- Required Experience property: `pageKey`
- Supported values: `home`, `products`, `product-detail`, `cart`, `request`
- Responsibilities:
  - Render site-wide header and footer
  - Publish shared CSS tokens for descendant components
  - Resolve Experience-aware navigation links with `@salesforce/community/basePath`
  - Select the correct page mount based on `pageKey`

### `alpineDemoPageContainer`

- Exposure: private helper component
- Responsibilities:
  - Provide consistent page spacing, surface styling, and title treatment
  - Inherit tokens from the shell and keep page mounts visually aligned

### Page mounts

- `alpineDemoHomeMount`
  - Reserved for hero, promo, and featured merchandising composition
- `alpineDemoProductsMount`
  - Reserved for catalog grid, filters, pagination, and search-result states
- `alpineDemoProductDetailMount`
  - Reserved for SKU-specific media, detail content, and purchase-adjacent interactions
- `alpineDemoCartMount`
  - Reserved for cart rows, totals, promo entry, and checkout handoff
- `alpineDemoRequestMount`
  - Reserved for quote/help/sample request intake and confirmation states

## Integration notes for downstream workflows

- Keep routing stable by editing the mount bundles instead of the Experience JSON.
- If product detail needs context, read it from page state or query string inside `alpineDemoProductDetailMount`. The current route contract assumes `sku` or `productId` can be added later without changing Experience metadata.
- If a workflow needs additional child components, compose them under the relevant mount instead of placing them directly in the Experience view.
- Shared tokens are defined in `alpineDemoSiteShell.css` using the `--alpine-demo-*` namespace.

## Files created for the shell

- `force-app/main/default/digitalExperiences/site/alpineDemoStorefront`
- `force-app/main/default/lwc/alpineDemoSiteShell`
- `force-app/main/default/lwc/alpineDemoPageContainer`
- `force-app/main/default/lwc/alpineDemoHomeMount`
- `force-app/main/default/lwc/alpineDemoProductsMount`
- `force-app/main/default/lwc/alpineDemoProductDetailMount`
- `force-app/main/default/lwc/alpineDemoCartMount`
- `force-app/main/default/lwc/alpineDemoRequestMount`
