import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Simple in-memory rate limiter (per function instance)
const submissions = new Map<string, number[]>();
const RATE_LIMIT = 3; // max submissions per window
const RATE_WINDOW = 600_000; // 10 minutes

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const times = (submissions.get(key) || []).filter((t) => now - t < RATE_WINDOW);
  if (times.length >= RATE_LIMIT) return true;
  times.push(now);
  submissions.set(key, times);
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { name, email, subject, message } = await req.json();

    // Validation
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Nom, email et message sont requis." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Adresse email invalide." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Rate limit by email
    if (isRateLimited(email.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: "Trop de messages envoyés. Réessayez dans quelques minutes." }),
        { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      console.error("BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service email non configuré." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const subjectLine = subject || "Contact depuis anti-planning.com";
    const recipientEmail = Deno.env.get("CONTACT_EMAIL") || "fahd.mouaddib@gmail.com";

    // 1. Send notification to admin
    const adminHtml = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#FF5B46;padding:20px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0">Nouveau message de contact</h2>
        </div>
        <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 12px 12px">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;font-weight:600;color:#1e293b;width:100px">Nom</td><td style="color:#334155">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:8px 0;font-weight:600;color:#1e293b">Email</td><td><a href="mailto:${escapeHtml(email)}" style="color:#2563eb">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding:8px 0;font-weight:600;color:#1e293b">Sujet</td><td style="color:#334155">${escapeHtml(subjectLine)}</td></tr>
          </table>
          <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0">
          <div style="color:#334155;line-height:1.6;white-space:pre-wrap">${escapeHtml(message)}</div>
        </div>
      </div>
    `;

    const adminEmailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Anti-Planning Contact", email: "fahd.mouaddib@gmail.com" },
        to: [{ email: recipientEmail, name: "Anti-Planning" }],
        replyTo: { email: email.trim(), name: name.trim() },
        subject: `[Contact] ${subjectLine} — ${name}`,
        htmlContent: adminHtml,
        tags: ["contact-form"],
      }),
    });

    if (!adminEmailRes.ok) {
      const errText = await adminEmailRes.text();
      console.error("Brevo admin email error:", errText);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'envoi. Réessayez plus tard." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 2. Send confirmation to user
    const confirmHtml = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#FF5B46;padding:20px;border-radius:12px 12px 0 0;text-align:center">
          <h2 style="color:#fff;margin:0">Merci pour votre message !</h2>
        </div>
        <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 12px 12px">
          <p style="color:#334155;line-height:1.6">Bonjour ${escapeHtml(name)},</p>
          <p style="color:#334155;line-height:1.6">Nous avons bien reçu votre message concernant <strong>"${escapeHtml(subjectLine)}"</strong>.</p>
          <p style="color:#334155;line-height:1.6">Notre équipe vous répondra sous <strong>24 heures ouvrées</strong>.</p>
          <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0">
          <p style="color:#64748b;font-size:0.85rem">Ceci est un email automatique. Pour toute urgence, contactez-nous à <a href="mailto:contact@anti-planning.com" style="color:#2563eb">contact@anti-planning.com</a>.</p>
          <p style="color:#64748b;font-size:0.85rem;margin-top:12px">— L'équipe Anti-Planning</p>
        </div>
      </div>
    `;

    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Anti-Planning", email: "fahd.mouaddib@gmail.com" },
        to: [{ email: email.trim(), name: name.trim() }],
        subject: "Confirmation : nous avons reçu votre message",
        htmlContent: confirmHtml,
        tags: ["contact-confirmation"],
      }),
    }).catch((err) => console.error("Confirmation email error:", err));

    // 3. Log to database (optional, fire-and-forget)
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);
      await supabase.from("email_logs").insert({
        recipient_email: recipientEmail,
        subject: `[Contact] ${subjectLine} — ${name}`,
        status: "sent",
        template_name: "contact_form",
        metadata: { sender_name: name, sender_email: email, subject: subjectLine },
      });
    } catch (e) {
      console.error("Log error:", e);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Message envoyé avec succès." }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Contact form error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
