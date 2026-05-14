import type {
  CheckoutPayload,
  CheckoutResponse,
  HomeResponse,
  ProductSortBy,
  ProductsResponse,
  QuizIdentityBridgeMonitorPayload,
  QuizIdentityBridgeMonitorResponse,
  QuizRecommendationCodeClickPayload,
  QuizRecommendationCodeClickResponse,
  QuizProgressPayload,
  QuizProgressResponse,
  QuizSharePayload,
  QuizShareResponse,
  QuizSession,
  RequestPayload,
  RequestResponse,
  StorefrontConfigResponse,
  StorefrontProduct
} from "../../shared/contracts";

export type StorefrontProviderName = "static-json" | "salesforce";

export interface ProductListQuery {
  category?: string;
  q?: string;
  sortBy?: ProductSortBy;
  limitSize?: number;
}

export interface StorefrontProvider {
  readonly name: StorefrontProviderName;
  getConfig(): Promise<StorefrontConfigResponse>;
  getHome(): Promise<HomeResponse>;
  listProducts(query?: ProductListQuery): Promise<ProductsResponse>;
  getProductDetail(slug: string): Promise<StorefrontProduct | null>;
  submitCheckout(payload: CheckoutPayload): Promise<CheckoutResponse>;
  submitRequest(payload: RequestPayload): Promise<RequestResponse>;
  recordQuizProgress(payload: QuizProgressPayload): Promise<QuizProgressResponse>;
  sendQuizShare(payload: QuizSharePayload): Promise<QuizShareResponse>;
  recordIdentityBridgeMonitor(
    payload: QuizIdentityBridgeMonitorPayload
  ): Promise<QuizIdentityBridgeMonitorResponse>;
  markRecommendationCodeClick(
    payload: QuizRecommendationCodeClickPayload
  ): Promise<QuizRecommendationCodeClickResponse>;
  getQuizSessions(limitSize?: number): Promise<QuizSession[]>;
}
