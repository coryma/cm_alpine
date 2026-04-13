import sitemapUrl from "../../integrations/salesforce-data-cloud/alpine-storefront.sitemap.js?url";

const SDK_SRC =
  "https://cdn.c360a.salesforce.com/beacon/c360a/c36d3b30-b074-40d0-bd94-b04cf80ef8d1/scripts/c360a.min.js";
const SDK_SCRIPT_ID = "salesforce-data-cloud-sdk";
const SITEMAP_SCRIPT_ID = "salesforce-data-cloud-sitemap";
const INIT_PROMISE_KEY = "__alpineStorefrontDataCloudInitPromise__";
const PROFILE_STORAGE_KEY = "alpine-data-cloud-anonymous-profile";
const PROFILE_SENT_SIGNATURE_KEY = "alpine-data-cloud-anonymous-profile-sent";
const DEBUG_STORAGE_KEY = "alpine-data-cloud-debug";
const ANONYMOUS_IDENTITY_INTERACTION_NAME = "Anonymous Identity Update";

type ConsentStatus = "Opt In" | "Opt Out";

interface DataCloudConsent {
  provider: string;
  purpose: string;
  status: ConsentStatus;
}

interface DataCloudSdk {
  ConsentPurpose?: {
    Tracking?: string;
  };
  sendEvent: (payload: unknown) => Promise<unknown> | void;
  init: (config: {
    consents: DataCloudConsent[];
    cookieDomain?: string;
  }) => Promise<unknown>;
}

interface AnonymousProfileSnapshot {
  acquisitionSource: string;
  personaHint: string;
  preferredCategory: string;
  quizBundle: string;
}

declare global {
  interface Window {
    SalesforceInteractions?: DataCloudSdk;
    __alpineStorefrontDataCloudInitPromise__?: Promise<void>;
    __alpineDataCloudDebug__?: {
      events: Array<{ type: string; detail: unknown; recordedAt: string }>;
      enabled: boolean;
    };
  }
}

export function initSalesforceDataCloud(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (!window[INIT_PROMISE_KEY]) {
    window[INIT_PROMISE_KEY] = bootstrapSalesforceDataCloud();
  }

  return window[INIT_PROMISE_KEY];
}

async function bootstrapSalesforceDataCloud() {
  try {
    const sdk = await ensureSdkLoaded();
    installDebugHooks();
    await sdk.init({
      // This preview storefront does not have a CMP yet. Opt in explicitly so
      // Data Cloud test traffic flows during demos; replace this with real CMP state.
      consents: [buildPreviewConsent(sdk)],
      cookieDomain: window.location.hostname
    });
    await ensureScriptLoaded(sitemapUrl, SITEMAP_SCRIPT_ID);
    await sendAnonymousProfileIfChanged(readAnonymousProfile());
  } catch (error) {
    console.error("Failed to initialize Salesforce Data Cloud Web SDK", error);
  }
}

export function isSalesforceDataCloudDebugEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const debugParam = searchParams.get("dcdebug");

  if (debugParam === "1") {
    window.localStorage.setItem(DEBUG_STORAGE_KEY, "true");
    return true;
  }

  if (debugParam === "0") {
    window.localStorage.removeItem(DEBUG_STORAGE_KEY);
    return false;
  }

  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
}

export async function syncAnonymousProfile(
  updates: Partial<AnonymousProfileSnapshot>
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const nextSnapshot = normalizeAnonymousProfile({
    ...readAnonymousProfile(),
    ...updates
  });

  writeAnonymousProfile(nextSnapshot);
  await initSalesforceDataCloud();
  await sendAnonymousProfileIfChanged(nextSnapshot);
}

function buildPreviewConsent(sdk: DataCloudSdk): DataCloudConsent {
  return {
    provider: "AlpineStorefrontCloudflare",
    purpose: sdk.ConsentPurpose?.Tracking || "Tracking",
    status: "Opt In"
  };
}

async function ensureSdkLoaded() {
  if (window.SalesforceInteractions) {
    return window.SalesforceInteractions;
  }

  await ensureScriptLoaded(SDK_SRC, SDK_SCRIPT_ID);

  if (!window.SalesforceInteractions) {
    throw new Error("SalesforceInteractions was not available after SDK script load");
  }

  return window.SalesforceInteractions;
}

async function sendAnonymousProfileIfChanged(snapshot: AnonymousProfileSnapshot) {
  const sdk = window.SalesforceInteractions;
  if (!sdk) {
    return;
  }

  if (!hasAnonymousProfileValues(snapshot)) {
    return;
  }

  const signature = JSON.stringify(snapshot);
  const previousSignature = readSessionStorageValue(PROFILE_SENT_SIGNATURE_KEY);

  if (signature === previousSignature) {
    return;
  }

  const payload = {
    interaction: {
      name: ANONYMOUS_IDENTITY_INTERACTION_NAME
    },
    user: {
      attributes: {
        eventType: "identity",
        // Salesforce docs conflict on 0/1 semantics; treat "1" as anonymous=true
        // for this storefront until the org mapping is verified.
        isAnonymous: "1",
        ...(snapshot.preferredCategory ? { customField0: snapshot.preferredCategory } : {}),
        ...(snapshot.quizBundle ? { customField1: snapshot.quizBundle } : {}),
        ...(snapshot.acquisitionSource ? { customField2: snapshot.acquisitionSource } : {}),
        ...(snapshot.personaHint ? { customField3: snapshot.personaHint } : {})
      }
    }
  };

  await Promise.resolve(sdk.sendEvent(payload));
  window.sessionStorage.setItem(PROFILE_SENT_SIGNATURE_KEY, signature);
}

function readAnonymousProfile(): AnonymousProfileSnapshot {
  const initialSnapshot = normalizeAnonymousProfile({
    acquisitionSource: readAcquisitionSource(),
    personaHint: "",
    preferredCategory: "",
    quizBundle: ""
  });

  if (typeof window === "undefined") {
    return initialSnapshot;
  }

  try {
    const rawValue = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!rawValue) {
      return initialSnapshot;
    }

    const parsed = JSON.parse(rawValue) as Partial<AnonymousProfileSnapshot>;
    return normalizeAnonymousProfile({
      ...initialSnapshot,
      ...parsed
    });
  } catch {
    return initialSnapshot;
  }
}

function writeAnonymousProfile(snapshot: AnonymousProfileSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(snapshot));
}

function normalizeAnonymousProfile(
  snapshot: Partial<AnonymousProfileSnapshot>
): AnonymousProfileSnapshot {
  return {
    acquisitionSource: normalizeText(snapshot.acquisitionSource),
    personaHint: normalizeText(snapshot.personaHint),
    preferredCategory: normalizeText(snapshot.preferredCategory),
    quizBundle: normalizeText(snapshot.quizBundle)
  };
}

function hasAnonymousProfileValues(snapshot: AnonymousProfileSnapshot) {
  return Boolean(
    snapshot.acquisitionSource ||
      snapshot.personaHint ||
      snapshot.preferredCategory ||
      snapshot.quizBundle
  );
}

function readAcquisitionSource() {
  if (typeof window === "undefined") {
    return "";
  }

  const searchParams = new URLSearchParams(window.location.search);
  const utmSource = normalizeText(searchParams.get("utm_source"));
  if (utmSource) {
    return utmSource;
  }

  try {
    const referrerUrl = window.document.referrer
      ? new URL(window.document.referrer)
      : null;
    return normalizeText(referrerUrl?.hostname);
  } catch {
    return "";
  }
}

function readSessionStorageValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function installDebugHooks() {
  if (typeof document === "undefined" || !isSalesforceDataCloudDebugEnabled()) {
    return;
  }

  if (!window.__alpineDataCloudDebug__) {
    window.__alpineDataCloudDebug__ = {
      enabled: true,
      events: []
    };
  }

  const listeners: Array<[string[], string]> = [
    [["salesforce:onInit", "interactions:onInit"], "init"],
    [["salesforce:onInitSitemap", "interactions:onInitSitemap"], "init-sitemap"],
    [["salesforce:onBeforeEventSend", "interactions:onBeforeEventSend"], "before-send"],
    [["salesforce:onEventSend", "interactions:onEventSend"], "event-send"],
    [["salesforce:onException", "interactions:onException"], "exception"]
  ];

  listeners.forEach(([eventNames, label]) => {
    eventNames.forEach((eventName) => {
      const marker = `__alpineDataCloudDebugListener:${eventName}`;

      if ((document as Document & Record<string, boolean>)[marker]) {
        return;
      }

      (document as Document & Record<string, boolean>)[marker] = true;
      document.addEventListener(eventName, (event) => {
        const customEvent = event as CustomEvent;
        const payload = {
          type: label,
          detail: customEvent.detail,
          eventName,
          recordedAt: new Date().toISOString()
        };

        window.__alpineDataCloudDebug__?.events.push(payload);
        console.log(`[Data Cloud:${label}]`, payload.detail);
      });
    });
  });

  console.info(
    "[Data Cloud] Debug enabled. Use window.__alpineDataCloudDebug__.events to inspect captured SDK events."
  );
}

function ensureScriptLoaded(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load script: ${src}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load script: ${src}`)),
      { once: true }
    );
    document.head.appendChild(script);
  });
}
