import type { StorefrontProduct } from "./contracts";

export const REAL_PRODUCT_IDS_BY_PERSONA: Record<string, string[]> = Object.freeze({
  discipline: ["6010060", "6010058", "6010059", "6010064"],
  mindful: ["6010065", "6010066", "6010063", "6010062"],
  social: ["6010061", "6010062", "6010063", "6010064"],
  efficiency: ["6010060", "6010058", "6010064", "6010066"],
  conscious: ["6010058", "6010059", "6010063", "6010065"]
});

export const REAL_HOME_FLASH_PRODUCT_IDS = Object.freeze([
  "6010060",
  "6010058",
  "6010064"
]);

export const REAL_HOME_RAIL_PRODUCT_IDS = Object.freeze([
  "6010065",
  "6010066",
  "6010059",
  "6010063"
]);

export const REAL_HOME_RECOMMENDED_PRODUCT_IDS = Object.freeze([
  "6010065",
  "6010066",
  "6010063",
  "6010064",
  "6010061",
  "6010062"
]);

export const REAL_STOREFRONT_PRODUCTS: readonly StorefrontProduct[] = Object.freeze([
  createRealProduct({
    id: "6010058",
    slug: "alpine-energy-during-eco-pod-green-tea",
    label: "Eco Pod",
    name: "Alpine Energy During Eco Pod, Green Tea",
    priceLabel: "US$345",
    imageFileName: "6010058-alpine-energy-during-eco-pod-green-tea.png",
    description:
      "一盒 Alpine Energy 運動中補給單份可堆肥 Eco Pods，綠茶口味。清爽茶韻專為長時間訓練與耐力活動中的穩定補水與補能而設計。",
    highlights: ["訓練中補給", "單份可堆肥包裝", "綠茶口味"],
    specs: [
      { label: "SKU", value: "6010058" },
      { label: "系列", value: "Alpine Energy" },
      { label: "使用時機", value: "訓練中" },
      { label: "規格", value: "Eco Pod 單盒" }
    ],
    tags: ["during", "eco pod", "pod", "green tea", "performance", "convenience"]
  }),
  createRealProduct({
    id: "6010059",
    slug: "alpine-energy-post-eco-pod-green-tea",
    label: "Eco Pod",
    name: "Alpine Energy Post Eco Pod, Green Tea",
    priceLabel: "US$345",
    imageFileName: "6010059-alpine-energy-post-eco-pod-green-tea.png",
    description:
      "一盒 Alpine Energy 運動後補給單份可堆肥 Eco Pods，綠茶口味。輕盈茶感搭配恢復導向配方，適合訓練後快速銜接日常節奏。",
    highlights: ["運動後恢復", "單份可堆肥包裝", "綠茶口味"],
    specs: [
      { label: "SKU", value: "6010059" },
      { label: "系列", value: "Alpine Energy" },
      { label: "使用時機", value: "運動後" },
      { label: "規格", value: "Eco Pod 單盒" }
    ],
    tags: ["post", "recovery", "eco pod", "pod", "green tea", "performance"]
  }),
  createRealProduct({
    id: "6010060",
    slug: "alpine-energy-pre-eco-pod-green-tea",
    label: "Eco Pod",
    name: "Alpine Energy Pre Eco Pod, Green Tea",
    priceLabel: "US$345",
    imageFileName: "6010060-alpine-energy-pre-eco-pod-green-tea.png",
    description:
      "一盒 Alpine Energy 運動前補給單份可堆肥 Eco Pods，綠茶口味。乾淨茶香與俐落能量感，適合訓練前喚醒狀態與專注力。",
    highlights: ["訓練前啟動", "單份可堆肥包裝", "綠茶口味"],
    specs: [
      { label: "SKU", value: "6010060" },
      { label: "系列", value: "Alpine Energy" },
      { label: "使用時機", value: "訓練前" },
      { label: "規格", value: "Eco Pod 單盒" }
    ],
    tags: ["pre", "eco pod", "pod", "green tea", "performance", "convenience"]
  }),
  createRealProduct({
    id: "6010061",
    slug: "gogoo-blueberry-non-caffeinated-1oz-6pack",
    label: "GoGoo",
    name: "GoGoo Blueberry Non-Caffeinated, 1oz - 6 pack",
    priceLabel: "US$330",
    imageFileName: "6010061-gogoo-blueberry-non-caffeinated-1oz-6pack.png",
    description:
      "Alpine Sport Energy GoGoo 藍莓無咖啡因能量膠，提供柔和果香與穩定耐力補給，適合晚間訓練或不想攝取咖啡因的使用者。",
    highlights: ["藍莓口味", "無咖啡因", "1oz 6 入"],
    specs: [
      { label: "SKU", value: "6010061" },
      { label: "系列", value: "Alpine Nutrition" },
      { label: "使用時機", value: "訓練中 / 長距離活動" },
      { label: "規格", value: "1oz - 6 pack" }
    ],
    tags: ["during", "gogoo", "blueberry", "taste", "performance", "convenience"]
  }),
  createRealProduct({
    id: "6010062",
    slug: "gogoo-chai-non-caffeinated-1oz-6pack",
    label: "GoGoo",
    name: "GoGoo Chai Non-Caffeinated, 1oz - 6 pack",
    priceLabel: "US$330",
    imageFileName: "6010062-gogoo-chai-non-caffeinated-1oz-6pack.png",
    description:
      "Alpine Sport Energy GoGoo 柴香無咖啡因能量膠，以溫暖香料風味帶來順口補給，適合長距離訓練與恢復日使用。",
    highlights: ["柴香口味", "無咖啡因", "1oz 6 入"],
    specs: [
      { label: "SKU", value: "6010062" },
      { label: "系列", value: "Alpine Nutrition" },
      { label: "使用時機", value: "長距離訓練 / 恢復日" },
      { label: "規格", value: "1oz - 6 pack" }
    ],
    tags: ["during", "gogoo", "chai", "taste", "performance", "social"]
  }),
  createRealProduct({
    id: "6010063",
    slug: "gobar-blueberry-vegan-2oz-6pack",
    label: "GoBar",
    name: "GoBar Blueberry Vegan, 2oz - 6 pack",
    priceLabel: "US$330",
    imageFileName: "6010063-gobar-blueberry-vegan-2oz-6pack.png",
    description:
      "Alpine 藍莓純素 GoBar 是一款即拿即走的植物蛋白機能棒。酸甜果香與紮實口感兼具，幫助你補足每日蛋白質攝取並延長飽足感。",
    highlights: ["Vegan 植物蛋白", "藍莓口味", "2oz 6 入"],
    specs: [
      { label: "SKU", value: "6010063" },
      { label: "系列", value: "Alpine Nutrition" },
      { label: "飲食偏好", value: "Vegan" },
      { label: "規格", value: "2oz - 6 pack" }
    ],
    tags: ["gobar", "bar", "protein", "vegan", "blueberry", "taste", "convenience"]
  }),
  createRealProduct({
    id: "6010064",
    slug: "gobar-chai-hi-protein-2oz-6pack",
    label: "GoBar",
    name: "GoBar Chai Hi Protein, 2oz - 6 pack",
    priceLabel: "US$345",
    imageFileName: "6010064-gobar-chai-hi-protein-2oz-6pack.png",
    description:
      "高蛋白柴香 GoBar 以溫暖辛香與紮實口感，帶來適合訓練前後的日常補給，是運動族群喜愛的蛋白能量棒。",
    highlights: ["高蛋白配方", "柴香口味", "2oz 6 入"],
    specs: [
      { label: "SKU", value: "6010064" },
      { label: "系列", value: "Alpine Nutrition" },
      { label: "使用時機", value: "訓練前後 / 日常補給" },
      { label: "規格", value: "2oz - 6 pack" }
    ],
    tags: ["gobar", "bar", "protein", "chai", "taste", "performance", "convenience"]
  }),
  createRealProduct({
    id: "6010065",
    slug: "gobrew-vanilla-oat-latte-6oz-can-6pack",
    label: "GoBrew",
    name: "GoBrew Vanilla Oat Latte, 6 oz can - 6 pack",
    priceLabel: "US$420",
    imageFileName: "6010065-gobrew-vanilla-oat-latte-6oz-can-6pack.png",
    description:
      "Alpine Blends GoBrew 香草燕麥拿鐵採 6 盎司罐裝，結合燕麥奶滑順口感、輕柔香草甜感與即飲便利性，適合作為早晨或午後的輕能量補給。",
    highlights: ["香草燕麥拿鐵", "即飲罐裝", "6oz 6 入"],
    specs: [
      { label: "SKU", value: "6010065" },
      { label: "系列", value: "Alpine Blends" },
      { label: "使用時機", value: "早晨 / 午後" },
      { label: "規格", value: "6 oz can - 6 pack" }
    ],
    tags: ["gobrew", "coffee", "latte", "vanilla", "oat", "ritual", "taste"]
  }),
  createRealProduct({
    id: "6010066",
    slug: "gobrew-hazelnut-cold-brew-protein-6oz-can-6pack",
    label: "GoBrew",
    name: "GoBrew Hazelnut Cold Brew Protein, 6 oz can - 6 pack",
    priceLabel: "US$420",
    imageFileName: "6010066-gobrew-hazelnut-cold-brew-protein-6oz-can-6pack.png",
    description:
      "Alpine Blends GoBrew 榛果冷萃蛋白咖啡採 6 盎司罐裝，帶有堅果香氣與俐落冷萃尾韻，適合需要咖啡與蛋白補給一次到位的高效率族群。",
    highlights: ["榛果冷萃", "蛋白咖啡", "6oz 6 入"],
    specs: [
      { label: "SKU", value: "6010066" },
      { label: "系列", value: "Alpine Blends" },
      { label: "使用時機", value: "晨間 / 高效率補給" },
      { label: "規格", value: "6 oz can - 6 pack" }
    ],
    tags: ["gobrew", "coffee", "protein", "hazelnut", "cold brew", "ritual", "convenience"]
  }),
  createRealProduct({
    id: "6010067",
    slug: "yetibar-blueberry-chicken-paleo-2oz-bar-6pack",
    label: "YetiBar",
    name: "YetiBar Blueberry/Chicken Paleo, 2oz bar - 6 pack",
    priceLabel: "US$675",
    imageFileName: "6010067-yetibar-blueberry-chicken-paleo-2oz-bar-6pack.png",
    description:
      "YetiBar 以草飼雞肉製成，帶有藍莓風味並遵循 Paleo 飲食理念，適合想要高蛋白與恢復補給的進階運動族群。",
    highlights: ["Paleo", "藍莓雞肉風味", "2oz 6 入"],
    specs: [
      { label: "SKU", value: "6010067" },
      { label: "系列", value: "Alpine Nutrition" },
      { label: "飲食偏好", value: "Paleo" },
      { label: "規格", value: "2oz bar - 6 pack" }
    ],
    tags: ["yetibar", "bar", "protein", "paleo", "blueberry", "performance", "recovery"]
  })
]);

export function getRealProductsByIds(ids: readonly string[]): StorefrontProduct[] {
  const productMap = new Map(REAL_STOREFRONT_PRODUCTS.map((product) => [product.id, product]));
  return ids.map((id) => productMap.get(id)).filter((product): product is StorefrontProduct => Boolean(product));
}

function createRealProduct({
  id,
  slug,
  label,
  name,
  priceLabel,
  imageFileName,
  description,
  highlights,
  specs,
  tags
}: {
  id: string;
  slug: string;
  label: string;
  name: string;
  priceLabel: string;
  imageFileName: string;
  description: string;
  highlights: string[];
  specs: StorefrontProduct["specs"];
  tags: string[];
}): StorefrontProduct {
  return {
    id,
    slug,
    categoryId: "wellness",
    categoryLabel: "健康補給",
    label,
    name,
    kicker: tags.join(" "),
    priceLabel,
    saleBadge: "真實商品",
    claimedPercent: 72,
    description,
    longDescription: `${description} 適合放進運動前、中、後的補給節奏，或作為日常固定補貨清單的一部分。`,
    highlights,
    specs,
    imageUrl: `/images/products/${imageFileName}`,
    imageAlt: `${name} product packshot`
  };
}
