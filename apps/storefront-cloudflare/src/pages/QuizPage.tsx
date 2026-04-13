import { startTransition, useEffect, useState } from "react";
import type {
  QuizProgressPayload,
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
import "./QuizPage.css";
import { StorefrontImage } from "../components/StorefrontImage";

interface QuizPageProps {
  onNavigate: (href: string) => void;
}

const CATALOG_LIMIT = 120;
const STEP_KEYS = ["intro", ...QUIZ_STEP_ORDER, "result"] as const;
const LAST_QUESTION_KEY = QUIZ_STEP_ORDER[QUIZ_STEP_ORDER.length - 1];

export function QuizPage({ onNavigate }: QuizPageProps) {
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
              : "目前尚未讀到可推薦商品，仍可先完成問答。"
          );
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        startTransition(() => {
          setCatalogLoaded(true);
          setCatalogNotice("商品資料暫時無法載入，請稍後再試。");
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const currentStep = STEP_KEYS[currentStepIndex];
  const currentQuestion = isQuestionStep(currentStep) ? getQuestion(currentStep) : null;
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
            : "目前尚未讀到可推薦商品，仍可先完成問答。"
        );
      });

      return payload.items;
    } catch {
      startTransition(() => {
        setCatalogLoaded(true);
        setCatalogNotice("商品資料暫時無法載入，請稍後再試。");
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
      setValidationMessage("請先選一個選項再繼續。");
      return;
    }

    const selectedOption = getOption(currentQuestion.key, answers[currentQuestion.key]);
    if (!selectedOption) {
      setValidationMessage("請重新選一次。");
      return;
    }

    if (currentQuestion.key === LAST_QUESTION_KEY) {
      setIsGenerating(true);

      try {
        const availableProducts = await resolveCatalogProducts();
        await wait(520);
        const nextRecommendation = buildHealthQuizRecommendation(answers, availableProducts);
        syncProgressPayload(
          buildProgressPayload(sessionIdentity, currentQuestion.key, currentQuestion.index, selectedOption, {
            bundleName: nextRecommendation.bundleName,
            isComplete: true
          }),
          1
        );

        startTransition(() => {
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
    <section className="quizPage">
      <div className="quizPage__panel">
        <header className="quizPage__header">
          <div>
            <p className="quizPage__brand">健康好物測驗</p>
            <h2>找到更適合你現在節奏的健康選品</h2>
            <p className="quizPage__meta">
              {currentQuestion
                ? `第 ${currentQuestion.index} / ${QUIZ_STEP_COUNT} 題`
                : currentStep === "result"
                  ? "推薦完成"
                  : "5 題快速完成，直接產出推薦商品"}
            </p>
          </div>

          {currentQuestion ? (
            <div className="quizProgress" aria-hidden="true">
              <span
                className="quizProgress__value"
                style={{ width: `${(currentQuestion.index / QUIZ_STEP_COUNT) * 100}%` }}
              />
            </div>
          ) : null}
        </header>

        <div className="quizPage__body">
          {currentStep === "intro" ? (
            <section className="quizIntro">
              <div className="quizIntro__art">
                <img alt="健康好物推薦主視覺" src={INTRO_ARTWORK} />
              </div>

              <div className="quizIntro__copy">
                <p className="quizIntro__eyebrow">個人化健康推薦</p>
                <h1>五個問題，幫你快速整理現在更適合的選項</h1>
                <p>
                  從生活節奏、使用習慣到想要的感受，幫你整理出更貼近現在需求的健康好物與日常補給。
                </p>

                <div className="quizIntro__points">
                  <article className="quizIntro__point">
                    <strong>5 題快速完成</strong>
                    <span>不用長時間填答，幾個步驟就能得到結果。</span>
                  </article>
                  <article className="quizIntro__point">
                    <strong>依偏好整理推薦</strong>
                    <span>從目標、生活型態到形式偏好，組出更貼近你的選項。</span>
                  </article>
                  <article className="quizIntro__point">
                    <strong>直接查看商品與需求表單</strong>
                    <span>看完推薦後可進一步瀏覽商品，或直接留下需求。</span>
                  </article>
                </div>
              </div>
            </section>
          ) : null}

          {currentQuestion ? (
            <section className="quizQuestion">
              <div className="quizQuestion__copy">
                <p className="quizQuestion__eyebrow">{currentQuestion.eyebrow}</p>
                <h2>{currentQuestion.title}</h2>
                <p>{currentQuestion.subtitle}</p>
              </div>

              <div className="quizChoiceGrid">
                {optionCards.map((option) => (
                  <button
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
                  <p className="quizResult__eyebrow">你的專屬推薦結果</p>
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

              <section className="quizInsights" aria-label="你的選擇摘要">
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
                    <p className="quizSectionHeading__eyebrow">推薦商品</p>
                    <h3>為你挑選的好物</h3>
                  </div>
                  <button
                    className="quizTextButton"
                    onClick={() => onNavigate("/products")}
                    type="button"
                  >
                    查看全部商品
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
                              查看商品
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="quizEmptyState">
                    <p>目前還沒有可直接配對的商品。</p>
                    <p>你可以先瀏覽全部商品，或直接把需求送到詢價表單。</p>
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
              <p className="quizPage__footerHint">約 1 分鐘完成，完成後直接查看推薦商品。</p>
              <div className="quizPage__footerActions">
                <button
                  className="quizButton quizButton_primary"
                  onClick={() => {
                    setValidationMessage("");
                    setCurrentStepIndex(1);
                  }}
                  type="button"
                >
                  開始測驗
                </button>
              </div>
            </>
          ) : null}

          {currentQuestion ? (
            <>
              <p className="quizPage__footerHint">依照你的選擇逐步整理更適合的推薦組合。</p>
              <div className="quizPage__footerActions">
                <button
                  className="quizButton quizButton_secondary"
                  onClick={() => {
                    setValidationMessage("");
                    setCurrentStepIndex((value) => Math.max(0, value - 1));
                  }}
                  type="button"
                >
                  上一題
                </button>
                <button
                  className="quizButton quizButton_primary"
                  onClick={() => {
                    void handleNext();
                  }}
                  type="button"
                >
                  {currentQuestion.key === LAST_QUESTION_KEY ? "查看我的推薦" : "下一題"}
                </button>
              </div>
            </>
          ) : null}

          {currentStep === "result" && recommendation ? (
            <>
              <p className="quizPage__footerHint">可繼續查看商品，或直接送出需求。</p>
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
                  送出這組需求
                </button>
                <button
                  className="quizButton quizButton_secondary"
                  onClick={() => onNavigate("/products")}
                  type="button"
                >
                  瀏覽全部商品
                </button>
                <button
                  className="quizButton quizButton_secondary"
                  onClick={() => onNavigate("/quiz-monitor")}
                  type="button"
                >
                  查看進度看板
                </button>
                <button
                  className="quizButton quizButton_secondary"
                  onClick={handleRestart}
                  type="button"
                >
                  重新測驗
                </button>
              </div>
            </>
          ) : null}
        </footer>

        {isGenerating ? (
          <div className="quizOverlay" role="status" aria-live="polite">
            <div className="quizOverlay__card">
              <span className="quizOverlay__pulse"></span>
              <p className="quizIntro__eyebrow">分析中</p>
              <h3>正在找出最適合你的商品組合</h3>
              <p>根據你的選擇幫你配對，馬上好。</p>
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
