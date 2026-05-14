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
import {
  createMockCheckoutResponse,
  createMockRequestResponse,
  getStorefrontConfig,
  getHomeResponse,
  getProductDetail,
  listProducts
} from "../../shared/storefront";

export async function fetchConfig(): Promise<StorefrontConfigResponse> {
  try {
    return await fetchJson<StorefrontConfigResponse>("/api/config");
  } catch {
    return getStorefrontConfig();
  }
}

export async function fetchHome(): Promise<HomeResponse> {
  try {
    return await fetchJson<HomeResponse>("/api/home");
  } catch {
    return getHomeResponse();
  }
}

export async function fetchProducts(params: {
  category?: string;
  q?: string;
  sortBy?: ProductSortBy;
  limitSize?: number;
}): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams();

  if (params.category && params.category !== "all") {
    searchParams.set("category", params.category);
  }

  if (params.q?.trim()) {
    searchParams.set("q", params.q.trim());
  }

  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }

  if (params.limitSize && params.limitSize > 0) {
    searchParams.set("limitSize", String(params.limitSize));
  }

  const pathname = searchParams.toString()
    ? `/api/products?${searchParams.toString()}`
    : "/api/products";

  try {
    return await fetchJson<ProductsResponse>(pathname);
  } catch {
    return listProducts(params);
  }
}

export async function fetchProductDetail(
  slug: string
): Promise<StorefrontProduct | null> {
  try {
    return await fetchJson<StorefrontProduct>(
      `/api/products/${encodeURIComponent(slug)}`
    );
  } catch {
    return getProductDetail(slug);
  }
}

export async function submitRequest(
  payload: RequestPayload
): Promise<RequestResponse> {
  try {
    const response = await fetch("/api/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as RequestResponse;
  } catch {
    return createMockRequestResponse(payload);
  }
}

export async function submitCheckout(
  payload: CheckoutPayload
): Promise<CheckoutResponse> {
  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as CheckoutResponse;
  } catch {
    return createMockCheckoutResponse(payload);
  }
}

export async function submitQuizProgress(
  payload: QuizProgressPayload
): Promise<QuizProgressResponse> {
  try {
    const response = await fetch("/api/quiz/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as QuizProgressResponse;
  } catch {
    return {
      sessionId: payload.sessionKey,
      completedSteps: payload.completedSteps || payload.stepNumber,
      success: true
    };
  }
}

export async function submitQuizShare(
  payload: QuizSharePayload
): Promise<QuizShareResponse> {
  try {
    const response = await fetch("/api/quiz/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as QuizShareResponse;
  } catch {
    return {
      success: true,
      emailAddress: payload.emailAddress,
      accountId: null,
      contactId: null,
      accountCreated: false,
      sessionId: payload.sessionKey
    };
  }
}

export async function submitQuizIdentityBridgeMonitor(
  payload: QuizIdentityBridgeMonitorPayload
): Promise<QuizIdentityBridgeMonitorResponse> {
  try {
    const response = await fetch("/api/quiz/identity-bridge-monitor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      keepalive: true
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as QuizIdentityBridgeMonitorResponse;
  } catch {
    return {
      success: true,
      sessionKey: payload.sessionKey
    };
  }
}

export async function submitQuizRecommendationCodeClick(
  payload: QuizRecommendationCodeClickPayload
): Promise<QuizRecommendationCodeClickResponse> {
  try {
    const response = await fetch("/api/quiz/recommendation-code-click", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      keepalive: true
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as QuizRecommendationCodeClickResponse;
  } catch {
    return {
      success: true,
      sessionId: payload.sessionKey
    };
  }
}

export async function fetchQuizSessions(limitSize = 50): Promise<QuizSession[]> {
  try {
    return await fetchJson<QuizSession[]>(
      `/api/quiz/sessions?limitSize=${encodeURIComponent(String(limitSize))}`
    );
  } catch {
    return [];
  }
}

async function fetchJson<T>(input: RequestInfo | URL): Promise<T> {
  const response = await fetch(input, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
