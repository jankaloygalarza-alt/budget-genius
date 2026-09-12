import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { BudgetGenius } from "../components/BudgetGenius";
import {
  type BudgetCategory,
  BUDGET_CATEGORIES,
} from "../lib/budget-rank";
import { buildRecommendations } from "../lib/recommend.server";
import { fetchCatalogProducts } from "../lib/shopify-products.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { products, source } = await fetchCatalogProducts(admin);

  return {
    products,
    source,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const budget = Number(formData.get("budget") || 90);
  const categoryRaw = String(formData.get("category") || "All");
  const category = (BUDGET_CATEGORIES.includes(categoryRaw as BudgetCategory)
    ? categoryRaw
    : "All") as BudgetCategory;

  const { products, source } = await fetchCatalogProducts(admin);
  return buildRecommendations({ products, source, budget, category });
};

export default function Index() {
  const { products, source } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Budget Genius">
      <s-section heading="Shopping assistant preview">
        <s-paragraph>
          Merchants can preview how Budget Genius ranks in-stock products for a
          shopper&apos;s budget. Add the theme app block to your storefront for
          customers.
        </s-paragraph>
      </s-section>

      <s-section>
        <div style={{ padding: "8px 0 24px" }}>
          <BudgetGenius products={products} source={source} />
        </div>
      </s-section>

      <s-section slot="aside" heading="How ranking works">
        <s-unordered-list>
          <s-list-item>Keep only in-stock products at or under budget</s-list-item>
          <s-list-item>Optionally filter by category / product type / tags</s-list-item>
          <s-list-item>Sort by closest price to the budget (best spend)</s-list-item>
          <s-list-item>
            AI writes a short reason for each top pick (falls back if offline)
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Storefront">
        <s-paragraph>
          Enable the <strong>Budget Genius</strong> app block in Online Store →
          Themes → Customize, then place it on a page or section.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
