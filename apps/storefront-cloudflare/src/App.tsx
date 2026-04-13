import { startTransition, useEffect, useEffectEvent, useMemo, useState } from "react";
import type {
  HomeResponse,
  ProductsResponse,
  StorefrontConfigResponse,
  StorefrontProduct
} from "../shared/contracts";
import {
  fetchConfig,
  fetchHome,
  fetchProductDetail,
  fetchProducts
} from "./lib/api";
import { StorefrontShell } from "./components/StorefrontShell";
import { HomePage } from "./pages/HomePage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ProductsPage } from "./pages/ProductsPage";
import { QuizPage } from "./pages/QuizPage";
import { QuizMonitorPage } from "./pages/QuizMonitorPage";
import { RequestPage } from "./pages/RequestPage";

type Route =
  | { kind: "home" }
  | { kind: "products"; category: string; q: string }
  | { kind: "product"; slug: string }
  | { kind: "quiz" }
  | { kind: "quiz-monitor" }
  | { kind: "request" };

const EMPTY_CONFIG: StorefrontConfigResponse = {
  shell: {
    brandEyebrow: "",
    brandName: "",
    searchPlaceholder: "",
    categoryEyebrow: "",
    categoryTitle: "",
    categoryCtaLabel: "",
    footerBrand: "",
    footerLegal: "",
    navLinks: [],
    sideCategories: [],
    footerLinks: []
  },
  pages: {
    home: {
      heroCtaLabel: "",
      flashSaleTitle: "",
      flashSaleMetaLabel: "",
      flashSaleLinkLabel: "",
      premiumTechnologyTitle: "",
      recommendedEyebrow: "",
      recommendedTitle: "",
      browseCatalogLabel: "",
      promoCard: {
        title: "",
        body: "",
        ctaLabel: ""
      }
    },
    products: {
      eyebrow: "",
      title: "",
      description: "",
      matchingLabel: "",
      emptyEyebrow: "",
      emptyTitle: "",
      emptyBody: "",
      viewProductLabel: ""
    },
    productDetail: {
      catalogLabel: "",
      requestButtonLabel: "",
      backButtonLabel: "",
      notesTitle: "",
      notFoundEyebrow: "",
      notFoundTitle: ""
    },
    request: {
      eyebrow: "",
      title: "",
      description: "",
      panelEyebrow: "",
      panelTitle: "",
      panelBody: "",
      checklist: [],
      validationMessage: "",
      submitIdleLabel: "",
      submitBusyLabel: "",
      browseProductsLabel: "",
      fieldLabels: {
        fullName: "",
        email: "",
        company: "",
        interest: "",
        message: ""
      }
    }
  }
};

function readRoute(): Route {
  if (typeof window === "undefined") {
    return { kind: "home" };
  }

  const { pathname, search } = window.location;
  const searchParams = new URLSearchParams(search);

  if (pathname === "/products") {
    return {
      kind: "products",
      category: searchParams.get("category") || "all",
      q: searchParams.get("q") || ""
    };
  }

  if (pathname.startsWith("/products/")) {
    return {
      kind: "product",
      slug: decodeURIComponent(pathname.replace("/products/", "").trim())
    };
  }

  if (pathname === "/request") {
    return { kind: "request" };
  }

  if (pathname === "/quiz") {
    return { kind: "quiz" };
  }

  if (pathname === "/quiz-monitor") {
    return { kind: "quiz-monitor" };
  }

  return { kind: "home" };
}

function App() {
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [searchInput, setSearchInput] = useState(
    route.kind === "products" ? route.q : ""
  );
  const [config, setConfig] = useState<StorefrontConfigResponse | null>(null);
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [productsResponse, setProductsResponse] = useState<ProductsResponse | null>(null);
  const [productDetail, setProductDetail] = useState<StorefrontProduct | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const nextSearch = route.kind === "products" ? route.q : "";
    setSearchInput(nextSearch);
  }, [route]);

  const activeCategoryId = useMemo(() => {
    if (route.kind === "products") {
      return route.category;
    }

    if (route.kind === "product") {
      return productDetail?.categoryId || "all";
    }

    return "all";
  }, [productDetail?.categoryId, route]);

  const navigate = useEffectEvent((href: string) => {
    const nextUrl = new URL(href, window.location.origin);
    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;

    if (nextPath === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      if (nextUrl.hash) {
        document.querySelector(nextUrl.hash)?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    window.history.pushState({}, "", nextPath);

    startTransition(() => {
      setRoute(readRoute());
      setErrorMessage("");
    });

    window.scrollTo({ top: 0, behavior: "auto" });

    if (nextUrl.hash) {
      window.setTimeout(() => {
        document.querySelector(nextUrl.hash)?.scrollIntoView({ behavior: "smooth" });
      }, 60);
    }
  });

  useEffect(() => {
    const handlePopState = () => {
      startTransition(() => {
        setRoute(readRoute());
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrapStorefront() {
      const [configPayload, homePayload] = await Promise.all([
        fetchConfig(),
        fetchHome()
      ]);

      if (!active) {
        return;
      }

      startTransition(() => {
        setConfig(configPayload);
        setHome(homePayload);
        setIsBootstrapping(false);
      });
    }

    bootstrapStorefront().catch((error) => {
      if (!active) {
        return;
      }

      startTransition(() => {
        setErrorMessage(
          error instanceof Error ? error.message : "站點內容暫時無法載入。"
        );
        setIsBootstrapping(false);
      });
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRoute() {
      setIsLoading(true);

      try {
        if (route.kind === "products") {
          const payload = await fetchProducts({
            category: route.category,
            q: route.q
          });

          if (!active) {
            return;
          }

          startTransition(() => {
            setProductsResponse(payload);
            setProductDetail(null);
            setErrorMessage("");
            setIsLoading(false);
          });
          return;
        }

        if (route.kind === "product") {
          const payload = await fetchProductDetail(route.slug);

          if (!active) {
            return;
          }

          startTransition(() => {
            setProductDetail(payload);
            setProductsResponse(null);
            setErrorMessage(payload ? "" : "找不到這個商品。");
            setIsLoading(false);
          });
          return;
        }

        startTransition(() => {
          setProductsResponse(null);
          setProductDetail(null);
          setErrorMessage("");
          setIsLoading(false);
        });
      } catch (error) {
        if (!active) {
          return;
        }

        startTransition(() => {
          setErrorMessage(
            error instanceof Error ? error.message : "頁面資料暫時無法載入。"
          );
          setIsLoading(false);
        });
      }
    }

    loadRoute();

    return () => {
      active = false;
    };
  }, [route]);

  const handleSearchSubmit = useEffectEvent(() => {
    const searchParams = new URLSearchParams();
    const category =
      route.kind === "products" ? route.category : activeCategoryId || "all";

    if (category && category !== "all") {
      searchParams.set("category", category);
    }

    if (searchInput.trim()) {
      searchParams.set("q", searchInput.trim());
    }

    const pathname = searchParams.toString()
      ? `/products?${searchParams.toString()}`
      : "/products";

    navigate(pathname);
  });

  const handleCategorySelect = useEffectEvent((categoryId: string) => {
    const searchParams = new URLSearchParams();

    if (categoryId !== "all") {
      searchParams.set("category", categoryId);
    }

    if (searchInput.trim()) {
      searchParams.set("q", searchInput.trim());
    }

    const pathname = searchParams.toString()
      ? `/products?${searchParams.toString()}`
      : "/products";

    navigate(pathname);
  });

  const storefrontConfig = config || EMPTY_CONFIG;

  return (
    <StorefrontShell
      activeCategoryId={activeCategoryId}
      onCategorySelect={handleCategorySelect}
      onNavigate={navigate}
      onSearchChange={setSearchInput}
      onSearchSubmit={handleSearchSubmit}
      searchTerm={searchInput}
      shell={storefrontConfig.shell}
    >
      {errorMessage ? <div className="errorBanner">{errorMessage}</div> : null}

      {isBootstrapping || isLoading ? (
        <div className="loadingPanel">載入頁面中...</div>
      ) : null}

      {!isBootstrapping && !isLoading && route.kind === "home" && home ? (
        <HomePage
          home={home}
          onNavigate={navigate}
          page={storefrontConfig.pages.home}
        />
      ) : null}

      {!isBootstrapping && !isLoading && route.kind === "products" && productsResponse ? (
        <ProductsPage
          activeCategory={route.category}
          onCategoryChange={handleCategorySelect}
          onNavigate={navigate}
          page={storefrontConfig.pages.products}
          productsResponse={productsResponse}
        />
      ) : null}

      {!isBootstrapping && !isLoading && route.kind === "product" ? (
        <ProductDetailPage
          onNavigate={navigate}
          page={storefrontConfig.pages.productDetail}
          product={productDetail}
        />
      ) : null}

      {!isBootstrapping && !isLoading && route.kind === "request" ? (
        <RequestPage
          onNavigate={navigate}
          page={storefrontConfig.pages.request}
        />
      ) : null}

      {!isBootstrapping && !isLoading && route.kind === "quiz" ? (
        <QuizPage onNavigate={navigate} />
      ) : null}

      {!isBootstrapping && !isLoading && route.kind === "quiz-monitor" ? (
        <QuizMonitorPage onNavigate={navigate} />
      ) : null}
    </StorefrontShell>
  );
}

export default App;
