import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  userName: string;
  centerName: string;
  role: string;
  redirectTo: string;
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

    const { email, userName, centerName, role, redirectTo } =
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

    // Generate recovery link (does NOT send any email)
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

    if (linkError) {
      console.error("generateLink error:", linkError);
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const setupUrl = linkData.properties.action_link;
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

    if (template) {
      subject = template.subject.replace(
        /\{\{center_name\}\}/g,
        centerName || "votre centre",
      );
      htmlContent = template.body_html
        .replace(/\{\{recipient_name\}\}/g, userName || "")
        .replace(/\{\{center_name\}\}/g, centerName || "votre centre")
        .replace(/\{\{role\}\}/g, roleLabel)
        .replace(/\{\{login_url\}\}/g, setupUrl)
        .replace(/\{\{setup_url\}\}/g, setupUrl);
    } else {
      subject = `Invitation \u00e0 rejoindre ${centerName || "votre centre"}`;
      htmlContent = buildDefaultHtml(
        userName || "",
        centerName || "votre centre",
        roleLabel,
        setupUrl,
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

    // Log in email_logs
    await adminClient.from("email_logs").insert({
      participant_email: email,
      email_type: "center_invitation",
      status: "sent",
      rendered_subject: subject,
      rendered_html: htmlContent,
    });

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
