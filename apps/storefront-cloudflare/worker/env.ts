export interface Env {
  ASSETS: {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
  STOREFRONT_PROVIDER?: string;
  SALESFORCE_API_BASE_URL?: string;
  SALESFORCE_MEDIA_BASE_URL?: string;
  SALESFORCE_API_TOKEN?: string;
  SALESFORCE_API_VERSION?: string;
  EDGE_CACHE_TTL_SECONDS?: string;
}
