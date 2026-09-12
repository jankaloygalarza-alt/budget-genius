(function () {
  function money(value) {
    return "$" + Math.round(Number(value));
  }

  function cartRoot() {
    if (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) {
      return window.Shopify.routes.root;
    }
    return "/";
  }

  function thumbHtml(imageUrl) {
    if (imageUrl) {
      return '<img src="' + imageUrl + '" alt="">';
    }
    return "👟";
  }

  function setFooter(cartCountEl, count) {
    if (!cartCountEl) return;
    cartCountEl.textContent =
      count + " item" + (count === 1 ? "" : "s") + " in cart.";
  }

  async function refreshCartCount(root, cartCountEl) {
    try {
      const response = await fetch(cartRoot() + "cart.js", {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const cart = await response.json();
      const count = Number(cart.item_count || 0);
      root.dataset.cartCount = String(count);
      setFooter(cartCountEl, count);
      document.documentElement.dispatchEvent(
        new CustomEvent("cart:refresh", { bubbles: true })
      );
      document.dispatchEvent(
        new CustomEvent("cart:updated", { detail: cart, bubbles: true })
      );
    } catch (_error) {
      // Ignore count refresh failures; add may still have succeeded.
    }
  }

  async function addToCart(variantId) {
    if (!variantId || String(variantId).startsWith("demo-")) {
      throw new Error(
        "This is a demo product. Open Budget Genius in Admin once so live products load."
      );
    }

    const numericId = String(variantId).includes("/")
      ? String(variantId).split("/").pop()
      : String(variantId);

    if (!numericId || Number.isNaN(Number(numericId))) {
      throw new Error("Missing product variant id.");
    }

    const response = await fetch(cartRoot() + "cart/add.js", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        items: [{ id: Number(numericId), quantity: 1 }],
      }),
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (_parseError) {
      payload = null;
    }

    if (!response.ok) {
      const message =
        (payload && (payload.description || payload.message)) ||
        "Could not add to cart (HTTP " + response.status + ").";
      throw new Error(message);
    }

    return payload;
  }

  function renderResults(root, data, cartCountEl) {
    const host = root.querySelector("[data-results]");
    if (!host) return;

    const picks = data.picks || [];
    if (!picks.length) {
      host.innerHTML =
        '<div class="bg-empty">No in-stock products at or under ' +
        money(data.budget) +
        ". Try raising your budget.</div>";
      return;
    }

    const best = picks[0];
    const rest = picks.slice(1);
    const sourceNote =
      data.source === "demo"
        ? '<p class="bg-empty">Showing demo products — open the app in Admin to load your catalog for real add-to-cart.</p>'
        : "";

    let html =
      sourceNote +
      '<div class="bg-meta"><span>Ranked for ' +
      money(data.budget) +
      "</span><span>" +
      picks.length +
      " picks" +
      (data.ai ? " · AI reasons" : "") +
      "</span></div>";

    html +=
      '<article class="bg-best"><div class="bg-badge">BEST MATCH</div>' +
      '<div class="bg-best-body"><div class="bg-thumb">' +
      thumbHtml(best.imageUrl) +
      '</div><div><h3 class="bg-product-title">' +
      best.title +
      '</h3><p class="bg-price">' +
      money(best.price) +
      '</p><p class="bg-reason">' +
      best.reason +
      "</p></div></div>" +
      '<div class="bg-accent"></div>' +
      '<button type="button" class="bg-add" data-add="' +
      (best.variantId || "") +
      '">Add to cart</button></article>';

    rest.forEach(function (product) {
      html +=
        '<div class="bg-row"><div class="bg-rank">#' +
        product.rank +
        '</div><div class="bg-row-thumb">' +
        thumbHtml(product.imageUrl) +
        '</div><div><p class="bg-row-title">' +
        product.title +
        '</p><p class="bg-row-reason">' +
        product.reason +
        '</p><p class="bg-row-price">' +
        money(product.price) +
        '</p></div><button type="button" class="bg-plus" data-add="' +
        (product.variantId || "") +
        '">+</button></div>';
    });

    host.innerHTML = html;

    host.querySelectorAll("[data-add]").forEach(function (button) {
      button.addEventListener("click", async function () {
        const original = button.textContent;
        button.disabled = true;
        button.textContent = button.classList.contains("bg-plus") ? "…" : "Adding…";
        try {
          await addToCart(button.getAttribute("data-add"));
          await refreshCartCount(root, cartCountEl);
          button.textContent = button.classList.contains("bg-plus") ? "✓" : "Added";
        } catch (error) {
          button.textContent = original;
          const message =
            error && error.message ? error.message : "Could not add to cart.";
          window.alert(message);
        } finally {
          window.setTimeout(function () {
            button.disabled = false;
            button.textContent = original;
          }, 1200);
        }
      });
    });
  }

  function init(root) {
    const proxyUrl = root.getAttribute("data-proxy-url");
    const slider = root.querySelector("[data-budget-slider]");
    const valueEl = root.querySelector("[data-budget-value]");
    const recommendBtn = root.querySelector("[data-recommend]");
    const cartCountEl = root.querySelector("[data-cart-count]");
    let category = "All";

    refreshCartCount(root, cartCountEl);

    root.querySelectorAll("[data-category]").forEach(function (pill) {
      pill.addEventListener("click", function () {
        root.querySelectorAll("[data-category]").forEach(function (el) {
          el.classList.remove("is-active");
        });
        pill.classList.add("is-active");
        category = pill.getAttribute("data-category") || "All";
      });
    });

    if (slider && valueEl) {
      slider.addEventListener("input", function () {
        valueEl.textContent = money(slider.value);
      });
    }

    if (recommendBtn) {
      recommendBtn.addEventListener("click", async function () {
        recommendBtn.disabled = true;
        recommendBtn.textContent = "Ranking with AI…";
        try {
          const budget = slider ? slider.value : "90";
          const url =
            proxyUrl +
            "?budget=" +
            encodeURIComponent(budget) +
            "&category=" +
            encodeURIComponent(category);
          const response = await fetch(url, {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
          });
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (_parseError) {
            throw new Error(
              "App proxy returned non-JSON (HTTP " +
                response.status +
                "). Reinstall the app so /apps/budget-genius is registered."
            );
          }
          if (!response.ok) {
            throw new Error(
              (data && data.error) ||
                "Request failed (HTTP " + response.status + ")"
            );
          }
          renderResults(root, data, cartCountEl);
        } catch (error) {
          const host = root.querySelector("[data-results]");
          if (host) {
            const message =
              error && error.message
                ? error.message
                : "Could not load recommendations. Check app proxy setup.";
            host.innerHTML = '<div class="bg-empty">' + message + "</div>";
          }
        } finally {
          recommendBtn.disabled = false;
          recommendBtn.textContent = "✦ Show recommendations";
        }
      });
    }
  }

  document.querySelectorAll("[data-budget-genius]").forEach(init);
})();
