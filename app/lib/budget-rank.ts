export type BudgetCategory = "All" | "Shoes" | "T-shirt" | "Bag";

export type CatalogProduct = {
  id: string;
  title: string;
  price: number;
  category: BudgetCategory | string;
  imageUrl?: string | null;
  variantId?: string | null;
  productType?: string | null;
  tags?: string[];
  inStock?: boolean;
};

export type RankedProduct = CatalogProduct & {
  rank: number;
  reason: string;
  matchScore: number;
};

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  "All",
  "Shoes",
  "T-shirt",
  "Bag",
];

export const DEMO_PRODUCTS: CatalogProduct[] = [
  {
    id: "demo-1",
    title: "Trail runners",
    price: 88,
    category: "Shoes",
    imageUrl: null,
    variantId: null,
    inStock: true,
  },
  {
    id: "demo-2",
    title: "Running shoes",
    price: 79,
    category: "Shoes",
    imageUrl: null,
    variantId: null,
    inStock: true,
  },
  {
    id: "demo-3",
    title: "Linen shirt",
    price: 64,
    category: "T-shirt",
    imageUrl: null,
    variantId: null,
    inStock: true,
  },
  {
    id: "demo-4",
    title: "Canvas tote",
    price: 42,
    category: "Bag",
    imageUrl: null,
    variantId: null,
    inStock: true,
  },
  {
    id: "demo-5",
    title: "Everyday tee",
    price: 28,
    category: "T-shirt",
    imageUrl: null,
    variantId: null,
    inStock: true,
  },
  {
    id: "demo-6",
    title: "Weekend sneakers",
    price: 120,
    category: "Shoes",
    imageUrl: null,
    variantId: null,
    inStock: true,
  },
  {
    id: "demo-7",
    title: "Crossbody bag",
    price: 95,
    category: "Bag",
    imageUrl: null,
    variantId: null,
    inStock: true,
  },
];

const CATEGORY_ALIASES: Record<string, BudgetCategory> = {
  all: "All",
  shoes: "Shoes",
  shoe: "Shoes",
  sneakers: "Shoes",
  footwear: "Shoes",
  "t-shirt": "T-shirt",
  tshirt: "T-shirt",
  shirt: "T-shirt",
  tee: "T-shirt",
  tops: "T-shirt",
  bag: "Bag",
  bags: "Bag",
  tote: "Bag",
  backpack: "Bag",
};

export function normalizeCategory(value?: string | null): BudgetCategory | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? null;
}

export function inferCategory(product: CatalogProduct): BudgetCategory | null {
  const fromField = normalizeCategory(String(product.category));
  if (fromField && fromField !== "All") return fromField;

  const fromType = normalizeCategory(product.productType);
  if (fromType && fromType !== "All") return fromType;

  for (const tag of product.tags ?? []) {
    const fromTag = normalizeCategory(tag);
    if (fromTag && fromTag !== "All") return fromTag;
  }

  const haystack = `${product.title} ${product.productType ?? ""} ${(product.tags ?? []).join(" ")}`.toLowerCase();
  if (/(shoe|sneaker|runner|boot)/.test(haystack)) return "Shoes";
  if (/(t-?shirt|tee|shirt|top)/.test(haystack)) return "T-shirt";
  if (/(bag|tote|backpack|crossbody)/.test(haystack)) return "Bag";
  return null;
}

function reasonForMatch(price: number, budget: number, rank: number): string {
  const gap = budget - price;
  if (rank === 1) {
    if (gap <= 5) return "Top rated and makes strong use of your budget.";
    if (gap <= 20) return "Best value under your budget.";
    return "Strong match with room left in your budget.";
  }
  if (gap <= 15) return "Close alternative under budget.";
  return "Solid pick if you want to spend less.";
}

/**
 * Rank in-stock products at or under budget.
 * Best match = closest price to budget without going over.
 */
export function rankProductsForBudget(
  products: CatalogProduct[],
  budget: number,
  category: BudgetCategory = "All",
  limit = 3,
): RankedProduct[] {
  const filtered = products
    .filter((product) => product.inStock !== false)
    .filter((product) => Number.isFinite(product.price) && product.price > 0)
    .filter((product) => product.price <= budget)
    .filter((product) => {
      if (category === "All") return true;
      return inferCategory(product) === category;
    })
    .map((product) => {
      const utilization = product.price / budget;
      const matchScore = utilization * 100;
      return { product, matchScore };
    })
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.product.title.localeCompare(b.product.title);
    })
    .slice(0, limit);

  return filtered.map(({ product, matchScore }, index) => {
    const rank = index + 1;
    return {
      ...product,
      category: inferCategory(product) ?? product.category,
      rank,
      matchScore,
      reason: reasonForMatch(product.price, budget, rank),
    };
  });
}
