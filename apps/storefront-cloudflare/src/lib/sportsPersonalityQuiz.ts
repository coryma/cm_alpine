import type { StorefrontProduct } from "../../shared/contracts";
import {
  REAL_PRODUCT_IDS_BY_PERSONA,
  REAL_STOREFRONT_PRODUCTS,
  getRealProductsByIds
} from "../../shared/realProductCatalog";

export const QUIZ_STEP_ORDER = [
  "wake",
  "weekend",
  "selection",
  "recovery",
  "bag",
  "decision"
] as const;

export const QUIZ_STEP_COUNT = QUIZ_STEP_ORDER.length;

export type QuizQuestionKey = (typeof QUIZ_STEP_ORDER)[number];
export type QuizAnswers = Record<QuizQuestionKey, string>;
type QuizDimensionKey = "intensity" | "ritual" | "convenience" | "social" | "sustainability";

export interface QuizOption {
  value: string;
  title: string;
  note: string;
  tags: string[];
  bundleWord: string;
  summaryLead: string;
  iconKey: string;
  artwork: string;
  scores: Partial<Record<QuizDimensionKey, number>>;
  crmTags: string[];
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
  sku: string;
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
  personaCode: string;
  personaName: string;
  primaryBundleName: string;
  offerCode: string;
  leadCaptureTitle: string;
  leadCaptureBody: string;
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
  scores: Partial<Record<QuizDimensionKey, number>>;
  crmTags: string[];
}

interface QuestionInput {
  key: QuizQuestionKey;
  eyebrow: string;
  title: string;
  subtitle: string;
  options: OptionInput[];
}

interface IllustrationInput {
  motif: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  label?: string;
}

interface PersonaProfile {
  key: string;
  code: string;
  personaName: string;
  englishName: string;
  primaryBundleName: string;
  summary: string;
  productTags: string[];
  crmTags: string[];
  leadCaptureTitle: string;
  leadCaptureBody: string;
  offerCode: string;
  artwork: IllustrationInput;
}

const ROLE_LABELS: Record<string, string> = Object.freeze({
  pre: "訓練前啟動",
  during: "訓練中維持",
  post: "運動後恢復",
  bar: "隨身蛋白補給",
  coffee: "晨間蛋白咖啡",
  pod: "便利單份包裝",
  eco: "永續補給",
  vegan: "植物性選擇",
  taste: "口味探索",
  performance: "高強度補給",
  convenience: "快速決策",
  ritual: "日常儀式",
  social: "分享與揪團"
});

const TAG_REASON_COPY: Record<string, string> = Object.freeze({
  pre: "符合你訓練前需要快速啟動和集中注意力的情境。",
  during: "適合放進訓練中段，維持補水和穩定能量。",
  post: "對應你重視恢復的選擇，讓訓練後銜接更俐落。",
  bar: "隨手就能補充蛋白質，適合包包裡常備一份。",
  coffee: "把咖啡和蛋白補給合在一起，適合有晨間儀式感的開始。",
  pod: "單份包裝能減少準備成本，符合快速、可重複的補給習慣。",
  eco: "包裝和價值觀更一致，適合重視永續選擇的客戶。",
  vegan: "植物性路線讓日常補給更清爽，也更容易長期接受。",
  taste: "多口味入門適合先探索，再決定長期回購的口味。",
  performance: "能支撐比較完整的訓練節奏，不只是一時補充。",
  convenience: "不用複雜準備，直接符合高效率決策和使用方式。",
  ritual: "能自然放入固定時段，讓補給變成可持續的習慣。",
  social: "包裝與口味都有分享話題，適合揪團、打卡或送禮。"
});

const PERSONAS: readonly PersonaProfile[] = Object.freeze([
  {
    key: "discipline",
    code: "ESTJ",
    personaName: "執行者",
    englishName: "The Executor",
    primaryBundleName: "全日補給方案",
    summary:
      "你把訓練當成系統，不是偶爾想起來才做。訓練前、訓練中、訓練後各有對應的補給，讓每一段都不掉鏈子。",
    productTags: ["performance", "pre", "during", "post", "bar"],
    crmTags: ["#高頻消費", "#大包裝", "#全套補給", "#訂閱制潛力"],
    leadCaptureTitle: "領取執行者補給計畫",
    leadCaptureBody: "把三段式補給清單和專屬優惠寄給你，下次訓練前可以直接照表補貨。",
    offerCode: "DISCIPLINE-85",
    artwork: { motif: "pulse", primary: "#14342f", secondary: "#7dd3fc", accent: "#fb923c" }
  },
  {
    key: "mindful",
    code: "ISFP",
    personaName: "品味家",
    englishName: "The Connoisseur",
    primaryBundleName: "口味優先方案",
    summary:
      "你重視感受勝過成績，補給不能只是功能正確，也要好喝、順口、值得期待。從咖啡和口味探索開始，最容易堅持下去。",
    productTags: ["ritual", "coffee", "taste", "vegan", "bar"],
    crmTags: ["#嘗鮮型", "#重口味", "#少量多款", "#品質敏感"],
    leadCaptureTitle: "領取品味家口味清單",
    leadCaptureBody: "把最適合你的咖啡與蛋白棒口味寄給你，先從少量多款開始試。",
    offerCode: "MINDFUL-85",
    artwork: { motif: "coffee", primary: "#5b3a29", secondary: "#fed7aa", accent: "#10b981" }
  },
  {
    key: "social",
    code: "ESFP",
    personaName: "號召者",
    englishName: "The Connector",
    primaryBundleName: "嘗鮮分享方案",
    summary:
      "運動對你來說也是連結。朋友推薦、打卡場景和話題包裝都是你的動力來源，多口味、小包裝、好分享的組合最適合你。",
    productTags: ["social", "taste", "bar", "coffee", "convenience"],
    crmTags: ["#團購潛力", "#推薦驅動", "#重話題性", "#送禮場景"],
    leadCaptureTitle: "領取號召者分享優惠",
    leadCaptureBody: "把測驗結果和嘗鮮組優惠寄給你，適合傳給朋友一起選口味。",
    offerCode: "SOCIAL-85",
    artwork: { motif: "social", primary: "#9f1239", secondary: "#fecdd3", accent: "#facc15" }
  },
  {
    key: "efficiency",
    code: "ENTP",
    personaName: "分析者",
    englishName: "The Analyst",
    primaryBundleName: "高效補給方案",
    summary:
      "你想用最少時間完成最有效的補給。看成分、比價格、算使用成本——蛋白棒、Eco Pod 和高效率品項最對你的胃口。",
    productTags: ["convenience", "pod", "bar", "performance", "pre"],
    crmTags: ["#成分導向", "#功能優先", "#便利包裝", "#數據驅動"],
    leadCaptureTitle: "領取分析者補給比較表",
    leadCaptureBody: "把每個推薦品項的使用時機和折扣碼寄給你，方便你快速決定。",
    offerCode: "EFFICIENCY-85",
    artwork: { motif: "grid", primary: "#172554", secondary: "#bfdbfe", accent: "#22c55e" }
  },
  {
    key: "conscious",
    code: "INFJ",
    personaName: "倡議者",
    englishName: "The Advocate",
    primaryBundleName: "天然環保方案",
    summary:
      "你在意身體，也在意選擇背後的價值。願意為環保包裝、植物性配方和透明品牌多花一點，環保膠囊和純植物路線就是為你準備的。",
    productTags: ["eco", "vegan", "pod", "ritual", "taste"],
    crmTags: ["#環保偏好", "#Vegan", "#品牌忠誠", "#價值觀消費"],
    leadCaptureTitle: "領取倡議者綠色清單",
    leadCaptureBody: "把環保膠囊、純植物補給和專屬優惠寄給你，方便你下次直接回購。",
    offerCode: "CONSCIOUS-85",
    artwork: { motif: "leaf", primary: "#14532d", secondary: "#bbf7d0", accent: "#f59e0b" }
  }
]);

const QUESTIONS: Record<QuizQuestionKey, QuizQuestion> = Object.freeze({
  wake: createQuestion({
    key: "wake",
    eyebrow: "訓練開場",
    title: "鬧鐘響了，今天是你計劃的運動日，你的第一個動作是？",
    subtitle: "你怎麼開始一天，會影響你需要什麼樣的補給。",
    options: [
      {
        value: "packed",
        title: "直接起床，補給包早就備好了",
        note: "計畫明確，補給也要跟訓練一樣準時。",
        tags: ["performance", "pre", "convenience"],
        bundleWord: "紀律",
        summaryLead: "你的訓練節奏很明確",
        iconKey: "wake-packed",
        artwork: { motif: "pulse", primary: "#14342f", secondary: "#99f6e4", accent: "#fb923c" },
        scores: { intensity: 3, convenience: 1 },
        crmTags: ["#高頻消費", "#全套補給"]
      },
      {
        value: "coffee",
        title: "先喝杯咖啡，等身體醒了再說",
        note: "有個順口的開始，整天狀態會比較好。",
        tags: ["coffee", "ritual", "taste"],
        bundleWord: "儀式",
        summaryLead: "你重視開始前的體感和節奏",
        iconKey: "wake-coffee",
        artwork: { motif: "coffee", primary: "#5b3a29", secondary: "#fed7aa", accent: "#10b981" },
        scores: { ritual: 3, sustainability: 1 },
        crmTags: ["#重口味", "#品質敏感"]
      },
      {
        value: "plan",
        title: "先確認訓練計畫，再出發",
        note: "每一步都有目的，補給也不例外。",
        tags: ["performance", "data", "ritual"],
        bundleWord: "計畫",
        summaryLead: "你會先看清楚訓練目的再行動",
        iconKey: "wake-plan",
        artwork: { motif: "grid", primary: "#172554", secondary: "#bfdbfe", accent: "#22c55e" },
        scores: { intensity: 2, ritual: 2 },
        crmTags: ["#數據驅動", "#成分導向"]
      },
      {
        value: "snooze",
        title: "多睡 15 分鐘，運動等等再說",
        note: "低壓、好入口、不複雜，才有可能持續。",
        tags: ["convenience", "bar", "light"],
        bundleWord: "低壓",
        summaryLead: "你需要先降低開始的門檻",
        iconKey: "wake-snooze",
        artwork: { motif: "moon", primary: "#312e81", secondary: "#c4b5fd", accent: "#f8fafc" },
        scores: { intensity: -1, social: 1 },
        crmTags: ["#便利包裝", "#輕量入門"]
      }
    ]
  }),
  weekend: createQuestion({
    key: "weekend",
    eyebrow: "週末場景",
    title: "朋友約你週末去爬山，你的第一反應是？",
    subtitle: "有些人靠朋友帶動，有些人靠自己的節奏。",
    options: [
      {
        value: "join",
        title: "好啊！這種揪我最喜歡了",
        note: "跟朋友一起動，比自己練有動力多了。",
        tags: ["social", "taste", "bar"],
        bundleWord: "社交",
        summaryLead: "你適合好分享、好揪團的補給",
        iconKey: "weekend-join",
        artwork: { motif: "social", primary: "#9f1239", secondary: "#fecdd3", accent: "#facc15" },
        scores: { social: 3, sustainability: 1 },
        crmTags: ["#團購潛力", "#推薦驅動"]
      },
      {
        value: "route",
        title: "先問路線強度和難度",
        note: "知道強度才能決定要帶什麼補給。",
        tags: ["performance", "during", "data"],
        bundleWord: "策略",
        summaryLead: "你會依照強度規劃補給",
        iconKey: "weekend-route",
        artwork: { motif: "mountain", primary: "#155e75", secondary: "#bae6fd", accent: "#f97316" },
        scores: { intensity: 2, ritual: 1 },
        crmTags: ["#全套補給", "#數據驅動"]
      },
      {
        value: "schedule",
        title: "看那天有沒有排其他訓練",
        note: "已經排好的節奏，不太想被打亂。",
        tags: ["performance", "post", "ritual"],
        bundleWord: "穩定",
        summaryLead: "你重視固定週期和恢復安排",
        iconKey: "weekend-schedule",
        artwork: { motif: "calendar", primary: "#0f172a", secondary: "#cbd5e1", accent: "#22c55e" },
        scores: { intensity: 3, ritual: 1, social: -1 },
        crmTags: ["#高頻消費", "#訂閱制潛力"]
      },
      {
        value: "walk",
        title: "可以啊，主要是跟朋友出去走走",
        note: "氣氛和陪伴比強度更重要。",
        tags: ["social", "taste", "coffee"],
        bundleWord: "陪伴",
        summaryLead: "你適合輕鬆、有話題的品項",
        iconKey: "weekend-walk",
        artwork: { motif: "trail", primary: "#166534", secondary: "#bbf7d0", accent: "#facc15" },
        scores: { social: 2, ritual: 1 },
        crmTags: ["#送禮場景", "#社群擴散"]
      }
    ]
  }),
  selection: createQuestion({
    key: "selection",
    eyebrow: "商品判斷",
    title: "你在選運動飲料，最先看的是什麼？",
    subtitle: "每個人在意的重點不同，推薦也會跟著調整。",
    options: [
      {
        value: "facts",
        title: "成分表和蛋白質含量",
        note: "數據站得住腳，才值得買。",
        tags: ["data", "performance", "protein"],
        bundleWord: "成分",
        summaryLead: "你會先用成分和功能判斷",
        iconKey: "selection-facts",
        artwork: { motif: "label", primary: "#172554", secondary: "#dbeafe", accent: "#22c55e" },
        scores: { intensity: 2, convenience: 1 },
        crmTags: ["#成分導向", "#功能優先"]
      },
      {
        value: "taste",
        title: "口味，好喝最重要",
        note: "不好喝的東西，再有功能也很難長期回購。",
        tags: ["taste", "coffee", "bar"],
        bundleWord: "口味",
        summaryLead: "你會因為口味和體驗留下來",
        iconKey: "selection-taste",
        artwork: { motif: "spark", primary: "#7c2d12", secondary: "#fed7aa", accent: "#fb7185" },
        scores: { ritual: 3 },
        crmTags: ["#重口味", "#嘗鮮型"]
      },
      {
        value: "eco",
        title: "包裝環不環保、成分天不天然",
        note: "選擇的品牌要跟自己的價值觀一致。",
        tags: ["eco", "vegan", "pod"],
        bundleWord: "永續",
        summaryLead: "你會把品牌理念納入購買決策",
        iconKey: "selection-eco",
        artwork: { motif: "leaf", primary: "#14532d", secondary: "#bbf7d0", accent: "#f59e0b" },
        scores: { sustainability: 3, ritual: 1 },
        crmTags: ["#環保偏好", "#Vegan"]
      },
      {
        value: "value",
        title: "CP 值，哪個划算買哪個",
        note: "願意買，但要看每次使用成本。",
        tags: ["convenience", "bar", "pod"],
        bundleWord: "效率",
        summaryLead: "你會快速比較成本和使用效率",
        iconKey: "selection-value",
        artwork: { motif: "grid", primary: "#334155", secondary: "#cbd5e1", accent: "#f97316" },
        scores: { convenience: 2, intensity: 1 },
        crmTags: ["#數據驅動", "#快速決策"]
      }
    ]
  }),
  recovery: createQuestion({
    key: "recovery",
    eyebrow: "恢復意識",
    title: "訓練結束，全身痠痛，你最想做的第一件事是？",
    subtitle: "訓練結束後怎麼緩和，也是補給策略的一部分。",
    options: [
      {
        value: "post",
        title: "馬上補充恢復飲，把握黃金 30 分鐘",
        note: "恢復是訓練的一部分，不能隨便帶過。",
        tags: ["post", "performance", "convenience"],
        bundleWord: "恢復",
        summaryLead: "你會把恢復當成訓練流程的一環",
        iconKey: "recovery-post",
        artwork: { motif: "recovery", primary: "#7f1d1d", secondary: "#fecaca", accent: "#38bdf8" },
        scores: { intensity: 3, ritual: 1 },
        crmTags: ["#全套補給", "#高頻消費"]
      },
      {
        value: "bath",
        title: "先好好泡個澡，讓身體放鬆",
        note: "完整的體驗比快速補充更重要。",
        tags: ["ritual", "taste", "coffee"],
        bundleWord: "放鬆",
        summaryLead: "你需要有感、舒服、值得期待的補給",
        iconKey: "recovery-bath",
        artwork: { motif: "wave", primary: "#0f766e", secondary: "#ccfbf1", accent: "#f59e0b" },
        scores: { ritual: 3, sustainability: 1 },
        crmTags: ["#品質敏感", "#低頻高單"]
      },
      {
        value: "photo",
        title: "拍張訓練成果照打卡",
        note: "有成果可以分享，就更有動力繼續。",
        tags: ["social", "taste", "bar"],
        bundleWord: "分享",
        summaryLead: "你會被社群和成果感激勵",
        iconKey: "recovery-photo",
        artwork: { motif: "camera", primary: "#9f1239", secondary: "#fbcfe8", accent: "#facc15" },
        scores: { social: 3 },
        crmTags: ["#重話題性", "#社群擴散"]
      },
      {
        value: "couch",
        title: "攤在沙發上，明天再說",
        note: "最簡單、最少步驟的方式才做得下去。",
        tags: ["convenience", "bar", "pod"],
        bundleWord: "簡單",
        summaryLead: "你適合不用準備、低阻力的商品",
        iconKey: "recovery-couch",
        artwork: { motif: "moon", primary: "#312e81", secondary: "#ddd6fe", accent: "#f8fafc" },
        scores: { intensity: -1, convenience: 1, social: 1 },
        crmTags: ["#便利包裝", "#輕量入門"]
      }
    ]
  }),
  bag: createQuestion({
    key: "bag",
    eyebrow: "補給形式",
    title: "如果你的運動包只能再塞一樣補給品，你選？",
    subtitle: "包裡只剩一個空間，你的選擇說明了你最在意什麼。",
    options: [
      {
        value: "bar",
        title: "GoBar 高蛋白棒，隨時來一條",
        note: "快速、實用，包包裡常備最重要。",
        tags: ["bar", "protein", "convenience"],
        bundleWord: "隨身",
        summaryLead: "你偏好隨身、快速的蛋白補給",
        iconKey: "bag-bar",
        artwork: { motif: "bar", primary: "#92400e", secondary: "#fde68a", accent: "#38bdf8" },
        scores: { convenience: 2, intensity: 1 },
        crmTags: ["#便利包裝", "#功能優先"]
      },
      {
        value: "coffee",
        title: "GoBrew 蛋白質咖啡，早上的儀式",
        note: "補給也可以是每天值得期待的開始。",
        tags: ["coffee", "protein", "ritual"],
        bundleWord: "晨間",
        summaryLead: "你適合把補給放進早晨儀式",
        iconKey: "bag-coffee",
        artwork: { motif: "coffee", primary: "#5b3a29", secondary: "#fed7aa", accent: "#10b981" },
        scores: { ritual: 3 },
        crmTags: ["#品質敏感", "#少量多款"]
      },
      {
        value: "pod",
        title: "Eco Pod 環保膠囊，方便又環保",
        note: "便利和價值觀可以同時兼顧。",
        tags: ["pod", "eco", "convenience"],
        bundleWord: "綠色",
        summaryLead: "你偏好單份包裝和環保選擇",
        iconKey: "bag-pod",
        artwork: { motif: "pod", primary: "#14532d", secondary: "#bbf7d0", accent: "#f59e0b" },
        scores: { sustainability: 3, convenience: 1 },
        crmTags: ["#Eco Pod偏好", "#環保偏好"]
      },
      {
        value: "drink",
        title: "Alpine 能量飲，訓練中補水首選",
        note: "訓練中能持續支撐狀態的補給。",
        tags: ["during", "performance", "hydration"],
        bundleWord: "續航",
        summaryLead: "你重視訓練中的續航和補水",
        iconKey: "bag-drink",
        artwork: { motif: "droplet", primary: "#0f766e", secondary: "#99f6e4", accent: "#f97316" },
        scores: { intensity: 3 },
        crmTags: ["#全套補給", "#高頻消費"]
      }
    ]
  }),
  decision: createQuestion({
    key: "decision",
    eyebrow: "購買決策",
    title: "看到推薦商品後，你通常會怎麼決定？",
    subtitle: "最後一步，讓我們知道你下單前的習慣。",
    options: [
      {
        value: "research",
        title: "先看成分和評價，再下單",
        note: "有比較過才安心。",
        tags: ["data", "performance", "convenience"],
        bundleWord: "比較",
        summaryLead: "你會先研究，再快速決策",
        iconKey: "decision-research",
        artwork: { motif: "label", primary: "#172554", secondary: "#dbeafe", accent: "#22c55e" },
        scores: { intensity: 2, convenience: 1 },
        crmTags: ["#成分導向", "#數據驅動"]
      },
      {
        value: "discount",
        title: "有優惠就願意試一次",
        note: "不排斥嘗試，但需要一個推力。",
        tags: ["taste", "convenience", "bar"],
        bundleWord: "優惠",
        summaryLead: "你適合用入門優惠啟動首購",
        iconKey: "decision-discount",
        artwork: { motif: "ticket", primary: "#7c2d12", secondary: "#fed7aa", accent: "#fb7185" },
        scores: { ritual: 2, sustainability: 1 },
        crmTags: ["#首購優惠", "#嘗鮮型"]
      },
      {
        value: "cart",
        title: "喜歡就直接加入購物車",
        note: "商品夠準就會行動，不拖泥帶水。",
        tags: ["performance", "convenience", "pre"],
        bundleWord: "行動",
        summaryLead: "你偏向高意圖、快速轉換",
        iconKey: "decision-cart",
        artwork: { motif: "cart", primary: "#0f766e", secondary: "#ccfbf1", accent: "#f97316" },
        scores: { intensity: 2, convenience: 1 },
        crmTags: ["#高購買意圖", "#快速決策"]
      },
      {
        value: "share",
        title: "先傳給朋友一起看",
        note: "能分享、能討論，揪團更有動力。",
        tags: ["social", "taste", "coffee"],
        bundleWord: "分享",
        summaryLead: "你會讓朋友參與購買決策",
        iconKey: "decision-share",
        artwork: { motif: "social", primary: "#9f1239", secondary: "#fecdd3", accent: "#facc15" },
        scores: { social: 3 },
        crmTags: ["#團購潛力", "#推薦驅動"]
      },
    ]
  })
});

export const INTRO_ARTWORK = createIllustration({
  motif: "hero",
  primary: "#14342f",
  secondary: "#bbf7d0",
  accent: "#fb923c",
  label: "健康取向"
});

const OPTION_LOOKUP = buildOptionLookup();
const ICON_URLS = buildIconUrlLookup();
const ALPINE_PRODUCTS = buildAlpineProducts();

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
  fallbackLabel = "健康取向"
) {
  const safeIconKey = normalizeString(iconKey);
  return ICON_URLS[safeIconKey] || createIllustration({
    motif: "hero",
    primary: "#0f766e",
    secondary: "#ccfbf1",
    accent: "#f97316",
    label: normalizeString(fallbackLabel) || "健康取向"
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
  const safeSelections = selectedOptions.length ? selectedOptions : [QUESTIONS.wake.options[0]];
  const dimensionScores = buildDimensionScores(safeSelections);
  const persona = choosePersonaProfile(dimensionScores);
  const tagWeights = buildTagWeights(safeSelections, persona);
  const personaProductIds = REAL_PRODUCT_IDS_BY_PERSONA[persona.key] || [];
  const personaProducts = getRealProductsByIds(personaProductIds);
  const scoringPool = mergeProducts(
    personaProducts,
    REAL_STOREFRONT_PRODUCTS,
    products || [],
    ALPINE_PRODUCTS
  );
  const rankedProducts = scoringPool
    .map((product) => {
      const inferredTags = inferProductTags(product);
      const score =
        scoreProductForProfile(inferredTags, tagWeights, persona, product) +
        scoreProductForPersonaMap(product, personaProductIds);
      return {
        ...product,
        inferredTags,
        sku: product.id,
        roleLabel: resolveRoleLabel(inferredTags, tagWeights),
        reason: buildProductReason(inferredTags, persona),
        score
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  const decision = getOption("decision", answers?.decision);

  return {
    heroVariantKey: persona.key,
    bundleName: `${persona.personaName} · ${persona.primaryBundleName}`,
    summary: decision
      ? `${persona.summary} 你的購買風格偏向「${decision.title}」，下面的商品和優惠都依這個方向整理。`
      : persona.summary,
    artwork: createIllustration({
      ...persona.artwork,
      label: persona.personaName
    }),
    tags: uniqueValues([
      persona.personaName,
      persona.englishName,
      persona.primaryBundleName,
      ...persona.crmTags
    ]),
    products: rankedProducts,
    personaCode: persona.code,
    personaName: persona.personaName,
    primaryBundleName: persona.primaryBundleName,
    offerCode: persona.offerCode,
    leadCaptureTitle: persona.leadCaptureTitle,
    leadCaptureBody: persona.leadCaptureBody
  };
}

export function inferProductTags(product: StorefrontProduct): string[] {
  const searchableText = [
    product.id,
    product.slug,
    product.name,
    product.categoryId,
    product.categoryLabel,
    product.label,
    product.kicker,
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

  if (!tags.size) {
    tags.add("convenience");
  }

  return Array.from(tags);
}

function buildDimensionScores(selectedOptions: QuizOption[]) {
  const scores: Record<QuizDimensionKey, number> = {
    intensity: 0,
    ritual: 0,
    convenience: 0,
    social: 0,
    sustainability: 0
  };

  selectedOptions.forEach((option) => {
    (Object.keys(scores) as QuizDimensionKey[]).forEach((dimension) => {
      scores[dimension] += option.scores[dimension] || 0;
    });
  });

  return scores;
}

function choosePersonaProfile(scores: Record<QuizDimensionKey, number>) {
  const ranked = [
    {
      persona: findPersona("discipline"),
      score: scores.intensity * 1.35 + scores.convenience * 0.35 + scores.ritual * 0.1
    },
    {
      persona: findPersona("mindful"),
      score: scores.ritual * 1.35 + scores.sustainability * 0.25 + scores.social * 0.1
    },
    {
      persona: findPersona("social"),
      score: scores.social * 1.45 + scores.ritual * 0.2 + scores.convenience * 0.1
    },
    {
      persona: findPersona("efficiency"),
      score: scores.convenience * 1.25 + scores.intensity * 0.45 + scores.sustainability * 0.1
    },
    {
      persona: findPersona("conscious"),
      score: scores.sustainability * 1.55 + scores.ritual * 0.25 + scores.convenience * 0.1
    }
  ];

  return ranked.sort((left, right) => right.score - left.score)[0].persona;
}

function findPersona(key: string) {
  return PERSONAS.find((persona) => persona.key === key) || PERSONAS[0];
}

function buildTagWeights(selectedOptions: QuizOption[], persona: PersonaProfile) {
  const weights: Record<string, number> = {};

  selectedOptions.forEach((option, index) => {
    const weight = index === 0 ? 2.7 : index === selectedOptions.length - 1 ? 2.5 : 2.1;
    addWeightedTags(weights, option.tags, weight);
  });

  addWeightedTags(weights, persona.productTags, 3.4);
  addWeightedTags(weights, ["protein", "nutrition"], 0.8);
  return weights;
}

function scoreProductForProfile(
  inferredTags: string[],
  tagWeights: Record<string, number>,
  persona: PersonaProfile,
  product: StorefrontProduct
) {
  let score = 0;

  inferredTags.forEach((tag) => {
    score += tagWeights[tag] || 0;
    if (persona.productTags.includes(tag)) {
      score += 2.5;
    }
  });

  if (product.imageUrl) {
    score += 0.08;
  }

  return score;
}

function scoreProductForPersonaMap(product: StorefrontProduct, personaProductIds: readonly string[]) {
  const productIndex = personaProductIds.indexOf(product.id);

  if (productIndex < 0) {
    return 0;
  }

  return 40 - productIndex * 4;
}

function resolveRoleLabel(inferredTags: string[], tagWeights: Record<string, number>) {
  const strongestTag = inferredTags
    .map((tag) => ({
      tag,
      score: tagWeights[tag] || 0
    }))
    .sort((left, right) => right.score - left.score)[0]?.tag;

  return ROLE_LABELS[strongestTag || ""] || "為你推薦";
}

function buildProductReason(inferredTags: string[], persona: PersonaProfile) {
  const personaTag = persona.productTags.find((tag) => inferredTags.includes(tag));
  const firstTag = personaTag || inferredTags[0];

  return TAG_REASON_COPY[firstTag] || "這個品項和你目前的健康取向與購買偏好最接近。";
}

function addWeightedTags(target: Record<string, number>, tags: string[], weight: number) {
  tags.forEach((tag) => {
    target[tag] = (target[tag] || 0) + weight;
  });
}

function createQuestion(input: QuestionInput): QuizQuestion {
  return {
    key: input.key,
    index: QUIZ_STEP_ORDER.indexOf(input.key) + 1,
    eyebrow: input.eyebrow,
    title: input.title,
    subtitle: input.subtitle,
    options: input.options.map(createOption)
  };
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

function mergeProducts(...productGroups: ReadonlyArray<readonly StorefrontProduct[]>) {
  const productMap = new Map<string, StorefrontProduct>();

  productGroups.flat().forEach((product) => {
    if (!productMap.has(product.id)) {
      productMap.set(product.id, product);
    }
  });

  return Array.from(productMap.values());
}

function buildAlpineProducts(): StorefrontProduct[] {
  return [
    createAlpineProduct({
      id: "alpine-energy-pre-green-tea",
      name: "綠茶能量飲（訓練前）6 入",
      label: "能量飲",
      priceLabel: "NT$899",
      tags: ["pre", "performance", "convenience"],
      description: "訓練前啟動用綠茶能量飲，適合需要專注和乾淨能量的日子。",
      motif: "droplet"
    }),
    createAlpineProduct({
      id: "alpine-energy-during-green-tea",
      name: "綠茶能量飲（訓練中）6 入",
      label: "能量飲",
      priceLabel: "NT$899",
      tags: ["during", "hydration", "performance"],
      description: "訓練中補水與穩定能量，支撐長時間運動節奏。",
      motif: "wave"
    }),
    createAlpineProduct({
      id: "alpine-energy-post-tart-cherry",
      name: "酸櫻桃恢復飲（訓練後）6 入",
      label: "恢復飲",
      priceLabel: "NT$960",
      tags: ["post", "performance", "recovery"],
      description: "酸櫻桃風味恢復飲，適合運動後快速銜接日常。",
      motif: "recovery"
    }),
    createAlpineProduct({
      id: "alpine-eco-pod-chai",
      name: "環保膠囊 印度奶茶風味",
      label: "環保膠囊",
      priceLabel: "NT$620",
      tags: ["pod", "eco", "convenience"],
      description: "可堆肥單份膠囊包裝，讓每次補給更簡單也更有意識。",
      motif: "pod"
    }),
    createAlpineProduct({
      id: "alpine-eco-pod-tart-cherry",
      name: "環保膠囊 酸櫻桃風味",
      label: "環保膠囊",
      priceLabel: "NT$620",
      tags: ["pod", "eco", "post"],
      description: "酸櫻桃單份補給，兼顧恢復情境和環保包裝。",
      imageUrl: "/images/quiz/alpine-eco-pod-tart-cherry-prototype.png",
      motif: "leaf"
    }),
    createAlpineProduct({
      id: "alpine-gobar-tart-cherry-12",
      name: "酸櫻桃高蛋白棒 12 入",
      label: "蛋白棒",
      priceLabel: "NT$1,080",
      tags: ["bar", "protein", "convenience", "taste"],
      description: "酸櫻桃高蛋白能量棒，包包、辦公桌、健身袋都能常備。",
      imageUrl: "/images/quiz/alpine-gobar-tart-cherry-12-prototype.png",
      motif: "bar"
    }),
    createAlpineProduct({
      id: "alpine-gobar-blueberry-plant",
      name: "藍莓植物蛋白棒 6 入",
      label: "蛋白棒",
      priceLabel: "NT$760",
      tags: ["bar", "vegan", "taste", "eco"],
      description: "藍莓植物蛋白棒，適合重視口味和天然成分的日常補給。",
      imageUrl: "/images/products/6010063-gobar-blueberry-vegan-2oz-6pack.png",
      motif: "spark"
    }),
    createAlpineProduct({
      id: "alpine-gobrew-french-roast",
      name: "深焙蛋白咖啡 6 入",
      label: "蛋白咖啡",
      priceLabel: "NT$860",
      tags: ["coffee", "protein", "ritual"],
      description: "深焙蛋白質咖啡，把早晨咖啡和補給合成一個固定儀式。",
      motif: "coffee"
    }),
    createAlpineProduct({
      id: "alpine-gobrew-mocha",
      name: "摩卡蛋白咖啡 6 入",
      label: "蛋白咖啡",
      priceLabel: "NT$860",
      tags: ["coffee", "taste", "ritual"],
      description: "摩卡風味蛋白咖啡，適合想要好喝、順口、能持續的開始。",
      motif: "coffee"
    }),
    createAlpineProduct({
      id: "alpine-taster-pack",
      name: "綜合嘗鮮組",
      label: "嘗鮮組",
      priceLabel: "NT$1,180",
      tags: ["taste", "social", "bar", "coffee"],
      description: "多口味入門組，適合先試喝試吃，也適合跟朋友一起分。",
      imageUrl: "/images/quiz/alpine-taster-pack-prototype.png",
      motif: "social"
    })
  ];
}

function createAlpineProduct({
  id,
  name,
  label,
  priceLabel,
  tags,
  description,
  imageUrl,
  imageAlt,
  motif
}: {
  id: string;
  name: string;
  label: string;
  priceLabel: string;
  tags: string[];
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  motif: string;
}): StorefrontProduct {
  return {
    id,
    slug: id.replace("alpine-", ""),
    categoryId: "wellness",
    categoryLabel: "運動營養",
    label,
    name,
    kicker: tags.join(" "),
    priceLabel,
    description,
    longDescription: description,
    highlights: tags.map((tag) => ROLE_LABELS[tag] || tag).slice(0, 3),
    specs: [
      {
        label: "適用情境",
        value: tags.join(", ")
      }
    ],
    imageUrl:
      imageUrl ||
      createIllustration({
        motif,
        primary: colorForTag(tags[0]).primary,
        secondary: colorForTag(tags[0]).secondary,
        accent: colorForTag(tags[0]).accent,
        label
      }),
    imageAlt: imageAlt || name
  };
}

const PRODUCT_TAG_RULES = Object.freeze([
  { keywords: ["pre", "運動前", "啟動"], tags: ["pre", "performance", "convenience"] },
  { keywords: ["during", "訓練中", "補水", "hydration"], tags: ["during", "performance", "hydration"] },
  { keywords: ["post", "運動後", "恢復", "recovery", "tart cherry", "酸櫻桃"], tags: ["post", "performance"] },
  { keywords: ["gobar", "protein bar", "蛋白棒", "能量棒", "bar"], tags: ["bar", "protein", "convenience"] },
  { keywords: ["gogoo", "energy gel", "能量膠", "non-caffeinated", "無咖啡因"], tags: ["during", "convenience", "performance"] },
  { keywords: ["yetibar", "paleo"], tags: ["bar", "protein", "performance"] },
  { keywords: ["gobrew", "coffee", "咖啡", "mocha", "french roast", "latte"], tags: ["coffee", "protein", "ritual"] },
  { keywords: ["eco pod", "pod", "膠囊", "單份", "compostable", "可堆肥"], tags: ["pod", "eco", "convenience"] },
  { keywords: ["vegan", "植物", "純素"], tags: ["vegan", "eco"] },
  { keywords: ["blueberry", "chai", "hazelnut", "vanilla", "mocha", "moca", "taster", "口味", "嘗鮮"], tags: ["taste"] },
  { keywords: ["share", "social", "朋友", "團購", "gift"], tags: ["social", "taste"] },
  { keywords: ["sneaker", "performance", "runner", "運動"], tags: ["performance", "convenience"] },
  { keywords: ["matcha", "granola", "elixir", "穀物"], tags: ["ritual", "taste"] }
]);

function colorForTag(tag: string) {
  switch (tag) {
    case "coffee":
      return { primary: "#5b3a29", secondary: "#fed7aa", accent: "#10b981" };
    case "eco":
    case "pod":
    case "vegan":
      return { primary: "#14532d", secondary: "#bbf7d0", accent: "#f59e0b" };
    case "bar":
      return { primary: "#92400e", secondary: "#fde68a", accent: "#38bdf8" };
    case "post":
      return { primary: "#7f1d1d", secondary: "#fecaca", accent: "#38bdf8" };
    case "during":
      return { primary: "#0f766e", secondary: "#99f6e4", accent: "#f97316" };
    case "taste":
      return { primary: "#9f1239", secondary: "#fecdd3", accent: "#facc15" };
    default:
      return { primary: "#14342f", secondary: "#bfdbfe", accent: "#fb923c" };
  }
}

function uniqueValues(values: string[]) {
  return Array.from(new Set((values || []).filter((value) => normalizeString(value))));
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function createIllustration({
  motif,
  primary,
  secondary,
  accent,
  label = "健康取向"
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
      <rect width="400" height="280" rx="30" fill="url(#bg)" />
      <circle cx="330" cy="58" r="58" fill="${safeAccent}" opacity="0.18" />
      <circle cx="58" cy="234" r="72" fill="#ffffff" opacity="0.14" />
      <path d="M0 210C46 184 88 176 132 180C178 184 230 210 274 204C318 198 356 166 400 142V280H0Z" fill="#ffffff" opacity="0.18" />
      ${motifMarkup}
      <rect x="22" y="24" width="138" height="30" rx="15" fill="#ffffff" opacity="0.16" />
      <text x="91" y="44" text-anchor="middle" font-size="13" font-family="'Avenir Next','PingFang TC','Noto Sans TC',sans-serif" fill="#ffffff" opacity="0.9">${safeLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildMotifMarkup(motif: string, accent: string) {
  const safeAccent = accent || "#f97316";

  switch (motif) {
    case "pulse":
      return `
        <path d="M44 168H114L148 114L188 194L224 144H356" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
        <circle cx="284" cy="98" r="34" fill="${safeAccent}" opacity="0.76" />
      `;
    case "coffee":
      return `
        <path d="M120 120H244V176C244 212 220 232 182 232C144 232 120 212 120 176Z" fill="#ffffff" opacity="0.88" />
        <path d="M244 138H278C296 138 306 150 306 166C306 184 292 196 270 196H244" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.78" />
        <path d="M154 88C146 74 160 62 154 48M196 88C188 74 202 62 196 48" fill="none" stroke="${safeAccent}" stroke-width="10" stroke-linecap="round" opacity="0.86" />
      `;
    case "grid":
      return `
        <rect x="88" y="78" width="220" height="126" rx="20" fill="#ffffff" opacity="0.86" />
        <path d="M146 78V204M202 78V204M258 78V204M88 120H308M88 162H308" stroke="${safeAccent}" stroke-width="10" opacity="0.28" />
        <circle cx="118" cy="106" r="10" fill="${safeAccent}" opacity="0.72" />
      `;
    case "moon":
      return `
        <circle cx="112" cy="112" r="50" fill="#ffffff" opacity="0.9" />
        <circle cx="136" cy="96" r="44" fill="#312e81" opacity="0.9" />
        <path d="M42 204C98 178 136 168 176 172C216 176 260 196 316 188" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.34" />
      `;
    case "social":
      return `
        <circle cx="142" cy="120" r="34" fill="#ffffff" opacity="0.9" />
        <circle cx="246" cy="104" r="30" fill="${safeAccent}" opacity="0.82" />
        <path d="M82 216C96 178 116 158 146 158C176 158 200 178 212 216" fill="#ffffff" opacity="0.76" />
        <path d="M204 208C216 170 238 150 268 150C298 150 320 172 330 208" fill="${safeAccent}" opacity="0.52" />
      `;
    case "mountain":
      return `
        <path d="M42 214L146 80L212 166L260 112L356 214Z" fill="#ffffff" opacity="0.86" />
        <path d="M146 80L174 116L130 116Z" fill="${safeAccent}" opacity="0.72" />
        <path d="M260 112L282 138L242 138Z" fill="${safeAccent}" opacity="0.52" />
      `;
    case "calendar":
      return `
        <rect x="92" y="76" width="216" height="154" rx="22" fill="#ffffff" opacity="0.88" />
        <path d="M92 122H308M144 62V96M256 62V96" stroke="${safeAccent}" stroke-width="12" stroke-linecap="round" opacity="0.72" />
        <rect x="126" y="148" width="44" height="34" rx="8" fill="${safeAccent}" opacity="0.72" />
        <rect x="188" y="148" width="44" height="34" rx="8" fill="#14342f" opacity="0.24" />
        <rect x="250" y="148" width="28" height="34" rx="8" fill="#14342f" opacity="0.16" />
      `;
    case "trail":
      return `
        <path d="M72 220C120 184 164 176 204 188C238 198 266 188 326 126" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" opacity="0.86" />
        <circle cx="102" cy="88" r="28" fill="${safeAccent}" opacity="0.72" />
        <path d="M232 116C250 90 278 76 318 72" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.48" />
      `;
    case "label":
      return `
        <rect x="96" y="76" width="208" height="136" rx="22" fill="#ffffff" opacity="0.88" />
        <path d="M128 116H268M128 152H236M128 188H208" stroke="#14342f" stroke-width="12" stroke-linecap="round" opacity="0.34" />
        <circle cx="278" cy="184" r="26" fill="${safeAccent}" opacity="0.76" />
      `;
    case "spark":
      return `
        <circle cx="190" cy="140" r="48" fill="#ffffff" opacity="0.92" />
        <circle cx="190" cy="140" r="24" fill="${safeAccent}" opacity="0.88" />
        <path d="M190 56V92M190 188V224M106 140H142M238 140H274M130 80L156 106M224 174L250 200M130 200L156 174M224 106L250 80" stroke="#ffffff" stroke-width="10" stroke-linecap="round" opacity="0.72" />
      `;
    case "leaf":
      return `
        <path d="M206 196C206 132 242 92 314 78C310 148 274 196 206 196Z" fill="#ffffff" opacity="0.86" />
        <path d="M170 182C170 124 142 92 84 76C88 138 116 182 170 182Z" fill="${safeAccent}" opacity="0.78" />
        <path d="M202 204C198 166 216 130 244 96" stroke="#0b3b35" stroke-width="8" stroke-linecap="round" opacity="0.28" />
      `;
    case "recovery":
      return `
        <path d="M104 176C124 126 160 100 206 100C252 100 286 126 304 176" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.88" />
        <path d="M142 190C158 164 180 150 206 150C232 150 254 164 270 190" fill="none" stroke="${safeAccent}" stroke-width="14" stroke-linecap="round" opacity="0.82" />
        <circle cx="206" cy="102" r="28" fill="#ffffff" opacity="0.7" />
      `;
    case "wave":
      return `
        <path d="M48 166C82 138 116 138 150 166C184 194 218 194 252 166C286 138 320 138 354 166" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" opacity="0.86" />
        <path d="M68 210C102 188 136 188 170 210C204 232 238 232 272 210C306 188 330 188 356 206" fill="none" stroke="${safeAccent}" stroke-width="12" stroke-linecap="round" opacity="0.72" />
      `;
    case "camera":
      return `
        <rect x="96" y="100" width="208" height="118" rx="24" fill="#ffffff" opacity="0.86" />
        <path d="M138 100L154 72H226L242 100" fill="#ffffff" opacity="0.86" />
        <circle cx="202" cy="158" r="38" fill="${safeAccent}" opacity="0.78" />
        <circle cx="202" cy="158" r="18" fill="#ffffff" opacity="0.82" />
      `;
    case "bar":
      return `
        <rect x="78" y="104" width="244" height="86" rx="24" fill="#ffffff" opacity="0.88" />
        <path d="M126 104L104 190M178 104L156 190M230 104L208 190M282 104L260 190" stroke="${safeAccent}" stroke-width="10" opacity="0.38" />
        <path d="M118 146H276" stroke="#14342f" stroke-width="12" stroke-linecap="round" opacity="0.24" />
      `;
    case "pod":
      return `
        <path d="M104 174C114 116 150 82 204 82C258 82 294 116 304 174C280 206 246 222 204 222C162 222 128 206 104 174Z" fill="#ffffff" opacity="0.86" />
        <path d="M126 168H282" stroke="${safeAccent}" stroke-width="12" stroke-linecap="round" opacity="0.76" />
        <circle cx="204" cy="132" r="30" fill="${safeAccent}" opacity="0.42" />
      `;
    case "droplet":
      return `
        <path d="M204 68C240 114 262 144 262 176C262 212 236 236 204 236C172 236 146 212 146 176C146 144 168 114 204 68Z" fill="#ffffff" opacity="0.88" />
        <circle cx="270" cy="112" r="24" fill="${safeAccent}" opacity="0.72" />
      `;
    case "ticket":
      return `
        <path d="M86 118C106 118 122 102 122 82H314V118C294 118 278 134 278 154C278 174 294 190 314 190V226H122C122 206 106 190 86 190Z" fill="#ffffff" opacity="0.88" />
        <path d="M180 100V208" stroke="${safeAccent}" stroke-width="10" stroke-linecap="round" stroke-dasharray="8 14" opacity="0.7" />
      `;
    case "cart":
      return `
        <path d="M96 92H130L154 180H282L310 116H150" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
        <circle cx="174" cy="214" r="18" fill="${safeAccent}" opacity="0.84" />
        <circle cx="266" cy="214" r="18" fill="${safeAccent}" opacity="0.84" />
      `;
    case "hero":
    default:
      return `
        <circle cx="126" cy="106" r="44" fill="#ffffff" opacity="0.86" />
        <path d="M206 196C206 132 242 92 314 78C310 148 274 196 206 196Z" fill="${safeAccent}" opacity="0.8" />
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
