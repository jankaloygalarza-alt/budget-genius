import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import type { BudgetCategory, CatalogProduct, RankedProduct } from "../lib/budget-rank";
import { BUDGET_CATEGORIES } from "../lib/budget-rank";
import styles from "./BudgetGenius.module.css";

type Props = {
  products: CatalogProduct[];
  source?: "shopify" | "demo";
  minBudget?: number;
  maxBudget?: number;
  defaultBudget?: number;
};

type RecommendActionData = {
  ranked?: RankedProduct[];
  picks?: RankedProduct[];
  source?: "shopify" | "demo";
  ai?: boolean;
  aiError?: string;
  budget?: number;
  category?: BudgetCategory;
};

function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l1.2 6.3L19 12l-5.8 3.7L12 22l-1.2-6.3L5 12l5.8-3.7L12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

function ProductGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 15c2-4 5-6 8-6s6 2 8 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 15h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="8" cy="17.5" r="1.4" fill="currentColor" />
      <circle cx="16" cy="17.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function formatMoney(value: number) {
  return `$${Math.round(value)}`;
}

export function BudgetGenius({
  source = "demo",
  minBudget = 20,
  maxBudget = 1000,
  defaultBudget = 90,
}: Props) {
  const fetcher = useFetcher<RecommendActionData>();
  const [category, setCategory] = useState<BudgetCategory>("All");
  const [budget, setBudget] = useState(defaultBudget);
  const [results, setResults] = useState<RankedProduct[] | null>(null);
  const [usedAi, setUsedAi] = useState(false);
  const [aiError, setAiError] = useState<string | undefined>();
  const [resultSource, setResultSource] = useState(source);
  const [cartCount, setCartCount] = useState(0);

  const loading = fetcher.state !== "idle";
  const catalogNote = useMemo(() => resultSource, [resultSource]);

  useEffect(() => {
    if (!fetcher.data) return;
    const picks = fetcher.data.picks ?? fetcher.data.ranked ?? [];
    setResults(picks);
    setUsedAi(Boolean(fetcher.data.ai));
    setAiError(fetcher.data.aiError);
    if (fetcher.data.source) {
      setResultSource(fetcher.data.source);
    }
  }, [fetcher.data]);

  function showRecommendations() {
    fetcher.submit(
      {
        budget: String(budget),
        category,
      },
      { method: "post" },
    );
  }

  function addToCart(_product: RankedProduct) {
    setCartCount((count) => count + 1);
  }

  const best = results?.[0];
  const rest = results?.slice(1) ?? [];

  return (
    <div className={styles.widget}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <SparkIcon size={18} />
        </div>
        <div>
          <h1 className={styles.title}>Budget Genius</h1>
          <p className={styles.tagline}>
            Set what you want to spend — I&apos;ll rank the best matches in stock
            for it.
          </p>
        </div>
      </header>

      <label className={styles.sectionLabel} htmlFor="budget-category">
        Category
      </label>
      <div className={styles.pills} id="budget-category" role="group">
        {BUDGET_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={`${styles.pill} ${category === item ? styles.pillActive : ""}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className={styles.budgetRow}>
        <span className={styles.sectionLabel} style={{ marginBottom: 0 }}>
          Budget
        </span>
        <span className={styles.budgetValue}>{formatMoney(budget)}</span>
      </div>
      <input
        className={styles.slider}
        type="range"
        min={minBudget}
        max={maxBudget}
        step={1}
        value={budget}
        onChange={(event) => setBudget(Number(event.target.value))}
        aria-label="Budget"
      />
      <div className={styles.rangeLabels}>
        <span>{formatMoney(minBudget)}</span>
        <span>{formatMoney(maxBudget)}</span>
      </div>

      <button
        type="button"
        className={styles.cta}
        onClick={showRecommendations}
        disabled={loading}
      >
        <SparkIcon size={14} />
        {loading ? "Ranking with AI…" : "Show recommendations"}
      </button>

      {results && results.length === 0 && (
        <div className={styles.empty}>
          No in-stock products at or under {formatMoney(budget)}
          {category !== "All" ? ` in ${category}` : ""}. Try raising your budget
          or switching category.
        </div>
      )}

      {results && results.length > 0 && (
        <>
          <div className={styles.resultsMeta}>
            <span>Ranked for {formatMoney(budget)}</span>
            <span>
              {results.length} pick{results.length === 1 ? "" : "s"}
              {usedAi ? " · AI reasons" : ""}
            </span>
          </div>

          {best && (
            <article className={styles.bestCard}>
              <div className={styles.badge}>BEST MATCH</div>
              <div className={styles.bestBody}>
                <div className={styles.thumb}>
                  {best.imageUrl ? (
                    <img src={best.imageUrl} alt="" />
                  ) : (
                    <ProductGlyph />
                  )}
                </div>
                <div>
                  <h2 className={styles.productTitle}>{best.title}</h2>
                  <p className={styles.price}>{formatMoney(best.price)}</p>
                  <p className={styles.reason}>{best.reason}</p>
                </div>
              </div>
              <div className={styles.accent} />
              <button
                type="button"
                className={styles.addButton}
                onClick={() => addToCart(best)}
              >
                Add to cart
              </button>
            </article>
          )}

          {rest.length > 0 && (
            <div className={styles.list}>
              {rest.map((product) => (
                <div key={product.id} className={styles.row}>
                  <div className={styles.rank}>#{product.rank}</div>
                  <div className={styles.rowThumb}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" />
                    ) : (
                      <ProductGlyph />
                    )}
                  </div>
                  <div>
                    <p className={styles.rowTitle}>{product.title}</p>
                    <p className={styles.rowReason}>{product.reason}</p>
                    <p className={styles.rowPrice}>{formatMoney(product.price)}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.plus}
                    aria-label={`Add ${product.title} to cart`}
                    onClick={() => addToCart(product)}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className={styles.footer}>
        {cartCount} item{cartCount === 1 ? "" : "s"} in cart.
      </div>
      <div className={styles.sourceNote}>
        Catalog source:{" "}
        {catalogNote === "shopify" ? "live store products" : "demo products"}
        {results
          ? usedAi
            ? " · AI reasons on"
            : ` · AI reasons off${aiError ? ` (${aiError})` : ""}`
          : ""}
      </div>
    </div>
  );
}
