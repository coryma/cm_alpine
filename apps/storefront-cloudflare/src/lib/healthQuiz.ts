import type { QuizQuestionContent, StorefrontProduct } from "../../shared/contracts";
import { getStorefrontContentDocument } from "../../shared/storefront";

export const QUIZ_STEP_ORDER = [
  "goal",
  "rhythm",
  "preference",
  "format",
  "support"
] as const;

export const QUIZ_STEP_COUNT = QUIZ_STEP_ORDER.length;

export type QuizQuestionKey = (typeof QUIZ_STEP_ORDER)[number];
export type QuizAnswers = Record<QuizQuestionKey, string>;

export interface QuizOption {
  value: string;
  title: string;
  note: string;
  tags: string[];
  bundleWord: string;
  summaryLead: string;
  iconKey: string;
  artwork: string;
}

export interface QuizQuestion {
  key: QuizQuestionKey;
  index: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  options: QuizOption[];
}

export interface QuizAnswerHighlight {
  stepKey: QuizQuestionKey;
  stepNumber: number;
  eyebrow: string;
  title: string;
  note: string;
  iconKey: string;
  artwork: string;
}

export interface QuizRecommendedProduct extends StorefrontProduct {
  inferredTags: string[];
  reason: string;
  roleLabel: string;
  score: number;
}

export interface QuizRecommendation {
  heroVariantKey: string;
  bundleName: string;
  summary: string;
  artwork: string;
  tags: string[];
  products: QuizRecommendedProduct[];
}

interface OptionInput {
  value: string;
  title: string;
  note: string;
  tags: string[];
  bundleWord: string;
  summaryLead: string;
  iconKey: string;
  artwork: IllustrationInput;
}

interface IllustrationInput {
  motif: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  label?: string;
}

interface OptionMetaInput {
  tags: string[];
  iconKey: string;
  artwork: IllustrationInput;
}

const QUIZ_CONTENT = getStorefrontContentDocument().pages.quiz;

const QUESTION_META: Record<QuizQuestionKey, Record<string, OptionMetaInput>> = Object.freeze({
  goal: {
    energy: { tags: ["energy", "focus", "daily", "portable"], iconKey: "goal-energy", artwork: { motif: "sunrise", primary: "#0f766e", secondary: "#99f6e4", accent: "#f97316" } },
    balance: { tags: ["balance", "nutrition", "ritual", "daily"], iconKey: "goal-balance", artwork: { motif: "leaf", primary: "#14532d", secondary: "#86efac", accent: "#facc15" } },
    recovery: { tags: ["recovery", "performance", "fitness"], iconKey: "goal-recovery", artwork: { motif: "pulse", primary: "#7c3aed", secondary: "#c4b5fd", accent: "#fb7185" } },
    sleep: { tags: ["calm", "rest", "home"], iconKey: "goal-sleep", artwork: { motif: "moon", primary: "#1e293b", secondary: "#93c5fd", accent: "#f8fafc" } },
    light: { tags: ["light", "balance", "portable"], iconKey: "goal-light", artwork: { motif: "arc", primary: "#0f766e", secondary: "#a7f3d0", accent: "#fde68a" } },
    care: { tags: ["daily", "ritual", "calm"], iconKey: "goal-care", artwork: { motif: "glow", primary: "#9d174d", secondary: "#fbcfe8", accent: "#f59e0b" } }
  },
  rhythm: {
    office: { tags: ["focus", "daily", "ritual"], iconKey: "rhythm-office", artwork: { motif: "grid", primary: "#1d4ed8", secondary: "#bfdbfe", accent: "#f97316" } },
    commute: { tags: ["portable", "energy", "hydration"], iconKey: "rhythm-commute", artwork: { motif: "stride", primary: "#0f766e", secondary: "#67e8f9", accent: "#facc15" } },
    training: { tags: ["fitness", "performance", "recovery"], iconKey: "rhythm-training", artwork: { motif: "pulse", primary: "#dc2626", secondary: "#fecaca", accent: "#fb7185" } },
    lateNight: { tags: ["rest", "calm", "recovery"], iconKey: "rhythm-lateNight", artwork: { motif: "moon", primary: "#312e81", secondary: "#c4b5fd", accent: "#f9fafb" } },
    home: { tags: ["home", "calm", "nutrition"], iconKey: "rhythm-home", artwork: { motif: "home", primary: "#854d0e", secondary: "#fde68a", accent: "#fb7185" } },
    family: { tags: ["nutrition", "daily", "home"], iconKey: "rhythm-family", artwork: { motif: "droplet", primary: "#0f766e", secondary: "#ccfbf1", accent: "#fb7185" } }
  },
  preference: {
    grabAndGo: { tags: ["portable", "daily", "light"], iconKey: "preference-grabAndGo", artwork: { motif: "stride", primary: "#0f766e", secondary: "#99f6e4", accent: "#f97316" } },
    visibleResults: { tags: ["performance", "energy", "recovery"], iconKey: "preference-visibleResults", artwork: { motif: "glow", primary: "#be123c", secondary: "#fecdd3", accent: "#facc15" } },
    homeComfort: { tags: ["home", "calm", "rest"], iconKey: "preference-homeComfort", artwork: { motif: "home", primary: "#7c2d12", secondary: "#fed7aa", accent: "#f472b6" } },
    steadyRitual: { tags: ["ritual", "nutrition", "daily"], iconKey: "preference-steadyRitual", artwork: { motif: "leaf", primary: "#166534", secondary: "#bbf7d0", accent: "#f59e0b" } },
    lightRoutine: { tags: ["light", "balance", "portable"], iconKey: "preference-lightRoutine", artwork: { motif: "arc", primary: "#0f766e", secondary: "#bfdbfe", accent: "#fde68a" } },
    outdoorMove: { tags: ["portable", "hydration", "fitness"], iconKey: "preference-outdoorMove", artwork: { motif: "droplet", primary: "#0f766e", secondary: "#67e8f9", accent: "#f97316" } }
  },
  format: {
    drink: { tags: ["hydration", "portable", "energy"], iconKey: "format-drink", artwork: { motif: "droplet", primary: "#0f766e", secondary: "#99f6e4", accent: "#f8fafc" } },
    snack: { tags: ["portable", "light", "energy"], iconKey: "format-snack", artwork: { motif: "sunrise", primary: "#f97316", secondary: "#fde68a", accent: "#ffffff" } },
    kitchen: { tags: ["nutrition", "home", "ritual"], iconKey: "format-kitchen", artwork: { motif: "leaf", primary: "#166534", secondary: "#dcfce7", accent: "#f59e0b" } },
    device: { tags: ["home", "calm", "recovery"], iconKey: "format-device", artwork: { motif: "home", primary: "#7c3aed", secondary: "#ddd6fe", accent: "#fb7185" } },
    tool: { tags: ["daily", "ritual", "hydration"], iconKey: "format-tool", artwork: { motif: "grid", primary: "#1d4ed8", secondary: "#dbeafe", accent: "#facc15" } },
    gear: { tags: ["fitness", "recovery", "performance"], iconKey: "format-gear", artwork: { motif: "pulse", primary: "#b91c1c", secondary: "#fecaca", accent: "#ffffff" } }
  },
  support: {
    clear: { tags: ["light", "hydration", "focus"], iconKey: "support-clear", artwork: { motif: "arc", primary: "#0ea5e9", secondary: "#dbeafe", accent: "#ffffff" } },
    steady: { tags: ["balance", "daily", "ritual"], iconKey: "support-steady", artwork: { motif: "grid", primary: "#334155", secondary: "#cbd5e1", accent: "#f8fafc" } },
    comfort: { tags: ["home", "calm", "rest"], iconKey: "support-comfort", artwork: { motif: "home", primary: "#854d0e", secondary: "#fde68a", accent: "#ffffff" } },
    motivate: { tags: ["performance", "energy", "fitness"], iconKey: "support-motivate", artwork: { motif: "glow", primary: "#be123c", secondary: "#fecdd3", accent: "#facc15" } },
    simple: { tags: ["light", "portable", "daily"], iconKey: "support-simple", artwork: { motif: "stride", primary: "#0f766e", secondary: "#ccfbf1", accent: "#ffffff" } },
    restore: { tags: ["recovery", "rest", "calm"], iconKey: "support-restore", artwork: { motif: "moon", primary: "#312e81", secondary: "#ddd6fe", accent: "#ffffff" } }
  }
});

const QUESTIONS: Record<QuizQuestionKey, QuizQuestion> = Object.freeze(
  buildQuestions(QUIZ_CONTENT.questions)
);

const PRODUCT_TAG_RULES = Object.freeze([
  { keywords: ["按摩", "恢復", "熱敷", "放鬆", "massage", "recovery"], tags: ["recovery", "performance", "fitness", "calm"] },
  { keywords: ["水瓶", "水壺", "保冰", "瓶", "hydration", "bottle"], tags: ["hydration", "portable", "daily", "light"] },
  { keywords: ["香氛", "抱枕", "毯", "blanket", "aroma", "sleep"], tags: ["calm", "rest", "home"] },
  { keywords: ["鍋", "餐廚", "燕麥", "穀物", "營養", "nutrition", "breakfast", "protein"], tags: ["nutrition", "ritual", "home", "balance"] },
  { keywords: ["循環扇", "靜音", "居家", "home"], tags: ["home", "calm", "rest"] },
  { keywords: ["運動", "健身", "機能", "fitness", "energy"], tags: ["fitness", "performance", "energy"] },
  { keywords: ["耳機", "平板", "投影", "focus"], tags: ["focus", "daily", "home"] }
]);

const CATEGORY_TAG_RULES = Object.freeze([
  { keywords: ["energy", "運動", "機能"], tags: ["energy", "fitness", "portable"] },
  { keywords: ["nutrition", "營養", "穀物", "blends"], tags: ["nutrition", "balance", "ritual"] },
  { keywords: ["健康", "保健"], tags: ["recovery", "daily", "balance"] },
  { keywords: ["居家"], tags: ["home", "calm", "rest"] },
  { keywords: ["餐廚"], tags: ["nutrition", "home", "ritual"] },
  { keywords: ["運動戶外"], tags: ["portable", "hydration", "fitness"] }
]);

const ROLE_LABELS: Record<string, string> = Object.freeze(QUIZ_CONTENT.roleLabels);

const TAG_REASON_COPY: Record<string, string> = Object.freeze(QUIZ_CONTENT.reasonCopy);

export const INTRO_ARTWORK = createIllustration({
  motif: "hero",
  primary: "#0f766e",
  secondary: "#99f6e4",
  accent: "#f97316"
});

const OPTION_LOOKUP = buildOptionLookup();
const ICON_URLS = buildIconUrlLookup();

export function buildEmptyQuizAnswers(): QuizAnswers {
  return QUIZ_STEP_ORDER.reduce((result, stepKey) => {
    result[stepKey] = "";
    return result;
  }, {} as QuizAnswers);
}

export function getQuestion(questionKey: QuizQuestionKey): QuizQuestion {
  return QUESTIONS[questionKey];
}

export function getOption(
  questionKey: QuizQuestionKey | string | undefined,
  optionValue: string | undefined
): QuizOption | null {
  const safeQuestionKey = normalizeString(questionKey);
  const safeOptionValue = normalizeString(optionValue);
  if (!safeQuestionKey || !safeOptionValue) {
    return null;
  }

  return OPTION_LOOKUP[`${safeQuestionKey}:${safeOptionValue}`] || null;
}

export function getQuizIconUrl(
  iconKey: string | undefined,
  fallbackLabel = QUIZ_CONTENT.fallbackIconLabel
) {
  const safeIconKey = normalizeString(iconKey);
  return ICON_URLS[safeIconKey] || createIllustration({
    motif: "hero",
    primary: "#0f766e",
    secondary: "#ccfbf1",
    accent: "#f97316",
    label: normalizeString(fallbackLabel) || QUIZ_CONTENT.fallbackIconLabel
  });
}

export function getAnswerHighlights(answers: Partial<QuizAnswers>): QuizAnswerHighlight[] {
  return QUIZ_STEP_ORDER.map((stepKey) => {
    const option = getOption(stepKey, answers?.[stepKey]);
    if (!option) {
      return null;
    }

    return {
      stepKey,
      stepNumber: QUESTIONS[stepKey].index,
      eyebrow: QUESTIONS[stepKey].eyebrow,
      title: option.title,
      note: option.note,
      iconKey: option.iconKey,
      artwork: option.artwork
    };
  }).filter((item): item is QuizAnswerHighlight => Boolean(item));
}

export function buildHealthQuizRecommendation(
  answers: Partial<QuizAnswers>,
  products: StorefrontProduct[]
): QuizRecommendation {
  const selectedOptions = QUIZ_STEP_ORDER.map((stepKey) => getOption(stepKey, answers?.[stepKey])).filter(
    (item): item is QuizOption => Boolean(item)
  );
  const safeSelections = selectedOptions.length ? selectedOptions : [QUESTIONS.goal.options[0]];
  const goal = getOption("goal", answers?.goal) || QUESTIONS.goal.options[0];
  const rhythm = getOption("rhythm", answers?.rhythm) || QUESTIONS.rhythm.options[0];
  const preference = getOption("preference", answers?.preference) || QUESTIONS.preference.options[0];
  const format = getOption("format", answers?.format) || QUESTIONS.format.options[0];
  const support = getOption("support", answers?.support) || QUESTIONS.support.options[0];
  const tagWeights = buildTagWeights(safeSelections);

  const rankedProducts = (products || [])
    .map((product) => {
      const inferredTags = inferProductTags(product);
      const score = scoreProductForProfile(inferredTags, tagWeights, product);
      return {
        ...product,
        inferredTags,
        roleLabel: resolveRoleLabel(inferredTags, tagWeights),
        reason: buildProductReason(inferredTags, tagWeights),
        score
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  return {
    heroVariantKey: goal.value,
    bundleName: applyTemplate(QUIZ_CONTENT.bundleNameTemplate, {
      goal: goal.bundleWord,
      support: support.bundleWord
    }),
    summary: applyTemplate(QUIZ_CONTENT.summaryTemplate, {
      goalSummaryLead: goal.summaryLead,
      preferenceTitle: preference.title,
      formatTitle: format.title,
      rhythmTitle: rhythm.title,
      supportTitle: support.title
    }),
    artwork: support.artwork || preference.artwork || goal.artwork,
    tags: uniqueValues([goal.title, rhythm.title, preference.title, format.title, support.title]),
    products: rankedProducts
  };
}

export function inferProductTags(product: StorefrontProduct): string[] {
  const searchableText = [
    product.name,
    product.categoryLabel,
    product.label,
    product.description,
    product.longDescription,
    ...(product.highlights || []),
    ...(product.specs || []).map((item) => `${item.label} ${item.value}`)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const tags = new Set<string>();

  PRODUCT_TAG_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => searchableText.includes(keyword.toLowerCase()))) {
      rule.tags.forEach((tag) => tags.add(tag));
    }
  });

  const categoryText = [product.categoryLabel, product.categoryId, product.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  CATEGORY_TAG_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => categoryText.includes(keyword.toLowerCase()))) {
      rule.tags.forEach((tag) => tags.add(tag));
    }
  });

  if (!tags.size) {
    tags.add("daily");
  }

  return Array.from(tags);
}

function buildTagWeights(selectedOptions: QuizOption[]) {
  const weights: Record<string, number> = {};

  selectedOptions.forEach((option, index) => {
    const weight = index === 0 ? 3.2 : index === selectedOptions.length - 1 ? 2.8 : 2.35;
    addWeightedTags(weights, option.tags, weight);
  });

  addWeightedTags(weights, ["daily"], 0.8);
  return weights;
}

function scoreProductForProfile(
  inferredTags: string[],
  tagWeights: Record<string, number>,
  product: StorefrontProduct
) {
  let score = 0;

  inferredTags.forEach((tag) => {
    score += tagWeights[tag] || 0;
  });

  if (product.imageUrl) {
    score += 0.08;
  }

  if (product.highlights.length) {
    score += product.highlights.length * 0.04;
  }

  return score;
}

function resolveRoleLabel(inferredTags: string[], tagWeights: Record<string, number>) {
  const strongestTag = inferredTags
    .map((tag) => ({
      tag,
      score: tagWeights[tag] || 0
    }))
    .sort((left, right) => right.score - left.score)[0]?.tag;

  return ROLE_LABELS[strongestTag] || QUIZ_CONTENT.defaultRoleLabel;
}

function buildProductReason(inferredTags: string[], tagWeights: Record<string, number>) {
  const strongestTag = inferredTags
    .map((tag) => ({
      tag,
      score: tagWeights[tag] || 0
    }))
    .sort((left, right) => right.score - left.score)[0]?.tag;

  return TAG_REASON_COPY[strongestTag] || QUIZ_CONTENT.defaultReason;
}

function addWeightedTags(target: Record<string, number>, tags: string[], weight: number) {
  tags.forEach((tag) => {
    target[tag] = (target[tag] || 0) + weight;
  });
}

function createOption({ artwork, iconKey, ...rest }: OptionInput): QuizOption {
  return {
    ...rest,
    iconKey,
    artwork: createIllustration({
      ...artwork,
      label: rest.title
    })
  };
}

function buildQuestions(questionContent: QuizQuestionContent[]) {
  const questions = {} as Record<QuizQuestionKey, QuizQuestion>;

  questionContent.forEach((question) => {
    const questionKey = question.key as QuizQuestionKey;
    const optionMeta = QUESTION_META[questionKey];

    questions[questionKey] = {
      key: questionKey,
      index: question.index,
      eyebrow: question.eyebrow,
      title: question.title,
      subtitle: question.subtitle,
      options: question.options.map((option) => {
        const meta = optionMeta[option.value];

        return createOption({
          ...option,
          tags: meta.tags,
          iconKey: meta.iconKey,
          artwork: meta.artwork
        });
      })
    };
  });

  return questions;
}

function buildOptionLookup() {
  const lookup: Record<string, QuizOption> = {};

  Object.values(QUESTIONS).forEach((question) => {
    question.options.forEach((option) => {
      lookup[`${question.key}:${option.value}`] = option;
    });
  });

  return lookup;
}

function buildIconUrlLookup() {
  const lookup: Record<string, string> = {};

  Object.values(QUESTIONS).forEach((question) => {
    question.options.forEach((option) => {
      lookup[option.iconKey] = option.artwork;
    });
  });

  return lookup;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set((values || []).filter((value) => normalizeString(value))));
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function applyTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function createIllustration({
  motif,
  primary,
  secondary,
  accent,
  label = QUIZ_CONTENT.fallbackIconLabel
}: IllustrationInput) {
  const safePrimary = primary || "#0f766e";
  const safeSecondary = secondary || "#ccfbf1";
  const safeAccent = accent || "#f97316";
  const safeLabel = escapeXml(label);
  const motifMarkup = buildMotifMarkup(motif, safeAccent);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" role="img" aria-label="${safeLabel}">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${safePrimary}" />
          <stop offset="100%" stop-color="${safeSecondary}" />
        </linearGradient>
      </defs>
      <rect width="400" height="280" rx="36" fill="url(#bg)" />
      <circle cx="330" cy="56" r="58" fill="${safeAccent}" opacity="0.18" />
      <circle cx="58" cy="234" r="72" fill="#ffffff" opacity="0.14" />
      <path d="M0 210C46 184 88 176 132 180C178 184 230 210 274 204C318 198 356 166 400 142V280H0Z" fill="#ffffff" opacity="0.18" />
      <path d="M0 232C52 218 98 206 144 212C190 218 238 246 284 242C330 238 362 214 400 194V280H0Z" fill="#ffffff" opacity="0.12" />
      ${motifMarkup}
      <rect x="22" y="24" width="128" height="30" rx="15" fill="#ffffff" opacity="0.14" />
      <text x="86" y="44" text-anchor="middle" font-size="13" font-family="'Avenir Next','PingFang TC','Noto Sans TC',sans-serif" fill="#ffffff" opacity="0.88">${safeLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildMotifMarkup(motif: string, accent: string) {
  const safeAccent = accent || "#f97316";

  switch (motif) {
    case "sunrise":
      return `
        <circle cx="114" cy="138" r="38" fill="${safeAccent}" opacity="0.72" />
        <path d="M48 176C76 152 96 142 116 142C136 142 156 152 184 176" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.9" />
        <path d="M216 96H330" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.8" />
        <path d="M240 128H356" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.48" />
      `;
    case "leaf":
      return `
        <path d="M206 196C206 132 242 92 314 78C310 148 274 196 206 196Z" fill="#ffffff" opacity="0.86" />
        <path d="M170 182C170 124 142 92 84 76C88 138 116 182 170 182Z" fill="${safeAccent}" opacity="0.78" />
        <path d="M202 204C198 166 216 130 244 96" stroke="#0b3b35" stroke-width="8" stroke-linecap="round" opacity="0.28" />
      `;
    case "pulse":
      return `
        <path d="M44 168H114L148 114L188 194L224 144H356" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
        <circle cx="284" cy="98" r="34" fill="${safeAccent}" opacity="0.76" />
      `;
    case "moon":
      return `
        <circle cx="112" cy="112" r="50" fill="#ffffff" opacity="0.9" />
        <circle cx="136" cy="96" r="44" fill="#1e293b" opacity="0.92" />
        <circle cx="286" cy="90" r="7" fill="#ffffff" opacity="0.85" />
        <circle cx="318" cy="126" r="5" fill="#ffffff" opacity="0.72" />
        <circle cx="252" cy="142" r="5" fill="#ffffff" opacity="0.62" />
        <path d="M42 204C98 178 136 168 176 172C216 176 260 196 316 188" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.34" />
      `;
    case "home":
      return `
        <path d="M102 198V128L192 66L284 128V198Z" fill="#ffffff" opacity="0.84" />
        <path d="M148 198V150H238V198" fill="${safeAccent}" opacity="0.72" />
        <path d="M94 134L192 54L292 134" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.78" />
      `;
    case "stride":
      return `
        <path d="M102 198L174 126L220 160L306 84" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
        <circle cx="104" cy="200" r="18" fill="${safeAccent}" opacity="0.82" />
        <circle cx="306" cy="84" r="18" fill="#ffffff" opacity="0.9" />
      `;
    case "droplet":
      return `
        <path d="M204 68C240 114 262 144 262 176C262 212 236 236 204 236C172 236 146 212 146 176C146 144 168 114 204 68Z" fill="#ffffff" opacity="0.88" />
        <circle cx="270" cy="112" r="24" fill="${safeAccent}" opacity="0.72" />
      `;
    case "arc":
      return `
        <path d="M72 178C94 130 136 98 186 98C236 98 280 130 304 178" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.9" />
        <path d="M110 194C130 156 158 138 186 138C214 138 244 156 264 194" fill="none" stroke="${safeAccent}" stroke-width="14" stroke-linecap="round" opacity="0.82" />
      `;
    case "glow":
      return `
        <circle cx="188" cy="138" r="54" fill="#ffffff" opacity="0.92" />
        <circle cx="188" cy="138" r="28" fill="${safeAccent}" opacity="0.88" />
        <path d="M188 44V80M188 196V232M94 138H130M246 138H282M122 72L148 98M228 178L254 204M122 204L148 178M228 98L254 72" stroke="#ffffff" stroke-width="10" stroke-linecap="round" opacity="0.72" />
      `;
    case "grid":
      return `
        <rect x="88" y="78" width="220" height="126" rx="20" fill="#ffffff" opacity="0.86" />
        <path d="M146 78V204M202 78V204M258 78V204M88 120H308M88 162H308" stroke="${safeAccent}" stroke-width="10" opacity="0.28" />
        <circle cx="118" cy="106" r="10" fill="${safeAccent}" opacity="0.72" />
      `;
    case "hero":
    default:
      return `
        <circle cx="126" cy="106" r="44" fill="#ffffff" opacity="0.86" />
        <path d="M206 182C206 132 242 92 314 78C310 148 274 196 206 196Z" fill="${safeAccent}" opacity="0.8" />
        <path d="M74 196C108 168 138 156 172 156C206 156 242 168 280 196" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.72" />
      `;
  }
}

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
