import type {
  QuizProgressPayload,
  RequestPayload
} from "../../shared/contracts";
import {
  createMockRequestResponse,
  getHomeResponse,
  getProductDetail,
  getStorefrontConfig,
  listProducts
} from "../../shared/storefront";
import type {
  ProductListQuery,
  StorefrontProvider
} from "./contracts";

export class StaticJsonStorefrontProvider implements StorefrontProvider {
  readonly name = "static-json" as const;

  async getConfig() {
    return getStorefrontConfig();
  }

  async getHome() {
    return getHomeResponse();
  }

  async listProducts(query: ProductListQuery = {}) {
    return listProducts(query);
  }

  async getProductDetail(slug: string) {
    return getProductDetail(slug);
  }

  async submitRequest(payload: RequestPayload) {
    return createMockRequestResponse(payload);
  }

  async recordQuizProgress(payload: QuizProgressPayload) {
    return {
      sessionId: payload.sessionKey,
      completedSteps: payload.completedSteps || payload.stepNumber || 0,
      success: true
    };
  }

  async getQuizSessions() {
    return [];
  }
}
