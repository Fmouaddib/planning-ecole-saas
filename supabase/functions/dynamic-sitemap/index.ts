import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_URL = "https://anti-planning.com";

const STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/#/features", changefreq: "monthly", priority: "0.9" },
  { path: "/#/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/#/ecole-en-ligne", changefreq: "monthly", priority: "0.8" },
  { path: "/#/how-it-works", changefreq: "monthly", priority: "0.8" },
  { path: "/#/about", changefreq: "monthly", priority: "0.7" },
  { path: "/#/blog", changefreq: "daily", priority: "0.8" },
  { path: "/#/contact", changefreq: "yearly", priority: "0.6" },
  { path: "/#/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/#/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/#/onboarding", changefreq: "monthly", priority: "0.7" },
];

Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch published blog posts
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}${page.path}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Blog posts
    if (posts) {
      for (const post of posts) {
        const lastmod = post.updated_at
          ? new Date(post.updated_at).toISOString().split("T")[0]
          : today;
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/#/blog/${post.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Sitemap error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
