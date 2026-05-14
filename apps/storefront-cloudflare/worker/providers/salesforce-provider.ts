import type {
  CheckoutPayload,
  CheckoutResponse,
  HomeResponse,
  ProductSortBy,
  ProductsResponse,
  QuizIdentityBridgeMonitorPayload,
  QuizIdentityBridgeMonitorResponse,
  QuizRecommendationCodeClickPayload,
  QuizRecommendationCodeClickResponse,
  QuizProgressPayload,
  QuizProgressResponse,
  QuizSharePayload,
  QuizShareResponse,
  QuizSession,
  RequestPayload,
  RequestResponse,
  SideCategory,
  StorefrontConfigResponse,
  StorefrontProduct
} from "../../shared/contracts";
import {
  createMockCheckoutResponse,
  getStorefrontConfig,
  getStorefrontContentDocument
} from "../../shared/storefront";
import type { Env } from "../env";
import type { ProductListQuery, StorefrontProvider } from "./contracts";
import {
  resetSalesforceTokenCache,
  resolveSalesforceAccessToken
} from "./salesforce-auth";

const STOREFRONT_API_PREFIX = "/services/apexrest/alpine-storefront/v1";

interface SalesforcePublicConfig {
  storeName?: string;
  storeTagline?: string;
  logoImageUrl?: string;
  searchPlaceholder?: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroBody?: string;
  heroPrimaryCtaLabel?: string;
  heroSecondaryCtaLabel?: string;
  flashSaleTitle?: string;
  flashSaleIntro?: string;
  technologyTitle?: string;
  technologyIntro?: string;
  recommendationsTitle?: string;
  recommendationsPromoTitle?: string;
  recommendationsPromoBody?: string;
  recommendationsPromoCtaLabel?: string;
  footerCopy?: string;
}

interface SalesforceCategoryOption {
  label: string;
  value: string;
  count: number;
}

interface SalesforceImageRecord {
  url?: string;
  alt?: string;
  cmsContentId?: string;
  cmsDeliveryPath?: string;
}

interface SalesforceSpecRecord {
  label?: string;
  value?: string;
}

interface SalesforceFeatureRecord {
  title?: string;
  description?: string;
}

interface SalesforceProductRecord {
  id?: string;
  sku?: string;
  slug?: string;
  name?: string;
  category?: string;
  price?: number;
  currencyIsoCode?: string;
  formattedPrice?: string;
  availability?: string;
  shortDescription?: string;
  longDescription?: string;
  badges?: string[];
  featureHighlights?: string[];
  features?: SalesforceFeatureRecord[];
  specHighlights?: SalesforceSpecRecord[];
  images?: SalesforceImageRecord[];
  listingImage?: SalesforceImageRecord;
}

interface SalesforceCatalogResponse {
  total?: number;
  products?: SalesforceProductRecord[];
  categories?: SalesforceCategoryOption[];
}

interface SalesforceRequestResponse {
  leadId?: string;
  reference?: string;
  message?: string;
}

export class SalesforceStorefrontProvider implements StorefrontProvider {
  readonly name = "salesforce" as const;

  constructor(private readonly env: Env) {}

  async getConfig(): Promise<StorefrontConfigResponse> {
    const baseConfig = getStorefrontConfig();
    const [publicConfig, catalog] = await Promise.all([
      this.fetchSalesforceJson<SalesforcePublicConfig>("/config"),
      this.fetchCatalog({ sortBy: "featured", limitSize: 1 })
    ]);

      return {
        shell: {
          ...baseConfig.shell,
          brandEyebrow: readText(publicConfig.storeTagline, baseConfig.shell.brandEyebrow),
          brandName: baseConfig.shell.brandName,
          searchPlaceholder: readText(
            publicConfig.searchPlaceholder,
            baseConfig.shell.searchPlaceholder
        ),
        footerLegal: readText(publicConfig.footerCopy, baseConfig.shell.footerLegal),
        sideCategories: this.mapSideCategories(catalog.categories || [])
      },
      pages: {
        ...baseConfig.pages,
        home: {
          ...baseConfig.pages.home,
          heroCtaLabel: readText(
            publicConfig.heroPrimaryCtaLabel,
            baseConfig.pages.home.heroCtaLabel
          ),
          flashSaleTitle: readText(
            publicConfig.flashSaleTitle,
            baseConfig.pages.home.flashSaleTitle
          ),
          premiumTechnologyTitle: readText(
            publicConfig.technologyTitle,
            baseConfig.pages.home.premiumTechnologyTitle
          ),
          recommendedTitle: readText(
            publicConfig.recommendationsTitle,
            baseConfig.pages.home.recommendedTitle
          ),
          promoCard: {
            ...baseConfig.pages.home.promoCard,
            title: readText(
              publicConfig.recommendationsPromoTitle,
              baseConfig.pages.home.promoCard.title
            ),
            body: readText(
              publicConfig.recommendationsPromoBody,
              baseConfig.pages.home.promoCard.body
            ),
            ctaLabel: readText(
              publicConfig.recommendationsPromoCtaLabel,
              baseConfig.pages.home.promoCard.ctaLabel
            )
          }
        }
      }
    };
  }

  async getHome(): Promise<HomeResponse> {
    const baseDocument = getStorefrontContentDocument();
    const [publicConfig, featured, premium, recommended] = await Promise.all([
      this.fetchSalesforceJson<SalesforcePublicConfig>("/config"),
      this.fetchCatalog({ sortBy: "featured", limitSize: 4 }),
      this.fetchCatalog({ sortBy: "priceDesc", limitSize: 5 }),
      this.fetchCatalog({ sortBy: "newest", limitSize: 7 })
    ]);

    return {
      navLinks: baseDocument.shell.navLinks,
      sideCategories: this.mapSideCategories(featured.categories || []),
      quickLinks: baseDocument.homeSections.quickLinks,
      footerLinks: baseDocument.shell.footerLinks,
      heroFeature: {
        ...baseDocument.homeSections.heroFeature,
        imageUrl: toMediaUrl(baseDocument.homeSections.heroFeature.imageUrl),
        label: readText(publicConfig.heroEyebrow, baseDocument.homeSections.heroFeature.label),
        title: readText(publicConfig.heroTitle, baseDocument.homeSections.heroFeature.title),
        body: readText(publicConfig.heroBody, baseDocument.homeSections.heroFeature.body)
      },
      heroSecondary: {
        ...baseDocument.homeSections.heroSecondary,
        imageUrl: toMediaUrl(baseDocument.homeSections.heroSecondary.imageUrl)
      },
      heroMembership: baseDocument.homeSections.heroMembership,
      editorialBanner: {
        ...baseDocument.homeSections.editorialBanner,
        imageUrl: toMediaUrl(baseDocument.homeSections.editorialBanner.imageUrl),
        title: readText(
          publicConfig.technologyTitle,
          baseDocument.homeSections.editorialBanner.title
        ),
        caption: readText(
          publicConfig.technologyIntro,
          baseDocument.homeSections.editorialBanner.caption
        )
      },
      flashSale: (featured.products || []).map((item) => this.mapProduct(item)).slice(0, 4),
      premiumTechnology: (premium.products || [])
        .map((item) => this.mapProduct(item))
        .slice(0, 5),
      recommended: (recommended.products || [])
        .map((item) => this.mapProduct(item))
        .slice(0, 7)
    };
  }

  async listProducts(query: ProductListQuery = {}): Promise<ProductsResponse> {
    const response = await this.fetchCatalog(query);

    return {
      items: (response.products || []).map((product) => this.mapProduct(product)),
      total: response.total || (response.products || []).length,
      category: query.category || "all",
      q: query.q || "",
      sortBy: query.sortBy || "featured",
      limitSize: query.limitSize,
      sideCategories: this.mapSideCategories(response.categories || [])
    };
  }

  async getProductDetail(slug: string): Promise<StorefrontProduct | null> {
    const response = await this.fetchSalesforce(
      `${STOREFRONT_API_PREFIX}/products/${encodeURIComponent(slug)}`
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Salesforce API ${response.status}: ${await this.readErrorMessage(response)}`
      );
    }

    const payload = (await response.json()) as SalesforceProductRecord;
    return this.mapProduct(payload);
  }

  async submitCheckout(payload: CheckoutPayload): Promise<CheckoutResponse> {
    return createMockCheckoutResponse(payload);
  }

  async submitRequest(payload: RequestPayload): Promise<RequestResponse> {
    const response = await this.fetchSalesforce(`${STOREFRONT_API_PREFIX}/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        `Salesforce API ${response.status}: ${await this.readErrorMessage(response)}`
      );
    }

    const result = (await response.json()) as SalesforceRequestResponse;
    const commonPage = getStorefrontContentDocument().pages.common;

    return {
      ok: true,
      message: result.message || commonPage.salesforceRequestSuccessMessage,
      reference: result.reference || result.leadId || "SALESFORCE-UNKNOWN",
      mockMode: false
    };
  }

  async recordQuizProgress(
    payload: QuizProgressPayload
  ): Promise<QuizProgressResponse> {
    const response = await this.fetchSalesforce(`${STOREFRONT_API_PREFIX}/quiz/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        `Salesforce API ${response.status}: ${await this.readErrorMessage(response)}`
      );
    }

    return (await response.json()) as QuizProgressResponse;
  }

  async sendQuizShare(payload: QuizSharePayload): Promise<QuizShareResponse> {
    return this.fetchSalesforceJson<QuizShareResponse>("/quiz/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  async recordIdentityBridgeMonitor(
    payload: QuizIdentityBridgeMonitorPayload
  ): Promise<QuizIdentityBridgeMonitorResponse> {
    return this.fetchSalesforceJson<QuizIdentityBridgeMonitorResponse>(
      "/quiz/identity-bridge-monitor",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
  }

  async markRecommendationCodeClick(
    payload: QuizRecommendationCodeClickPayload
  ): Promise<QuizRecommendationCodeClickResponse> {
    return this.fetchSalesforceJson<QuizRecommendationCodeClickResponse>(
      "/quiz/recommendation-code-click",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
  }

  async getQuizSessions(limitSize = 50): Promise<QuizSession[]> {
    const searchParams = new URLSearchParams();

    if (limitSize > 0) {
      searchParams.set("limitSize", String(limitSize));
    }

    const path = searchParams.toString()
      ? `/quiz/sessions?${searchParams.toString()}`
      : "/quiz/sessions";

    return this.fetchSalesforceJson<QuizSession[]>(path);
  }

  private async fetchCatalog(
    query: ProductListQuery = {}
  ): Promise<SalesforceCatalogResponse> {
    const searchParams = new URLSearchParams();

    if (query.category && query.category !== "all") {
      searchParams.set("category", query.category);
    }

    if (query.q?.trim()) {
      searchParams.set("searchTerm", query.q.trim());
    }

    if (query.sortBy) {
      searchParams.set("sortBy", query.sortBy);
    }

    if (query.limitSize && query.limitSize > 0) {
      searchParams.set("limitSize", String(query.limitSize));
    }

    const path = searchParams.toString()
      ? `/products?${searchParams.toString()}`
      : "/products";

    return this.fetchSalesforceJson<SalesforceCatalogResponse>(path);
  }

  private async fetchSalesforceJson<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const response = await this.fetchSalesforce(`${STOREFRONT_API_PREFIX}${path}`, init);

    if (!response.ok) {
      throw new Error(
        `Salesforce API ${response.status}: ${await this.readErrorMessage(response)}`
      );
    }

    return (await response.json()) as T;
  }

  private async fetchSalesforce(
    path: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const baseUrl = this.env.SALESFORCE_API_BASE_URL?.trim();

    if (!baseUrl) {
      throw new Error("Salesforce provider requires SALESFORCE_API_BASE_URL.");
    }

    const response = await this.executeSalesforceRequest(path, init, baseUrl);

    if (response.status === 401 && this.hasOAuthCredentials()) {
      resetSalesforceTokenCache();
      return this.executeSalesforceRequest(path, init, baseUrl);
    }

    return response;
  }

  private async executeSalesforceRequest(
    path: string,
    init: RequestInit,
    baseUrl: string
  ): Promise<Response> {
    const token = await resolveSalesforceAccessToken(this.env);
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(new URL(path, baseUrl), {
      ...init,
      headers
    });
  }

  private hasOAuthCredentials(): boolean {
    return Boolean(
      this.env.SALESFORCE_CLIENT_ID?.trim() &&
        this.env.SALESFORCE_CLIENT_SECRET?.trim()
    );
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };
      return payload.message || payload.error || response.statusText;
    } catch {
      return response.statusText || "Salesforce request failed.";
    }
  }

  private mapSideCategories(categories: SalesforceCategoryOption[]): SideCategory[] {
    const baseDocument = getStorefrontContentDocument();
    const byId = new Map(
      baseDocument.shell.sideCategories.map((category) => [category.id.toLowerCase(), category])
    );
    const byLabel = new Map(
      baseDocument.shell.sideCategories.map((category) => [
        category.label.toLowerCase(),
        category
      ])
    );

    if (!categories.length) {
      return baseDocument.shell.sideCategories;
    }

    return categories.map((category) => {
      const baseCategory =
        byId.get(category.value.toLowerCase()) || byLabel.get(category.label.toLowerCase());

      return {
        id: category.value,
        label: category.label,
        caption: baseCategory?.caption || `${category.count} items`,
        icon: baseCategory?.icon || inferCategoryIcon(category.label)
      };
    });
  }

  private mapProduct(record: SalesforceProductRecord): StorefrontProduct {
    const baseDocument = getStorefrontContentDocument();
    const commonPage = baseDocument.pages.common;
    const matchedBaseProduct = baseDocument.products.find(
      (product) =>
        product.slug === record.slug ||
        product.id === record.id ||
        product.name === record.name
    );
    const image =
      record.listingImage ||
      record.images?.[0] ||
      (matchedBaseProduct
        ? {
            url: matchedBaseProduct.imageUrl,
            alt: matchedBaseProduct.imageAlt
          }
        : undefined);
    const highlights = (record.featureHighlights || []).filter(Boolean);
    const fallbackHighlights = (record.features || [])
      .map((feature) => feature.title || feature.description || "")
      .filter(Boolean)
      .slice(0, 3);

    return {
      id: record.id || matchedBaseProduct?.id || record.slug || "salesforce-product",
      slug:
        record.slug ||
        matchedBaseProduct?.slug ||
        slugify(record.name || record.id || "salesforce-product"),
      categoryId: record.category || matchedBaseProduct?.categoryId || "all",
      categoryLabel:
        record.category || matchedBaseProduct?.categoryLabel || "Curated Selection",
      label: record.category || matchedBaseProduct?.label || "Curated Selection",
      name: record.name || matchedBaseProduct?.name || "Untitled product",
      kicker:
        readText(
          record.availability,
          record.badges?.[0] || matchedBaseProduct?.kicker || "Storefront selection"
        ),
      priceLabel:
        normalizePriceLabel(record.formattedPrice, record.price, record.currencyIsoCode) ||
        matchedBaseProduct?.priceLabel ||
        "Price on request",
      originalPriceLabel: matchedBaseProduct?.originalPriceLabel,
      saleBadge: record.badges?.[0] || matchedBaseProduct?.saleBadge,
      claimedPercent: matchedBaseProduct?.claimedPercent,
      description:
        readText(
          record.shortDescription,
          matchedBaseProduct?.description || commonPage.productDescriptionFallback
        ),
      longDescription:
        readText(
          stripHtml(record.longDescription),
          matchedBaseProduct?.longDescription || commonPage.productLongDescriptionFallback
        ),
      highlights: highlights.length
        ? highlights
        : fallbackHighlights.length
          ? fallbackHighlights
          : matchedBaseProduct?.highlights || ["Curated storefront item"],
      specs:
        record.specHighlights
          ?.map((spec) => ({
            label: spec.label || "Spec",
            value: spec.value || "-"
          }))
          .filter((spec) => spec.label && spec.value) || matchedBaseProduct?.specs || [],
      imageUrl: resolveSalesforceImageUrl(image, matchedBaseProduct?.imageUrl, this.env),
      imageAlt:
        image?.alt || matchedBaseProduct?.imageAlt || record.name || "storefront product image"
    };
  }
}

function readText(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function stripHtml(value: string | undefined): string {
  const normalized = value?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return normalized || "";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(price?: number, currencyIsoCode?: string): string {
  if (typeof price !== "number" || Number.isNaN(price)) {
    return "";
  }

  const currency = (currencyIsoCode || "TWD").toUpperCase();

  if (currency === "TWD") {
    return `NT$${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0
    }).format(price)}`;
  }

  try {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

function normalizePriceLabel(
  formattedPrice?: string,
  price?: number,
  currencyIsoCode?: string
): string {
  const normalized = formattedPrice?.trim();

  if (normalized) {
    const parsedAmount = parseNumericPrice(normalized);

    if (parsedAmount !== null && !hasCurrencyMarker(normalized)) {
      return formatPrice(parsedAmount, currencyIsoCode);
    }

    if (parsedAmount !== null && /^twd\b/i.test(normalized)) {
      return formatPrice(parsedAmount, "TWD");
    }

    return normalized;
  }

  return formatPrice(price, currencyIsoCode);
}

function parseNumericPrice(value: string): number | null {
  const numeric = value.replace(/,/g, "").replace(/[^\d.]/g, "");

  if (!numeric) {
    return null;
  }

  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasCurrencyMarker(value: string): boolean {
  return /(?:NT\$|[$¥€£]|USD|TWD|JPY|CNY|RMB|EUR|GBP)/i.test(value);
}

function resolveSalesforceImageUrl(
  image: SalesforceImageRecord | undefined,
  fallbackUrl: string | undefined,
  env: Pick<Env, "SALESFORCE_API_BASE_URL" | "SALESFORCE_MEDIA_BASE_URL">
): string {
  const directUrl = image?.url?.trim();
  if (directUrl) {
    return toSalesforceMediaUrl(directUrl, env);
  }

  const cmsDeliveryPath = image?.cmsDeliveryPath?.trim();
  if (cmsDeliveryPath) {
    return toSalesforceMediaUrl(cmsDeliveryPath, env);
  }

  return fallbackUrl || "";
}

function toMediaUrl(imageUrl: string): string {
  const normalized = imageUrl.trim();

  if (!normalized || normalized.startsWith("/")) {
    return normalized;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `/api/media?src=${encodeURIComponent(normalized)}`;
}

function toSalesforceMediaUrl(
  imageUrl: string,
  env: Pick<Env, "SALESFORCE_API_BASE_URL" | "SALESFORCE_MEDIA_BASE_URL">
): string {
  const normalized = imageUrl.trim();

  if (!normalized) {
    return "";
  }

  if (/^https?:\/\//i.test(normalized)) {
    return buildMediaProxyUrl(normalized);
  }

  if (!normalized.startsWith("/")) {
    return normalized;
  }

  const absoluteUrl = toAbsoluteSalesforceUrl(normalized, env);
  return absoluteUrl ? buildMediaProxyUrl(absoluteUrl) : normalized;
}

function toAbsoluteSalesforceUrl(
  path: string,
  env: Pick<Env, "SALESFORCE_API_BASE_URL" | "SALESFORCE_MEDIA_BASE_URL">
): string | null {
  const origin = readSalesforceMediaOrigin(env);

  if (!origin) {
    return null;
  }

  try {
    return new URL(path, origin).toString();
  } catch {
    return null;
  }
}

function readSalesforceMediaOrigin(
  env: Pick<Env, "SALESFORCE_API_BASE_URL" | "SALESFORCE_MEDIA_BASE_URL">
): string | null {
  const candidates = [env.SALESFORCE_MEDIA_BASE_URL, env.SALESFORCE_API_BASE_URL];

  for (const candidate of candidates) {
    const normalized = candidate?.trim();

    if (!normalized) {
      continue;
    }

    try {
      return new URL(normalized).origin;
    } catch {
      continue;
    }
  }

  return null;
}

function buildMediaProxyUrl(imageUrl: string): string {
  return `/api/media?src=${encodeURIComponent(imageUrl)}`;
}

function inferCategoryIcon(label: string): string {
  const normalized = label.toLowerCase();

  if (normalized.includes("wellness") || normalized.includes("health")) {
    return "self_care";
  }

  if (normalized.includes("travel")) {
    return "flight_takeoff";
  }

  if (normalized.includes("style") || normalized.includes("fashion")) {
    return "diamond";
  }

  if (normalized.includes("food") || normalized.includes("gourmet")) {
    return "restaurant";
  }

  return "devices";
}
