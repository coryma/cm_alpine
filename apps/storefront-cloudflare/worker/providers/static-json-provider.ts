import type {
  CheckoutPayload,
  QuizIdentityBridgeMonitorPayload,
  QuizRecommendationCodeClickPayload,
  QuizProgressPayload,
  QuizSharePayload,
  RequestPayload
} from "../../shared/contracts";
import {
  createMockCheckoutResponse,
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

  async submitCheckout(payload: CheckoutPayload) {
    return createMockCheckoutResponse(payload);
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

  async sendQuizShare(payload: QuizSharePayload) {
    return {
      success: true,
      emailAddress: payload.emailAddress.trim(),
      accountId: "001000000000000AAA",
      contactId: "003000000000000AAA",
      accountCreated: false,
      sessionId: payload.sessionKey
    };
  }

  async recordIdentityBridgeMonitor(payload: QuizIdentityBridgeMonitorPayload) {
    return {
      success: true,
      sessionKey: payload.sessionKey
    };
  }

  async markRecommendationCodeClick(payload: QuizRecommendationCodeClickPayload) {
    return {
      success: true,
      sessionId: payload.sessionKey
    };
  }

  async getQuizSessions() {
    return [];
  }
}
