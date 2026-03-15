import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Generic email sender via Brevo API
 * Used by: useEmailNotifications (session emails, collaboration, onboarding)
 * Auth: Supabase gateway handles JWT verification (--no-verify-jwt NOT used)
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const ALLOWED_ORIGINS = [
  "https://anti-planning.com",
  "https://planning-ecole-saas.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    (origin.endsWith(".anti-planning.com") && origin.startsWith("https://")) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailRequest {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  tags?: string[];
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      console.error("[send-email] BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const senderEmail =
      Deno.env.get("BREVO_SENDER_EMAIL") || "contact@anti-planning.com";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "AntiPlanning";

    const body: SendEmailRequest = await req.json();
    const { to, subject, htmlContent, tags } = body;

    if (!to || to.length === 0 || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, htmlContent" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Send via Brevo
    const brevoPayload = {
      sender: { name: senderName, email: senderEmail },
      to: to.map((r) => ({ email: r.email, name: r.name || r.email })),
      subject,
      htmlContent,
      tags: tags || ["antiplanning"],
      headers: {
        "List-Unsubscribe": `<mailto:unsubscribe@anti-planning.com?subject=unsubscribe>`,
      },
    };

    const brevoRes = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    if (!brevoRes.ok) {
      const errBody = await brevoRes.text();
      console.error("[send-email] Brevo error:", brevoRes.status, errBody);
      return new Response(
        JSON.stringify({
          error: "Email send failed",
          details: errBody,
        }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const result = await brevoRes.json();
    console.log(
      `[send-email] Sent to ${to.length} recipient(s): ${subject} [${(tags || []).join(",")}]`
    );

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-email] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
