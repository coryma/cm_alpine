(function () {
  const SDK = window.SalesforceInteractions;

  if (!SDK || typeof SDK.initSitemap !== "function") {
    return;
  }

  const EVENT_NAME =
    window.ALPINE_STOREFRONT_CONFIG?.dataCloud?.eventName || "alpineStorefrontAction";
  const INIT_FLAG = "__alpineStorefrontDataCloudSitemapInstalled__";

  if (window[INIT_FLAG]) {
    return;
  }

  window[INIT_FLAG] = true;

  function getPathname() {
    return window.location.pathname || "/";
  }

  function getSearchParams() {
    return new URLSearchParams(window.location.search);
  }

  function getProductSlug() {
    const match = getPathname().match(/^\/products\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  function getCategoryId() {
    const categoryId = getSearchParams().get("category");
    return categoryId || undefined;
  }

  function appendInteractionFields(event, fields) {
    const interaction = event.interaction || {};

    event.interaction = {
      ...interaction,
      name: interaction.name || EVENT_NAME,
      ...fields
    };

    return event;
  }

  function buildPageViewConfig(name, routeKind, isMatch, getExtraFields) {
    return {
      name,
      interaction: {
        name: EVENT_NAME
      },
      isMatch,
      onActionEvent: (event) =>
        appendInteractionFields(event, {
          actionName: "pageView",
          routeKind,
          ...(typeof getExtraFields === "function" ? getExtraFields() : {})
        })
    };
  }

  const sitemapConfig = {
    global: {
      locale: "zh_TW",
      onActionEvent: (event) =>
        appendInteractionFields(event, {
          pagePath: getPathname()
        })
    },
    pageTypeDefault: {
      name: "unknown",
      interaction: {
        name: EVENT_NAME
      },
      onActionEvent: (event) =>
        appendInteractionFields(event, {
          actionName: "pageView",
          routeKind: "unknown"
        })
    },
    pageTypes: [
      buildPageViewConfig("home", "home", () => getPathname() === "/"),
      buildPageViewConfig(
        "products",
        "products",
        () => getPathname() === "/products",
        () => ({
          categoryId: getCategoryId()
        })
      ),
      buildPageViewConfig(
        "product-detail",
        "product",
        () => /^\/products\/[^/]+$/.test(getPathname()),
        () => ({
          productSlug: getProductSlug()
        })
      ),
      buildPageViewConfig("cart", "cart", () => getPathname() === "/cart"),
      buildPageViewConfig("request", "request", () => getPathname() === "/request"),
      buildPageViewConfig("quiz", "quiz", () => getPathname() === "/quiz"),
      buildPageViewConfig(
        "quiz-monitor",
        "quiz-monitor",
        () => getPathname() === "/quiz-monitor"
      )
    ]
  };

  function installSpaReinit() {
    if (window.__alpineStorefrontDataCloudSpaHookInstalled__) {
      return;
    }

    window.__alpineStorefrontDataCloudSpaHookInstalled__ = true;

    let currentUrl = window.location.href;

    function reinitIfUrlChanged() {
      if (window.location.href === currentUrl) {
        return;
      }

      currentUrl = window.location.href;
      if (typeof SDK.reinit === "function") {
        SDK.reinit();
      }
    }

    function wrapHistoryMethod(methodName) {
      const original = window.history[methodName];

      if (typeof original !== "function") {
        return;
      }

      window.history[methodName] = function () {
        const result = original.apply(this, arguments);
        window.setTimeout(reinitIfUrlChanged, 0);
        return result;
      };
    }

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");
    window.addEventListener("popstate", reinitIfUrlChanged);
  }

  function installCustomActionListener() {
    if (window.__alpineStorefrontDataCloudActionHookInstalled__) {
      return;
    }

    window.__alpineStorefrontDataCloudActionHookInstalled__ = true;

    window.addEventListener("alpine-storefront:data-cloud-action", function (event) {
      const detail = event.detail || {};

      SDK.sendEvent({
        interaction: {
          name: EVENT_NAME,
          category: "Engagement",
          pagePath: getPathname(),
          sourcePage: getPathname(),
          ...detail
        }
      });
    });
  }

  installSpaReinit();
  installCustomActionListener();
  SDK.initSitemap(sitemapConfig);
})();
