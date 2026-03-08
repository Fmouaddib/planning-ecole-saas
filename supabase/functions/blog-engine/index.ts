import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// ── Types ────────────────────────────────────────────────────────
interface BlogSettings {
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
}

interface TopicSuggestion {
  topic: string;
  description: string;
  keywords: string[];
  category: string;
  priority: number;
}

// ── Helpers ──────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function countWords(text: string): number {
  return text
    .replace(/[#*_\[\]()>|`]/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

function computeSeoScore(post: {
  title: string;
  meta_description: string;
  content: string;
  keywords: string[];
}): number {
  let score = 0;
  const content = post.content.toLowerCase();
  // Title length 30-65 chars
  if (post.title.length >= 30 && post.title.length <= 65) score += 15;
  else if (post.title.length > 0) score += 5;
  // Meta description 120-160 chars
  if (
    post.meta_description.length >= 120 &&
    post.meta_description.length <= 160
  )
    score += 15;
  else if (post.meta_description.length > 0) score += 5;
  // H2 headings present
  if ((content.match(/^## /gm) || []).length >= 3) score += 15;
  // Keyword in title
  if (
    post.keywords.some((kw) => post.title.toLowerCase().includes(kw.toLowerCase()))
  )
    score += 15;
  // Keywords in content
  const kwHits = post.keywords.filter((kw) =>
    content.includes(kw.toLowerCase()),
  ).length;
  score += Math.min(15, kwHits * 5);
  // Word count 1200+
  const words = countWords(post.content);
  if (words >= 1500) score += 15;
  else if (words >= 1000) score += 10;
  else if (words >= 500) score += 5;
  // Internal links
  if (content.includes("anti-planning")) score += 5;
  // FAQ section
  if (content.includes("## faq") || content.includes("## questions"))
    score += 5;
  return Math.min(100, score);
}

async function callClaude(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(ANTHROPIC_API_URL, {
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
  };
}

// ── System Prompts ───────────────────────────────────────────────
function buildArticleSystemPrompt(settings: BlogSettings): string {
  const internalLinksText =
    settings.internal_links.length > 0
      ? `\nLiens internes à intégrer naturellement :\n${settings.internal_links.map((l) => `- [${l.title}](${l.url})`).join("\n")}`
      : "";

  return `Tu es un rédacteur SEO expert spécialisé dans le secteur de la formation professionnelle, de l'éducation et de la gestion de centres de formation en France.

SITE: ${settings.site_name} (${settings.site_url}) — logiciel SaaS de planning intelligent pour centres de formation, écoles et organismes de formation.

AUDIENCE CIBLE: ${settings.target_audience}

TON: ${settings.tone === "expert" ? "Expert et autoritaire, avec des données et exemples concrets" : settings.tone === "professional" ? "Professionnel et informatif" : settings.tone === "casual" ? "Décontracté mais crédible" : "Amical et accessible"}

LANGUE: ${settings.language === "fr" ? "Français" : "English"}

RÈGLES SEO STRICTES:
1. Le titre (H1) doit contenir le mot-clé principal, entre 30 et 65 caractères
2. La meta description doit faire 120-160 caractères, inclure le mot-clé et un appel à l'action
3. Utiliser 4-6 sous-titres H2 avec des mots-clés secondaires
4. Premier paragraphe : inclure le mot-clé principal dans les 100 premiers mots
5. Densité de mots-clés : 1-2% naturellement
6. Inclure une section FAQ avec 3-5 questions (balisage schema.org friendly)
7. Article de 1500-2500 mots minimum
8. Phrases courtes (max 20 mots en moyenne)
9. Paragraphes courts (3-4 lignes max)
10. Utiliser des listes à puces et des tableaux quand pertinent
11. Ajouter un CTA vers ${settings.site_name} en conclusion
${internalLinksText}

CTA PAR DÉFAUT: ${settings.cta_text} → ${settings.cta_url}

FORMAT DE SORTIE (JSON strict):
{
  "title": "Titre SEO optimisé (H1)",
  "meta_title": "Meta title pour Google (max 60 chars)",
  "meta_description": "Meta description (120-160 chars)",
  "excerpt": "Résumé accrocheur (2-3 phrases)",
  "content": "Article complet en Markdown (H2, H3, listes, gras, liens)",
  "keywords": ["mot-clé 1", "mot-clé 2", ...],
  "featured_image_prompt": "Description pour générer une image de couverture (en anglais, style professionnel)"
}

IMPORTANT: Retourne UNIQUEMENT le JSON, sans backticks ni texte avant/après.`;
}

function buildTopicSystemPrompt(settings: BlogSettings): string {
  return `Tu es un stratège SEO expert spécialisé dans le secteur de la formation professionnelle et de l'éducation en France.

SITE: ${settings.site_name} — logiciel SaaS de planning pour centres de formation.
AUDIENCE: ${settings.target_audience}
MOTS-CLÉS SEED: ${settings.seed_keywords.join(", ")}
CATÉGORIES: ${settings.categories.join(", ")}

Ta mission : suggérer des sujets d'articles de blog qui vont :
1. Cibler des requêtes long-tail avec un volume de recherche réaliste
2. Répondre aux questions que se posent les directeurs de centres de formation
3. Positionner ${settings.site_name} comme expert du secteur
4. Couvrir les différentes étapes du parcours client (découverte → considération → décision)
5. Traiter de l'actualité du secteur (Qualiopi, CPF, alternance, IA dans la formation)

Pour chaque sujet, fournis :
- Un titre provisoire optimisé SEO
- Une description courte (1-2 phrases)
- 3-5 mots-clés cibles
- La catégorie
- La priorité (1=basse, 10=haute)

FORMAT JSON (array strict) :
[
  {
    "topic": "Titre provisoire",
    "description": "Description courte",
    "keywords": ["kw1", "kw2", "kw3"],
    "category": "catégorie",
    "priority": 8
  }
]

IMPORTANT: Retourne UNIQUEMENT le JSON array, sans backticks.`;
}

// ── Main handler ─────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const action = body.action as string;

    // Load settings
    const { data: settings, error: settingsError } = await db
      .from("blog_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Blog settings not found" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const apiKey = settings.anthropic_api_key;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Clé API Anthropic non configurée. Ajoutez-la dans les paramètres du blog.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── ACTION: suggest-topics ──────────────────────────────────
    if (action === "suggest-topics") {
      const count = body.count || 10;
      const existingTopics = body.existingTopics || [];

      const systemPrompt = buildTopicSystemPrompt(settings as BlogSettings);
      const userPrompt = `Suggère ${count} sujets d'articles de blog uniques et pertinents.
${existingTopics.length > 0 ? `\nSujets DÉJÀ traités (à éviter) :\n${existingTopics.map((t: string) => `- ${t}`).join("\n")}` : ""}

Privilégie un mix entre :
- Articles informatifs (guides, tutoriels, comparatifs)
- Articles d'actualité (tendances 2025-2026, réglementations)
- Articles de fond (transformation digitale, IA dans la formation)
- Articles pratiques (checklists, templates, cas d'usage)`;

      const result = await callClaude(
        apiKey,
        settings.model || "claude-haiku-4-5-20251001",
        systemPrompt,
        userPrompt,
        2048,
      );

      let suggestions: TopicSuggestion[];
      try {
        suggestions = JSON.parse(result.text);
      } catch {
        // Try to extract JSON from response
        const match = result.text.match(/\[[\s\S]*\]/);
        if (match) suggestions = JSON.parse(match[0]);
        else throw new Error("Invalid JSON from Claude: " + result.text.slice(0, 200));
      }

      // Log
      await db.from("blog_generation_logs").insert({
        action: "suggest-topics",
        model: settings.model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost_estimate: estimateCost(
          settings.model,
          result.inputTokens,
          result.outputTokens,
        ),
        duration_ms: Date.now() - startTime,
        status: "success",
        metadata: { count: suggestions.length },
      });

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: generate-article ────────────────────────────────
    if (action === "generate-article") {
      const topicId = body.topicId as string;

      // Get topic
      const { data: topic, error: topicErr } = await db
        .from("blog_topics")
        .select("*")
        .eq("id", topicId)
        .single();

      if (topicErr || !topic) {
        return new Response(
          JSON.stringify({ error: "Topic not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Mark as generating
      await db
        .from("blog_topics")
        .update({ status: "generating" })
        .eq("id", topicId);

      try {
        const systemPrompt = buildArticleSystemPrompt(
          settings as BlogSettings,
        );
        const userPrompt = `Rédige un article de blog SEO complet sur le sujet suivant :

SUJET : ${topic.topic}
${topic.description ? `DESCRIPTION : ${topic.description}` : ""}
MOTS-CLÉS CIBLES : ${(topic.keywords || []).join(", ")}
CATÉGORIE : ${topic.category}

Rappel : retourne UNIQUEMENT le JSON valide avec title, meta_title, meta_description, excerpt, content, keywords, featured_image_prompt.`;

        const result = await callClaude(
          apiKey,
          settings.model || "claude-haiku-4-5-20251001",
          systemPrompt,
          userPrompt,
          8192,
        );

        let article: {
          title: string;
          meta_title: string;
          meta_description: string;
          excerpt: string;
          content: string;
          keywords: string[];
          featured_image_prompt: string;
        };

        try {
          article = JSON.parse(result.text);
        } catch {
          const match = result.text.match(/\{[\s\S]*\}/);
          if (match) article = JSON.parse(match[0]);
          else throw new Error("Invalid JSON article: " + result.text.slice(0, 300));
        }

        const wordCount = countWords(article.content);
        const seoScore = computeSeoScore({
          title: article.title,
          meta_description: article.meta_description || "",
          content: article.content,
          keywords: article.keywords || topic.keywords || [],
        });
        const cost = estimateCost(
          settings.model,
          result.inputTokens,
          result.outputTokens,
        );

        // Check slug uniqueness
        let baseSlug = slugify(article.title);
        let slug = baseSlug;
        let attempt = 0;
        while (true) {
          const { data: existing } = await db
            .from("blog_posts")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          if (!existing) break;
          attempt++;
          slug = `${baseSlug}-${attempt}`;
        }

        // Insert post
        const { data: post, error: postErr } = await db
          .from("blog_posts")
          .insert({
            title: article.title,
            slug,
            excerpt: article.excerpt,
            content: article.content,
            meta_title: article.meta_title,
            meta_description: article.meta_description,
            keywords: article.keywords || topic.keywords || [],
            category: topic.category,
            status: "review",
            featured_image_prompt: article.featured_image_prompt,
            word_count: wordCount,
            reading_time_min: Math.max(1, Math.round(wordCount / 220)),
            seo_score: seoScore,
            topic_id: topicId,
            model_used: settings.model,
            generation_cost_estimate: cost,
          })
          .select()
          .single();

        if (postErr) throw postErr;

        // Update topic
        await db
          .from("blog_topics")
          .update({ status: "generated", generated_post_id: post.id })
          .eq("id", topicId);

        // Update settings counters
        await db
          .from("blog_settings")
          .update({
            last_generation_at: new Date().toISOString(),
            total_posts_generated: (settings.total_posts_generated || 0) + 1,
          })
          .eq("id", 1);

        // Log
        await db.from("blog_generation_logs").insert({
          action: "generate-article",
          topic_id: topicId,
          post_id: post.id,
          model: settings.model,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          cost_estimate: cost,
          duration_ms: Date.now() - startTime,
          status: "success",
          metadata: { wordCount, seoScore, slug },
        });

        return new Response(JSON.stringify({ post }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        // Mark topic as failed
        await db
          .from("blog_topics")
          .update({ status: "failed", error_message: err.message })
          .eq("id", topicId);

        await db.from("blog_generation_logs").insert({
          action: "generate-article",
          topic_id: topicId,
          model: settings.model,
          duration_ms: Date.now() - startTime,
          status: "error",
          error_message: err.message,
        });

        throw err;
      }
    }

    // ── ACTION: batch-generate ──────────────────────────────────
    if (action === "batch-generate") {
      const limit = body.limit || settings.posts_per_batch || 2;

      // Get pending topics by priority
      const { data: topics } = await db
        .from("blog_topics")
        .select("id, topic")
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(limit);

      if (!topics?.length) {
        return new Response(
          JSON.stringify({ message: "Aucun sujet en attente", generated: 0 }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const results: { topicId: string; postId?: string; error?: string }[] =
        [];

      for (const t of topics) {
        try {
          // Recursive call — reuse generate-article logic
          const innerReq = new Request(req.url, {
            method: "POST",
            headers: req.headers,
            body: JSON.stringify({ action: "generate-article", topicId: t.id }),
          });
          // Instead of recursive fetch, inline the logic via a sub-call
          // For simplicity, we call the same endpoint
          const innerRes = await fetch(
            `${supabaseUrl}/functions/v1/blog-engine`,
            {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
                apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
              },
              body: JSON.stringify({
                action: "generate-article",
                topicId: t.id,
              }),
            },
          );

          if (innerRes.ok) {
            const data = await innerRes.json();
            results.push({ topicId: t.id, postId: data.post?.id });
          } else {
            const errData = await innerRes.json();
            results.push({ topicId: t.id, error: errData.error });
          }
        } catch (err) {
          results.push({ topicId: t.id, error: err.message });
        }
      }

      return new Response(
        JSON.stringify({ generated: results.filter((r) => r.postId).length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── ACTION: analyze-seo ─────────────────────────────────────
    if (action === "analyze-seo") {
      const postId = body.postId as string;

      const { data: post } = await db
        .from("blog_posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (!post) {
        return new Response(
          JSON.stringify({ error: "Post not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const systemPrompt = `Tu es un auditeur SEO expert. Analyse l'article suivant et donne un audit détaillé avec des recommandations concrètes.

Retourne un JSON :
{
  "score": 0-100,
  "issues": [{"severity": "critical|warning|info", "message": "...", "fix": "..."}],
  "strengths": ["..."],
  "recommendations": ["..."]
}

IMPORTANT: JSON uniquement.`;

      const result = await callClaude(
        apiKey,
        settings.model || "claude-haiku-4-5-20251001",
        systemPrompt,
        `Titre: ${post.title}\nMeta: ${post.meta_description}\nMots-clés: ${(post.keywords || []).join(", ")}\n\n${post.content}`,
        2048,
      );

      let audit;
      try {
        audit = JSON.parse(result.text);
      } catch {
        const match = result.text.match(/\{[\s\S]*\}/);
        if (match) audit = JSON.parse(match[0]);
        else audit = { score: 0, issues: [], strengths: [], recommendations: [] };
      }

      // Update seo_score
      if (audit.score) {
        await db
          .from("blog_posts")
          .update({ seo_score: audit.score })
          .eq("id", postId);
      }

      return new Response(JSON.stringify({ audit }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: `Unknown action: ${action}. Valid: suggest-topics, generate-article, batch-generate, analyze-seo`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("blog-engine error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  // Pricing per million tokens (USD)
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
    "claude-sonnet-4-6": { input: 3, output: 15 },
    "claude-opus-4-6": { input: 15, output: 75 },
  };
  const p = pricing[model] || pricing["claude-haiku-4-5-20251001"];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}
