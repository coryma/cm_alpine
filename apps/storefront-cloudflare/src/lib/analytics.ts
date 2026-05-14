declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_CLIENT_ID_TIMEOUT_MS = 1200;
const DEFAULT_GA_MEASUREMENT_ID = "G-NL1KZMN4H2";
const GA_CLIENT_ID_STORAGE_KEY = "alpine-ga-client-id";
const GA_CLIENT_ID_SOURCE_STORAGE_KEY = "alpine-ga-client-id-source";
let hasInitializedGa = false;
let lastGaClientIdSource = "";

function isGaEnabled(): boolean {
  return typeof window !== "undefined" && getGaMeasurementId().length > 0;
}

function ensureGtag(): void {
  if (!window.dataLayer) {
    window.dataLayer = [];
  }

  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }
}

function injectGaScript(): void {
  const scriptId = "google-analytics-gtag";

  if (document.getElementById(scriptId)) {
    return;
  }

  const script = document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    getGaMeasurementId()
  )}`;
  document.head.appendChild(script);
}

export function initGoogleAnalytics(): void {
  if (!isGaEnabled() || hasInitializedGa) {
    return;
  }

  injectGaScript();
  ensureGtag();

  window.gtag?.("js", new Date());
  window.gtag?.("config", getGaMeasurementId(), { send_page_view: false });

  hasInitializedGa = true;
}

export function trackGoogleAnalyticsPageView(pathAndQuery: string): void {
  if (!isGaEnabled()) {
    return;
  }

  window.gtag?.("event", "page_view", {
    send_to: getGaMeasurementId(),
    page_title: document.title,
    page_path: pathAndQuery,
    page_location: window.location.href
  });
}

export function getGaMeasurementId(): string {
  if (typeof window === "undefined") {
    return import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || DEFAULT_GA_MEASUREMENT_ID;
  }

  const runtimeConfig = window as Window & {
    ALPINE_STOREFRONT_CONFIG?: {
      ga?: {
        measurementId?: string;
      };
    };
  };

  return (
    runtimeConfig.ALPINE_STOREFRONT_CONFIG?.ga?.measurementId?.trim() ||
    import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ||
    DEFAULT_GA_MEASUREMENT_ID
  );
}

export async function getGaClientId(timeoutMs = GA_CLIENT_ID_TIMEOUT_MS): Promise<string> {
  if (typeof window === "undefined") {
    return "";
  }

  const storedClientId = readStorageValue(GA_CLIENT_ID_STORAGE_KEY);
  if (storedClientId) {
    lastGaClientIdSource = readStorageValue(GA_CLIENT_ID_SOURCE_STORAGE_KEY) || "local_storage";
    return storedClientId;
  }

  const cookieClientId = readGaClientIdFromCookie();
  if (cookieClientId) {
    persistGaClientId(cookieClientId, "cookie");
    return cookieClientId;
  }

  const measurementId = getGaMeasurementId();
  if (measurementId && typeof window.gtag === "function") {
    const gtagClientId = await readGaClientIdFromGtag(measurementId, timeoutMs);
    if (gtagClientId) {
      persistGaClientId(gtagClientId, "gtag");
      return gtagClientId;
    }
  }

  lastGaClientIdSource = "";
  return "";
}

export function getGaClientIdSource(): string {
  if (lastGaClientIdSource) {
    return lastGaClientIdSource;
  }

  return readGaClientIdFromCookie() ? "cookie" : "";
}

function readGaClientIdFromGtag(
  measurementId: string,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve) => {
    let didResolve = false;
    const timeoutId = window.setTimeout(() => {
      didResolve = true;
      resolve("");
    }, timeoutMs);

    try {
      window.gtag?.("get", measurementId, "client_id", (clientId: unknown) => {
        if (didResolve) {
          return;
        }

        didResolve = true;
        window.clearTimeout(timeoutId);
        resolve(typeof clientId === "string" ? clientId.trim() : "");
      });
    } catch {
      if (!didResolve) {
        didResolve = true;
        window.clearTimeout(timeoutId);
        resolve("");
      }
    }
  });
}

function readGaClientIdFromCookie(): string {
  if (typeof document === "undefined") {
    return "";
  }

  const gaCookie = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("_ga="));

  if (!gaCookie) {
    return "";
  }

  const cookieValue = decodeURIComponent(gaCookie.slice("_ga=".length));
  const match = cookieValue.match(/^GA\d+\.\d+\.(.+)$/);
  return (match?.[1] || cookieValue).trim();
}

function persistGaClientId(clientId: string, source: string): void {
  const normalizedClientId = clientId.trim();
  const normalizedSource = source.trim();
  if (!normalizedClientId) {
    return;
  }

  lastGaClientIdSource = normalizedSource;
  writeStorageValue(GA_CLIENT_ID_STORAGE_KEY, normalizedClientId);
  if (normalizedSource) {
    writeStorageValue(GA_CLIENT_ID_SOURCE_STORAGE_KEY, normalizedSource);
  }
}

function readStorageValue(key: string): string {
  try {
    return window.localStorage.getItem(key)?.trim() || "";
  } catch {
    return "";
  }
}

function writeStorageValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
  }
}
