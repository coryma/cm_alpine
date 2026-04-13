import { ROADMAP_RESPONSE } from "../shared/roadmap";
import type {
  HealthResponse,
  ProductSortBy,
  QuizProgressPayload,
  RequestPayload
} from "../shared/contracts";
import type { Env } from "./env";
import { createStorefrontProvider, readProviderName } from "./providers";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const provider = createStorefrontProvider(env);

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }

      const payload: HealthResponse = {
        ok: true,
        runtime: "cloudflare-workers",
        generatedAt: new Date().toISOString(),
        provider: readProviderName(env.STOREFRONT_PROVIDER),
        salesforce: {
          baseUrlConfigured: Boolean(env.SALESFORCE_API_BASE_URL),
          tokenConfigured: Boolean(env.SALESFORCE_API_TOKEN),
          apiVersion: env.SALESFORCE_API_VERSION || "v66.0"
        }
      };

      return json(payload, 200, {
        "Cache-Control": "no-store"
      });
    }

    if (url.pathname === "/api/roadmap") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }

      return json(ROADMAP_RESPONSE, 200, {
        "Cache-Control": `public, max-age=${readTtl(env.EDGE_CACHE_TTL_SECONDS)}`
      });
    }

    if (url.pathname === "/api/media") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }

      return proxyRemoteImage(url, env);
    }

    if (url.pathname === "/api/config") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }

      try {
        return json(await provider.getConfig(), 200, {
          "Cache-Control": `public, max-age=${readTtl(env.EDGE_CACHE_TTL_SECONDS)}`
        });
      } catch (error) {
        return handleProviderError(error);
      }
    }

    if (url.pathname === "/api/home") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }

      try {
        return json(await provider.getHome(), 200, {
          "Cache-Control": `public, max-age=${readTtl(env.EDGE_CACHE_TTL_SECONDS)}`
        });
      } catch (error) {
        return handleProviderError(error);
      }
    }

    if (url.pathname === "/api/products") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }

      try {
        return json(
          await provider.listProducts({
            category: url.searchParams.get("category") || "all",
            q: url.searchParams.get("q") || "",
            sortBy: readSortBy(url.searchParams.get("sortBy")),
            limitSize: readLimit(url.searchParams.get("limitSize"))
          }),
          200,
          {
            "Cache-Control": `public, max-age=${readTtl(env.EDGE_CACHE_TTL_SECONDS)}`
          }
        );
      } catch (error) {
        return handleProviderError(error);
      }
    }

    if (url.pathname.startsWith("/api/products/")) {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }

      const slug = decodeURIComponent(url.pathname.replace("/api/products/", "").trim());
      let product;

      try {
        product = await provider.getProductDetail(slug);
      } catch (error) {
        return handleProviderError(error);
      }

      if (!product) {
        return json(
          {
            error: "Not Found",
            message: `No product found for slug "${slug}".`
          },
          404
        );
      }

      return json(product, 200, {
        "Cache-Control": `public, max-age=${readTtl(env.EDGE_CACHE_TTL_SECONDS)}`
      });
    }

    if (url.pathname === "/api/request") {
      if (request.method !== "POST") {
        return methodNotAllowed("POST");
      }

      let payload: RequestPayload;

      try {
        payload = (await request.json()) as RequestPayload;
      } catch {
        return json(
          {
            error: "Bad Request",
            message: "Request payload must be valid JSON."
          },
          400
        );
      }

      if (!payload.fullName?.trim() || !payload.email?.trim()) {
        return json(
          {
            error: "Bad Request",
            message: "fullName and email are required."
          },
          400
        );
      }

      try {
        return json(await provider.submitRequest(payload), 200, {
          "Cache-Control": "no-store"
        });
      } catch (error) {
        return handleProviderError(error);
      }
    }

    if (url.pathname === "/api/quiz/progress") {
      if (request.method !== "POST") {
        return methodNotAllowed("POST");
      }

      let payload: QuizProgressPayload;

      try {
        payload = (await request.json()) as QuizProgressPayload;
      } catch {
        return json(
          {
            error: "Bad Request",
            message: "Quiz progress payload must be valid JSON."
          },
          400
        );
      }

      if (!payload.sessionKey?.trim() || !payload.stepKey?.trim() || !payload.optionKey?.trim()) {
        return json(
          {
            error: "Bad Request",
            message: "sessionKey, stepKey, and optionKey are required."
          },
          400
        );
      }

      try {
        return json(await provider.recordQuizProgress(payload), 200, {
          "Cache-Control": "no-store"
        });
      } catch (error) {
        return handleProviderError(error);
      }
    }

    if (url.pathname === "/api/quiz/sessions") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }

      try {
        return json(
          await provider.getQuizSessions(readLimit(url.searchParams.get("limitSize")) || 50),
          200,
          {
            "Cache-Control": "no-store"
          }
        );
      } catch (error) {
        return handleProviderError(error);
      }
    }

    if (isSpaRouteRequest(request, url)) {
      const indexUrl = new URL("/index.html", url);
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    }

    return env.ASSETS.fetch(request);
  }
};

function methodNotAllowed(allow: string): Response {
  return json(
    {
      error: "Method Not Allowed"
    },
    405,
    {
      Allow: allow
    }
  );
}

function readTtl(value?: string): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
}

function readLimit(value: string | null): number | undefined {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function readSortBy(value: string | null): ProductSortBy | undefined {
  switch (value) {
    case "newest":
    case "priceAsc":
    case "priceDesc":
    case "nameAsc":
    case "featured":
      return value;
    default:
      return undefined;
  }
}

function isSpaRouteRequest(request: Request, url: URL): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  if (url.pathname.startsWith("/api/")) {
    return false;
  }

  return !url.pathname.includes(".");
}

function handleProviderError(error: unknown): Response {
  const message =
    error instanceof Error ? error.message : "Storefront provider failed to respond.";
  const status = message.includes("not wired yet") ? 501 : 500;

  return json(
    {
      error: status === 501 ? "Not Implemented" : "Internal Server Error",
      message
    },
    status,
    {
      "Cache-Control": "no-store"
    }
  );
}

function json(payload: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

async function proxyRemoteImage(url: URL, env: Env): Promise<Response> {
  const source = url.searchParams.get("src")?.trim();

  if (!source) {
    return json(
      {
        error: "Bad Request",
        message: "src query parameter is required."
      },
      400,
      {
        "Cache-Control": "no-store"
      }
    );
  }

  let remoteUrl: URL;

  try {
    remoteUrl = new URL(source);
  } catch {
    return json(
      {
        error: "Bad Request",
        message: "src must be a valid absolute URL."
      },
      400,
      {
        "Cache-Control": "no-store"
      }
    );
  }

  if (!isAllowedRemoteImageUrl(remoteUrl)) {
    return json(
      {
        error: "Forbidden",
        message: "Unsupported remote image host."
      },
      403,
      {
        "Cache-Control": "no-store"
      }
    );
  }

  const headers = new Headers({
    Accept: "image/*"
  });
  const salesforceToken = readSalesforceMediaToken(remoteUrl, env);

  if (salesforceToken) {
    headers.set("Authorization", `Bearer ${salesforceToken}`);
  }

  const upstream = await fetch(remoteUrl.toString(), {
    headers
  });

  if (!upstream.ok) {
    return new Response("Image origin failed.", {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }

  const contentType = upstream.headers.get("Content-Type") || "application/octet-stream";

  if (!contentType.toLowerCase().startsWith("image/")) {
    return new Response("Unsupported media type.", {
      status: 415,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("Cache-Control", `public, max-age=${readTtl(env.EDGE_CACHE_TTL_SECONDS)}`);

  const etag = upstream.headers.get("ETag");
  if (etag) {
    responseHeaders.set("ETag", etag);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: responseHeaders
  });
}

function isAllowedRemoteImageUrl(url: URL): boolean {
  if (!["http:", "https:"].includes(url.protocol)) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  const exactHosts = new Set(["lh3.googleusercontent.com", "s3.amazonaws.com"]);

  if (exactHosts.has(hostname)) {
    return true;
  }

  return hostname.endsWith(".amazonaws.com") || isSalesforceHostname(hostname);
}

function readSalesforceMediaToken(url: URL, env: Env): string | null {
  const token = env.SALESFORCE_API_TOKEN?.trim();

  if (!token || !isSalesforceHostname(url.hostname)) {
    return null;
  }

  return token;
}

function isSalesforceHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return [
    ".salesforce.com",
    ".force.com",
    ".site.com",
    ".documentforce.com",
    ".salesforce-sites.com"
  ].some((suffix) => normalized.endsWith(suffix));
}
