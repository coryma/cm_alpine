import type { Env } from "../env";
import type { StorefrontProvider, StorefrontProviderName } from "./contracts";
import { SalesforceStorefrontProvider } from "./salesforce-provider";
import { StaticJsonStorefrontProvider } from "./static-json-provider";

const DEFAULT_PROVIDER: StorefrontProviderName = "static-json";

export function readProviderName(value?: string): StorefrontProviderName {
  return value === "salesforce" ? "salesforce" : DEFAULT_PROVIDER;
}

export function createStorefrontProvider(env: Env): StorefrontProvider {
  const providerName = readProviderName(env.STOREFRONT_PROVIDER);

  if (providerName === "salesforce") {
    return new SalesforceStorefrontProvider(env);
  }

  return new StaticJsonStorefrontProvider();
}
