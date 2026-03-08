import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import type { BlogSettings, TopicSuggestion } from "./providers.ts";
import { callAI, searchUnsplashImage } from "./providers.ts";
import {
  safeJsonParse,
  slugify,
  countWords,
  computeSeoScore,
  estimateCost,
  buildArticleSystemPrompt,
  buildTopicSystemPrompt,
  doResearch,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Main handler ─────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const action = body.action as string;

    const { data: settings, error: settingsError } = await db
      .from("blog_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: "Blog settings not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasKey = settings.gemini_api_key || settings.groq_api_key || settings.anthropic_api_key;
    if (!hasKey) {
      return new Response(
        JSON.stringify({
          error: "Aucune cl\u00E9 API configur\u00E9e. Ajoutez au moins une cl\u00E9 (Gemini gratuit recommand\u00E9) dans les param\u00E8tres du blog.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── ACTION: suggest-topics ──────────────────────────────────
    if (action === "suggest-topics") {
      const count = body.count || 10;
      const existingTopics = body.existingTopics || [];

      const researchQuery = `${settings.seed_keywords.slice(0, 3).join(" ")} tendances 2025 2026 formation`;
      const researchContext = await doResearch(settings as BlogSettings, researchQuery);

      const systemPrompt = buildTopicSystemPrompt(settings as BlogSettings, researchContext);
      const userPrompt = `Sugg\u00E8re ${count} sujets d'articles de blog uniques et pertinents.
${existingTopics.length > 0 ? `\nSujets D\u00C9J\u00C0 trait\u00E9s (\u00E0 \u00E9viter) :\n${existingTopics.map((t: string) => `- ${t}`).join("\n")}` : ""}

Privil\u00E9gie un mix entre :
- Articles informatifs (guides, tutoriels, comparatifs)
- Articles d'actualit\u00E9 (tendances 2025-2026, r\u00E9glementations)
- Articles de fond (transformation digitale, IA dans la formation)
- Articles pratiques (checklists, templates, cas d'usage)`;

      const result = await callAI(settings as BlogSettings, systemPrompt, userPrompt, 2048);

      const suggestions: TopicSuggestion[] = safeJsonParse<TopicSuggestion[]>(result.text);

      await db.from("blog_generation_logs").insert({
        action: "suggest-topics",
        model: result.model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost_estimate: estimateCost(result.provider, result.model, result.inputTokens, result.outputTokens),
        duration_ms: Date.now() - startTime,
        status: "success",
        metadata: { count: suggestions.length, provider: result.provider, research: !!researchContext },
      });

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: generate-article ────────────────────────────────
    if (action === "generate-article") {
      const topicId = body.topicId as string;

      const { data: topic, error: topicErr } = await db
        .from("blog_topics")
        .select("*")
        .eq("id", topicId)
        .single();

      if (topicErr || !topic) {
        return new Response(JSON.stringify({ error: "Topic not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await db.from("blog_topics").update({ status: "generating" }).eq("id", topicId);

      try {
        const researchQueries = [
          topic.topic,
          ...(topic.keywords || []).slice(0, 2).map((k: string) => `${k} formation France 2025`),
        ];

        let researchContext = "";
        for (const q of researchQueries) {
          const results = await doResearch(settings as BlogSettings, q);
          if (results) researchContext += results + "\n\n";
        }

        const { data: publishedArticles } = await db
          .from("blog_posts")
          .select("title, slug, category")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(50);

        const systemPrompt = buildArticleSystemPrompt(settings as BlogSettings, researchContext || undefined, publishedArticles || []);
        const userPrompt = `R\u00E9dige un article de blog SEO complet sur le sujet suivant :

SUJET : ${topic.topic}
${topic.description ? `DESCRIPTION : ${topic.description}` : ""}
MOTS-CL\u00C9S CIBLES : ${(topic.keywords || []).join(", ")}
CAT\u00C9GORIE : ${topic.category}

Rappel : retourne UNIQUEMENT le JSON valide avec title, meta_title, meta_description, excerpt, content, keywords, featured_image_prompt.`;

        const result = await callAI(settings as BlogSettings, systemPrompt, userPrompt, 8192);

        let article: {
          title: string;
          meta_title: string;
          meta_description: string;
          excerpt: string;
          content: string;
          keywords: string[];
          featured_image_prompt: string;
        };

        article = safeJsonParse(result.text);

        const wordCount = countWords(article.content);
        const seoScore = computeSeoScore({
          title: article.title,
          meta_description: article.meta_description || "",
          content: article.content,
          keywords: article.keywords || topic.keywords || [],
        });
        const cost = estimateCost(result.provider, result.model, result.inputTokens, result.outputTokens);

        const baseSlug = slugify(article.title);
        let slug = baseSlug;
        let attempt = 0;
        while (true) {
          const { data: existing } = await db.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
          if (!existing) break;
          attempt++;
          slug = `${baseSlug}-${attempt}`;
        }

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
            model_used: `${result.provider}/${result.model}`,
            generation_cost_estimate: cost,
          })
          .select()
          .single();

        if (postErr) throw postErr;

        // Fetch Unsplash image if API key configured
        if (settings.unsplash_api_key && article.featured_image_prompt) {
          const searchQuery = article.featured_image_prompt
            ? article.featured_image_prompt.slice(0, 100)
            : (article.keywords || []).slice(0, 2).join(" ") + " " + (topic.category || "education");
          const imageUrl = await searchUnsplashImage(settings.unsplash_api_key, searchQuery);
          if (imageUrl) {
            await db.from("blog_posts").update({ featured_image_url: imageUrl }).eq("id", post.id);
            post.featured_image_url = imageUrl;
          }
        }

        await db.from("blog_topics").update({ status: "generated", generated_post_id: post.id }).eq("id", topicId);

        await db.from("blog_settings").update({
          last_generation_at: new Date().toISOString(),
          total_posts_generated: (settings.total_posts_generated || 0) + 1,
        }).eq("id", 1);

        await db.from("blog_generation_logs").insert({
          action: "generate-article",
          topic_id: topicId,
          post_id: post.id,
          model: `${result.provider}/${result.model}`,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          cost_estimate: cost,
          duration_ms: Date.now() - startTime,
          status: "success",
          metadata: { wordCount, seoScore, slug, provider: result.provider, research: !!researchContext },
        });

        return new Response(JSON.stringify({ post }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        await db.from("blog_topics").update({ status: "failed", error_message: err.message }).eq("id", topicId);
        await db.from("blog_generation_logs").insert({
          action: "generate-article",
          topic_id: topicId,
          model: `${settings.provider}/${settings.model}`,
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
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const results: { topicId: string; postId?: string; error?: string }[] = [];

      for (const t of topics) {
        try {
          const innerRes = await fetch(`${supabaseUrl}/functions/v1/blog-engine`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""}`,
              "Content-Type": "application/json",
              apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
            },
            body: JSON.stringify({ action: "generate-article", topicId: t.id }),
          });

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

      const { data: post } = await db.from("blog_posts").select("*").eq("id", postId).single();

      if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemPrompt = `Tu es un auditeur SEO expert. Analyse l'article suivant et donne un audit d\u00E9taill\u00E9 avec des recommandations concr\u00E8tes.

Retourne un JSON :
{
  "score": 0-100,
  "issues": [{"severity": "critical|warning|info", "message": "...", "fix": "..."}],
  "strengths": ["..."],
  "recommendations": ["..."]
}

IMPORTANT: JSON uniquement.`;

      const result = await callAI(
        settings as BlogSettings,
        systemPrompt,
        `Titre: ${post.title}\nMeta: ${post.meta_description}\nMots-cl\u00E9s: ${(post.keywords || []).join(", ")}\n\n${post.content}`,
        2048,
      );

      let audit;
      try {
        audit = safeJsonParse(result.text);
      } catch {
        audit = { score: 0, issues: [], strengths: [], recommendations: [] };
      }

      if (audit.score) {
        await db.from("blog_posts").update({ seo_score: audit.score }).eq("id", postId);
      }

      return new Response(JSON.stringify({ audit }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: improve-article ──────────────────────────────────
    if (action === "improve-article") {
      const postId = body.postId as string;
      const audit = body.audit as {
        issues: { severity: string; message: string; fix: string }[];
        recommendations: string[];
      };

      const { data: post } = await db.from("blog_posts").select("*").eq("id", postId).single();

      if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch published articles for internal linking (exclude current article)
      const { data: publishedArticles } = await db
        .from("blog_posts")
        .select("title, slug, category")
        .eq("status", "published")
        .neq("id", postId)
        .order("published_at", { ascending: false })
        .limit(50);

      const articleLinksText = (publishedArticles || []).length > 0
        ? `\nARTICLES PUBLI\u00C9S DISPONIBLES POUR LE MAILLAGE INTERNE (ins\u00E8re 3-5 liens pertinents) :\n${(publishedArticles || []).map((a: any) => `- [${a.title}](${settings.blog_base_url || '#/blog'}/${a.slug})`).join("\n")}`
        : "";

      const issuesText = (audit.issues || [])
        .map((i) => `- [${i.severity}] ${i.message} \u2192 Correction: ${i.fix}`)
        .join("\n");

      const recsText = (audit.recommendations || [])
        .map((r) => `- ${r}`)
        .join("\n");

      const systemPrompt = `Tu es un r\u00E9dacteur SEO expert. Tu dois am\u00E9liorer un article existant en appliquant les corrections issues d'un audit SEO.

R\u00C8GLES:
1. Applique TOUTES les corrections et recommandations de l'audit
2. Conserve le style, le ton et la structure g\u00E9n\u00E9rale de l'article
3. Ne raccourcis PAS l'article \u2014 garde au minimum le m\u00EAme nombre de mots
4. Am\u00E9liore les titres, paragraphes et mots-cl\u00E9s selon les recommandations
5. Si l'audit mentionne la meta description ou le titre, am\u00E9liore-les aussi
6. Conserve les blocs \`\`\`mermaid existants et ajoute-en 1-2 de plus si l'article n'en contient pas (flowchart, graph, pie, timeline \u2014 en fran\u00E7ais, 5-10 n\u0153uds max)
7. RESPECTE les normes de r\u00E9daction fran\u00E7aise : pas de majuscule \u00E0 chaque mot dans les titres (seule la premi\u00E8re lettre + noms propres), accents corrects, voix active, vouvoiement
8. MAILLAGE INTERNE : int\u00E8gre naturellement 3-5 liens vers les articles publi\u00E9s list\u00E9s ci-dessous, en utilisant des ancres contextuelles pertinentes
${settings.custom_prompt ? `\nINSTRUCTIONS PERSONNALIS\u00C9ES :\n${settings.custom_prompt}` : ""}
${articleLinksText}

FORMAT DE SORTIE (JSON strict):
{
  "title": "Titre am\u00E9lior\u00E9",
  "meta_description": "Meta description am\u00E9lior\u00E9e (120-160 chars)",
  "content": "Article complet am\u00E9lior\u00E9 en Markdown",
  "keywords": ["mot-cl\u00E9 1", "mot-cl\u00E9 2", ...]
}

IMPORTANT: Retourne UNIQUEMENT le JSON, sans backticks ni texte avant/apr\u00E8s.`;

      const userPrompt = `Voici l'article \u00E0 am\u00E9liorer :

TITRE ACTUEL : ${post.title}
META DESCRIPTION : ${post.meta_description || ""}
MOTS-CL\u00C9S : ${(post.keywords || []).join(", ")}

CONTENU ACTUEL :
${post.content}

---

AUDIT SEO \u2014 PROBL\u00C8MES \u00C0 CORRIGER :
${issuesText || "Aucun probl\u00E8me critique."}

RECOMMANDATIONS :
${recsText || "Aucune recommandation suppl\u00E9mentaire."}

Applique toutes les corrections et retourne l'article am\u00E9lior\u00E9 en JSON.`;

      const result = await callAI(settings as BlogSettings, systemPrompt, userPrompt, 8192);

      let improved: {
        title: string;
        meta_description: string;
        content: string;
        keywords: string[];
      };

      try {
        improved = safeJsonParse(result.text);
      } catch (parseErr) {
        console.error("Failed to parse improve-article response:", parseErr, "Raw (first 1000):", result.text?.slice(0, 1000));
        // Fallback: try to extract fields individually via regex
        const titleMatch = result.text?.match(/"title"\s*:\s*"([^"]+)"/);
        const metaMatch = result.text?.match(/"meta_description"\s*:\s*"([^"]+)"/);
        const kwMatch = result.text?.match(/"keywords"\s*:\s*\[([^\]]+)\]/);
        const contentMatch = result.text?.match(/"content"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"(?:keywords|title|meta_description)"|}\s*$)/);
        if (titleMatch || contentMatch) {
          improved = {
            title: titleMatch?.[1] || post.title,
            meta_description: metaMatch?.[1] || post.meta_description || "",
            content: contentMatch?.[1]?.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\") || post.content,
            keywords: kwMatch ? kwMatch[1].split(",").map((k: string) => k.trim().replace(/^"|"$/g, "")) : post.keywords || [],
          };
          console.log("Recovered improve-article via regex fallback");
        } else {
          throw new Error("L'IA a retourn\u00E9 une r\u00E9ponse invalide (JSON non parsable). R\u00E9essayez.");
        }
      }

      // Fallback: use original values if AI didn't return them
      if (!improved.title) improved.title = post.title;
      if (!improved.content) improved.content = post.content;
      if (!improved.meta_description) improved.meta_description = post.meta_description || "";

      const wordCount = countWords(improved.content);
      const seoScore = computeSeoScore({
        title: improved.title,
        meta_description: improved.meta_description || "",
        content: improved.content,
        keywords: improved.keywords || post.keywords || [],
      });
      const cost = estimateCost(result.provider, result.model, result.inputTokens, result.outputTokens);

      // Update the post — preserve status and slug (no status change on improve)
      const { data: updatedPost, error: updateErr } = await db
        .from("blog_posts")
        .update({
          title: improved.title,
          meta_description: improved.meta_description,
          content: improved.content,
          keywords: improved.keywords || post.keywords,
          word_count: wordCount,
          reading_time_min: Math.max(1, Math.round(wordCount / 220)),
          seo_score: seoScore,
          meta_title: improved.title.length <= 60 ? improved.title : (post.meta_title || improved.title.slice(0, 60)),
        })
        .eq("id", postId)
        .select()
        .single();

      if (updateErr) {
        console.error("improve-article DB update failed:", updateErr);
        throw new Error(`DB update failed: ${updateErr.message || JSON.stringify(updateErr)}`);
      }

      await db.from("blog_generation_logs").insert({
        action: "improve-article",
        post_id: postId,
        model: `${result.provider}/${result.model}`,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost_estimate: cost,
        duration_ms: Date.now() - startTime,
        status: "success",
        metadata: {
          wordCount,
          seoScore,
          previousScore: post.seo_score,
          issuesFixed: audit.issues?.length || 0,
          provider: result.provider,
        },
      }).then(() => {}, (e: any) => console.error("improve-article log insert failed:", e));

      return new Response(JSON.stringify({ post: updatedPost }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: update-links ───────────────────────────────────────
    if (action === "update-links") {
      const postId = body.postId as string;

      const { data: post } = await db.from("blog_posts").select("*").eq("id", postId).single();
      if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: publishedArticles } = await db
        .from("blog_posts")
        .select("title, slug, category, keywords")
        .eq("status", "published")
        .neq("id", postId)
        .order("published_at", { ascending: false })
        .limit(50);

      if (!publishedArticles?.length) {
        return new Response(JSON.stringify({ post, linksAdded: 0, message: "Aucun autre article publi\u00E9 pour le maillage." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const notLinked = (publishedArticles || []).filter((a: any) => !post.content.includes(a.slug));

      if (notLinked.length === 0) {
        return new Response(JSON.stringify({ post, linksAdded: 0, message: "Tous les articles sont d\u00E9j\u00E0 li\u00E9s." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const manualLinks = (settings.internal_links || []).map((l: any) => `- [${l.title}](${l.url})`);
      const newArticleLinks = notLinked.map((a: any) => `- [${a.title}](${settings.blog_base_url || '#/blog'}/${a.slug}) [cat\u00E9gorie: ${a.category}]`);

      const systemPrompt = `Tu es un r\u00E9dacteur SEO expert. Tu dois mettre \u00E0 jour un article existant en y int\u00E9grant NATURELLEMENT des liens internes vers de nouveaux articles du m\u00EAme blog.

R\u00C8GLES STRICTES :
1. NE MODIFIE PAS le texte existant \u2014 garde le contenu identique \u00E0 99%
2. Int\u00E8gre 2-5 liens internes NOUVEAUX aux endroits les plus pertinents du texte
3. Utilise des ancres contextuelles naturelles (pas de "cliquez ici" mais le sujet du lien int\u00E9gr\u00E9 dans une phrase)
4. Privil\u00E9gie les liens vers des articles de la m\u00EAme cat\u00E9gorie ou avec des mots-cl\u00E9s communs
5. Ne touche PAS aux liens d\u00E9j\u00E0 pr\u00E9sents dans l'article
6. RESPECTE les normes de r\u00E9daction fran\u00E7aise
${settings.custom_prompt ? `\nINSTRUCTIONS PERSONNALIS\u00C9ES :\n${settings.custom_prompt}` : ""}

NOUVEAUX ARTICLES \u00C0 LIER :
${newArticleLinks.join("\n")}
${manualLinks.length > 0 ? `\nLIENS MANUELS :\n${manualLinks.join("\n")}` : ""}

FORMAT DE SORTIE (JSON strict) :
{
  "content": "Article complet avec les nouveaux liens int\u00E9gr\u00E9s",
  "links_added": 3
}

IMPORTANT: Retourne UNIQUEMENT le JSON.`;

      const result = await callAI(
        settings as BlogSettings,
        systemPrompt,
        `ARTICLE ACTUEL :\n\nTITRE : ${post.title}\nCAT\u00C9GORIE : ${post.category}\nMOTS-CL\u00C9S : ${(post.keywords || []).join(", ")}\n\nCONTENU :\n${post.content}`,
        8192,
      );

      let updated: { content: string; links_added: number };
      try {
        updated = safeJsonParse(result.text);
      } catch {
        throw new Error("L'IA a retourn\u00E9 une r\u00E9ponse invalide pour la mise \u00E0 jour des liens.");
      }

      if (!updated.content) updated.content = post.content;

      const { data: updatedPost, error: updateErr } = await db
        .from("blog_posts")
        .update({ content: updated.content })
        .eq("id", postId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      const cost = estimateCost(result.provider, result.model, result.inputTokens, result.outputTokens);
      await db.from("blog_generation_logs").insert({
        action: "update-links",
        post_id: postId,
        model: `${result.provider}/${result.model}`,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost_estimate: cost,
        duration_ms: Date.now() - startTime,
        status: "success",
        metadata: { linksAdded: updated.links_added, availableArticles: notLinked.length, provider: result.provider },
      });

      return new Response(
        JSON.stringify({ post: updatedPost, linksAdded: updated.links_added }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}. Valid: suggest-topics, generate-article, batch-generate, analyze-seo, improve-article, update-links` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("blog-engine error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
