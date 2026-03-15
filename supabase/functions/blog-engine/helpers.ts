import type { BlogSettings } from "./providers.ts";
import { searchWeb } from "./providers.ts";

// ── JSON Helpers ─────────────────────────────────────────────────

/** Sanitize AI-generated JSON: only escape control characters INSIDE string values,
 *  preserving structural whitespace (newlines/tabs between JSON tokens). */
function sanitizeJsonString(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const code = s.charCodeAt(i);

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString) {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString && code >= 0 && code <= 0x1f) {
      switch (ch) {
        case "\n": result += "\\n"; break;
        case "\r": result += "\\r"; break;
        case "\t": result += "\\t"; break;
        default: result += ""; break;
      }
    } else {
      result += ch;
    }
  }

  return result;
}

export function safeJsonParse<T>(raw: string): T {
  try {
    return JSON.parse(raw);
  } catch {
    const sanitized = sanitizeJsonString(raw);
    try {
      return JSON.parse(sanitized);
    } catch {
      const objMatch = sanitized.match(/\{[\s\S]*\}/);
      if (objMatch) return JSON.parse(objMatch[0]);
      const arrMatch = sanitized.match(/\[[\s\S]*\]/);
      if (arrMatch) return JSON.parse(arrMatch[0]);
      throw new Error("Could not parse AI response as JSON: " + raw.slice(0, 300));
    }
  }
}

// ── Text Helpers ─────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function countWords(text: string): number {
  return text
    .replace(/[#*_\[\]()>|`]/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function computeSeoScore(post: {
  title: string;
  meta_description: string;
  content: string;
  keywords: string[];
}): number {
  let score = 0;
  const content = post.content.toLowerCase();
  if (post.title.length >= 30 && post.title.length <= 65) score += 15;
  else if (post.title.length > 0) score += 5;
  if (post.meta_description.length >= 120 && post.meta_description.length <= 160) score += 15;
  else if (post.meta_description.length > 0) score += 5;
  if ((content.match(/^## /gm) || []).length >= 3) score += 15;
  if (post.keywords.some((kw) => post.title.toLowerCase().includes(kw.toLowerCase()))) score += 15;
  const kwHits = post.keywords.filter((kw) => content.includes(kw.toLowerCase())).length;
  score += Math.min(15, kwHits * 5);
  const words = countWords(post.content);
  if (words >= 1500) score += 15;
  else if (words >= 1000) score += 10;
  else if (words >= 500) score += 5;
  if (content.includes("anti-planning")) score += 5;
  if (content.includes("## faq") || content.includes("## questions")) score += 5;
  return Math.min(100, score);
}

export function estimateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
  if (provider === "gemini" || provider === "groq") return 0;
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
    "claude-sonnet-4-6": { input: 3, output: 15 },
    "claude-opus-4-6": { input: 15, output: 75 },
  };
  const p = pricing[model] || pricing["claude-haiku-4-5-20251001"];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

// ── System Prompts ───────────────────────────────────────────────

export function buildArticleSystemPrompt(settings: BlogSettings, researchContext?: string, publishedArticles?: { title: string; slug: string; category: string }[]): string {
  const manualLinks = settings.internal_links?.length > 0
    ? settings.internal_links.map((l) => `- [${l.title}](${l.url})`)
    : [];
  const blogBase = settings.blog_base_url || 'https://anti-planning.com/#/blog';
  const articleLinks = (publishedArticles || []).map((a) => `- [${a.title}](${blogBase}/${a.slug})`);
  const allLinks = [...manualLinks, ...articleLinks];
  const internalLinksText = allLinks.length > 0
    ? `\nLIENS INTERNES \u00C0 INT\u00C9GRER NATURELLEMENT (ins\u00E8re 3-5 liens pertinents dans le corps de l'article) :\n${allLinks.join("\n")}`
    : "";

  const researchBlock = researchContext
    ? `\n\nCONTEXTE DE RECHERCHE WEB (utilise ces donn\u00E9es pour enrichir l'article avec des faits r\u00E9cents, statistiques et tendances) :\n${researchContext}\n`
    : "";

  return `Tu es un r\u00E9dacteur SEO expert sp\u00E9cialis\u00E9 dans le secteur de la formation professionnelle, de l'\u00E9ducation et de la gestion de centres de formation en France.

SITE: ${settings.site_name} (${settings.site_url}) \u2014 logiciel SaaS de planning intelligent pour centres de formation, \u00E9coles et organismes de formation.

AUDIENCE CIBLE: ${settings.target_audience}

TON: ${settings.tone === "expert" ? "Expert et autoritaire, avec des donn\u00E9es et exemples concrets" : settings.tone === "professional" ? "Professionnel et informatif" : settings.tone === "casual" ? "D\u00E9contract\u00E9 mais cr\u00E9dible" : "Amical et accessible"}

LANGUE: ${settings.language === "fr" ? "Fran\u00E7ais" : "English"}
${researchBlock}
R\u00C8GLES SEO STRICTES:
1. Le titre (H1) doit contenir le mot-cl\u00E9 principal, entre 30 et 65 caract\u00E8res
2. La meta description doit faire 120-160 caract\u00E8res, inclure le mot-cl\u00E9 et un appel \u00E0 l'action
3. Utiliser 4-6 sous-titres H2 avec des mots-cl\u00E9s secondaires
4. Premier paragraphe : inclure le mot-cl\u00E9 principal dans les 100 premiers mots
5. Densit\u00E9 de mots-cl\u00E9s : 1-2% naturellement
6. Inclure une section FAQ avec 3-5 questions (balisage schema.org friendly)
7. Article de 1500-2500 mots minimum
8. Phrases courtes (max 20 mots en moyenne)
9. Paragraphes courts (3-4 lignes max)
10. Utiliser des listes \u00E0 puces et des tableaux quand pertinent
11. Ajouter un CTA vers ${settings.site_name} en conclusion
12. Int\u00E9grer des donn\u00E9es chiffr\u00E9es et statistiques r\u00E9centes quand disponibles
13. Int\u00E9grer 2-3 SCH\u00C9MAS MERMAID dans l'article pour illustrer visuellement les concepts cl\u00E9s
${internalLinksText}

R\u00C8GLES DE R\u00C9DACTION EN FRAN\u00C7AIS (OBLIGATOIRE) :
- Ne PAS mettre de majuscule \u00E0 chaque mot des titres et sous-titres : seule la premi\u00E8re lettre du titre et les noms propres prennent une majuscule (ex: "Comment optimiser la gestion de votre centre" et NON "Comment Optimiser La Gestion De Votre Centre")
- Utiliser les accents correctement (\u00E9, \u00E8, \u00EA, \u00E0, \u00F9, \u00E7, etc.)
- Respecter la typographie fran\u00E7aise : espace ins\u00E9cable avant ; : ! ? et guillemets \u00AB \u00BB
- Utiliser "centre de formation" et non "Centre De Formation"
- Les sigles restent en majuscules (CPF, OPCO, VAE, CFA, etc.)
- \u00C9crire les nombres en lettres jusqu'\u00E0 dix, en chiffres au-del\u00E0
- Pr\u00E9f\u00E9rer la voix active et le vouvoiement professionnel

CTA PAR D\u00C9FAUT: ${settings.cta_text} \u2192 ${settings.cta_url}
${settings.custom_prompt ? `\nINSTRUCTIONS PERSONNALIS\u00C9ES DU R\u00C9DACTEUR EN CHEF :\n${settings.custom_prompt}\n` : ""}
SCH\u00C9MAS MERMAID (OBLIGATOIRE) :
- Ins\u00E8re 2-3 blocs \`\`\`mermaid dans le contenu Markdown aux endroits strat\u00E9giques
- Types possibles : flowchart (processus), graph (relations), pie (r\u00E9partitions), timeline (chronologie), mindmap (concepts)
- Les sch\u00E9mas doivent illustrer les concepts expliqu\u00E9s dans l'article
- Garde les sch\u00E9mas simples (5-10 n\u0153uds max) et lisibles
- Utilise des labels en fran\u00E7ais
- Exemple de bloc dans le contenu :
\`\`\`mermaid
flowchart LR
    A[\u00C9tape 1] --> B[\u00C9tape 2] --> C[R\u00E9sultat]
\`\`\`

FORMAT DE SORTIE (JSON strict):
{
  "title": "Titre SEO optimis\u00E9 (H1)",
  "meta_title": "Meta title pour Google (max 60 chars)",
  "meta_description": "Meta description (120-160 chars)",
  "excerpt": "R\u00E9sum\u00E9 accrocheur (2-3 phrases)",
  "content": "Article complet en Markdown (H2, H3, listes, gras, liens, blocs mermaid)",
  "keywords": ["mot-cl\u00E9 1", "mot-cl\u00E9 2", ...],
  "featured_image_prompt": "Description pour g\u00E9n\u00E9rer une image de couverture (en anglais, style professionnel)"
}

IMPORTANT: Retourne UNIQUEMENT le JSON, sans backticks ni texte avant/apr\u00E8s.`;
}

export function buildTopicSystemPrompt(settings: BlogSettings, researchContext?: string): string {
  const researchBlock = researchContext
    ? `\n\nTENDANCES WEB ACTUELLES (base tes suggestions sur ces donn\u00E9es r\u00E9centes) :\n${researchContext}\n`
    : "";

  return `Tu es un strat\u00E8ge SEO expert sp\u00E9cialis\u00E9 dans le secteur de la formation professionnelle et de l'\u00E9ducation en France.

SITE: ${settings.site_name} \u2014 logiciel SaaS de planning pour centres de formation.
AUDIENCE: ${settings.target_audience}
MOTS-CL\u00C9S SEED: ${settings.seed_keywords.join(", ")}
CAT\u00C9GORIES: ${settings.categories.join(", ")}
${researchBlock}
Ta mission : sugg\u00E9rer des sujets d'articles de blog qui vont :
1. Cibler des requ\u00EAtes long-tail avec un volume de recherche r\u00E9aliste
2. R\u00E9pondre aux questions que se posent les directeurs de centres de formation
3. Positionner ${settings.site_name} comme expert du secteur
4. Couvrir les diff\u00E9rentes \u00E9tapes du parcours client (d\u00E9couverte \u2192 consid\u00E9ration \u2192 d\u00E9cision)
5. Traiter de l'actualit\u00E9 du secteur (Qualiopi, CPF, alternance, IA dans la formation)

Pour chaque sujet, fournis :
- Un titre provisoire optimis\u00E9 SEO
- Une description courte (1-2 phrases)
- 3-5 mots-cl\u00E9s cibles
- La cat\u00E9gorie
- La priorit\u00E9 (1=basse, 10=haute)

FORMAT JSON (array strict) :
[
  {
    "topic": "Titre provisoire",
    "description": "Description courte",
    "keywords": ["kw1", "kw2", "kw3"],
    "category": "cat\u00E9gorie",
    "priority": 8
  }
]

IMPORTANT: Retourne UNIQUEMENT le JSON array, sans backticks.`;
}

// ── Research helper ──────────────────────────────────────────────
export async function doResearch(settings: BlogSettings, query: string): Promise<string> {
  if (!settings.research_enabled || !settings.tavily_api_key) return "";

  try {
    const results = await searchWeb(settings.tavily_api_key, query, 8);
    if (results.length === 0) return "";

    return results
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}\nSource: ${r.url}`)
      .join("\n\n");
  } catch (err) {
    console.error("Research error:", err);
    return "";
  }
}
