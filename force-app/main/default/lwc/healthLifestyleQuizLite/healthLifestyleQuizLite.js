import { LightningElement } from 'lwc';
import {
    INTRO_ARTWORK,
    QUIZ_STEP_COUNT,
    QUIZ_STEP_ORDER,
    getAnswerHighlights,
    getOption,
    getQuestion
} from 'c/healthLifestyleQuizCatalog';

const STEP_KEYS = Object.freeze(['intro', ...QUIZ_STEP_ORDER, 'result']);
const LAST_QUESTION_KEY = QUIZ_STEP_ORDER[QUIZ_STEP_ORDER.length - 1];

export default class HealthLifestyleQuizLite extends LightningElement {
    currentStepIndex = 0;
    answers = buildEmptyAnswers();
    validationMessage = '';
    isGenerating = false;
    recommendation = null;

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
        return this.currentStep === LAST_QUESTION_KEY ? '查看 Lite 建議' : '下一題';
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
        return this.recommendation?.bundleName || 'Lite 建議';
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

    get directionCards() {
        return this.recommendation?.directionCards || [];
    }

    get isolationNotes() {
        return this.recommendation?.isolationNotes || [];
    }

    handleStart() {
        this.currentStepIndex = 1;
        this.validationMessage = '';
    }

    handleBack() {
        this.validationMessage = '';
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
    }

    async handleNext() {
        this.validationMessage = '';

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
            await this.generateRecommendation();
            return;
        }

        this.currentStepIndex += 1;
    }

    async generateRecommendation() {
        this.isGenerating = true;

        try {
            await wait(520);
            this.recommendation = buildLiteRecommendation(this.answers);
            this.currentStepIndex = STEP_KEYS.indexOf('result');
        } finally {
            this.isGenerating = false;
        }
    }

    handleRestart() {
        this.answers = buildEmptyAnswers();
        this.validationMessage = '';
        this.recommendation = null;
        this.currentStepIndex = 0;
    }
}

function buildEmptyAnswers() {
    return QUIZ_STEP_ORDER.reduce((result, stepKey) => {
        result[stepKey] = '';
        return result;
    }, {});
}

function buildLiteRecommendation(answers) {
    const goal = getOption('goal', answers?.goal) || getQuestion('goal').options[0];
    const rhythm = getOption('rhythm', answers?.rhythm) || getQuestion('rhythm').options[0];
    const preference = getOption('preference', answers?.preference) || getQuestion('preference').options[0];
    const format = getOption('format', answers?.format) || getQuestion('format').options[0];
    const support = getOption('support', answers?.support) || getQuestion('support').options[0];

    return {
        bundleName: `${goal.bundleWord} × ${support.bundleWord} Lite 建議`,
        summary:
            `${goal.summaryLead}，再用「${format.title}」這種低摩擦方式開始，讓它更適合 ${rhythm.title} 的生活節奏。這個版本只保留題目與推薦邏輯，先驗證公開頁在純前端模式下是否穩定。`,
        artwork: support.artwork || preference.artwork || goal.artwork || INTRO_ARTWORK,
        tags: uniqueValues([goal.title, rhythm.title, preference.title, format.title, support.title]),
        directionCards: [
            {
                key: 'format',
                label: '建議起手式',
                title: format.title,
                note: `${preference.note}，先把開始成本壓到最低。`
            },
            {
                key: 'rhythm',
                label: '適合你的節奏',
                title: rhythm.title,
                note: `${support.summaryLead}，優先找能真正融入現在生活的做法。`
            },
            {
                key: 'scope',
                label: 'Lite 隔離範圍',
                title: '純前端問答與結果頁',
                note: '不載入商品、不解 CMS、不寫購物車，也不送問卷進度事件。'
            }
        ],
        isolationNotes: [
            'No productCatalogAdapter',
            'No cmsMediaResolver',
            'No demoCartStore',
            'No HealthQuizProgressController',
            'No sessionStorage identity'
        ]
    };
}

function uniqueValues(values) {
    return Array.from(new Set((values || []).filter((value) => normalizeString(value))));
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function wait(duration) {
    return new Promise((resolve) => {
        setTimeout(resolve, duration);
    });
}
