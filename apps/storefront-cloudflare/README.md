# Alpine Storefront on Cloudflare

This app is a Cloudflare storefront migration workspace for the Alpine demo project. It intentionally lives under `apps/storefront-cloudflare/` so the existing Salesforce DX project can stay untouched while the new public-facing experience is moved out of Experience Cloud in controlled phases.

## What this preview already gives you

- A React SPA storefront with route-level pages on Cloudflare
- A Worker BFF entrypoint at `worker/index.ts`
- Worker endpoints for config, home, products, product detail, and request flow:
  - `GET /api/config`
  - `GET /api/home`
  - `GET /api/products`
  - `GET /api/products/:slug`
  - `POST /api/request`
  - `GET /api/health`
  - `GET /api/roadmap`
- A content-driven catalog preview backed by `data/site-content.zh-TW.json`
- A provider boundary under `worker/providers/` so the current static JSON source can later be swapped for Salesforce without changing the public routes
- Wrangler + Vite wiring for local development and deploy

## Commands

```bash
npm install
npm run dev
npm run build
npm run deploy
```

## Environment setup

You do not need Salesforce credentials to preview the current site. Copy `.dev.vars.example` to `.dev.vars` only when you start wiring the Worker to real backend services.

Future backend variables:

- `STOREFRONT_PROVIDER`
- `SALESFORCE_API_BASE_URL`
- `SALESFORCE_MEDIA_BASE_URL` (optional, for ProductMedia / CMS images on an Experience domain)
- `SALESFORCE_API_TOKEN`
- `SALESFORCE_API_VERSION`
- `EDGE_CACHE_TTL_SECONDS`

Do not expose Salesforce credentials in the browser. All secrets stay inside the Worker when the integration phase starts.

## Current source mapping for later integration

These are the main Salesforce sources that need public API equivalents:

| Current Salesforce source | Future Worker-facing API |
| --- | --- |
| `force-app/main/default/classes/AlpineStorefrontConfigController.cls` | `/api/config` |
| `force-app/main/default/classes/AlpineProductCatalogController.cls` | `/api/products` and `/api/search` |
| `force-app/main/default/classes/AlpineProductCatalogService.cls` | `/api/products/:slug` |
| `force-app/main/default/classes/DemoCartRequestController.cls` | `/api/request` |
| `force-app/main/default/classes/HealthQuizProgressController.cls` | `/api/quiz/*` |

## Current delivery order

1. Preview the static storefront on Cloudflare and decide on the visual direction.
2. Refine the home, catalog, detail, and request sections until the shell feels right.
3. Move storefront content and product data out of components and into editable data files.
4. Publish Salesforce-backed APIs only after the Cloudflare route and content model are accepted.

## Notes on Cloudflare setup

- `wrangler.jsonc` points `main` to `worker/index.ts`.
- `assets.not_found_handling` is set to `single-page-application` so storefront routes stay in the SPA while `/api/*` remains in the Worker.
- `data/site-content.zh-TW.json` is the current editable source for shell copy, page copy, category definitions, and product content.
- `shared/storefront.ts` is now only a data access layer that derives API responses from the JSON document.
- `worker/providers/static-json-provider.ts` is the active provider.
- `worker/providers/salesforce-provider.ts` now calls the Salesforce Apex REST facade while preserving the existing Cloudflare route contracts.
- `/api/products` already accepts `category`, `q`, `sortBy`, and `limitSize` to stay close to the Salesforce catalog controller shape.
- The Salesforce-facing facade now lives in `force-app/main/default/classes/AlpineStorefrontPublicRest.cls` and exposes `/services/apexrest/alpine-storefront/v1/config`, `/products`, `/products/{slug}`, and `/request`.
- This aligns with Cloudflare's React + Vite guidance for a React SPA plus Worker API.

## Next implementation targets

- Add external CMS or sheet sync to replace the local JSON document.
- Map the JSON content model to Salesforce-backed `/api/products`, `/api/products/:slug`, and `/api/request`.
- Add `/api/config` sourcing rules so global shell copy can come from a real backend when needed.

## Switching to Salesforce provider later

1. Keep `STOREFRONT_PROVIDER=static-json` until the Worker env has a valid Salesforce base URL and token.
2. Deploy the Apex REST facade in the Salesforce org.
3. Set:
   - `STOREFRONT_PROVIDER=salesforce`
   - `SALESFORCE_API_BASE_URL=https://<your-instance>.my.salesforce.com`
   - `SALESFORCE_MEDIA_BASE_URL=https://<your-experience-site>.my.site.com` when ProductMedia / CMS delivery uses a site host instead of the API host
   - `SALESFORCE_API_TOKEN=<worker-side bearer token>`
4. Re-deploy the Cloudflare Worker after the env change.
