import { LightningElement } from 'lwc';
import basePath from '@salesforce/community/basePath';
import recordQuizProgressJson from '@salesforce/apex/HealthQuizProgressController.recordProgressJson';
import {
    ADAPTER_SOURCE,
    DEFAULT_PRODUCT_SORT,
    buildProductDetailUrl,
    getProductCatalog
} from 'c/productCatalogAdapter';
import { resolveCatalogProducts } from 'c/cmsMediaResolver';
import { formatStorefrontAmount, upsertItem } from 'c/demoCartStore';
import {
    INTRO_ARTWORK,
    QUIZ_STEP_COUNT,
    QUIZ_STEP_ORDER,
    buildHealthQuizRecommendation,
    getAnswerHighlights,
    getOption,
    getQuestion,
    inferProductTags
} from 'c/healthLifestyleQuizCatalog';

const SESSION_STORAGE_KEY = 'health-lifestyle-quiz-session';
const STEP_KEYS = Object.freeze(['intro', ...QUIZ_STEP_ORDER, 'result']);
const LAST_QUESTION_KEY = QUIZ_STEP_ORDER[QUIZ_STEP_ORDER.length - 1];

export default class HealthLifestyleQuiz extends LightningElement {
    currentStepIndex = 0;
    answers = buildEmptyAnswers();
    validationMessage = '';
    cartNotice = '';
    isGenerating = false;
    isAddingBundle = false;
    recommendation = null;
    products = [];
    catalogLoadPromise;
    sessionKey = '';
    sessionDisplayLabel = '';

    connectedCallback() {
        this.ensureSessionIdentity();
        this.catalogLoadPromise = this.loadProducts();
    }

    get isIntro() {
        return this.currentStep === 'intro';
    }

    get isQuestionStep() {
        return QUIZ_STEP_ORDER.includes(this.currentStep);
    }

    get isResult() {
        return this.currentStep === 'result';
    }

    get currentStep() {
        return STEP_KEYS[this.currentStepIndex];
    }

    get currentQuestion() {
        return getQuestion(this.currentStep);
    }

    get showProgress() {
        return this.isQuestionStep;
    }

    get progressStyle() {
        return `width: ${(this.currentQuestion.index / QUIZ_STEP_COUNT) * 100}%;`;
    }

    get optionCards() {
        const selectedValue = this.answers[this.currentQuestion.key];
        return this.currentQuestion.options.map((option) => ({
            ...option,
            className: selectedValue === option.value ? 'choice-card choice-card_selected' : 'choice-card'
        }));
    }

    get nextButtonLabel() {
        return this.currentStep === LAST_QUESTION_KEY ? '查看我的推薦' : '下一題';
    }

    get quizStepCount() {
        return QUIZ_STEP_COUNT;
    }

    get introArtwork() {
        return INTRO_ARTWORK;
    }

    get answerHighlights() {
        return getAnswerHighlights(this.answers);
    }

    get bundleName() {
        return this.recommendation?.bundleName || '你的專屬推薦';
    }

    get bundleSummary() {
        return this.recommendation?.summary || '';
    }

    get resultArtwork() {
        return this.recommendation?.artwork || INTRO_ARTWORK;
    }

    get resultTags() {
        return this.recommendation?.tags || [];
    }

    get recommendedProducts() {
        return this.recommendation?.products || [];
    }

    get hasRecommendedProducts() {
        return this.recommendedProducts.length > 0;
    }

    get addBundleLabel() {
        return this.isAddingBundle ? '加入中...' : '加入推薦商品';
    }

    get disableAddBundle() {
        return this.isAddingBundle || !this.hasRecommendedProducts;
    }

    get cartPageUrl() {
        return this.hrefFor('cart');
    }

    get productsPageUrl() {
        return this.hrefFor('products');
    }

    async loadProducts() {
        try {
            const payload = await this.loadCatalogWithFallback();
            const resolvedProducts = await resolveCatalogProducts(payload.products || []);
            this.products = resolvedProducts.map((product) => this.decorateProduct(product));
        } catch (error) {
            this.products = [];
        }
    }

    async loadCatalogWithFallback() {
        try {
            return await getProductCatalog({
                source: ADAPTER_SOURCE.WF1,
                sortBy: DEFAULT_PRODUCT_SORT
            });
        } catch (wf1Error) {
            return getProductCatalog({
                source: ADAPTER_SOURCE.MOCK,
                sortBy: DEFAULT_PRODUCT_SORT
            });
        }
    }

    decorateProduct(product) {
        return {
            ...product,
            inferredTags: inferProductTags(product),
            detailUrl: buildProductDetailUrl(product, this.hrefFor('product')),
            imageUrl: product?.listingImage?.url || product?.images?.[0]?.url || INTRO_ARTWORK,
            imageAlt: product?.listingImage?.alt || product?.images?.[0]?.alt || product?.name || '商品圖片',
            priceLabel: formatProductPrice(product)
        };
    }

    handleStart() {
        this.currentStepIndex = 1;
        this.validationMessage = '';
        this.cartNotice = '';
    }

    handleBack() {
        this.validationMessage = '';
        this.cartNotice = '';
        if (this.currentStepIndex > 0) {
            this.currentStepIndex -= 1;
        }
    }

    handleOptionSelect(event) {
        const questionKey = event.currentTarget.dataset.question;
        const optionValue = event.currentTarget.dataset.value;

        this.answers = {
            ...this.answers,
            [questionKey]: optionValue
        };
        this.validationMessage = '';
        this.cartNotice = '';
    }

    async handleNext() {
        this.validationMessage = '';
        this.cartNotice = '';

        if (!this.answers[this.currentQuestion.key]) {
            this.validationMessage = '請先選一個選項再繼續。';
            return;
        }

        const selectedOption = getOption(this.currentQuestion.key, this.answers[this.currentQuestion.key]);
        if (!selectedOption) {
            this.validationMessage = '請重新選一次。';
            return;
        }

        if (this.currentStep === LAST_QUESTION_KEY) {
            await this.generateRecommendation(selectedOption);
            return;
        }

        this.publishProgressEvent({
            stepNumber: this.currentQuestion.index,
            stepKey: this.currentQuestion.key,
            option: selectedOption,
            isComplete: false,
            bundleName: ''
        });
        this.currentStepIndex += 1;
    }

    async generateRecommendation(selectedOption) {
        this.isGenerating = true;

        try {
            await Promise.all([this.catalogLoadPromise, wait(720)]);
            this.recommendation = buildHealthQuizRecommendation(this.answers, this.products);
            this.publishProgressEvent({
                stepNumber: this.currentQuestion.index,
                stepKey: this.currentQuestion.key,
                option: selectedOption,
                isComplete: true,
                bundleName: this.recommendation.bundleName
            });
            this.currentStepIndex = STEP_KEYS.indexOf('result');
        } finally {
            this.isGenerating = false;
        }
    }

    handleRestart() {
        this.answers = buildEmptyAnswers();
        this.validationMessage = '';
        this.cartNotice = '';
        this.recommendation = null;
        this.currentStepIndex = 0;
        this.resetSessionIdentity();
    }

    handleAddBundle() {
        if (this.disableAddBundle) {
            return;
        }

        this.isAddingBundle = true;
        this.cartNotice = '';

        try {
            this.recommendedProducts.forEach((product) => {
                upsertItem({
                    id: product.id || product.sku,
                    productId: product.id,
                    sku: product.sku,
                    name: product.name,
                    imageUrl: product.imageUrl,
                    unitPrice: product.price || 0,
                    price: product.price || 0,
                    quantity: 1,
                    attributes: [this.bundleName, product.roleLabel]
                });
            });

            this.cartNotice = `已加入 ${this.recommendedProducts.length} 件商品到購物車。`;
        } catch (error) {
            this.cartNotice = '加入購物車時發生問題，請稍後再試一次。';
        } finally {
            this.isAddingBundle = false;
        }
    }

    ensureSessionIdentity() {
        const storedIdentity = readStoredIdentity();
        if (storedIdentity) {
            this.sessionKey = storedIdentity.sessionKey;
            this.sessionDisplayLabel = storedIdentity.displayLabel;
            return;
        }

        this.resetSessionIdentity();
    }

    resetSessionIdentity() {
        const identity = buildSessionIdentity();
        this.sessionKey = identity.sessionKey;
        this.sessionDisplayLabel = identity.displayLabel;
        storeIdentity(identity);
    }

    publishProgressEvent({ stepNumber, stepKey, option, isComplete, bundleName }) {
        const payload = {
            sessionKey: this.sessionKey,
            displayLabel: this.sessionDisplayLabel,
            stepNumber,
            stepKey,
            optionKey: option.value,
            optionLabel: option.title,
            iconKey: option.iconKey,
            completedSteps: stepNumber,
            isComplete,
            bundleName: bundleName || ''
        };

        recordQuizProgressJson({
            payloadJson: JSON.stringify(payload)
        }).catch(() => {
            // The quiz should continue even if monitor sync fails.
        });
    }

    hrefFor(path) {
        const normalizedBasePath = basePath === '/' ? '' : basePath || '';
        const normalizedPath = normalizeString(path);

        if (!normalizedPath) {
            return normalizedBasePath || '/';
        }

        const prefixedPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
        return `${normalizedBasePath}${prefixedPath}`.replace(/\/{2,}/g, '/');
    }
}

function buildEmptyAnswers() {
    return QUIZ_STEP_ORDER.reduce((result, stepKey) => {
        result[stepKey] = '';
        return result;
    }, {});
}

function buildSessionIdentity() {
    const generatedKey = generateSessionKey();
    return {
        sessionKey: generatedKey,
        displayLabel: generatedKey.slice(0, 8)
    };
}

function readStoredIdentity() {
    if (!isBrowser()) {
        return null;
    }

    try {
        const rawValue = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!rawValue) {
            return null;
        }

        const parsedValue = JSON.parse(rawValue);
        if (!normalizeString(parsedValue?.sessionKey) || !normalizeString(parsedValue?.displayLabel)) {
            return null;
        }

        return {
            sessionKey: parsedValue.sessionKey,
            displayLabel: parsedValue.displayLabel
        };
    } catch (error) {
        return null;
    }
}

function storeIdentity(identity) {
    if (!isBrowser()) {
        return;
    }

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(identity));
}

function isBrowser() {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function generateSessionKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '');
    }

    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function formatProductPrice(product) {
    const rawPrice = Number(product?.price);

    if (Number.isFinite(rawPrice) && rawPrice > 0) {
        return `NT$ ${formatStorefrontAmount(rawPrice)}`;
    }

    if (normalizeString(product?.formattedPrice)) {
        return product.formattedPrice;
    }

    return '暫無售價';
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function wait(duration) {
    return new Promise((resolve) => {
        setTimeout(resolve, duration);
    });
}
