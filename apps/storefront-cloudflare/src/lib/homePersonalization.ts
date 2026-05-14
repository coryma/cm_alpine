import type { HomeResponse, StorefrontProduct } from "../../shared/contracts";
import { getStorefrontContentDocument } from "../../shared/storefront";

const HOME_HERO_PERSONALIZATION_KEY = "alpine-home-hero-personalization";

export interface HomeHeroPersonalization {
  heroVariantKey: string;
  bundleName: string;
  completedAt: string;
  products: HomePersonalizedProduct[];
}

export interface HomePersonalizedProduct
  extends Pick<
    StorefrontProduct,
    "id" | "slug" | "name" | "priceLabel" | "imageUrl" | "imageAlt" | "label"
  > {
  reason: string;
  roleLabel: string;
}

export function readHomeHeroPersonalization(): HomeHeroPersonalization | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(HOME_HERO_PERSONALIZATION_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<HomeHeroPersonalization>;
    if (
      typeof parsed?.heroVariantKey !== "string" ||
      typeof parsed?.bundleName !== "string" ||
      typeof parsed?.completedAt !== "string"
    ) {
      return null;
    }

    return {
      heroVariantKey: parsed.heroVariantKey,
      bundleName: parsed.bundleName,
      completedAt: parsed.completedAt,
      products: normalizeProducts(parsed.products)
    };
  } catch {
    return null;
  }
}

export function writeHomeHeroPersonalization(
  payload: Pick<HomeHeroPersonalization, "heroVariantKey" | "bundleName" | "products">
): HomeHeroPersonalization {
  const nextValue: HomeHeroPersonalization = {
    ...payload,
    completedAt: new Date().toISOString()
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(HOME_HERO_PERSONALIZATION_KEY, JSON.stringify(nextValue));
  }

  return nextValue;
}

export function applyHomeHeroPersonalization(
  home: HomeResponse,
  personalization: HomeHeroPersonalization | null
): HomeResponse {
  if (!personalization) {
    return home;
  }

  const variant =
    getStorefrontContentDocument().homeSections.quizHeroVariants?.[personalization.heroVariantKey];

  if (!variant) {
    return home;
  }

  return {
    ...home,
    heroFeature: {
      ...home.heroFeature,
      label: applyTemplate(variant.label, personalization),
      title: applyTemplate(variant.title, personalization),
      body: applyTemplate(variant.body, personalization),
      imageUrl: applyTemplate(variant.imageUrl, personalization),
      alt: applyTemplate(variant.alt, personalization)
    }
  };
}

function applyTemplate(
  template: string,
  values: Pick<HomeHeroPersonalization, "heroVariantKey" | "bundleName" | "completedAt">
) {
  const templateValues: Record<string, string> = {
    heroVariantKey: values.heroVariantKey,
    bundleName: values.bundleName,
    completedAt: values.completedAt
  };

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(templateValues[key] ?? ""));
}

function normalizeProducts(value: unknown): HomePersonalizedProduct[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isHomePersonalizedProduct);
}

function isHomePersonalizedProduct(value: unknown): value is HomePersonalizedProduct {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.priceLabel === "string" &&
    typeof candidate.imageUrl === "string" &&
    typeof candidate.imageAlt === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.reason === "string" &&
    typeof candidate.roleLabel === "string"
  );
}
