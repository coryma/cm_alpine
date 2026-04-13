import type { RoadmapResponse } from "./contracts";

export const ROADMAP_RESPONSE: RoadmapResponse = {
  project: {
    name: "Alpine Storefront on Cloudflare",
    generatedOn: "2026-04-13",
    currentPlatform: "Salesforce Experience Cloud + LWC + Apex",
    targetPlatform: "Cloudflare Worker BFF + React SPA",
    migrationPrinciple: "Phase 1 keeps Salesforce as the system of record and only moves the public storefront.",
    nextCheckpoint: "Expose public product, config, and request APIs that an external frontend can call."
  },
  phases: [
    {
      id: "phase-0",
      title: "Phase 0: Freeze scope and contracts",
      window: "2-3 days",
      goal: "Lock the MVP pages and define the JSON contracts before any UI rewrite.",
      deliverables: [
        "Freeze MVP routes: /, /products, /product/:slug, /cart, /request",
        "Document the product, storefront config, and request payload shapes",
        "Decide whether health quiz ships in phase 1 or phase 2"
      ],
      exitCriteria: "The frontend team can build against stable endpoint contracts without opening Salesforce source every day."
    },
    {
      id: "phase-1",
      title: "Phase 1: Publish Salesforce-backed APIs",
      window: "3-5 days",
      goal: "Turn internal @AuraEnabled logic into external endpoints suitable for a Worker BFF.",
      deliverables: [
        "Create read-only product and storefront config APIs",
        "Create a protected request submission API for lead creation",
        "Choose Worker-to-Salesforce auth strategy and keep credentials server-side"
      ],
      exitCriteria: "The Cloudflare Worker can fetch real catalog data and submit requests without calling Experience Cloud directly."
    },
    {
      id: "phase-2",
      title: "Phase 2: Build the Cloudflare storefront shell",
      window: "4-6 days",
      goal: "Replace the Experience Cloud shell with a React storefront that uses the new Worker API.",
      deliverables: [
        "Implement homepage, product listing, product detail, cart, and request pages",
        "Preserve Chinese copy, route semantics, and product/category filtering behavior",
        "Add edge caching for config and catalog responses"
      ],
      exitCriteria: "A full storefront flow runs from Cloudflare with mock-free catalog data."
    },
    {
      id: "phase-3",
      title: "Phase 3: Cutover, harden, and observe",
      window: "2-4 days",
      goal: "Move traffic to Cloudflare and make failures visible before broader rollout.",
      deliverables: [
        "Attach a staging hostname and then the production custom domain",
        "Add analytics, logs, and error alerts around /api/* endpoints",
        "Smoke-test SEO, cache behavior, and request submission end to end"
      ],
      exitCriteria: "The Cloudflare storefront is stable enough to replace the Experience Cloud site for public traffic."
    }
  ],
  surfaces: [
    {
      name: "Public storefront config",
      currentSource: "force-app/main/default/classes/AlpineStorefrontConfigController.cls",
      targetEndpoint: "/api/config",
      notes: "Expose the read-only config currently sourced from Alpine_Storefront_Config__c."
    },
    {
      name: "Catalog listing and search",
      currentSource: "force-app/main/default/classes/AlpineProductCatalogController.cls",
      targetEndpoint: "/api/products and /api/search",
      notes: "Keep category, sort, and search behavior aligned with the current LWC adapter."
    },
    {
      name: "Product detail",
      currentSource: "force-app/main/default/classes/AlpineProductCatalogService.cls",
      targetEndpoint: "/api/products/:slug",
      notes: "Return badges, specs, FAQs, images, and formatted pricing in one payload."
    },
    {
      name: "Request submission",
      currentSource: "force-app/main/default/classes/DemoCartRequestController.cls",
      targetEndpoint: "/api/request",
      notes: "Lead creation stays in Salesforce, but the Worker should validate, rate-limit, and forward the request."
    },
    {
      name: "Health quiz",
      currentSource: "force-app/main/default/classes/HealthQuizProgressController.cls",
      targetEndpoint: "/api/quiz/*",
      notes: "Move this to phase 2 unless it is required for launch."
    }
  ],
  risks: [
    {
      title: "No external API contract yet",
      impact: "Frontend work will stall or drift if the data shape keeps changing.",
      mitigation: "Define the Worker-facing contracts first, then adapt Salesforce responses behind them."
    },
    {
      title: "Mixing data migration with hosting migration",
      impact: "Moving Product2, CMS media, and storefront config out of Salesforce at the same time will expand scope sharply.",
      mitigation: "Keep Salesforce as source of truth in phase 1 and postpone data relocation to a later phase."
    },
    {
      title: "Public request endpoint abuse",
      impact: "A public lead endpoint on Cloudflare will invite spam if deployed without controls.",
      mitigation: "Add Worker-side rate limiting, bot checks, and observability before cutover."
    }
  ],
  envChecklist: [
    {
      name: "SALESFORCE_API_BASE_URL",
      required: true,
      purpose: "Base URL for the Salesforce org or the custom public API gateway."
    },
    {
      name: "SALESFORCE_API_TOKEN",
      required: true,
      purpose: "Worker-side secret used to authenticate calls into Salesforce or the proxy gateway."
    },
    {
      name: "SALESFORCE_API_VERSION",
      required: false,
      purpose: "Allows the Worker to pin the target Salesforce REST API version."
    },
    {
      name: "EDGE_CACHE_TTL_SECONDS",
      required: false,
      purpose: "Controls how long catalog/config responses should be cached at the edge."
    }
  ]
};
