const SESSION_STORAGE_KEY = "health-lifestyle-quiz-session";

export interface QuizSessionIdentity {
  sessionKey: string;
  displayLabel: string;
}

export function ensureQuizSessionIdentity(): QuizSessionIdentity {
  const storedIdentity = readStoredIdentity();
  if (storedIdentity) {
    return storedIdentity;
  }

  return resetQuizSessionIdentity();
}

export function resetQuizSessionIdentity(): QuizSessionIdentity {
  const identity = buildSessionIdentity();
  storeIdentity(identity);
  return identity;
}

function readStoredIdentity(): QuizSessionIdentity | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as QuizSessionIdentity;
    if (!normalizeString(parsedValue?.sessionKey) || !normalizeString(parsedValue?.displayLabel)) {
      return null;
    }

    return {
      sessionKey: parsedValue.sessionKey,
      displayLabel: parsedValue.displayLabel
    };
  } catch {
    return null;
  }
}

function storeIdentity(identity: QuizSessionIdentity) {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(identity));
}

function buildSessionIdentity(): QuizSessionIdentity {
  const sessionKey = generateSessionKey();
  return {
    sessionKey,
    displayLabel: sessionKey.slice(0, 8)
  };
}

function generateSessionKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
