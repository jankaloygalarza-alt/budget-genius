import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function SetupGuide() {
  return (
    <s-page heading="Setup guide">
      <s-section heading="1. Install &amp; open the app">
        <s-paragraph>
          Run <code>npm run dev</code> with Shopify CLI, install on your
          development store, then open Budget Genius from Apps.
        </s-paragraph>
      </s-section>

      <s-section heading="2. Add the storefront block">
        <s-unordered-list>
          <s-list-item>Online Store → Themes → Customize</s-list-item>
          <s-list-item>Add section / App block → Budget Genius</s-list-item>
          <s-list-item>Save the theme</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="3. Tag products for categories">
        <s-paragraph>
          Ranking uses product type, tags, and title keywords for Shoes,
          T-shirt, and Bag. Example tags: <code>shoes</code>,{" "}
          <code>t-shirt</code>, <code>bag</code>.
        </s-paragraph>
      </s-section>

      <s-section heading="Does n8n work for this?">
        <s-paragraph>
          Yes — optionally. Keep ranking in the app for speed, or call an n8n
          webhook if you want CRM / email / spreadsheet side-effects after a
          recommendation request.
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            Good fit: webhook → Shopify Admin API → rank → return JSON
          </s-list-item>
          <s-list-item>
            Good fit: after shopper clicks recommend, notify Slack / Klaviyo
          </s-list-item>
          <s-list-item>
            Not ideal alone: every storefront keystroke/slider move through n8n
            (extra latency)
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
