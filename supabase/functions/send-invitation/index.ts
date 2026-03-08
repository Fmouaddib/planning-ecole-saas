import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BASE_DOMAIN = "anti-planning.com";
const VERCEL_PROD_URL = "https://planning-ecole-saas.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  userName: string;
  centerName: string;
  centerId?: string;
  role: string;
  redirectTo: string;
  customSubject?: string;
  customHtmlContent?: string;
}

const ROLE_LABELS: Record<string, string> = {
  teacher: "Enseignant",
  student: "\u00c9tudiant",
  admin: "Administrateur",
  staff: "Personnel",
  trainer: "Formateur",
  coordinator: "Coordinateur",
};

function buildDefaultHtml(
  userName: string,
  centerName: string,
  roleLabel: string,
  setupUrl: string,
): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Bienvenue sur AntiPlanning !</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;background:#fff">
    <p style="font-size:15px;color:#333">Bonjour <strong>${userName}</strong>,</p>
    <p style="font-size:15px;color:#333">Vous avez \u00e9t\u00e9 invit\u00e9(e) \u00e0 rejoindre <strong>${centerName}</strong> en tant que <strong>${roleLabel}</strong>.</p>
    <p style="font-size:15px;color:#333">Pour activer votre compte, cliquez sur le bouton ci-dessous et cr\u00e9ez votre mot de passe :</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${setupUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
        Cr\u00e9er mon mot de passe
      </a>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
      Ce lien est valable 24 heures. Si vous n'avez pas demand\u00e9 cette invitation, ignorez cet email.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;margin-top:16px;text-align:center">AntiPlanning \u2014 Ne pas r\u00e9pondre \u00e0 cet email</p>
</div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoKey) {
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { email, userName, centerName, centerId, role, redirectTo, customSubject, customHtmlContent } =
      (await req.json()) as InvitationRequest;

    if (!email || !redirectTo) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: email, redirectTo",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Admin client with service_role to generate recovery link
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Resolve center slug → build production redirect URL
    // Never use localhost — always fall back to Vercel production URL
    let productionUrl = redirectTo?.startsWith("http://localhost") ? VERCEL_PROD_URL : (redirectTo || VERCEL_PROD_URL);
    if (centerId) {
      const { data: center } = await adminClient
        .from("training_centers")
        .select("slug")
        .eq("id", centerId)
        .single();

      if (center?.slug) {
        productionUrl = `https://${center.slug}.${BASE_DOMAIN}`;
      } else {
        // No slug → use Vercel production URL as fallback
        productionUrl = VERCEL_PROD_URL;
      }
    }
    console.log(`[send-invitation] redirectTo resolved: ${productionUrl} (center: ${centerId}, original: ${redirectTo})`);

    // Generate recovery link (does NOT send any email)
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: productionUrl },
      });

    if (linkError) {
      console.error("generateLink error:", linkError);
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build setup URL pointing to our app with the token hash in the path.
    // This avoids all issues with & encoding in HTML emails and email client link tracking.
    // The app will call supabase.auth.verifyOtp({ token_hash, type: 'recovery' }) client-side.
    const actionLink = linkData.properties.action_link;
    const actionUrl = new URL(actionLink);
    const tokenHash = actionUrl.searchParams.get("token_hash") || actionUrl.searchParams.get("token") || linkData.properties.hashed_token || "";
    console.log(`[send-invitation] token_hash extracted: ${tokenHash} (from action_link: ${actionLink})`);

    // Clean URL with NO query parameters — just path-based token
    const setupUrl = `${productionUrl}/#/setup-account/${tokenHash}`;
    const htmlSetupUrl = setupUrl; // No HTML encoding needed — no & in URL
    console.log(`[send-invitation] Final setup URL: ${setupUrl}`);

    const roleLabel = ROLE_LABELS[role] || role;

    // Try to fetch custom template from DB
    const { data: template } = await adminClient
      .from("email_templates")
      .select("subject, body_html")
      .eq("name", "center_invitation")
      .eq("is_active", true)
      .limit(1)
      .single();

    let subject: string;
    let htmlContent: string;

    if (customSubject && customHtmlContent) {
      // Use custom content provided by admin (with setup URL injection)
      subject = customSubject;
      htmlContent = customHtmlContent
        .replace(/\{\{setup_url\}\}/g, htmlSetupUrl)
        .replace(/\{\{login_url\}\}/g, htmlSetupUrl);
    } else if (template) {
      subject = template.subject.replace(
        /\{\{center_name\}\}/g,
        centerName || "votre centre",
      );
      htmlContent = template.body_html
        .replace(/\{\{recipient_name\}\}/g, userName || "")
        .replace(/\{\{center_name\}\}/g, centerName || "votre centre")
        .replace(/\{\{role\}\}/g, roleLabel)
        .replace(/\{\{login_url\}\}/g, htmlSetupUrl)
        .replace(/\{\{setup_url\}\}/g, htmlSetupUrl);
    } else {
      subject = `Invitation \u00e0 rejoindre ${centerName || "votre centre"}`;
      htmlContent = buildDefaultHtml(
        userName || "",
        centerName || "votre centre",
        roleLabel,
        htmlSetupUrl,
      );
    }

    // Send via Brevo
    const senderEmail =
      Deno.env.get("BREVO_SENDER_EMAIL") || "fahd.mouaddib@gmail.com";

    const brevoPayload = {
      sender: { name: "AntiPlanning", email: senderEmail },
      to: [{ email, name: userName || email }],
      subject,
      htmlContent,
      tags: ["invitation"],
    };

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Brevo API error:", result);
      return new Response(
        JSON.stringify({ error: "Brevo API error", details: result }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Resolve center_id: use provided value, or look up from user's profile
    let resolvedCenterId = centerId || null;
    if (!resolvedCenterId) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("center_id")
        .eq("email", email)
        .limit(1)
        .maybeSingle();
      if (profile?.center_id) resolvedCenterId = profile.center_id;
    }

    // Log in email_logs (include center_id so it appears in admin's email list)
    const { error: logError } = await adminClient.from("email_logs").insert({
      participant_email: email,
      email_type: "center_invitation",
      status: "sent",
      rendered_subject: subject,
      rendered_html: htmlContent,
      ...(resolvedCenterId ? { center_id: resolvedCenterId } : {}),
    });
    if (logError) console.error("email_logs insert error:", logError);

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-invitation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
