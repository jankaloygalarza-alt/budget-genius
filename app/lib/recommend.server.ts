import {
  type BudgetCategory,
  type CatalogProduct,
  type RankedProduct,
  rankProductsForBudget,
} from "./budget-rank";
import { enrichReasonsWithAi } from "./ai-reasons.server";

export async function buildRecommendations(options: {
  products: CatalogProduct[];
  source: "shopify" | "demo";
  budget: number;
  category: BudgetCategory;
  limit?: number;
}): Promise<{
  budget: number;
  category: BudgetCategory;
  source: "shopify" | "demo";
  ai: boolean;
  aiError?: string;
  picks: RankedProduct[];
}> {
  const { products, source, budget, category, limit = 3 } = options;
  const ranked = rankProductsForBudget(products, budget, category, limit);
  const { picks, ai, aiError } = await enrichReasonsWithAi(
    ranked,
    budget,
    category,
  );

  return {
    budget,
    category,
    source,
    ai,
    aiError,
    picks,
  };
}
