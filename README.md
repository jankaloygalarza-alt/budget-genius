# Budget Genius

Shopify custom app that ranks in-stock products for a shopper's budget — matching the Budget Genius assistant UI.

Built on Shopify's **latest React Router** app template (**not Remix**).

## Stack

- **App home:** React Router 7 + `@shopify/shopify-app-react-router`
- **Storefront:** Theme app extension (app block)
- **API:** App proxy → `/api/recommendations`
- **Ranking:** closest price ≤ budget, optional category filter

## Quick start

```bash
cd ~/budget-genius
npm install
npm run setup
npm run dev
```

### Optional: AI recommendation reasons (Google AI Studio — free tier)

Get a free key from [Google AI Studio](https://aistudio.google.com/apikey), then add it to `.env`:

```bash
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-3.6-flash
```

Ranking stays rule-based. Gemini only writes a short reason for each top pick. Without a key, the app uses built-in fallback reasons.

Then:

1. Install the app on your development store
2. Open **Budget Genius** in Apps to preview the widget against live products
3. Online Store → Themes → Customize → add the **Budget Genius** app block

## How ranking works

1. Load active products (Admin GraphQL)
2. Keep in-stock items with `price <= budget`
3. Filter by category using product type / tags / title keywords (`Shoes`, `T-shirt`, `Bag`)
4. Sort by how fully they use the budget (best match first)
5. Return top 3
6. Optionally ask Gemini (Google AI Studio) to write a one-line reason per pick (`GEMINI_API_KEY`)

If the store has no matching catalog data yet, the admin preview falls back to demo products so the UI still looks like the design.

## Does n8n work for this?

**Yes, optionally — but you don't need it for the core app.**

| Use n8n for | Skip n8n for |
| --- | --- |
| Post-recommend automations (Slack, email, Sheets, CRM) | Real-time ranking on every "Show recommendations" click |
| Nightly catalog sync / enrichment jobs | Add-to-cart (use Shopify Ajax Cart / Storefront API) |
| Human approval workflows around curated picks | Auth / app proxy / theme extension hosting |

Recommended pattern:

1. Keep ranking inside this Shopify app (fast, authenticated, simple)
2. Optionally `POST` the ranked result to an **n8n webhook** for side effects
3. Or have n8n call Shopify Admin API on a schedule if you want offline curation

n8n alone as the storefront backend adds latency and another failure point for a simple rank-by-budget feature.

## Project map

```
app/
  components/BudgetGenius.tsx     # Admin preview UI
  lib/budget-rank.ts              # Ranking logic
  lib/shopify-products.server.ts  # Admin GraphQL fetch
  routes/app._index.tsx           # Embedded app home
  routes/api.recommendations.tsx  # App proxy endpoint
extensions/budget-genius/         # Storefront theme app block
```

## Notes

- Categories map from product type, tags, and title keywords
- App proxy path on the storefront: `/apps/budget-genius`
- Scopes: `read_products,write_products`
