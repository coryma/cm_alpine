import { startTransition, useEffect, useState } from "react";
import type {
  QuizProgressPayload,
  QuizRecommendationCodeClickPayload,
  QuizPageContent,
  StorefrontProduct
} from "../../shared/contracts";
import { fetchProducts, submitQuizProgress, submitQuizRecommendationCodeClick } from "../lib/api";
import { getGaClientId, getGaClientIdSource, getGaMeasurementId } from "../lib/analytics";
import {
  buildEmptyQuizAnswers,
  buildHealthQuizRecommendation,
  getOption,
  getQuestion,
  QUIZ_STEP_COUNT,
  QUIZ_STEP_ORDER,
  type QuizAnswers,
  type QuizQuestionKey,
  type QuizRecommendation
} from "../lib/sportsPersonalityQuiz";
import {
  ensureQuizSessionIdentity,
  resetQuizSessionIdentity,
  type QuizSessionIdentity
} from "../lib/quizSession";
import {
  writeHomeHeroPersonalization,
  type HomeHeroPersonalization,
  type HomePersonalizedProduct
} from "../lib/homePersonalization";
import "./QuizPage.css";
import { StorefrontImage } from "../components/StorefrontImage";
import {
  sendDataCloudEvent,
  sendProductSelectionEvent,
  waitForDataCloudDeviceId,
  type DataCloudEventAttributes,
  type ProductSelectionTrackingContext
} from "../lib/salesforceDataCloud";

interface QuizPageProps {
  onAddToCart: (
    product: StorefrontProduct,
    trackingContext?: ProductSelectionTrackingContext
  ) => void;
  onNavigate: (href: string) => void;
  onHeroPersonalizationChange?: (payload: HomeHeroPersonalization) => void;
  page: QuizPageContent;
}

const ALPINE_HEALTH_QUIZ_VERSION = "alpine-health-2026-04";
const CATALOG_LIMIT = 120;
const STEP_KEYS = ["intro", ...QUIZ_STEP_ORDER, "result"] as const;
const LAST_QUESTION_KEY = QUIZ_STEP_ORDER[QUIZ_STEP_ORDER.length - 1];
const STORY_MODE_QUERY_VALUE = "jiangweiwei";

export function QuizPage({
  onAddToCart,
  onNavigate,
  onHeroPersonalizationChange,
  page
}: QuizPageProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(() => buildEmptyQuizAnswers());
  const [validationMessage, setValidationMessage] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<StorefrontProduct[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<QuizRecommendation | null>(null);
  const [isStoryModeEnabled, setIsStoryModeEnabled] = useState(false);
  const [cartConfirmation, setCartConfirmation] = useState("");
  const [startedAtMs, setStartedAtMs] = useState(() => Date.now());
  const [sessionIdentity, setSessionIdentity] = useState<QuizSessionIdentity>(() =>
    ensureQuizSessionIdentity()
  );

  useEffect(() => {
    let active = true;

    fetchProducts({ sortBy: "featured", limitSize: CATALOG_LIMIT })
      .then((payload) => {
        if (!active) {
          return;
        }

        startTransition(() => {
          setCatalogProducts(payload.items);
          setCatalogLoaded(true);
          setCatalogNotice(
            payload.items.length
              ? ""
              : page.catalogEmptyMessage
          );
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        startTransition(() => {
          setCatalogLoaded(true);
          setCatalogNotice(page.catalogErrorMessage);
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const currentStep = STEP_KEYS[currentStepIndex];
  const currentQuestion = isQuestionStep(currentStep) ? getQuestion(currentStep) : null;
  const pageClassName = currentQuestion
    ? "quizPage quizPage_question"
    : currentStep === "intro"
      ? "quizPage quizPage_intro"
      : "quizPage";
  const optionCards = currentQuestion
    ? currentQuestion.options.map((option) => ({
        ...option,
        className:
          answers[currentQuestion.key] === option.value
            ? "quizChoiceCard quizChoiceCard_selected"
            : "quizChoiceCard"
      }))
    : [];

  async function resolveCatalogProducts() {
    if (catalogLoaded) {
      return catalogProducts;
    }

    try {
      const payload = await fetchProducts({ sortBy: "featured", limitSize: CATALOG_LIMIT });

      startTransition(() => {
        setCatalogProducts(payload.items);
        setCatalogLoaded(true);
        setCatalogNotice(
          payload.items.length
            ? ""
            : page.catalogEmptyMessage
        );
      });

      return payload.items;
    } catch {
      startTransition(() => {
        setCatalogLoaded(true);
        setCatalogNotice(page.catalogErrorMessage);
      });

      return [];
    }
  }

  async function handleNext() {
    if (!currentQuestion) {
      return;
    }

    setValidationMessage("");

    if (!answers[currentQuestion.key]) {
      setValidationMessage(page.validationSelectMessage);
      return;
    }

    const selectedOption = getOption(currentQuestion.key, answers[currentQuestion.key]);
    if (!selectedOption) {
      setValidationMessage(page.validationRetryMessage);
      return;
    }

    if (currentQuestion.key === LAST_QUESTION_KEY) {
      setIsGenerating(true);

      try {
        const generatingStart = Date.now();
        const availableProducts = await resolveCatalogProducts();
        const nextRecommendation = buildHealthQuizRecommendation(answers, availableProducts);
        const elapsed = Date.now() - generatingStart;
        if (elapsed < 500) {
          await wait(500 - elapsed);
        }
        const personalizedProducts: HomePersonalizedProduct[] = nextRecommendation.products.map(
          (product) => ({
            id: product.id,
            slug: product.slug,
            name: product.name,
            priceLabel: product.priceLabel,
            imageUrl: product.imageUrl,
            imageAlt: product.imageAlt,
            label: product.label,
            reason: product.reason,
            roleLabel: product.roleLabel
          })
        );
        const nextHeroPersonalization = writeHomeHeroPersonalization({
          heroVariantKey: nextRecommendation.heroVariantKey,
          bundleName: nextRecommendation.bundleName,
          products: personalizedProducts
        });
        const completionMs = Math.max(0, Date.now() - startedAtMs);
        trackQuizAction("quizStepAnswered", {
          ...buildQuizEventBase(sessionIdentity),
          questionKey: currentQuestion.key,
          questionLabel: currentQuestion.title,
          optionKey: selectedOption.value,
          optionLabel: selectedOption.title,
          stepNumber: currentQuestion.index,
          completedSteps: currentQuestion.index
        });
        syncProgressPayload(
          buildProgressPayload(sessionIdentity, currentQuestion.key, currentQuestion.index, selectedOption, answers, {
            bundleName: nextRecommendation.bundleName,
            completionMs,
            isComplete: true,
            recommendation: nextRecommendation
          }),
          1
        );
        trackQuizAction("quizCompleted", {
          ...buildQuizEventBase(sessionIdentity, nextRecommendation),
          answerHistoryJson: buildAnswerHistoryJson(answers),
          completionMs,
          scoreJson: buildScoreJson(answers, nextRecommendation),
          selectedProductId: nextRecommendation.products[0]?.id || "",
          selectedProductName: nextRecommendation.products[0]?.name || ""
        });

        startTransition(() => {
          onHeroPersonalizationChange?.(nextHeroPersonalization);
          setRecommendation(nextRecommendation);
          setCurrentStepIndex(STEP_KEYS.indexOf("result"));
        });
      } finally {
        setIsGenerating(false);
      }

      return;
    }

    syncProgressPayload(
      buildProgressPayload(sessionIdentity, currentQuestion.key, currentQuestion.index, selectedOption, answers, {
        isComplete: false
      }),
      1
    );
    trackQuizAction("quizStepAnswered", {
      ...buildQuizEventBase(sessionIdentity),
      questionKey: currentQuestion.key,
      questionLabel: currentQuestion.title,
      optionKey: selectedOption.value,
      optionLabel: selectedOption.title,
      stepNumber: currentQuestion.index,
      completedSteps: currentQuestion.index
    });
    setCurrentStepIndex((value) => value + 1);
  }

  function handleStartQuiz() {
    const nextStartedAt = Date.now();
    setStartedAtMs(nextStartedAt);
    setValidationMessage("");
    setCurrentStepIndex(1);
    trackQuizAction("quizStarted", {
      ...buildQuizEventBase(sessionIdentity),
      startedAt: new Date(nextStartedAt).toISOString()
    });
  }

  function handleRestart() {
    const nextIdentity = resetQuizSessionIdentity();
    setAnswers(buildEmptyQuizAnswers());
    setValidationMessage("");
    setCartConfirmation("");
    setRecommendation(null);
    setCurrentStepIndex(0);
    setStartedAtMs(Date.now());
    setSessionIdentity(nextIdentity);
  }

  function handleRecommendedProductCart(product: StorefrontProduct) {
    onAddToCart(product, buildQuizProductSelectionContext(
      sessionIdentity,
      recommendation,
      "add_to_cart"
    ));
    recordQuizProductIntent(sessionIdentity, recommendation, product, "add_to_cart");
    setCartConfirmation(`${product.name} 已加入購物車。`);
  }

  function handleRecommendedProductOffer(product: StorefrontProduct) {
    recordQuizProductIntent(sessionIdentity, recommendation, product, "claim_offer");
    recordRecommendationCodeClick(sessionIdentity, recommendation, product);
    void sendProductSelectionEvent(
      product,
      buildQuizProductSelectionContext(sessionIdentity, recommendation, "claim_offer")
    ).catch(() => {});
    onNavigate(
      buildRequestHref({
        identity: sessionIdentity,
        interest: recommendation ? `${recommendation.personaName} · ${product.name}` : product.name,
        isStoryModeEnabled,
        product,
        recommendation
      })
    );
  }

  return (
    <section className={pageClassName}>
      <div className="quizPage__panel">
        <button
          aria-label={isStoryModeEnabled ? "關閉劇情模式" : "開啟劇情模式"}
          aria-pressed={isStoryModeEnabled}
          className={
            isStoryModeEnabled
              ? "quizStoryToggle quizStoryToggle_active"
              : "quizStoryToggle"
          }
          onClick={() => setIsStoryModeEnabled((value) => !value)}
          title={isStoryModeEnabled ? "劇情模式已開啟" : "開啟劇情模式"}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined">
            theater_comedy
          </span>
        </button>

        <header className="quizPage__header">
          {currentQuestion ? (
            <>
              <div className="quizPage__headline">
                <p className="quizPage__progressLabel">
                  {applyTemplate(page.questionProgressTemplate, {
                    current: currentQuestion.index,
                    total: QUIZ_STEP_COUNT
                  })}
                </p>
                <h2>{currentQuestion.title}</h2>
                <p className="quizPage__meta">{currentQuestion.subtitle}</p>
              </div>
            </>
          ) : (
            <div>
              <p className="quizPage__brand">{page.brand}</p>
              <h2>{page.title}</h2>
              <p className="quizPage__meta">
                {currentStep === "result" ? page.completedLabel : page.introStatusLabel}
              </p>
            </div>
          )}
        </header>

        <div className="quizPage__body">
          {currentStep === "intro" ? (
            <section aria-labelledby="quizIntroTitle" className="quizIntro">
              <div className="quizIntro__copy">
                <p className="quizIntro__eyebrow">{page.introEyebrow}</p>
                <h1 id="quizIntroTitle">{page.introTitle}</h1>
                <p>{page.introBody}</p>
              </div>

              <div className="quizIntro__points">
                {page.introPoints.map((point) => (
                  <div className="quizIntro__point" key={point.title}>
                    <strong>{point.title}</strong>
                    <span>{point.body}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {currentQuestion ? (
            <section className="quizQuestion">
              <div className="quizChoiceList">
                {optionCards.map((option) => (
                  <button
                    aria-pressed={answers[currentQuestion.key] === option.value}
                    className={option.className}
                    key={option.value}
                    onClick={() => {
                      setAnswers((current) => ({
                        ...current,
                        [currentQuestion.key]: option.value
                      }));
                      setValidationMessage("");
                    }}
                    type="button"
                  >
                    <span className="quizChoiceCard__icon">
                      <img alt="" src={option.artwork} />
                    </span>
                    <span className="quizChoiceCard__label">{option.title}</span>
                    {answers[currentQuestion.key] === option.value ? (
                      <span aria-hidden="true" className="quizChoiceCard__check">✓</span>
                    ) : null}
                  </button>
                ))}
              </div>

              {validationMessage ? <p className="quizValidation">{validationMessage}</p> : null}
            </section>
          ) : null}

          {currentStep === "result" && recommendation ? (
            <section className="quizResult">
              <article className="quizResult__hero">
                <div className="quizResult__art">
                  <img alt={recommendation.bundleName} src={recommendation.artwork} />
                </div>

                <div className="quizResult__copy">
                  <p className="quizResult__eyebrow">{page.resultEyebrow}</p>
                  <h2>{recommendation.bundleName}</h2>
                  <p>{recommendation.summary}</p>
                </div>
              </article>

              <section className="quizLeadCapture">
                <div>
                  <p className="quizLeadCapture__eyebrow">專屬優惠</p>
                  <h3>{recommendation.leadCaptureTitle}</h3>
                  <p>{recommendation.leadCaptureBody}</p>
                </div>
                <div className="quizLeadCapture__aside">
                  <span>專屬優惠碼</span>
                  <strong>{recommendation.offerCode}</strong>
                  <button
                    className="quizButton quizButton_primary"
                    onClick={() => {
                      recordRecommendationCodeClick(sessionIdentity, recommendation);
                      onNavigate(
                        buildRequestHref({
                          identity: sessionIdentity,
                          interest: recommendation.bundleName,
                          isStoryModeEnabled,
                          recommendation
                        })
                      );
                    }}
                    type="button"
                  >
                    把優惠寄給我
                  </button>
                </div>
              </section>

              <section>
                <div className="quizSectionHeading">
                  <div>
                    <p className="quizSectionHeading__eyebrow">{page.recommendationSectionEyebrow}</p>
                    <h3>{page.recommendationSectionTitle}</h3>
                  </div>
                  <button
                    className="quizTextButton"
                    onClick={() => onNavigate("/products")}
                    type="button"
                  >
                    {page.viewAllProductsLabel}
                  </button>
                </div>

                {recommendation.products.length ? (
                  <div className="quizResult__grid">
                    {recommendation.products.map((product) => (
                      <article className="quizResultProduct" key={product.id}>
                        <div className="quizResultProduct__media">
                          <StorefrontImage alt={product.imageAlt} src={product.imageUrl} />
                        </div>

                        <div className="quizResultProduct__body">
                          <span className="quizResultProduct__role">{product.roleLabel}</span>
                          <h4>{product.name}</h4>
                          <p>{product.reason}</p>
                          <div className="quizResultProduct__footer">
                            <strong>{product.priceLabel}</strong>
                            <div className="quizResultProduct__actions">
                              <button
                                className="quizTextButton"
                                onClick={() => handleRecommendedProductCart(product)}
                                type="button"
                              >
                                加入購物車
                              </button>
                              <button
                                className="quizTextButton"
                                onClick={() => handleRecommendedProductOffer(product)}
                                type="button"
                              >
                                領取優惠
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="quizEmptyState">
                    <p>{page.emptyTitle}</p>
                    <p>{page.emptyBody}</p>
                  </div>
                )}
              </section>

              {cartConfirmation ? (
                <div className="quizCartNotice" role="status">
                  {cartConfirmation}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        {catalogNotice ? <div className="quizPage__notice">{catalogNotice}</div> : null}

        <footer className="quizPage__footer">
          {currentStep === "intro" ? (
            <>
              <p className="quizPage__footerHint">{page.introFooterHint}</p>
              <div className="quizPage__footerActions">
                <button
                  className="quizButton quizButton_primary"
                  onClick={handleStartQuiz}
                  type="button"
                >
                  {page.startQuizLabel}
                </button>
              </div>
            </>
          ) : null}

          {currentQuestion ? (
            <>
              <p className="quizPage__footerHint">{page.questionFooterHint}</p>
              <div className="quizPage__footerActions">
                {currentQuestion.index > 1 ? (
                  <button
                    className="quizButton quizButton_secondary"
                    onClick={() => {
                      setValidationMessage("");
                      setCurrentStepIndex((value) => Math.max(1, value - 1));
                    }}
                    type="button"
                  >
                    {page.previousQuestionLabel}
                  </button>
                ) : null}
                <button
                  className="quizButton quizButton_primary"
                  onClick={() => {
                    void handleNext();
                  }}
                  type="button"
                >
                  {currentQuestion.key === LAST_QUESTION_KEY
                    ? page.viewRecommendationLabel
                    : page.nextQuestionLabel}
                </button>
              </div>
            </>
          ) : null}

          {currentStep === "result" && recommendation ? (
            <>
              <p className="quizPage__footerHint">{page.resultFooterHint}</p>
              <div className="quizPage__footerActions">
                <button
                  className="quizButton quizButton_secondary"
                  onClick={() => onNavigate("/products")}
                  type="button"
                >
                  {page.browseProductsLabel}
                </button>
                <button
                  className="quizTextButton"
                  onClick={handleRestart}
                  type="button"
                >
                  {page.restartLabel}
                </button>
              </div>
            </>
          ) : null}
        </footer>

        {isGenerating ? (
          <div className="quizOverlay" role="status" aria-live="polite">
            <div className="quizOverlay__card">
              <span className="quizOverlay__pulse"></span>
              <p className="quizIntro__eyebrow">{page.loadingEyebrow}</p>
              <h3>{page.loadingTitle}</h3>
              <p>{page.loadingBody}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function isQuestionStep(step: (typeof STEP_KEYS)[number]): step is QuizQuestionKey {
  return QUIZ_STEP_ORDER.includes(step as QuizQuestionKey);
}

function wait(duration: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function buildProgressPayload(
  identity: QuizSessionIdentity,
  stepKey: QuizQuestionKey,
  stepNumber: number,
  option: NonNullable<ReturnType<typeof getOption>>,
  answers: QuizAnswers,
  {
    bundleName = "",
    completionMs,
    recommendation,
    isComplete = false
  }: {
    bundleName?: string;
    completionMs?: number;
    recommendation?: QuizRecommendation;
    isComplete?: boolean;
  }
): QuizProgressPayload {
  const question = getQuestion(stepKey);
  const selectedProduct = recommendation?.products[0];

  return {
    sessionKey: identity.sessionKey,
    displayLabel: identity.displayLabel,
    quizVersion: ALPINE_HEALTH_QUIZ_VERSION,
    stepNumber,
    stepKey,
    questionKey: stepKey,
    questionLabel: question.title,
    optionKey: option.value,
    optionLabel: option.title,
    iconKey: option.iconKey,
    weightJson: JSON.stringify(option.scores),
    completedSteps: stepNumber,
    isComplete,
    bundleName,
    resultTypeKey: recommendation?.heroVariantKey,
    resultTypeLabel: recommendation?.personaName,
    scoreJson: recommendation ? buildScoreJson(answers, recommendation) : undefined,
    sourcePage: readCurrentPagePath(),
    completionMs,
    answerHistoryJson: buildAnswerHistoryJson(answers),
    selectedProductId: selectedProduct?.id,
    selectedProductName: selectedProduct?.name
  };
}

function syncProgressPayload(payload: QuizProgressPayload, attemptNumber: number) {
  void enrichProgressPayload(payload)
    .then((enrichedPayload) => {
      submitProgressPayload(enrichedPayload, attemptNumber);
    })
    .catch(() => {
      submitProgressPayload(payload, attemptNumber);
    });
}

function submitProgressPayload(payload: QuizProgressPayload, attemptNumber: number) {
  void submitQuizProgress(payload).catch(() => {
    if (attemptNumber >= 3) {
      return;
    }

    window.setTimeout(() => {
      syncProgressPayload(payload, attemptNumber + 1);
    }, 700 * attemptNumber);
  });
}

async function enrichProgressPayload(
  payload: QuizProgressPayload
): Promise<QuizProgressPayload> {
  const [deviceId, gaClientId] = await Promise.all([
    waitForDataCloudDeviceId({ allowFallback: true, timeoutMs: 650 }).catch(() => ""),
    getGaClientId().catch(() => "")
  ]);

  return {
    ...payload,
    deviceId: payload.deviceId || deviceId || undefined,
    gaClientId: payload.gaClientId || gaClientId || undefined,
    gaClientIdSource: payload.gaClientIdSource || getGaClientIdSource() || undefined,
    gaMeasurementId: payload.gaMeasurementId || getGaMeasurementId() || undefined
  };
}

function trackQuizAction(actionName: string, attributes: DataCloudEventAttributes) {
  void getGaClientId()
    .catch(() => "")
    .then((gaClientId) =>
      sendDataCloudEvent(actionName, {
        gaClientId,
        gaClientIdSource: getGaClientIdSource(),
        gaMeasurementId: getGaMeasurementId(),
        ...attributes
      })
    )
    .catch(() => {});
}

function buildQuizEventBase(
  identity: QuizSessionIdentity,
  recommendation?: QuizRecommendation | null
): DataCloudEventAttributes {
  return {
    sessionKey: identity.sessionKey,
    displayLabel: identity.displayLabel,
    quizVersion: ALPINE_HEALTH_QUIZ_VERSION,
    sourcePage: readCurrentPagePath(),
    routeKind: "quiz",
    resultTypeKey: recommendation?.heroVariantKey || "",
    resultTypeLabel: recommendation?.personaName || "",
    bundleName: recommendation?.bundleName || ""
  };
}

function buildQuizProductSelectionContext(
  identity: QuizSessionIdentity,
  recommendation: QuizRecommendation | null,
  productAction: string
): ProductSelectionTrackingContext {
  return {
    ...buildQuizEventBase(identity, recommendation),
    productAction,
    answerSource: "quiz-result"
  };
}

function recordQuizProductIntent(
  identity: QuizSessionIdentity,
  recommendation: QuizRecommendation | null,
  product: StorefrontProduct,
  action: "add_to_cart" | "claim_offer"
) {
  if (typeof window === "undefined") {
    return;
  }

  const event = {
    event: "quiz_recommended_product_intent",
    action,
    sessionKey: identity.sessionKey,
    displayLabel: identity.displayLabel,
    persona: recommendation?.personaName || "",
    bundleName: recommendation?.bundleName || "",
    productId: product.id,
    productName: product.name,
    recordedAt: new Date().toISOString()
  };

  try {
    const key = "alpine-quiz-product-intents";
    const rawValue = window.localStorage.getItem(key);
    const events = rawValue ? (JSON.parse(rawValue) as unknown[]) : [];
    window.localStorage.setItem(key, JSON.stringify([...events.slice(-24), event]));
  } catch {
  }
}

function recordRecommendationCodeClick(
  identity: QuizSessionIdentity,
  recommendation: QuizRecommendation | null,
  product?: StorefrontProduct
) {
  if (!recommendation) {
    return;
  }

  const payload = buildRecommendationCodeClickPayload(identity, recommendation, product);
  void enrichRecommendationCodeClickPayload(payload)
    .then((enrichedPayload) => submitQuizRecommendationCodeClick(enrichedPayload))
    .catch(() => submitQuizRecommendationCodeClick(payload));

  trackQuizAction("quizRecommendationCodeClicked", {
    ...buildQuizEventBase(identity, recommendation),
    offerCode: recommendation.offerCode,
    selectedProductId: product?.id || "",
    selectedProductName: product?.name || ""
  });
}

function buildRecommendationCodeClickPayload(
  identity: QuizSessionIdentity,
  recommendation: QuizRecommendation,
  product?: StorefrontProduct
): QuizRecommendationCodeClickPayload {
  return {
    sessionKey: identity.sessionKey,
    displayLabel: identity.displayLabel,
    quizVersion: ALPINE_HEALTH_QUIZ_VERSION,
    resultTypeKey: recommendation.heroVariantKey,
    resultTypeLabel: recommendation.personaName,
    sourcePage: readCurrentPagePath(),
    selectedProductId: product?.id || recommendation.products[0]?.id,
    selectedProductName: product?.name || recommendation.products[0]?.name,
    offerCode: recommendation.offerCode
  };
}

async function enrichRecommendationCodeClickPayload(
  payload: QuizRecommendationCodeClickPayload
): Promise<QuizRecommendationCodeClickPayload> {
  const deviceId = await waitForDataCloudDeviceId({ allowFallback: true, timeoutMs: 650 }).catch(() => "");

  return {
    ...payload,
    deviceId: payload.deviceId || deviceId || undefined
  };
}

function buildAnswerHistoryJson(answers: Partial<QuizAnswers>) {
  return JSON.stringify(
    QUIZ_STEP_ORDER.map((stepKey) => {
      const question = getQuestion(stepKey);
      const option = getOption(stepKey, answers[stepKey]);

      return {
        stepKey,
        stepNumber: question.index,
        questionKey: stepKey,
        questionLabel: question.title,
        optionKey: option?.value || "",
        optionLabel: option?.title || "",
        iconKey: option?.iconKey || "",
        tags: option?.tags || []
      };
    }).filter((item) => item.optionKey)
  );
}

function buildScoreJson(
  answers: Partial<QuizAnswers>,
  recommendation: QuizRecommendation
) {
  const dimensions: Record<string, number> = {};
  const crmTags = new Set<string>();

  QUIZ_STEP_ORDER.forEach((stepKey) => {
    const option = getOption(stepKey, answers[stepKey]);
    if (!option) {
      return;
    }

    Object.entries(option.scores).forEach(([dimension, value]) => {
      dimensions[dimension] = (dimensions[dimension] || 0) + (value || 0);
    });
    option.crmTags.forEach((tag) => crmTags.add(tag));
  });

  return JSON.stringify({
    dimensions,
    personaCode: recommendation.personaCode,
    personaName: recommendation.personaName,
    resultTypeKey: recommendation.heroVariantKey,
    resultTypeLabel: recommendation.personaName,
    primaryBundleName: recommendation.primaryBundleName,
    crmTags: Array.from(crmTags)
  });
}

function readCurrentPagePath() {
  if (typeof window === "undefined") {
    return "/quiz";
  }

  return `${window.location.pathname}${window.location.search}`;
}

function buildRequestHref({
  identity,
  interest,
  isStoryModeEnabled,
  product,
  recommendation
}: {
  identity: QuizSessionIdentity;
  interest: string;
  isStoryModeEnabled: boolean;
  product?: StorefrontProduct;
  recommendation?: QuizRecommendation | null;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("interest", interest);
  searchParams.set("sessionKey", identity.sessionKey);
  searchParams.set("displayLabel", identity.displayLabel);
  searchParams.set("quizVersion", ALPINE_HEALTH_QUIZ_VERSION);
  searchParams.set("sourcePage", readCurrentPagePath());

  if (recommendation) {
    searchParams.set("resultTypeKey", recommendation.heroVariantKey);
    searchParams.set("resultTypeLabel", recommendation.personaName);
  }

  if (product) {
    searchParams.set("selectedProductId", product.id);
    searchParams.set("selectedProductName", product.name);
  }

  if (isStoryModeEnabled) {
    searchParams.set("story", STORY_MODE_QUERY_VALUE);
  }

  return `/request?${searchParams.toString()}`;
}

function applyTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
