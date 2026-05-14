import type { Env } from "../env";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const TOKEN_REFRESH_SKEW_MS = 60_000;
let cachedToken: CachedToken | null = null;
let inflightRequest: Promise<string> | null = null;

export function resetSalesforceTokenCache() {
  cachedToken = null;
  inflightRequest = null;
}

export async function resolveSalesforceAccessToken(env: Env): Promise<string> {
  const staticToken = env.SALESFORCE_API_TOKEN?.trim();
  const clientId = env.SALESFORCE_CLIENT_ID?.trim();
  const clientSecret = env.SALESFORCE_CLIENT_SECRET?.trim();

  if (clientId && clientSecret) {
    return resolveClientCredentialsToken(env, clientId, clientSecret);
  }

  if (staticToken) {
    return staticToken;
  }

  throw new Error(
    "Salesforce auth requires either SALESFORCE_CLIENT_ID/SECRET or SALESFORCE_API_TOKEN."
  );
}

async function resolveClientCredentialsToken(
  env: Env,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + TOKEN_REFRESH_SKEW_MS) {
    return cachedToken.accessToken;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = fetchClientCredentialsToken(env, clientId, clientSecret)
    .then((token) => {
      cachedToken = token;
      return token.accessToken;
    })
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
}

async function fetchClientCredentialsToken(
  env: Env,
  clientId: string,
  clientSecret: string
): Promise<CachedToken> {
  const baseUrl = env.SALESFORCE_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("SALESFORCE_API_BASE_URL is required for OAuth token exchange.");
  }

  const tokenUrl = new URL("/services/oauth2/token", baseUrl);
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `Salesforce OAuth token request failed: ${response.status} ${errorText}`
    );
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    issued_at?: string;
  };

  if (!payload.access_token) {
    throw new Error("Salesforce OAuth response missing access_token.");
  }

  const expiresInMs =
    typeof payload.expires_in === "number" && payload.expires_in > 0
      ? payload.expires_in * 1000
      : 30 * 60 * 1000;

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + expiresInMs
  };
}
