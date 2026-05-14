import type { Env } from "../env";
import type { StorefrontProvider, StorefrontProviderName } from "./contracts";
import { SalesforceStorefrontProvider } from "./salesforce-provider";
import { StaticJsonStorefrontProvider } from "./static-json-provider";

const DEFAULT_PROVIDER: StorefrontProviderName = "static-json";

export function readProviderName(value?: string): StorefrontProviderName {
  return value === "salesforce" ? "salesforce" : DEFAULT_PROVIDER;
}

export function readEffectiveProviderName(env: Env): StorefrontProviderName {
  const providerName = readProviderName(env.STOREFRONT_PROVIDER);

  if (providerName === "salesforce") {
    const hasBaseUrl = Boolean(env.SALESFORCE_API_BASE_URL?.trim());
    const hasStaticToken = Boolean(env.SALESFORCE_API_TOKEN?.trim());
    const hasClientCredentials = Boolean(
      env.SALESFORCE_CLIENT_ID?.trim() && env.SALESFORCE_CLIENT_SECRET?.trim()
    );

    if (!hasBaseUrl || (!hasStaticToken && !hasClientCredentials)) {
      return DEFAULT_PROVIDER;
    }
  }

  return providerName;
}

export function createStorefrontProvider(env: Env): StorefrontProvider {
  const providerName = readEffectiveProviderName(env);

  if (providerName === "salesforce") {
    return new SalesforceStorefrontProvider(env);
  }

  return new StaticJsonStorefrontProvider();
}
