import { startTransition, useState } from "react";
import type { RequestPageContent, RequestPayload } from "../../shared/contracts";
import {
  submitQuizIdentityBridgeMonitor,
  submitQuizShare,
  submitRequest
} from "../lib/api";
import { getGaClientId, getGaClientIdSource, getGaMeasurementId } from "../lib/analytics";
import { ensureQuizSessionIdentity } from "../lib/quizSession";
import {
  sendDataCloudEvent,
  syncAnonymousProfile,
  syncKnownIdentityBridge,
  syncKnownMemberProfile,
  waitForDataCloudDeviceId
} from "../lib/salesforceDataCloud";

interface RequestPageProps {
  onNavigate: (href: string) => void;
  page: RequestPageContent;
}

const STORY_MODE_QUERY_VALUE = "jiangweiwei";
const JIANG_WEIWEI_REQUEST_DEFAULTS = {
  firstName: "薇薇",
  lastName: "姜",
  fullName: "姜薇薇",
  phone: "8635841901",
  email: "jmorris@example.com"
} satisfies Pick<RequestPayload, "firstName" | "lastName" | "fullName" | "phone" | "email">;

export function RequestPage({ onNavigate, page }: RequestPageProps) {
  const [form, setForm] = useState<RequestPayload>(() => buildInitialForm(page.defaultInterest));
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      (!(form.lastName || "").trim() &&
        !(form.firstName || "").trim() &&
        !form.fullName.trim()) ||
      !form.email.trim()
    ) {
      setErrorMessage(page.validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const [deviceId, gaClientId] = await Promise.all([
        waitForDataCloudDeviceId({ allowFallback: true, timeoutMs: 650 }).catch(() => ""),
        getGaClientId().catch(() => "")
      ]);
      const sharePayload = buildQuizSharePayload(form, deviceId, gaClientId);
      const quizSubmission = Boolean(form.interest && form.interest !== page.defaultInterest);
      let nextSuccessMessage = "";
      let nextReference = "";
      let bridgeAccountId = "";
      let bridgeContactId = "";
      let bridgeSessionId = "";

      if (quizSubmission) {
        const result = await submitQuizShare(sharePayload);
        nextSuccessMessage = "優惠資料已成功送出。";
        nextReference = result.accountId || result.sessionId || result.emailAddress;
        bridgeAccountId = result.accountId || "";
        bridgeContactId = result.contactId || "";
        bridgeSessionId = result.sessionId || "";
      } else {
        const result = await submitRequest(form);
        nextSuccessMessage = result.message;
        nextReference = result.reference;
      }

      const bridgeContext = {
        accountId: bridgeAccountId,
        contactId: bridgeContactId,
        deviceId: sharePayload.deviceId || deviceId || "",
        gaClientId,
        gaClientIdSource: getGaClientIdSource(),
        gaMeasurementId: getGaMeasurementId(),
        sessionKey: bridgeSessionId || sharePayload.sessionKey
      };

      const bridgeResult = await syncSubmittedDataCloudProfile(form, bridgeContext);
      void submitQuizIdentityBridgeMonitor({
        accountId: bridgeContext.accountId,
        contactId: bridgeContext.contactId,
        deviceId: bridgeContext.deviceId,
        displayLabel: sharePayload.displayLabel,
        emailAddress: form.email.trim(),
        gaClientId: bridgeContext.gaClientId,
        gaClientIdSource: bridgeContext.gaClientIdSource,
        gaMeasurementId: bridgeContext.gaMeasurementId,
        quizVersion: sharePayload.quizVersion,
        sessionKey: sharePayload.sessionKey,
        sourcePage: sharePayload.sourcePage,
        syncStatus: bridgeResult.status
      }).catch(() => {});

      void sendDataCloudEvent("profileSubmitted", {
        ...sharePayload,
        emailDomain: readEmailDomain(form.email),
        interest: form.interest || "",
        messagePresent: Boolean(form.message.trim()),
        gaClientId,
        gaClientIdSource: getGaClientIdSource(),
        gaMeasurementId: getGaMeasurementId()
      }).catch(() => {});

      startTransition(() => {
        setSuccessMessage(nextSuccessMessage);
        setReference(nextReference);
        setForm(buildInitialForm(page.defaultInterest));
      });
    } catch (error) {
      startTransition(() => {
        setErrorMessage(
          error instanceof Error ? error.message : page.submitErrorMessage
        );
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const interestLabel = form.interest && form.interest !== page.defaultInterest
    ? form.interest
    : "";
  const isFromQuiz = Boolean(interestLabel);

  if (successMessage) {
    return (
      <section className="contentStack">
        <section className="requestLayout">
          <div className="requestSuccessPanel">
            <span aria-hidden="true" className="requestSuccessPanel__icon material-symbols-outlined">check_circle</span>
            <h2>已收到你的資料</h2>
            <p>我們會盡快將優惠資訊寄到你的信箱。</p>
            <div className="requestSuccessPanel__actions">
              <button
                className="requestFormPanel__submit"
                onClick={() => onNavigate("/products")}
                type="button"
              >
                去逛逛商品
              </button>
              <button
                className="requestSuccessPanel__link"
                onClick={() => onNavigate("/")}
                type="button"
              >
                回首頁
              </button>
            </div>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="contentStack">
      <section className="requestLayout">
        <form className="requestFormPanel requestFormPanel_clean" onSubmit={handleSubmit}>
          <div className="requestFormPanel__header">
            <div className="requestFormPanel__headerAccent"></div>
            <h2>{isFromQuiz ? "領取專屬優惠" : page.title}</h2>
            <p className="requestFormPanel__description">
              {isFromQuiz
                ? "留下聯絡方式，優惠碼會直接寄到你的信箱。"
                : page.description}
            </p>
          </div>

          <div className="requestFormPanel__nameRow">
            <label>
              <span>姓</span>
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lastName: event.target.value,
                    fullName: `${event.target.value}${current.firstName}`
                  }))
                }
                placeholder="請輸入姓氏"
                type="text"
                value={form.lastName}
              />
            </label>
            <label>
              <span>名</span>
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    firstName: event.target.value,
                    fullName: `${current.lastName}${event.target.value}`
                  }))
                }
                placeholder="請輸入名字"
                type="text"
                value={form.firstName}
              />
            </label>
          </div>

          <label>
            <span>{page.fieldLabels.email}</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="name@example.com"
              type="email"
              value={form.email}
            />
          </label>
          <label>
            <span>{page.fieldLabels.phone}</span>
            <input
              inputMode="tel"
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="09XX-XXX-XXX"
              type="tel"
              value={form.phone}
            />
          </label>
          <label>
            <span>{page.fieldLabels.message}</span>
            <textarea
              onChange={(event) =>
                setForm((current) => ({ ...current, message: event.target.value }))
              }
              placeholder="有什麼想補充的都可以寫在這裡"
              rows={4}
              value={form.message}
            />
          </label>

          {errorMessage ? <div className="formNotice formNotice_error">{errorMessage}</div> : null}

          <div className="requestFormPanel__actions">
            <button className="requestFormPanel__submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? page.submitBusyLabel : page.submitIdleLabel}
            </button>
          </div>

          <p className="requestFormPanel__privacy">
            我們重視你的隱私，僅會用於本次諮詢服務。
            <button
              className="requestFormPanel__skipLink"
              onClick={() => onNavigate("/products")}
              type="button"
            >
              先去逛逛
            </button>
          </p>
        </form>
      </section>
    </section>
  );
}

function buildQuizSharePayload(form: RequestPayload, deviceId: string, gaClientId: string) {
  const trackingContext = readRequestTrackingContext();
  const gaClientIdSource = getGaClientIdSource();
  const bridgeDeviceId =
    deviceId.trim() || buildFallbackBridgeDeviceId(trackingContext.sessionKey);

  return {
    emailAddress: form.email.trim(),
    sessionKey: trackingContext.sessionKey,
    displayLabel: trackingContext.displayLabel,
    quizVersion: trackingContext.quizVersion,
    resultTypeKey: trackingContext.resultTypeKey,
    resultTypeLabel: trackingContext.resultTypeLabel,
    sourcePage: trackingContext.sourcePage || readCurrentPagePath(),
    firstName: (form.firstName || "").trim(),
    lastName: (form.lastName || "").trim(),
    phoneNumber: (form.phone || "").trim(),
    deviceId: bridgeDeviceId,
    gaClientId: gaClientId.trim(),
    gaClientIdSource,
    gaMeasurementId: getGaMeasurementId(),
    selectedProductId: trackingContext.selectedProductId,
    selectedProductName: trackingContext.selectedProductName
  };
}

async function syncSubmittedDataCloudProfile(
  form: RequestPayload,
  bridge: {
    accountId: string;
    contactId: string;
    deviceId: string;
    gaClientId: string;
    gaClientIdSource: string;
    gaMeasurementId: string;
    sessionKey: string;
  }
): Promise<{ status: string }> {
  const email = form.email.trim();
  if (!email) {
    return { status: "skipped_no_email" };
  }

  const memberProfile = {
    id: bridge.contactId || bridge.accountId || bridge.deviceId || email.toLowerCase(),
    fullName: buildSubmittedFullName(form),
    email
  };

  const results = await Promise.allSettled([
    syncAnonymousProfile({}, memberProfile),
    syncKnownMemberProfile(memberProfile),
    syncKnownIdentityBridge({
      accountId: bridge.accountId,
      contactId: bridge.contactId,
      deviceId: bridge.deviceId,
      email,
      firstName: (form.firstName || "").trim(),
      fullName: memberProfile.fullName,
      gaClientId: bridge.gaClientId,
      gaClientIdSource: bridge.gaClientIdSource,
      gaMeasurementId: bridge.gaMeasurementId,
      lastName: (form.lastName || "").trim(),
      sessionKey: bridge.sessionKey
    })
  ]);

  return {
    status: results.every((result) => result.status === "fulfilled")
      ? "sent"
      : "partial_or_failed"
  };
}

function buildSubmittedFullName(form: RequestPayload) {
  const combinedName = `${(form.firstName || "").trim()} ${(form.lastName || "").trim()}`.trim();
  if (combinedName) {
    return combinedName;
  }

  const explicitFullName = form.fullName.trim();
  if (explicitFullName) {
    return explicitFullName;
  }

  return form.email.trim();
}

function buildFallbackBridgeDeviceId(sessionKey: string) {
  const normalizedSessionKey = sessionKey.trim();
  return normalizedSessionKey ? `local-device-${normalizedSessionKey}` : "";
}

function readRequestTrackingContext() {
  const identity = ensureQuizSessionIdentity();

  if (typeof window === "undefined") {
    return {
      sessionKey: identity.sessionKey,
      displayLabel: identity.displayLabel,
      quizVersion: "",
      resultTypeKey: "",
      resultTypeLabel: "",
      sourcePage: "",
      selectedProductId: "",
      selectedProductName: ""
    };
  }

  const searchParams = new URLSearchParams(window.location.search);

  return {
    sessionKey: searchParams.get("sessionKey")?.trim() || identity.sessionKey,
    displayLabel: searchParams.get("displayLabel")?.trim() || identity.displayLabel,
    quizVersion: searchParams.get("quizVersion")?.trim() || "",
    resultTypeKey: searchParams.get("resultTypeKey")?.trim() || "",
    resultTypeLabel: searchParams.get("resultTypeLabel")?.trim() || "",
    sourcePage: searchParams.get("sourcePage")?.trim() || "",
    selectedProductId: searchParams.get("selectedProductId")?.trim() || "",
    selectedProductName: searchParams.get("selectedProductName")?.trim() || ""
  };
}

function readCurrentPagePath() {
  if (typeof window === "undefined") {
    return "/request";
  }

  return `${window.location.pathname}${window.location.search}`;
}

function readEmailDomain(emailAddress: string) {
  const normalizedEmail = emailAddress.trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf("@");
  return atIndex >= 0 ? normalizedEmail.slice(atIndex + 1) : "";
}

function buildInitialForm(defaultInterest: string): RequestPayload {
  const initialForm: RequestPayload = {
    firstName: "",
    lastName: "",
    fullName: "",
    email: "",
    phone: "",
    company: "",
    interest: defaultInterest,
    message: ""
  };

  if (typeof window === "undefined") {
    return initialForm;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const storyDefaults =
    searchParams.get("story") === STORY_MODE_QUERY_VALUE
      ? JIANG_WEIWEI_REQUEST_DEFAULTS
      : null;
  const firstName = searchParams.get("firstName")?.trim();
  const lastName = searchParams.get("lastName")?.trim();
  const fullName = searchParams.get("fullName")?.trim();
  const email = searchParams.get("email")?.trim();
  const phone = searchParams.get("phone")?.trim();
  const interest = searchParams.get("interest")?.trim();
  const message = searchParams.get("message")?.trim();

  return {
    ...initialForm,
    firstName: firstName || storyDefaults?.firstName || initialForm.firstName,
    lastName: lastName || storyDefaults?.lastName || initialForm.lastName,
    fullName: fullName || storyDefaults?.fullName || initialForm.fullName,
    email: email || storyDefaults?.email || initialForm.email,
    phone: phone || storyDefaults?.phone || initialForm.phone,
    interest: interest || initialForm.interest,
    message: message || initialForm.message
  };
}
