export interface Env {
  ASSETS: {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
  ACCOUNT_STORE: DurableObjectNamespace;
  ADMIN_MEMBER_EMAILS?: string;
  STOREFRONT_PROVIDER?: string;
  SALESFORCE_API_BASE_URL?: string;
  SALESFORCE_MEDIA_BASE_URL?: string;
  SALESFORCE_API_TOKEN?: string;
  SALESFORCE_CLIENT_ID?: string;
  SALESFORCE_CLIENT_SECRET?: string;
  SALESFORCE_API_VERSION?: string;
  EDGE_CACHE_TTL_SECONDS?: string;
}
