// ── Types ────────────────────────────────────────────────────────
export interface BlogSettings {
  provider: string;
  model: string;
  language: string;
  tone: string;
  target_audience: string;
  site_name: string;
  site_url: string;
  blog_base_url: string;
  categories: string[];
  seed_keywords: string[];
  internal_links: { title: string; url: string }[];
  cta_text: string;
  cta_url: string;
  anthropic_api_key: string | null;
  gemini_api_key: string | null;
  groq_api_key: string | null;
  tavily_api_key: string | null;
  unsplash_api_key: string | null;
  research_enabled: boolean;
  custom_prompt: string | null;
}

export interface TopicSuggestion {
  topic: string;
  description: string;
  keywords: string[];
  category: string;
  priority: number;
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
}

export interface SearchResult {
  title: string;
  description: string;
  url: string;
}

// ── Provider abstraction ─────────────────────────────────────────
export async function callAI(
  settings: BlogSettings,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<AIResponse> {
  const provider = settings.provider || "gemini";

  switch (provider) {
    case "gemini":
      return callGemini(settings, systemPrompt, userPrompt, maxTokens);
    case "groq":
      return callGroq(settings, systemPrompt, userPrompt, maxTokens);
    case "claude":
      return callClaude(settings, systemPrompt, userPrompt, maxTokens);
    default:
      if (settings.gemini_api_key) {
        return callGemini(settings, systemPrompt, userPrompt, maxTokens);
      }
      if (settings.groq_api_key) {
        return callGroq(settings, systemPrompt, userPrompt, maxTokens);
      }
      if (settings.anthropic_api_key) {
        return callClaude(settings, systemPrompt, userPrompt, maxTokens);
      }
      throw new Error("Aucune clé API configurée. Ajoutez au moins une clé (Gemini gratuit recommandé).");
  }
}

// ── Google Gemini ────────────────────────────────────────────────
async function callGemini(
  settings: BlogSettings,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<AIResponse> {
  const apiKey = settings.gemini_api_key;
  if (!apiKey) throw new Error("Clé API Gemini non configurée");

  const model = settings.model?.startsWith("gemini")
    ? settings.model
    : "gemini-2.0-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const usage = data.usageMetadata || {};

  return {
    text,
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
    model,
    provider: "gemini",
  };
}

// ── Groq ─────────────────────────────────────────────────────────
async function callGroq(
  settings: BlogSettings,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<AIResponse> {
  const apiKey = settings.groq_api_key;
  if (!apiKey) throw new Error("Clé API Groq non configurée");

  const model = settings.model?.startsWith("llama") || settings.model?.startsWith("mixtral")
    ? settings.model
    : "llama-3.3-70b-versatile";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    model,
    provider: "groq",
  };
}

// ── Claude ────────────────────────────────────────────────────────
async function callClaude(
  settings: BlogSettings,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<AIResponse> {
  const apiKey = settings.anthropic_api_key;
  if (!apiKey) throw new Error("Clé API Anthropic non configurée");

  const model = settings.model?.startsWith("claude")
    ? settings.model
    : "claude-haiku-4-5-20251001";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    text: data.content[0]?.text || "",
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
    model,
    provider: "claude",
  };
}

// ── Tavily Search ────────────────────────────────────────────────
export async function searchWeb(
  apiKey: string,
  query: string,
  count = 5,
): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: count,
      search_depth: "basic",
      include_answer: false,
    }),
  });

  if (!res.ok) {
    console.error(`Tavily Search ${res.status}: ${await res.text()}`);
    return [];
  }

  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    title: r.title || "",
    description: r.content || "",
    url: r.url || "",
  }));
}

// ── Unsplash Image Search ────────────────────────────────────────
export async function searchUnsplashImage(
  apiKey: string,
  query: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${apiKey}` },
      },
    );
    if (!res.ok) {
      console.error(`Unsplash API ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const photo = data.results?.[0];
    if (!photo) return null;
    const imageUrl = photo.urls?.regular || photo.urls?.small || null;
    if (photo.links?.download_location) {
      fetch(`${photo.links.download_location}?client_id=${apiKey}`).catch(() => {});
    }
    return imageUrl;
  } catch (err) {
    console.error("Unsplash search error:", err);
    return null;
  }
}
