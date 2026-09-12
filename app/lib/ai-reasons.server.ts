import type { BudgetCategory, RankedProduct } from "./budget-rank";

type AiReasonItem = {
  id: string;
  reason: string;
};

export type AiEnrichResult = {
  picks: RankedProduct[];
  ai: boolean;
  aiError?: string;
};

function buildPrompt(
  picks: RankedProduct[],
  budget: number,
  category: BudgetCategory,
) {
  const catalog = picks.map((pick) => ({
    id: pick.id,
    title: pick.title,
    price: pick.price,
    rank: pick.rank,
    category: pick.category,
  }));

  return `You are Budget Genius, a concise shopping assistant.
Shopper budget: $${budget}
Category filter: ${category}

Write one short reason (max 18 words) for each ranked product explaining why it fits this budget.
Be specific about value / budget fit. No hype, no emojis, no markdown.

Return ONLY valid JSON shaped like:
{"reasons":[{"id":"...","reason":"..."}]}

Products:
${JSON.stringify(catalog)}`;
}

function extractGeminiText(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      error?: { message?: string };
    };

    if (data.error?.message) {
      throw new Error(data.error.message);
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    return text || null;
  } catch (error) {
    if (error instanceof Error) throw error;
    return null;
  }
}

export async function enrichReasonsWithAi(
  picks: RankedProduct[],
  budget: number,
  category: BudgetCategory,
): Promise<AiEnrichResult> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim();

  if (!apiKey || picks.length === 0) {
    return {
      picks,
      ai: false,
      aiError: apiKey ? undefined : "GEMINI_API_KEY is missing",
    };
  }

  const requestedModel = (process.env.GEMINI_MODEL || "gemini-3.6-flash").trim();
  // gemini-2.0-flash was retired; always prefer a current free-tier flash model.
  const model =
    !requestedModel || requestedModel.includes("2.0-flash")
      ? "gemini-3.6-flash"
      : requestedModel;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  console.info("[budget-genius] Using Gemini model:", model);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(picks, budget, category) }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              reasons: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    reason: { type: "STRING" },
                  },
                  required: ["id", "reason"],
                },
              },
            },
            required: ["reasons"],
          },
        },
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      let message = `Gemini HTTP ${response.status}`;
      try {
        const errJson = JSON.parse(raw) as {
          error?: { message?: string; status?: string };
        };
        message = errJson.error?.message || errJson.error?.status || message;
      } catch {
        // keep default message
      }
      console.warn("[budget-genius] AI reasons failed:", message);
      return { picks, ai: false, aiError: message };
    }

    const content = extractGeminiText(raw);
    if (!content) {
      return { picks, ai: false, aiError: "Gemini returned an empty response" };
    }

    const parsed = JSON.parse(content) as { reasons?: AiReasonItem[] };
    const reasonMap = new Map(
      (parsed.reasons ?? [])
        .filter((item) => item?.id && item?.reason)
        .map((item) => [item.id, String(item.reason).trim()]),
    );

    if (reasonMap.size === 0) {
      return {
        picks,
        ai: false,
        aiError: "Gemini response had no usable reasons",
      };
    }

    return {
      ai: true,
      picks: picks.map((pick) => ({
        ...pick,
        reason: reasonMap.get(pick.id) || pick.reason,
      })),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gemini request failed";
    console.warn("[budget-genius] AI reasons failed:", message);
    return { picks, ai: false, aiError: message };
  }
}
