import type {
  HomeResponse,
  ProductSortBy,
  ProductsResponse,
  QuizProgressPayload,
  QuizProgressResponse,
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
  submitRequest(payload: RequestPayload): Promise<RequestResponse>;
  recordQuizProgress(payload: QuizProgressPayload): Promise<QuizProgressResponse>;
  getQuizSessions(limitSize?: number): Promise<QuizSession[]>;
}
