/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_SALESFORCE_DATA_CLOUD_EVENT_NAME?: string;
  readonly VITE_SALESFORCE_DATA_CLOUD_SCRIPT_URL?: string;
  readonly VITE_SALESFORCE_DATA_CLOUD_SITEMAP_URL?: string;
  readonly VITE_SALESFORCE_GA_DATA_CLOUD_SCRIPT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
