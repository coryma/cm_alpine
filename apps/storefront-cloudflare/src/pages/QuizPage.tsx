import { startTransition, useEffect, useState } from "react";
import type {
  QuizProgressPayload,
  QuizPageContent,
  StorefrontProduct
} from "../../shared/contracts";
import { fetchProducts, submitQuizProgress } from "../lib/api";
import {
  buildEmptyQuizAnswers,
  buildHealthQuizRecommendation,
  getAnswerHighlights,
  getOption,
  getQuestion,
  INTRO_ARTWORK,
  QUIZ_STEP_COUNT,
  QUIZ_STEP_ORDER,
  type QuizAnswers,
  type QuizQuestionKey,
  type QuizRecommendation
} from "../lib/healthQuiz";
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

interface QuizPageProps {
  onNavigate: (href: string) => void;
  onHeroPersonalizationChange?: (payload: HomeHeroPersonalization) => void;
  page: QuizPageContent;
}

const CATALOG_LIMIT = 120;
const STEP_KEYS = ["intro", ...QUIZ_STEP_ORDER, "result"] as const;
const LAST_QUESTION_KEY = QUIZ_STEP_ORDER[QUIZ_STEP_ORDER.length - 1];

export function QuizPage({ onNavigate, onHeroPersonalizationChange, page }: QuizPageProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(() => buildEmptyQuizAnswers());
  const [validationMessage, setValidationMessage] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<StorefrontProduct[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<QuizRecommendation | null>(null);
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
  const pageClassName = currentQuestion ? "quizPage quizPage_question" : "quizPage";
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
        const availableProducts = await resolveCatalogProducts();
        await wait(520);
        const nextRecommendation = buildHealthQuizRecommendation(answers, availableProducts);
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
        syncProgressPayload(
          buildProgressPayload(sessionIdentity, currentQuestion.key, currentQuestion.index, selectedOption, {
            bundleName: nextRecommendation.bundleName,
            isComplete: true
          }),
          1
        );

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
      buildProgressPayload(sessionIdentity, currentQuestion.key, currentQuestion.index, selectedOption, {
        isComplete: false
      }),
      1
    );
    setCurrentStepIndex((value) => value + 1);
  }

  function handleRestart() {
    setAnswers(buildEmptyQuizAnswers());
    setValidationMessage("");
    setRecommendation(null);
    setCurrentStepIndex(0);
    setSessionIdentity(resetQuizSessionIdentity());
  }

  return (
    <section className={pageClassName}>
      <div className="quizPage__panel">
        <header className="quizPage__header">
          {currentQuestion ? (
            <>
              <div className="quizPage__headline">
                <p className="quizPage__brand">{page.brand}</p>
                <p className="quizPage__status">{currentQuestion.eyebrow}</p>
                <h2>{currentQuestion.title}</h2>
                <p className="quizPage__meta">{currentQuestion.subtitle}</p>
              </div>

              <div className="quizProgressWrap">
                <p className="quizPage__progressLabel">
                  {applyTemplate(page.questionProgressTemplate, {
                    current: currentQuestion.index,
                    total: QUIZ_STEP_COUNT
                  })}
                </p>
                <div className="quizProgress" aria-hidden="true">
                  <span
                    className="quizProgress__value"
                    style={{ width: `${(currentQuestion.index / QUIZ_STEP_COUNT) * 100}%` }}
                  />
                </div>
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
            <section className="quizIntro">
              <div className="quizIntro__art">
                <img alt={page.introImageAlt} src={INTRO_ARTWORK} />
              </div>

              <div className="quizIntro__copy">
                <p className="quizIntro__eyebrow">{page.introEyebrow}</p>
                <h1>{page.introTitle}</h1>
                <p>{page.introBody}</p>

                <div className="quizIntro__points">
                  {page.introPoints.map((point) => (
                    <article className="quizIntro__point" key={point.title}>
                      <strong>{point.title}</strong>
                      <span>{point.body}</span>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {currentQuestion ? (
            <section className="quizQuestion">
              <div className="quizChoiceGrid">
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
                    <span className="quizChoiceCard__media">
                      {answers[currentQuestion.key] === option.value ? (
                        <span aria-hidden="true" className="quizChoiceCard__selectedBadge">
                          <span className="quizChoiceCard__selectedIcon">✓</span>
                          <span className="quizChoiceCard__selectedText">已選擇</span>
                        </span>
                      ) : null}
                      <img alt={option.title} src={option.artwork} />
                    </span>
                    <span className="quizChoiceCard__body">
                      <strong>{option.title}</strong>
                      <span>{option.note}</span>
                    </span>
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

                  <div className="quizTagList">
                    {recommendation.tags.map((tag) => (
                      <span className="quizTag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>

              <section className="quizInsights" aria-label={page.insightsAriaLabel}>
                {getAnswerHighlights(answers).map((answer) => (
                  <article className="quizInsightCard" key={answer.stepKey}>
                    <p className="quizInsightCard__eyebrow">{answer.eyebrow}</p>
                    <strong>{answer.title}</strong>
                    <span>{answer.note}</span>
                  </article>
                ))}
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
                            <button
                              className="quizTextButton"
                              onClick={() => onNavigate(`/products/${product.slug}`)}
                              type="button"
                            >
                              {page.viewProductLabel}
                            </button>
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
                  onClick={() => {
                    setValidationMessage("");
                    setCurrentStepIndex(1);
                  }}
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
                <button
                  className="quizButton quizButton_secondary"
                  onClick={() => {
                    setValidationMessage("");
                    setCurrentStepIndex((value) => Math.max(0, value - 1));
                  }}
                  type="button"
                >
                  {page.previousQuestionLabel}
                </button>
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
                  className="quizButton quizButton_primary"
                  onClick={() =>
                    onNavigate(
                      `/request?interest=${encodeURIComponent(recommendation.bundleName)}`
                    )
                  }
                  type="button"
                >
                  {page.submitRequestLabel}
                </button>
                <button
                  className="quizButton quizButton_secondary"
                  onClick={() => onNavigate("/products")}
                  type="button"
                >
                  {page.browseProductsLabel}
                </button>
                <button
                  className="quizButton quizButton_secondary"
                  onClick={() => onNavigate("/quiz-monitor")}
                  type="button"
                >
                  {page.viewMonitorLabel}
                </button>
                <button
                  className="quizButton quizButton_secondary"
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
  {
    bundleName = "",
    isComplete = false
  }: {
    bundleName?: string;
    isComplete?: boolean;
  }
): QuizProgressPayload {
  return {
    sessionKey: identity.sessionKey,
    displayLabel: identity.displayLabel,
    stepNumber,
    stepKey,
    optionKey: option.value,
    optionLabel: option.title,
    iconKey: option.iconKey,
    completedSteps: stepNumber,
    isComplete,
    bundleName
  };
}

function syncProgressPayload(payload: QuizProgressPayload, attemptNumber: number) {
  void submitQuizProgress(payload).catch(() => {
    if (attemptNumber >= 3) {
      return;
    }

    window.setTimeout(() => {
      syncProgressPayload(payload, attemptNumber + 1);
    }, 700 * attemptNumber);
  });
}

function applyTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
