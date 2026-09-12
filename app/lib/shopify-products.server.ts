import type { CatalogProduct } from "./budget-rank";
import { DEMO_PRODUCTS, inferCategory } from "./budget-rank";

type AdminGraphql = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

type ProductsQueryResult = {
  data?: {
    products?: {
      nodes?: Array<{
        id: string;
        title: string;
        productType?: string | null;
        tags?: string[];
        featuredImage?: { url?: string | null } | null;
        variants?: {
          nodes?: Array<{
            id: string;
            price: string;
            availableForSale?: boolean;
          }>;
        };
      }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

function toNumericVariantId(gid: string): string {
  const parts = gid.split("/");
  return parts[parts.length - 1] || gid;
}

export async function fetchCatalogProducts(
  admin: AdminGraphql,
  first = 50,
): Promise<{ products: CatalogProduct[]; source: "shopify" | "demo" }> {
  try {
    const response = await admin.graphql(
      `#graphql
      query BudgetGeniusProducts($first: Int!) {
        products(first: $first, query: "status:active") {
          nodes {
            id
            title
            productType
            tags
            featuredImage {
              url
            }
            variants(first: 10) {
              nodes {
                id
                price
                availableForSale
              }
            }
          }
        }
      }`,
      { variables: { first } },
    );

    const json = (await response.json()) as ProductsQueryResult;
    if (json.errors?.length) {
      throw new Error(json.errors.map((error) => error.message).join("; "));
    }

    const nodes = json.data?.products?.nodes ?? [];

    const products: CatalogProduct[] = nodes
      .map((node) => {
        const variant =
          node.variants?.nodes?.find((item) => item.availableForSale !== false) ??
          node.variants?.nodes?.[0];
        if (!variant) return null;

        const price = Number.parseFloat(variant.price);
        if (!Number.isFinite(price)) return null;

        const mapped: CatalogProduct = {
          id: node.id,
          title: node.title,
          price,
          category: "All",
          imageUrl: node.featuredImage?.url ?? null,
          // Numeric ID for Ajax Cart (/cart/add.js)
          variantId: toNumericVariantId(variant.id),
          productType: node.productType ?? null,
          tags: node.tags ?? [],
          inStock: variant.availableForSale !== false,
        };

        mapped.category = inferCategory(mapped) ?? "All";
        return mapped;
      })
      .filter((product): product is CatalogProduct => product !== null);

    if (products.length === 0) {
      console.warn(
        "[budget-genius] No active products returned from Admin API; using demo catalog",
      );
      return { products: DEMO_PRODUCTS, source: "demo" };
    }

    return { products, source: "shopify" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown catalog error";
    console.warn("[budget-genius] Catalog fetch failed; using demo:", message);
    return { products: DEMO_PRODUCTS, source: "demo" };
  }
}
