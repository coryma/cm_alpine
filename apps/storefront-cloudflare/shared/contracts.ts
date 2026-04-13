export interface Phase {
  id: string;
  title: string;
  window: string;
  goal: string;
  deliverables: string[];
  exitCriteria: string;
}

export interface SurfaceMapping {
  name: string;
  currentSource: string;
  targetEndpoint: string;
  notes: string;
}

export interface RiskItem {
  title: string;
  impact: string;
  mitigation: string;
}

export interface EnvChecklistItem {
  name: string;
  required: boolean;
  purpose: string;
}

export interface RoadmapResponse {
  project: {
    name: string;
    generatedOn: string;
    currentPlatform: string;
    targetPlatform: string;
    migrationPrinciple: string;
    nextCheckpoint: string;
  };
  phases: Phase[];
  surfaces: SurfaceMapping[];
  risks: RiskItem[];
  envChecklist: EnvChecklistItem[];
}

export interface HealthResponse {
  ok: boolean;
  runtime: string;
  generatedAt: string;
  provider: string;
  salesforce: {
    baseUrlConfigured: boolean;
    tokenConfigured: boolean;
    apiVersion: string;
  };
}

export type ProductSortBy =
  | "featured"
  | "newest"
  | "priceAsc"
  | "priceDesc"
  | "nameAsc";

export interface NavLink {
  label: string;
  href: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface StorefrontShellContent {
  brandEyebrow: string;
  brandName: string;
  searchPlaceholder: string;
  categoryEyebrow: string;
  categoryTitle: string;
  categoryCtaLabel: string;
  footerBrand: string;
  footerLegal: string;
  navLinks: NavLink[];
  sideCategories: SideCategory[];
  footerLinks: FooterLink[];
}

export interface SideCategory {
  id: string;
  label: string;
  caption: string;
  icon: string;
}

export interface QuickLink {
  label: string;
  icon: string;
}

export interface HeroFeature {
  label: string;
  title: string;
  body: string;
  imageUrl: string;
  alt: string;
}

export interface HeroSecondary {
  title: string;
  caption: string;
  imageUrl: string;
  alt: string;
}

export interface HeroMembership {
  title: string;
  caption: string;
}

export interface EditorialBanner {
  title: string;
  caption: string;
  imageUrl: string;
  alt: string;
}

export interface PromoCardContent {
  title: string;
  body: string;
  ctaLabel: string;
}

export interface HomePageContent {
  heroCtaLabel: string;
  flashSaleTitle: string;
  flashSaleMetaLabel: string;
  flashSaleLinkLabel: string;
  flashSaleClaimTextTemplate: string;
  premiumTechnologyTitle: string;
  recommendedEyebrow: string;
  recommendedTitle: string;
  browseCatalogLabel: string;
  promoCard: PromoCardContent;
}

export interface ProductsPageContent {
  eyebrow: string;
  title: string;
  description: string;
  matchingLabel: string;
  emptyEyebrow: string;
  emptyTitle: string;
  emptyBody: string;
  viewProductLabel: string;
}

export interface ProductDetailPageContent {
  catalogLabel: string;
  requestButtonLabel: string;
  backButtonLabel: string;
  notesTitle: string;
  notFoundEyebrow: string;
  notFoundTitle: string;
}

export interface RequestPageFieldLabels {
  fullName: string;
  email: string;
  company: string;
  interest: string;
  message: string;
}

export interface RequestPageContent {
  eyebrow: string;
  title: string;
  description: string;
  panelEyebrow: string;
  panelTitle: string;
  panelBody: string;
  checklist: string[];
  validationMessage: string;
  submitErrorMessage: string;
  submitIdleLabel: string;
  submitBusyLabel: string;
  browseProductsLabel: string;
  defaultInterest: string;
  mockAnonymousName: string;
  mockSuccessMessageTemplate: string;
  fieldLabels: RequestPageFieldLabels;
}

export interface CommonPageContent {
  loadingLabel: string;
  bootstrapErrorMessage: string;
  routeErrorMessage: string;
  salesforceRequestSuccessMessage: string;
  productDescriptionFallback: string;
  productLongDescriptionFallback: string;
}

export interface QuizIntroPointContent {
  title: string;
  body: string;
}

export interface QuizQuestionOptionContent {
  value: string;
  title: string;
  note: string;
  bundleWord: string;
  summaryLead: string;
}

export interface QuizQuestionContent {
  key: string;
  index: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  options: QuizQuestionOptionContent[];
}

export interface QuizPageContent {
  brand: string;
  title: string;
  introStatusLabel: string;
  questionProgressTemplate: string;
  completedLabel: string;
  introImageAlt: string;
  introEyebrow: string;
  introTitle: string;
  introBody: string;
  introPoints: QuizIntroPointContent[];
  resultEyebrow: string;
  insightsAriaLabel: string;
  recommendationSectionEyebrow: string;
  recommendationSectionTitle: string;
  viewAllProductsLabel: string;
  viewProductLabel: string;
  emptyTitle: string;
  emptyBody: string;
  introFooterHint: string;
  questionFooterHint: string;
  resultFooterHint: string;
  startQuizLabel: string;
  previousQuestionLabel: string;
  nextQuestionLabel: string;
  viewRecommendationLabel: string;
  submitRequestLabel: string;
  browseProductsLabel: string;
  viewMonitorLabel: string;
  restartLabel: string;
  loadingEyebrow: string;
  loadingTitle: string;
  loadingBody: string;
  catalogEmptyMessage: string;
  catalogErrorMessage: string;
  validationSelectMessage: string;
  validationRetryMessage: string;
  bundleNameTemplate: string;
  summaryTemplate: string;
  defaultRoleLabel: string;
  defaultReason: string;
  fallbackIconLabel: string;
  roleLabels: Record<string, string>;
  reasonCopy: Record<string, string>;
  questions: QuizQuestionContent[];
}

export interface QuizMonitorPageContent {
  eyebrow: string;
  title: string;
  description: string;
  refreshIdleLabel: string;
  refreshBusyLabel: string;
  totalIconsLabel: string;
  totalSessionsLabel: string;
  autoRefreshValue: string;
  autoRefreshLabel: string;
  loadingLabel: string;
  emptyLabel: string;
  incompleteResultLabel: string;
  backToQuizLabel: string;
  anonymousLabel: string;
  completedStepFallbackLabel: string;
  optionAltFallback: string;
  completedSessionLabel: string;
  sessionProgressTemplate: string;
  stepTitleTemplate: string;
  loadErrorMessage: string;
}

export interface StorefrontPageCopy {
  common: CommonPageContent;
  home: HomePageContent;
  products: ProductsPageContent;
  productDetail: ProductDetailPageContent;
  request: RequestPageContent;
  quiz: QuizPageContent;
  quizMonitor: QuizMonitorPageContent;
}

export interface StorefrontConfigResponse {
  shell: StorefrontShellContent;
  pages: StorefrontPageCopy;
}

export interface StorefrontProduct {
  id: string;
  slug: string;
  categoryId: string;
  categoryLabel: string;
  label: string;
  name: string;
  kicker: string;
  priceLabel: string;
  originalPriceLabel?: string;
  saleBadge?: string;
  claimedPercent?: number;
  description: string;
  longDescription: string;
  highlights: string[];
  specs: Array<{
    label: string;
    value: string;
  }>;
  imageUrl: string;
  imageAlt: string;
}

export interface HomeResponse {
  navLinks: NavLink[];
  sideCategories: SideCategory[];
  quickLinks: QuickLink[];
  footerLinks: FooterLink[];
  heroFeature: HeroFeature;
  heroSecondary: HeroSecondary;
  heroMembership: HeroMembership;
  editorialBanner: EditorialBanner;
  flashSale: StorefrontProduct[];
  premiumTechnology: StorefrontProduct[];
  recommended: StorefrontProduct[];
}

export interface ProductsResponse {
  items: StorefrontProduct[];
  total: number;
  category: string;
  q: string;
  sortBy: ProductSortBy;
  limitSize?: number;
  sideCategories: SideCategory[];
}

export interface RequestPayload {
  fullName: string;
  email: string;
  company: string;
  interest: string;
  message: string;
}

export interface RequestResponse {
  ok: boolean;
  message: string;
  reference: string;
  mockMode: boolean;
}

export interface QuizProgressPayload {
  sessionKey: string;
  displayLabel: string;
  stepNumber: number;
  stepKey: string;
  optionKey: string;
  optionLabel: string;
  iconKey: string;
  completedSteps: number;
  isComplete: boolean;
  bundleName: string;
}

export interface QuizProgressResponse {
  sessionId?: string;
  completedSteps: number;
  success: boolean;
}

export interface QuizSessionStep {
  stepNumber: number;
  stepKey: string;
  optionKey: string;
  optionLabel: string;
  iconKey: string;
  occurredAt?: string;
}

export interface QuizSession {
  id?: string;
  sessionKey: string;
  displayLabel: string;
  completedSteps: number;
  isComplete: boolean;
  bundleName: string;
  lastEventAt?: string;
  steps: QuizSessionStep[];
}

export interface StorefrontContentDocument {
  shell: StorefrontShellContent;
  pages: StorefrontPageCopy;
  homeSections: {
    quickLinks: QuickLink[];
    heroFeature: HeroFeature;
    heroSecondary: HeroSecondary;
    heroMembership: HeroMembership;
    editorialBanner: EditorialBanner;
    flashSaleIds: string[];
    premiumTechnologyIds: string[];
    recommendedIds: string[];
  };
  products: StorefrontProduct[];
}
