import sitemapUrl from "../../integrations/salesforce-data-cloud/alpine-storefront.sitemap.js?url";
import type { StorefrontProduct } from "../../shared/contracts";

const DEFAULT_SDK_SRC =
  "https://cdn.c360a.salesforce.com/beacon/c360a/c36d3b30-b074-40d0-bd94-b04cf80ef8d1/scripts/c360a.min.js";
const DEFAULT_GA_BRIDGE_SDK_SRC =
  "https://cdn.c360a.salesforce.com/beacon/c360a/cd1f019a-c14a-4cea-b003-4eb880616144/scripts/c360a.min.js";
const SDK_SCRIPT_ID = "salesforce-data-cloud-sdk";
const SITEMAP_SCRIPT_ID = "salesforce-data-cloud-sitemap";
const GA_BRIDGE_FRAME_ID = "salesforce-data-cloud-ga-bridge";
const GA_BRIDGE_MESSAGE_SOURCE = "alpine-storefront-ga-data-cloud-bridge";
const INIT_PROMISE_KEY = "__alpineStorefrontDataCloudInitPromise__";
const DEVICE_ID_STORAGE_KEY = "alpine-data-cloud-device-id";
const EVENT_QUEUE_STORAGE_KEY = "alpine-data-cloud-event-queue";
const EVENT_QUEUE_MAX_SIZE = 40;
const EVENT_QUEUE_MAX_ATTEMPTS = 3;
const PROFILE_STORAGE_KEY = "alpine-data-cloud-anonymous-profile";
const PROFILE_SENT_SIGNATURE_KEY = "alpine-data-cloud-anonymous-profile-sent";
const KNOWN_PROFILE_SENT_SIGNATURE_KEY = "alpine-data-cloud-known-profile-sent";
const KNOWN_IDENTITY_BRIDGE_SENT_SIGNATURE_KEY = "alpine-data-cloud-known-identity-bridge-sent";
const DEBUG_STORAGE_KEY = "alpine-data-cloud-debug";
const CONTACT_POINT_EMAIL_EVENT_TYPE = "contactPointEmail";
const PARTY_IDENTIFICATION_EVENT_TYPE = "partyIdentification";
const KNOWN_PROFILE_SIGNATURE_VERSION = 4;
const KNOWN_IDENTITY_BRIDGE_SIGNATURE_VERSION = 6;
const DEFAULT_ACTION_EVENT_NAME = "alpineStorefrontAction";
const DEFAULT_DEVICE_TIMEOUT_MS = 900;
const SCRIPT_LOAD_TIMEOUT_MS = 2500;
const SDK_OPERATION_TIMEOUT_MS = 8000;

type ConsentStatus = "Opt In" | "Opt Out";
type DataCloudAttributeValue = string | number;

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
  getAnonymousId?: () => Promise<string | null | undefined> | string | null | undefined;
  initSitemap?: (config: unknown) => void;
  reinit?: () => void;
}

interface AnonymousProfileSnapshot {
  acquisitionSource: string;
  personaHint: string;
  preferredCategory: string;
  quizBundle: string;
}

interface KnownMemberProfileSnapshot {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface KnownIdentityBridgeInput {
  deviceId?: string;
  sessionKey?: string;
  email: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  accountId?: string | null;
  contactId?: string | null;
  gaClientId?: string;
  gaClientIdSource?: string;
  gaMeasurementId?: string;
}

interface AlpineStorefrontRuntimeConfig {
  dataCloud?: {
    disabled?: boolean;
    scriptUrl?: string;
    sitemapUrl?: string;
    eventName?: string;
    deviceIdTimeoutMs?: number;
    gaBridgeDisabled?: boolean;
    gaBridgeScriptUrl?: string;
  };
  ga?: {
    measurementId?: string;
  };
  salesforce?: {
    trackingEndpoint?: string;
    shareEndpoint?: string;
  };
}

interface DataCloudRuntimeConfig {
  disabled: boolean;
  scriptUrl: string;
  sitemapUrl: string;
  eventName: string;
  deviceIdTimeoutMs: number;
  gaBridgeDisabled: boolean;
  gaBridgeScriptUrl: string;
}

interface DataCloudQueuedEvent {
  id: string;
  payload: unknown;
  attempts: number;
  nextAttemptAt: number;
}

export interface DataCloudEventAttributes {
  [key: string]: unknown;
}

export interface ProductSelectionTrackingContext extends DataCloudEventAttributes {
  productAction?: string;
  sourcePage?: string;
  sessionKey?: string;
  displayLabel?: string;
  quizVersion?: string;
  resultTypeKey?: string;
  resultTypeLabel?: string;
}

declare global {
  interface Window {
    ALPINE_STOREFRONT_CONFIG?: AlpineStorefrontRuntimeConfig;
    SalesforceInteractions?: DataCloudSdk;
    __alpineStorefrontDataCloudInitPromise__?: Promise<void>;
    __alpineStorefrontDataCloudQueueFlushTimer__?: number;
    __alpineStorefrontDataCloudQueueHooksInstalled__?: boolean;
    __alpineStorefrontGaDataCloudBridgeReady__?: boolean;
    __alpineDataCloudDebug__?: {
      events: Array<{ type: string; detail: unknown; recordedAt: string }>;
      enabled: boolean;
    };
  }
}

let gaBridgeInitPromise: Promise<void> | null = null;
const gaBridgePendingMessages: unknown[] = [];

export function initSalesforceDataCloud(): Promise<void> {
  return ensureDataCloudReady();
}

export function ensureDataCloudReady(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (!window[INIT_PROMISE_KEY]) {
    window[INIT_PROMISE_KEY] = bootstrapSalesforceDataCloud();
  }

  return window[INIT_PROMISE_KEY];
}

async function bootstrapSalesforceDataCloud() {
  const config = readDataCloudConfig();

  if (config.disabled || !config.scriptUrl) {
    return;
  }

  try {
    const sdk = await ensureSdkLoaded(config.scriptUrl);
    installDebugHooks();
    installQueueFlushHooks();
    await withTimeout(
      Promise.resolve(
        sdk.init({
          consents: [buildPreviewConsent(sdk)],
          cookieDomain: window.location.hostname
        })
      ),
      SDK_OPERATION_TIMEOUT_MS,
      "Salesforce Data Cloud SDK init timed out"
    );
    await ensureScriptLoaded(config.sitemapUrl, SITEMAP_SCRIPT_ID);
    rememberDataCloudDeviceId(await resolveDataCloudDeviceId());
    void ensureGaDataCloudBridgeReady(config);
    await sendIdentityProfileIfChanged(readAnonymousProfile(), null);
    void flushDataCloudEventQueue();
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
  updates: Partial<AnonymousProfileSnapshot>,
  member?: {
    id: string;
    fullName: string;
    email: string;
  } | null
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
  await sendIdentityProfileIfChanged(nextSnapshot, normalizeKnownMemberProfile(member));
}

export async function syncKnownMemberProfile(
  member: {
    id: string;
    fullName: string;
    email: string;
  } | null
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedMember = normalizeKnownMemberProfile(member);

  if (!normalizedMember) {
    clearSessionStorageValue(KNOWN_PROFILE_SENT_SIGNATURE_KEY);
    return;
  }

  await initSalesforceDataCloud();
  await sendKnownMemberProfileIfChanged(normalizedMember);
}

export async function syncKnownIdentityBridge(
  bridge: KnownIdentityBridgeInput
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedBridge = normalizeKnownIdentityBridge(bridge);
  if (!normalizedBridge) {
    return;
  }

  await initSalesforceDataCloud();
  await sendKnownIdentityBridgeIfChanged(normalizedBridge);
}

export function getDataCloudDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const anonymousId = window.SalesforceInteractions?.getAnonymousId?.();
    if (typeof anonymousId === "string" && anonymousId.trim()) {
      const normalizedId = anonymousId.trim();
      rememberDataCloudDeviceId(normalizedId);
      return normalizedId;
    }
  } catch {
  }

  return readLocalStorageValue(DEVICE_ID_STORAGE_KEY);
}

async function resolveDataCloudDeviceId(): Promise<string> {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const anonymousId = window.SalesforceInteractions?.getAnonymousId?.();
    const resolvedAnonymousId = isPromiseLike(anonymousId)
      ? await anonymousId
      : anonymousId;
    const normalizedId = normalizeText(resolvedAnonymousId);

    if (normalizedId) {
      rememberDataCloudDeviceId(normalizedId);
      return normalizedId;
    }
  } catch {
  }

  return readLocalStorageValue(DEVICE_ID_STORAGE_KEY);
}

export async function waitForDataCloudDeviceId(options?: {
  allowFallback?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  if (typeof window === "undefined") {
    return "";
  }

  const config = readDataCloudConfig();
  const timeoutMs = Math.max(
    0,
    options?.timeoutMs ?? config.deviceIdTimeoutMs ?? DEFAULT_DEVICE_TIMEOUT_MS
  );
  const allowFallback = options?.allowFallback ?? true;
  const startedAt = Date.now();

  const initialDeviceId = await resolveDataCloudDeviceId();
  if (initialDeviceId) {
    return initialDeviceId;
  }

  await Promise.race([ensureDataCloudReady(), delay(timeoutMs)]);

  while (Date.now() - startedAt < timeoutMs) {
    const deviceId = await resolveDataCloudDeviceId();
    if (deviceId) {
      return deviceId;
    }

    await delay(80);
  }

  return allowFallback ? getOrCreateFallbackDeviceId() : "";
}

export async function sendDataCloudEvent(
  actionName: string,
  attributes: DataCloudEventAttributes = {}
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedActionName = normalizeText(actionName);
  if (!normalizedActionName) {
    return;
  }

  const deviceId =
    normalizeText(attributes.deviceId) ||
    (await waitForDataCloudDeviceId({
      allowFallback: true,
      timeoutMs: Math.min(readDataCloudConfig().deviceIdTimeoutMs, DEFAULT_DEVICE_TIMEOUT_MS)
    }));

  enqueueDataCloudEvent(
    buildDataCloudActionPayload(normalizedActionName, {
      ...attributes,
      deviceId
    })
  );
  sendGtmEvent(normalizedActionName, {
    ...attributes,
    deviceId
  });
  sendGaDataCloudBridgeEvent(
    buildGaDataCloudBehaviorPayload(normalizedActionName, {
      ...attributes,
      deviceId
    })
  );
  await flushDataCloudEventQueue();
}

export function sendProductSelectionEvent(
  product: StorefrontProduct,
  context: ProductSelectionTrackingContext = {}
): Promise<void> {
  return sendDataCloudEvent("productSelected", {
    ...context,
    productAction: normalizeText(context.productAction) || "select",
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    selectedProductId: product.id,
    selectedProductName: product.name,
    categoryId: product.categoryId,
    categoryLabel: product.categoryLabel,
    priceLabel: product.priceLabel
  });
}

function buildPreviewConsent(sdk: DataCloudSdk): DataCloudConsent {
  return {
    provider: "AlpineStorefrontCloudflare",
    purpose: sdk.ConsentPurpose?.Tracking || "Tracking",
    status: "Opt In"
  };
}

async function ensureSdkLoaded(scriptUrl: string) {
  if (window.SalesforceInteractions) {
    return window.SalesforceInteractions;
  }

  await ensureScriptLoaded(scriptUrl, SDK_SCRIPT_ID);

  if (!window.SalesforceInteractions) {
    throw new Error("SalesforceInteractions was not available after SDK script load");
  }

  return window.SalesforceInteractions;
}

async function sendIdentityProfileIfChanged(
  snapshot: AnonymousProfileSnapshot,
  member: KnownMemberProfileSnapshot | null
) {
  const sdk = window.SalesforceInteractions;
  if (!sdk) {
    return;
  }

  if (!hasAnonymousProfileValues(snapshot) && !member) {
    return;
  }

  const signature = JSON.stringify({
    snapshot,
    member
  });
  const previousSignature = readSessionStorageValue(PROFILE_SENT_SIGNATURE_KEY);

  if (signature === previousSignature) {
    return;
  }

  const payload = {
    user: {
      ...(member
        ? {
            identities: buildKnownUserIdentities({
              email: member.email
            })
          }
        : {}),
      attributes: {
        eventType: "identity",
        isAnonymous: member ? "0" : "1",
        ...(member
          ? { email: member.email, firstName: member.firstName, lastName: member.lastName }
          : {}),
        ...(snapshot.preferredCategory ? { customField0: snapshot.preferredCategory } : {}),
        ...(snapshot.quizBundle ? { customField1: snapshot.quizBundle } : {}),
        ...(snapshot.acquisitionSource ? { customField2: snapshot.acquisitionSource } : {}),
        ...(snapshot.personaHint ? { customField3: snapshot.personaHint } : {})
      }
    }
  };

  await sendSdkEventWithTimeout(sdk, payload);
  window.sessionStorage.setItem(PROFILE_SENT_SIGNATURE_KEY, signature);
}

async function sendKnownMemberProfileIfChanged(member: KnownMemberProfileSnapshot) {
  const sdk = window.SalesforceInteractions;
  if (!sdk) {
    return;
  }

  const signature = JSON.stringify({
    version: KNOWN_PROFILE_SIGNATURE_VERSION,
    member
  });
  const previousSignature = readSessionStorageValue(KNOWN_PROFILE_SENT_SIGNATURE_KEY);

  if (signature === previousSignature) {
    return;
  }

  const deviceId = await resolveProfileBridgeDeviceId();
  const context = {
    deviceId,
    sessionId: deviceId,
    identities: buildKnownUserIdentities({
      email: member.email,
      contactId: member.id,
      deviceId
    })
  };

  const profileSendResults = await Promise.allSettled([
    sendDataCloudProfileEvent(
      "identity",
      context,
      {
        email: member.email,
        firstName: member.firstName,
        isAnonymous: "0",
        lastName: member.lastName
      }
    ),
    sendDataCloudProfileEvent(
      CONTACT_POINT_EMAIL_EVENT_TYPE,
      context,
      {
        email: member.email
      }
    ),
    sendPartyIdentification(context, {
      IDNameWeb: "Cloudflare Storefront Member ID",
      IDType: "cloudflare_member_id",
      userId: member.id
    })
  ]);

  if (profileSendResults.some((result) => result.status === "rejected")) {
    throw new Error("Known member profile bridge did not fully send to Data Cloud.");
  }

  window.sessionStorage.setItem(KNOWN_PROFILE_SENT_SIGNATURE_KEY, signature);
}

async function sendKnownIdentityBridgeIfChanged(
  bridge: NormalizedKnownIdentityBridge
) {
  const sdk = window.SalesforceInteractions;
  if (!sdk) {
    return;
  }

  const signature = JSON.stringify({
    version: KNOWN_IDENTITY_BRIDGE_SIGNATURE_VERSION,
    bridge
  });
  const previousSignature = readSessionStorageValue(KNOWN_IDENTITY_BRIDGE_SENT_SIGNATURE_KEY);
  if (signature === previousSignature) {
    return;
  }

  const deviceId = await resolveProfileBridgeDeviceId(bridge.deviceId);
  const context = {
    deviceId,
    sessionId: bridge.sessionKey || deviceId,
    identities: buildKnownUserIdentities({
      ...bridge,
      deviceId
    })
  };

  const sends: Array<Promise<void>> = [
    sendDataCloudProfileEvent("identity", context, {
      email: bridge.email,
      isAnonymous: "0",
      firstName: bridge.firstName,
      lastName: bridge.lastName
    }),
    sendDataCloudProfileEvent(
      CONTACT_POINT_EMAIL_EVENT_TYPE,
      context,
      {
        email: bridge.email
      }
    )
  ];

  const partyIdentifiers = [
    bridge.contactId
      ? {
          IDNameWeb: "Salesforce Contact ID",
          IDType: "salesforce_contact_id",
          userId: bridge.contactId
        }
      : null,
    bridge.accountId
      ? {
          IDNameWeb: "Salesforce Account ID",
          IDType: "salesforce_account_id",
          userId: bridge.accountId
        }
      : null,
    bridge.gaClientId
      ? {
          IDNameWeb: "GA Client ID",
          IDType: "ga_client_id",
          userId: bridge.gaClientId
        }
      : null,
    context.deviceId
      ? {
          IDNameWeb: "Data Cloud Web SDK Device ID",
          IDType: "web_sdk_device_id",
          userId: context.deviceId
        }
      : null
  ].filter(Boolean) as PartyIdentifierAttributes[];

  for (const identifier of partyIdentifiers) {
    sends.push(sendPartyIdentification(context, identifier));
  }

  const sendResults = await Promise.allSettled(sends);
  if (sendResults.some((result) => result.status === "rejected")) {
    throw new Error("Known identity bridge did not fully send to Data Cloud.");
  }

  window.sessionStorage.setItem(KNOWN_IDENTITY_BRIDGE_SENT_SIGNATURE_KEY, signature);
}

type ProfileEventContext = {
  deviceId: string;
  sessionId: string;
  identities?: Record<string, string>;
};

type PartyIdentifierAttributes = {
  IDNameWeb: string;
  IDType: string;
  userId: string;
};

interface NormalizedKnownIdentityBridge {
  deviceId: string;
  sessionKey: string;
  email: string;
  firstName: string;
  lastName: string;
  accountId: string;
  contactId: string;
  gaClientId: string;
  gaClientIdSource: string;
  gaMeasurementId: string;
}

async function sendPartyIdentification(
  context: ProfileEventContext,
  attributes: PartyIdentifierAttributes
) {
  await sendDataCloudProfileEvent(
    PARTY_IDENTIFICATION_EVENT_TYPE,
    context,
    attributes
  );
}

async function resolveProfileBridgeDeviceId(fallbackDeviceId?: string): Promise<string> {
  const sdkDeviceId = await waitForDataCloudDeviceId({
    allowFallback: false,
    timeoutMs: readDataCloudConfig().deviceIdTimeoutMs
  });

  return (
    sdkDeviceId ||
    normalizeText(fallbackDeviceId) ||
    (await waitForDataCloudDeviceId({ allowFallback: true }))
  );
}

async function sendDataCloudProfileEvent(
  eventType: string,
  context: ProfileEventContext,
  attributes: Record<string, DataCloudAttributeValue>
) {
  const sdk = window.SalesforceInteractions;
  if (!sdk) {
    return;
  }
  const normalizedAttributes = normalizeDataCloudAttributes(attributes);
  const normalizedIdentities = normalizeDataCloudAttributes(context.identities || {});

  await sendSdkEventWithTimeout(
    sdk,
    {
      user: {
        identities: normalizedIdentities,
        attributes: {
          eventType,
          ...normalizedAttributes
        }
      }
    }
  );

  sendGaDataCloudBridgeEvent({
    user: {
      identities: normalizedIdentities,
      attributes: {
        eventType,
        ...normalizedAttributes
      }
    }
  });
}

function buildKnownUserIdentities(input: {
  email?: string;
  contactId?: string;
  accountId?: string;
  gaClientId?: string;
  deviceId?: string;
}): Record<string, string> {
  const identities: Record<string, string> = {};
  const email = normalizeText(input.email).toLowerCase();
  const contactId = normalizeText(input.contactId);
  const accountId = normalizeText(input.accountId);
  const gaClientId = normalizeText(input.gaClientId);
  const deviceId = normalizeText(input.deviceId);

  if (email) {
    identities.email = email;
  }
  if (contactId) {
    identities.CRMId = contactId;
    identities.salesforceContactId = contactId;
  }
  if (accountId) {
    identities.salesforceAccountId = accountId;
  }
  if (gaClientId) {
    identities.gaClientId = gaClientId;
  }
  if (deviceId) {
    identities.webSdkDeviceId = deviceId;
  }

  return identities;
}

function buildDataCloudActionPayload(
  actionName: string,
  attributes: DataCloudEventAttributes
) {
  const normalizedAttributes = normalizeDataCloudAttributes(attributes);
  const sourcePage = normalizeText(normalizedAttributes.sourcePage) || readPagePath();
  const sessionId =
    normalizeText(normalizedAttributes.sessionId) ||
    normalizeText(normalizedAttributes.sessionKey) ||
    normalizeText(normalizedAttributes.deviceId) ||
    getOrCreateFallbackDeviceId();

  return {
    interaction: {
      name: readDataCloudConfig().eventName,
      category: "Engagement",
      eventId: buildEventId(actionName),
      eventType: actionName,
      actionName,
      dateTime: new Date().toISOString(),
      sessionId,
      sourcePage,
      pagePath: readPagePath(),
      routeKind: normalizeText(normalizedAttributes.routeKind) || inferRouteKind(),
      ...normalizedAttributes
    }
  };
}

function buildGaDataCloudBehaviorPayload(
  actionName: string,
  attributes: DataCloudEventAttributes
) {
  const normalizedAttributes = normalizeDataCloudAttributes(attributes);
  const routeKind = normalizeText(normalizedAttributes.routeKind) || inferRouteKind();
  const sourcePage = normalizeText(normalizedAttributes.sourcePage) || readPagePath();
  const sessionId =
    normalizeText(normalizedAttributes.sessionId) ||
    normalizeText(normalizedAttributes.sessionKey) ||
    normalizeText(normalizedAttributes.deviceId) ||
    getOrCreateFallbackDeviceId();
  const interactionName = toGaInteractionName(actionName);
  const selectedProductName =
    normalizeText(normalizedAttributes.selectedProductName) ||
    normalizeText(normalizedAttributes.productName);

  return {
    source: {
      channel: "Web",
      locale: "zh_TW",
      pageType: routeKind,
      url: window.location.href
    },
    interaction: {
      name: interactionName,
      eventType: "website",
      category: "Engagement",
      eventId: buildEventId(`ga-${actionName}`),
      dateTime: new Date().toISOString(),
      sessionId,
      linkUrl: sourcePage,
      linkText: selectedProductName || interactionName,
      formName: actionName === "profileSubmitted" ? "leadCapture" : undefined,
      formDestination: actionName === "profileSubmitted" ? "/request" : undefined,
      method: "alpine-storefront",
      sourceUrl: window.location.href,
      sourcePageType: routeKind,
      ...normalizedAttributes
    }
  };
}

function toGaInteractionName(actionName: string) {
  switch (actionName) {
    case "quizStarted":
      return "Quiz started";
    case "quizQuestionViewed":
      return "Question viewed";
    case "quizAnswerSelected":
      return "Quiz answer selected";
    case "quizCompleted":
      return "Quiz completed";
    case "productSelected":
      return "Recommended product selected";
    case "profileSubmitted":
      return "Profile submitted from offer form";
    default:
      return actionName;
  }
}

function sendGtmEvent(actionName: string, attributes: DataCloudEventAttributes) {
  if (typeof window === "undefined") {
    return;
  }

  const dataLayerWindow = window as Window & {
    dataLayer?: unknown[];
  };

  if (!dataLayerWindow.dataLayer) {
    dataLayerWindow.dataLayer = [];
  }

  dataLayerWindow.dataLayer.push({
    event: `alpine_${actionName}`,
    alpineEventName: actionName,
    ...normalizeDataCloudAttributes(attributes)
  });
}

function sendGaDataCloudBridgeEvent(payload: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.__alpineStorefrontGaDataCloudBridgeReady__) {
    gaBridgePendingMessages.push(payload);
    void ensureGaDataCloudBridgeReady();
    return;
  }

  postGaDataCloudBridgeMessage(payload);
}

function postGaDataCloudBridgeMessage(payload: unknown) {
  const bridgeFrame = document.getElementById(GA_BRIDGE_FRAME_ID) as HTMLIFrameElement | null;
  bridgeFrame?.contentWindow?.postMessage(
    {
      source: GA_BRIDGE_MESSAGE_SOURCE,
      type: "send",
      payload
    },
    window.location.origin
  );
}

function ensureGaDataCloudBridgeReady(config = readDataCloudConfig()) {
  if (
    typeof window === "undefined" ||
    config.disabled ||
    config.gaBridgeDisabled ||
    !config.gaBridgeScriptUrl
  ) {
    return Promise.resolve();
  }

  if (gaBridgeInitPromise) {
    return gaBridgeInitPromise;
  }

  gaBridgeInitPromise = new Promise<void>((resolve) => {
    const existingFrame = document.getElementById(GA_BRIDGE_FRAME_ID) as HTMLIFrameElement | null;

    window.addEventListener("message", (event) => {
      if (
        event.origin !== window.location.origin ||
        !event.data ||
        event.data.source !== GA_BRIDGE_MESSAGE_SOURCE
      ) {
        return;
      }

      if (event.data.type === "ready") {
        window.__alpineStorefrontGaDataCloudBridgeReady__ = true;
        while (gaBridgePendingMessages.length) {
          postGaDataCloudBridgeMessage(gaBridgePendingMessages.shift());
        }
        resolve();
      }
    });

    if (existingFrame) {
      return;
    }

    const frame = document.createElement("iframe");
    frame.id = GA_BRIDGE_FRAME_ID;
    frame.title = "Salesforce Data Cloud GA Bridge";
    frame.setAttribute("aria-hidden", "true");
    frame.style.display = "none";
    frame.srcdoc = buildGaBridgeFrameHtml(
      config.gaBridgeScriptUrl,
      window.location.hostname,
      window.location.origin
    );
    document.body.appendChild(frame);
  });

  return gaBridgeInitPromise;
}

function buildGaBridgeFrameHtml(scriptUrl: string, cookieDomain: string, parentOrigin: string) {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
(function () {
  var MESSAGE_SOURCE = ${JSON.stringify(GA_BRIDGE_MESSAGE_SOURCE)};
  var SDK_URL = ${JSON.stringify(scriptUrl)};
  var COOKIE_DOMAIN = ${JSON.stringify(cookieDomain)};
  var PARENT_ORIGIN = ${JSON.stringify(parentOrigin)};
  var queue = [];
  var sdk = null;

  function post(type, detail) {
    window.parent.postMessage({ source: MESSAGE_SOURCE, type: type, detail: detail || null }, PARENT_ORIGIN);
  }

  function send(payload) {
    if (!sdk || !payload) {
      queue.push(payload);
      return;
    }
    Promise.resolve(sdk.sendEvent(payload)).catch(function (error) {
      post("error", error && error.message ? error.message : "sendEvent failed");
    });
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== PARENT_ORIGIN || !event.data || event.data.source !== MESSAGE_SOURCE) {
      return;
    }
    if (event.data.type === "send") {
      send(event.data.payload);
    }
  });

  var script = document.createElement("script");
  script.async = true;
  script.src = SDK_URL;
  script.onload = function () {
    sdk = window.SalesforceInteractions;
    if (!sdk) {
      post("error", "SalesforceInteractions missing");
      return;
    }
    Promise.resolve(sdk.init({
      consents: [{
        provider: "AlpineStorefrontCloudflare",
        purpose: sdk.ConsentPurpose && sdk.ConsentPurpose.Tracking || "Tracking",
        status: "Opt In"
      }],
      cookieDomain: COOKIE_DOMAIN
    })).then(function () {
      post("ready");
      while (queue.length) {
        send(queue.shift());
      }
    }).catch(function (error) {
      post("error", error && error.message ? error.message : "init failed");
    });
  };
  script.onerror = function () {
    post("error", "SDK script failed");
  };
  document.head.appendChild(script);
}());
<\/script></body></html>`;
}

function enqueueDataCloudEvent(payload: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  const queue = readDataCloudEventQueue();
  queue.push({
    id: buildEventId("queue"),
    payload,
    attempts: 0,
    nextAttemptAt: Date.now()
  });
  writeDataCloudEventQueue(queue.slice(-EVENT_QUEUE_MAX_SIZE));
  scheduleDataCloudQueueFlush(0);
}

async function flushDataCloudEventQueue(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (readDataCloudConfig().disabled) {
    return;
  }

  await ensureDataCloudReady();

  const sdk = window.SalesforceInteractions;
  if (!sdk) {
    scheduleDataCloudQueueFlush(5000);
    return;
  }

  const now = Date.now();
  const queue = readDataCloudEventQueue();
  const retainedEvents: DataCloudQueuedEvent[] = [];

  for (const event of queue) {
    if (event.nextAttemptAt > now) {
      retainedEvents.push(event);
      continue;
    }

    try {
    await sendSdkEventWithTimeout(sdk, event.payload);
    } catch {
      const attempts = event.attempts + 1;
      if (attempts < EVENT_QUEUE_MAX_ATTEMPTS) {
        retainedEvents.push({
          ...event,
          attempts,
          nextAttemptAt: now + Math.min(30000, 1000 * 2 ** attempts)
        });
      }
    }
  }

  writeDataCloudEventQueue(retainedEvents.slice(-EVENT_QUEUE_MAX_SIZE));

  const nextEvent = retainedEvents
    .filter((event) => event.nextAttemptAt > Date.now())
    .sort((left, right) => left.nextAttemptAt - right.nextAttemptAt)[0];

  if (nextEvent) {
    scheduleDataCloudQueueFlush(Math.max(1000, nextEvent.nextAttemptAt - Date.now()));
  }
}

function scheduleDataCloudQueueFlush(delayMs: number) {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__alpineStorefrontDataCloudQueueFlushTimer__) {
    window.clearTimeout(window.__alpineStorefrontDataCloudQueueFlushTimer__);
  }

  window.__alpineStorefrontDataCloudQueueFlushTimer__ = window.setTimeout(() => {
    window.__alpineStorefrontDataCloudQueueFlushTimer__ = undefined;
    void flushDataCloudEventQueue();
  }, delayMs);
}

function installQueueFlushHooks() {
  if (
    typeof window === "undefined" ||
    window.__alpineStorefrontDataCloudQueueHooksInstalled__
  ) {
    return;
  }

  window.__alpineStorefrontDataCloudQueueHooksInstalled__ = true;
  window.addEventListener("online", () => {
    void flushDataCloudEventQueue();
  });
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void flushDataCloudEventQueue();
    }
  });
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

function readLocalStorageValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return Boolean(
    value &&
      (typeof value === "object" || typeof value === "function") &&
      typeof (value as { then?: unknown }).then === "function"
  );
}

function normalizeDataCloudAttributes(
  attributes: DataCloudEventAttributes
): Record<string, DataCloudAttributeValue> {
  return Object.entries(attributes).reduce<Record<string, DataCloudAttributeValue>>(
    (result, [key, value]) => {
      if (!key || value === undefined || value === null) {
        return result;
      }

      if (typeof value === "string") {
        const normalizedValue = value.trim();
        if (normalizedValue) {
          result[key] = normalizedValue;
        }
        return result;
      }

      if (typeof value === "number") {
        if (Number.isFinite(value)) {
          result[key] = value;
        }
        return result;
      }

      if (typeof value === "boolean") {
        result[key] = value ? "true" : "false";
        return result;
      }

      try {
        result[key] = JSON.stringify(value);
      } catch {
      }

      return result;
    },
    {}
  );
}

function normalizeKnownMemberProfile(
  member:
    | {
        id: string;
        fullName: string;
        email: string;
      }
    | null
    | undefined
): KnownMemberProfileSnapshot | null {
  if (!member?.id) {
    return null;
  }

  const email = normalizeText(member.email).toLowerCase();
  if (!email) {
    return null;
  }

  const { firstName, lastName } = splitFullName(member.fullName);

  return {
    id: normalizeText(member.id),
    email,
    firstName,
    lastName
  };
}

function normalizeKnownIdentityBridge(
  bridge: KnownIdentityBridgeInput | null | undefined
): NormalizedKnownIdentityBridge | null {
  const email = normalizeText(bridge?.email).toLowerCase();
  if (!email) {
    return null;
  }

  const explicitFirstName = normalizeText(bridge?.firstName);
  const explicitLastName = normalizeText(bridge?.lastName);
  const splitName = splitFullName(normalizeText(bridge?.fullName) || email);

  return {
    deviceId: normalizeText(bridge?.deviceId),
    sessionKey: normalizeText(bridge?.sessionKey),
    email,
    firstName: explicitFirstName || splitName.firstName,
    lastName: explicitLastName || splitName.lastName,
    accountId: normalizeText(bridge?.accountId),
    contactId: normalizeText(bridge?.contactId),
    gaClientId: normalizeText(bridge?.gaClientId),
    gaClientIdSource: normalizeText(bridge?.gaClientIdSource),
    gaMeasurementId: normalizeText(bridge?.gaMeasurementId)
  };
}

function splitFullName(fullName: string) {
  const normalizedFullName = normalizeText(fullName);
  const parts = normalizedFullName.split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return {
      firstName: "Storefront",
      lastName: "Member"
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "Member"
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

function clearSessionStorageValue(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {
  }
}

function readDataCloudConfig(): DataCloudRuntimeConfig {
  const runtimeConfig =
    typeof window === "undefined" ? undefined : window.ALPINE_STOREFRONT_CONFIG;
  const dataCloudConfig = runtimeConfig?.dataCloud;

  return {
    disabled: dataCloudConfig?.disabled === true,
    scriptUrl:
      normalizeText(dataCloudConfig?.scriptUrl) ||
      normalizeText(import.meta.env.VITE_SALESFORCE_DATA_CLOUD_SCRIPT_URL) ||
      DEFAULT_SDK_SRC,
    sitemapUrl:
      normalizeText(dataCloudConfig?.sitemapUrl) ||
      normalizeText(import.meta.env.VITE_SALESFORCE_DATA_CLOUD_SITEMAP_URL) ||
      sitemapUrl,
    eventName:
      normalizeText(dataCloudConfig?.eventName) ||
      normalizeText(import.meta.env.VITE_SALESFORCE_DATA_CLOUD_EVENT_NAME) ||
      DEFAULT_ACTION_EVENT_NAME,
    deviceIdTimeoutMs:
      normalizePositiveInteger(dataCloudConfig?.deviceIdTimeoutMs) || DEFAULT_DEVICE_TIMEOUT_MS,
    gaBridgeDisabled: dataCloudConfig?.gaBridgeDisabled === true,
    gaBridgeScriptUrl:
      normalizeText(dataCloudConfig?.gaBridgeScriptUrl) ||
      normalizeText(import.meta.env.VITE_SALESFORCE_GA_DATA_CLOUD_SCRIPT_URL) ||
      DEFAULT_GA_BRIDGE_SDK_SRC
  };
}

function normalizePositiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readDataCloudEventQueue(): DataCloudQueuedEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(EVENT_QUEUE_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as DataCloudQueuedEvent[];
    return Array.isArray(parsedValue)
      ? parsedValue.filter((event) => event?.id && event?.payload)
      : [];
  } catch {
    return [];
  }
}

function writeDataCloudEventQueue(queue: DataCloudQueuedEvent[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!queue.length) {
      window.localStorage.removeItem(EVENT_QUEUE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(EVENT_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
  }
}

function rememberDataCloudDeviceId(deviceId: string) {
  const normalizedDeviceId = normalizeText(deviceId);
  if (typeof window === "undefined" || !normalizedDeviceId) {
    return;
  }

  try {
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, normalizedDeviceId);
  } catch {
  }
}

function getOrCreateFallbackDeviceId() {
  const storedDeviceId = readLocalStorageValue(DEVICE_ID_STORAGE_KEY);
  if (storedDeviceId) {
    return storedDeviceId;
  }

  const generatedId = `local-${buildEventId("device")}`;
  rememberDataCloudDeviceId(generatedId);
  return generatedId;
}

function buildEventId(prefix: string) {
  const randomSegment =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2, 12);

  return `${prefix}-${Date.now().toString(36)}-${randomSegment}`;
}

function readPagePath() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.pathname}${window.location.search}`;
}

function inferRouteKind() {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const pathname = window.location.pathname || "/";

  if (pathname === "/") {
    return "home";
  }

  if (pathname === "/products") {
    return "products";
  }

  if (/^\/products\/[^/]+$/.test(pathname)) {
    return "product";
  }

  if (pathname === "/cart") {
    return "cart";
  }

  if (pathname === "/request") {
    return "request";
  }

  if (pathname === "/quiz") {
    return "quiz";
  }

  return pathname.replace(/^\/+/, "") || "unknown";
}

function delay(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

async function sendSdkEventWithTimeout(sdk: DataCloudSdk, payload: unknown) {
  await withTimeout(
    Promise.resolve(sdk.sendEvent(payload)),
    SDK_OPERATION_TIMEOUT_MS,
    "Salesforce Data Cloud SDK sendEvent timed out"
  );
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
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
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      reject(new Error(`Timed out loading script: ${src}`));
    }, SCRIPT_LOAD_TIMEOUT_MS);
    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      callback();
    };
    const existing = document.getElementById(id) as HTMLScriptElement | null;

    if (existing) {
      if (id === SDK_SCRIPT_ID && window.SalesforceInteractions) {
        existing.dataset.loaded = "true";
        finish(resolve);
        return;
      }

      if (existing.dataset.loaded === "true") {
        finish(resolve);
        return;
      }

      existing.addEventListener("load", () => finish(resolve), { once: true });
      existing.addEventListener(
        "error",
        () => finish(() => reject(new Error(`Failed to load script: ${src}`))),
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
        finish(resolve);
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => finish(() => reject(new Error(`Failed to load script: ${src}`))),
      { once: true }
    );
    document.head.appendChild(script);
  });
}
