import storefrontContent from "../data/site-content.zh-TW.json";
import type {
  HomeResponse,
  ProductSortBy,
  ProductsResponse,
  RequestPayload,
  RequestResponse,
  StorefrontConfigResponse,
  StorefrontContentDocument,
  StorefrontProduct
} from "./contracts";

const content = storefrontContent as StorefrontContentDocument;
const DEFAULT_SORT: ProductSortBy = "featured";

export function getStorefrontContentDocument(): StorefrontContentDocument {
  return content;
}

export function getStorefrontConfig(): StorefrontConfigResponse {
  return {
    shell: content.shell,
    pages: content.pages
  };
}

function productMap() {
  return new Map(content.products.map((product) => [product.id, product]));
}

function resolveIds(ids: string[]) {
  const items = productMap();
  return ids
    .map((id) => items.get(id))
    .filter((product): product is StorefrontProduct => Boolean(product));
}

export function getHomeResponse(): HomeResponse {
  return {
    navLinks: content.shell.navLinks,
    sideCategories: content.shell.sideCategories,
    quickLinks: content.homeSections.quickLinks,
    footerLinks: content.shell.footerLinks,
    heroFeature: content.homeSections.heroFeature,
    heroSecondary: content.homeSections.heroSecondary,
    heroMembership: content.homeSections.heroMembership,
    editorialBanner: content.homeSections.editorialBanner,
    flashSale: resolveIds(content.homeSections.flashSaleIds),
    premiumTechnology: resolveIds(content.homeSections.premiumTechnologyIds),
    recommended: resolveIds(content.homeSections.recommendedIds)
  };
}

export function listProducts({
  category = "all",
  q = "",
  sortBy = DEFAULT_SORT,
  limitSize
}: {
  category?: string;
  q?: string;
  sortBy?: ProductSortBy;
  limitSize?: number;
} = {}): ProductsResponse {
  const normalizedCategory = category || "all";
  const normalizedQuery = q.trim().toLowerCase();
  const normalizedSort = normalizeSort(sortBy);
  const safeLimit = normalizeLimit(limitSize);

  const filteredItems = content.products.filter((product) => {
    const matchCategory =
      normalizedCategory === "all" ? true : product.categoryId === normalizedCategory;
    const matchQuery = normalizedQuery
      ? [
          product.name,
          product.categoryLabel,
          product.description,
          product.kicker,
          product.label
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      : true;

    return matchCategory && matchQuery;
  });

  const items = sortProducts(filteredItems, normalizedSort).slice(
    0,
    safeLimit > 0 ? safeLimit : undefined
  );

  return {
    items,
    total: items.length,
    category: normalizedCategory,
    q,
    sortBy: normalizedSort,
    limitSize: safeLimit || undefined,
    sideCategories: content.shell.sideCategories
  };
}

export function getProductDetail(slug: string): StorefrontProduct | null {
  const normalizedSlug = slug.trim().toLowerCase();
  return content.products.find((product) => product.slug === normalizedSlug) || null;
}

export function createMockRequestResponse(payload: RequestPayload): RequestResponse {
  const hash = Math.abs(
    Array.from(`${payload.fullName}:${payload.email}:${payload.company}`)
      .join("")
      .split("")
      .reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0)
  )
    .toString()
    .padStart(6, "0")
    .slice(0, 6);
  const requestPage = content.pages.request;
  const contactName = payload.fullName?.trim() || requestPage.mockAnonymousName;

  return {
    ok: true,
    message: applyTemplate(requestPage.mockSuccessMessageTemplate, {
      name: contactName
    }),
    reference: `ALPINE-MOCK-${hash}`,
    mockMode: true
  };
}

function applyTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function normalizeSort(value?: ProductSortBy): ProductSortBy {
  switch (value) {
    case "newest":
    case "priceAsc":
    case "priceDesc":
    case "nameAsc":
      return value;
    default:
      return DEFAULT_SORT;
  }
}

function normalizeLimit(value?: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value || 0));
}

function sortProducts(items: StorefrontProduct[], sortBy: ProductSortBy): StorefrontProduct[] {
  const products = [...items];

  switch (sortBy) {
    case "newest":
      return products.sort((left, right) => right.id.localeCompare(left.id));
    case "priceAsc":
      return products.sort((left, right) => readNumericPrice(left) - readNumericPrice(right));
    case "priceDesc":
      return products.sort((left, right) => readNumericPrice(right) - readNumericPrice(left));
    case "nameAsc":
      return products.sort((left, right) => left.name.localeCompare(right.name));
    case "featured":
    default:
      return products.sort((left, right) => {
        const saleWeight = (right.claimedPercent || 0) - (left.claimedPercent || 0);
        if (saleWeight !== 0) {
          return saleWeight;
        }

        return left.name.localeCompare(right.name);
      });
  }
}

function readNumericPrice(product: StorefrontProduct): number {
  const digits = product.priceLabel.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}
