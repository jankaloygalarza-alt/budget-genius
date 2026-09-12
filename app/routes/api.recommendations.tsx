import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  type BudgetCategory,
  BUDGET_CATEGORIES,
  DEMO_PRODUCTS,
} from "../lib/budget-rank";
import { buildRecommendations } from "../lib/recommend.server";
import { fetchCatalogProducts } from "../lib/shopify-products.server";
import { authenticate, unauthenticated } from "../shopify.server";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...(init?.headers ?? {}),
    },
  });
}

function parseCategory(value: unknown): BudgetCategory {
  const raw = String(value ?? "All");
  return (BUDGET_CATEGORIES.includes(raw as BudgetCategory)
    ? raw
    : "All") as BudgetCategory;
}

async function resolveCatalog(request: Request) {
  const { admin } = await authenticate.public.appProxy(request);

  if (admin) {
    return fetchCatalogProducts(admin);
  }

  const shop = new URL(request.url).searchParams.get("shop") || "";
  console.warn(
    "[budget-genius] App proxy has no offline session for",
    shop || "(unknown shop)",
    "- open Budget Genius in Admin once",
  );

  if (shop) {
    try {
      const { admin: offlineAdmin } = await unauthenticated.admin(shop);
      return fetchCatalogProducts(offlineAdmin);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "session missing";
      console.warn("[budget-genius] Offline admin lookup failed:", message);
    }
  }

  return { products: DEMO_PRODUCTS, source: "demo" as const };
}

async function recommend(
  request: Request,
  budget: number,
  category: BudgetCategory,
) {
  const { products, source } = await resolveCatalog(request);
  const payload = await buildRecommendations({
    products,
    source,
    budget,
    category,
  });
  void notifyN8n(payload);
  return json(payload);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return json({});
  }

  const url = new URL(request.url);
  const budget = Number(url.searchParams.get("budget") || 90);
  const category = parseCategory(url.searchParams.get("category"));
  return recommend(request, budget, category);
};

async function notifyN8n(payload: unknown) {
  const webhook = process.env.N8N_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking: ranking should still succeed if automation is down.
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return json({});
  }

  const contentType = request.headers.get("content-type") || "";
  let budget = 90;
  let category: BudgetCategory = "All";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      budget?: number;
      category?: string;
    };
    budget = Number(body.budget ?? 90);
    category = parseCategory(body.category);
  } else {
    const formData = await request.formData();
    budget = Number(formData.get("budget") || 90);
    category = parseCategory(formData.get("category"));
  }

  return recommend(request, budget, category);
};
